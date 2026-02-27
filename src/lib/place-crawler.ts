// Vercel 차단 우회를 위한 API 기반 크롤러 (HTML 파싱 제거)
// 브라우저 렌더링이나 정규식 기반 치환 대신, 100% 공식/비공식 API만을 조합하여 우회합니다.
import fetch from 'node-fetch';

// ============================================
// 타입 정의
// ============================================
export interface PlaceInfo {
    name: string;
    category: string;
    description: string;
    address: string;
    roadAddress: string;
    phone: string;
    businessHours: string;
    imageUrls: string[];
    menuItems: { name: string; price: string; description?: string; imageUrl?: string }[];
    tags: string[];
    reviewCount: number;
    reviewScore: number;
    x: string;
    y: string;
}

export interface CrawlResult {
    success: boolean;
    method?: string;
    data?: PlaceInfo;
    error?: string;
    needsManualInput?: boolean;
    partialData?: Partial<PlaceInfo>;
}

// ============================================
// 공통 유틸리티
// ============================================

// 네이버 플레이스 URL에서 place ID 추출
export function extractPlaceId(url: string): string | null {
    const patterns = [
        /place\/(\d+)/,
        /restaurant\/(\d+)/,
        /v1\/search\/local.*query=.*&.*id=(\d+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'naver.me') {
            return 'SHORT_URL';
        }
    } catch (e) { }

    return null;
}

// 모바일 브라우저 흉내 헤더 (API 요청 시 네이버 API 게이트웨이 우회용)
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G998N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'sec-ch-ua': '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"'
};

// ============================================
// 1단계: 네이버 공식 지역검색 API
// ============================================

// 1-1. 모바일 웹페이지 `<title>` 혹은 검색어에서 가게 이름 추출
async function extractPlaceName(url: string, placeId: string): Promise<string | null> {
    // 우선 URL 검색어 파라미터가 있는지 확인 (예: /search/안양맛집/place/1234)
    try {
        const match = url.match(/search\/([^\/]+)\/place/);
        if (match) {
            const decoded = decodeURIComponent(match[1]).trim();
            return decoded;
        }
    } catch (e) { }

    // 1-2. 검색어가 없다면 모바일 메인에 가볍게 접근하여 <title> 태그만 추출 (HTML 본문 파싱 안함)
    try {
        const res = await fetch(`https://m.place.naver.com/restaurant/${placeId}/home`, {
            headers: BROWSER_HEADERS,
            timeout: 5000
        });
        const html = await res.text();
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
        if (titleMatch) {
            let title = titleMatch[1].replace(' : 네이버', '').replace('- 네이버 플레이스', '').trim();
            if (title && title !== '네이버 플레이스' && title !== '네이버 지도') {
                return title;
            }
        }
    } catch (error) {
        console.warn('[Crawler][Step1] Failed to extract name from basic metadata:', error);
    }
    return null;
}

// 1-3. 네이버 공식 API 검색
async function fetchNaverLocalAPI(query: string, placeId: string): Promise<Partial<PlaceInfo> | null> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('[Crawler][Step1] NAVER_CLIENT_ID or NAVER_CLIENT_SECRET varies is missing in .env');
        return null;
    }

    try {
        const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&start=1&sort=random`;
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret
            },
            timeout: 5000
        });

        if (!response.ok) {
            console.warn(`[Crawler][Step1] Naver API Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (!data.items || data.items.length === 0) {
            return null;
        }

        // 우선 첫번째 결과를 채택 (나중에 좌표 기반 고도화 가능)
        const item = data.items[0];
        const cleanName = item.title.replace(/<[^>]+>/g, '').trim();

        return {
            name: cleanName,
            category: item.category || '',
            address: item.address || '',
            roadAddress: item.roadAddress || '',
            phone: item.telephone || '',
            x: item.mapx || '',
            y: item.mapy || ''
        };
    } catch (error) {
        console.error('[Crawler][Step1] Exception during Naver Local API fetch:', error);
        return null;
    }
}

// ============================================
// 2단계: 네이버 플레이스 비공식 GraphQL API
// ============================================

export async function fetchPlaceDetailGraphQL(placeId: string): Promise<Partial<PlaceInfo>> {
    try {
        const graphqlUrl = 'https://pcmap-api.place.naver.com/place/graphql';

        // 영업시간/메뉴/평점 등 부가정보 스니핑용 쿼리
        const query = `
      query getPlaces($id: String!) {
        places(input: { businessId: $id }) {
          items {
            businessName
            category
            description
            phone
            virtualPhone
            businessHours
            menus {
              name
              price
            }
            tags
            visitorReviewsTotal
            visitorReviewsScore
          }
        }
      }
    `;

        const body = JSON.stringify({
            operationName: 'getPlaces',
            variables: { id: placeId },
            query: query
        });

        const response = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
                'User-Agent': BROWSER_HEADERS['User-Agent'],
                'Referer': `https://pcmap.place.naver.com/restaurant/${placeId}/home`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Language': 'ko'
            },
            body: body,
            timeout: 5000
        });

        if (!response.ok) {
            console.warn(`[Crawler][Step2] GraphQL HTTP Status: ${response.status} -> Skipped`);
            return {};
        }

        const json = await response.json();

        if (json.errors || !json.data) {
            return {};
        }

        const p = json.data?.places?.items?.[0] || json.data?.restaurant || {};

        const info: Partial<PlaceInfo> = {};
        if (p.businessName || p.name) info.name = p.businessName || p.name;
        if (p.category) info.category = p.category;
        if (p.description || p.desc) info.description = p.description || p.desc;
        if (p.phone || p.virtualPhone) info.phone = p.phone || p.virtualPhone;
        if (p.businessHours) info.businessHours = p.businessHours;
        if (p.tags) info.tags = p.tags;
        if (p.visitorReviewsTotal !== undefined) info.reviewCount = p.visitorReviewsTotal;
        if (p.visitorReviewsScore !== undefined) info.reviewScore = p.visitorReviewsScore;

        if (p.menus && Array.isArray(p.menus)) {
            info.menuItems = p.menus.map((m: any) => ({
                name: m.name,
                price: typeof m.price === 'string' ? m.price : String(m.price || '')
            }));
        }

        return info;
    } catch (error) {
        console.warn('[Crawler][Step2] GraphQL Request Skipped due to error');
        return {}; // 서버 크래시 방지
    }
}

// ============================================
// 메인 크롤링 오케스트레이터
// ============================================

export async function crawlNaverPlace(url: string): Promise<CrawlResult> {
    console.log('[Crawler] Starting 2-Step API Crawler. Target URL:', url);

    const placeId = extractPlaceId(url);
    if (!placeId) {
        return { success: false, error: 'INVALID_URL' };
    }
    if (placeId === 'SHORT_URL') {
        return { success: false, error: 'SHORT_URL_NOT_SUPPORTED' }; // 네이버 단축 URL은 백엔드 Redirect 이후 넘겨야 함
    }

    // 데이터 합성을 위한 빈 객체
    const mergedData: PlaceInfo = {
        name: '',
        category: '',
        description: '',
        address: '',
        roadAddress: '',
        phone: '',
        businessHours: '',
        imageUrls: [],
        menuItems: [],
        tags: [],
        reviewCount: 0,
        reviewScore: 0,
        x: '',
        y: ''
    };

    try {
        // ---------------------------------------------------------
        // 단계 1: 네이버 지역 검색 API 
        // (차단 위험이 없으며 Vercel 서버에서 즉시 작동을 보장)
        // ---------------------------------------------------------
        console.log('[Crawler] Step 1: Attempting Local Search API');
        const queryName = await extractPlaceName(url, placeId);

        let step1Data: Partial<PlaceInfo> | null = null;
        if (queryName) {
            step1Data = await fetchNaverLocalAPI(queryName, placeId);
        }

        if (step1Data) {
            console.log('[Crawler] Step 1 Success:', step1Data.name);
            Object.assign(mergedData, step1Data);
        }

        // ---------------------------------------------------------
        // 단계 2: 네이버 GraphQL 조회
        // (메뉴, 영업시간, 평점 등을 보충하기 위함, 실패해도 멈추지 않음)
        // ---------------------------------------------------------
        console.log('[Crawler] Step 2: Attempting GraphQL Detail API');
        const step2Data = await fetchPlaceDetailGraphQL(placeId);

        for (const [key, value] of Object.entries(step2Data)) {
            // 이미 1단계에서 들어온 값이 의미있으면 유지하고, 2단계에서 새롭게 얻은 배열(메뉴 등)이나 값만 병합
            if (value && (!mergedData[key as keyof PlaceInfo] || (Array.isArray(value) && value.length > 0))) {
                (mergedData as any)[key] = value;
            }
        }

        // ---------------------------------------------------------
        // 최종 검증 및 결합
        // ---------------------------------------------------------
        const hasBasicInfo = !!(mergedData.name && mergedData.address);
        // 메뉴 정보나 영업시간 등 부가 정보가 비어있다면 Manual Input 유도
        const lacksDetails = !mergedData.menuItems || mergedData.menuItems.length === 0 || !mergedData.businessHours;

        if (!hasBasicInfo) {
            console.warn('[Crawler] All steps failed to extract basic info. Falling back to manual input.');
            return {
                success: true,  // 폼으로 넘기기 위해 true 반환
                method: 'api_fallback',
                needsManualInput: true,
                partialData: mergedData
            };
        }

        return {
            success: true,
            method: "api_combo",
            data: mergedData,
            needsManualInput: lacksDetails, // 상세 정보 누락 시 입력 폼 등장
            partialData: lacksDetails ? mergedData : undefined // 입력 폼에 미리 채워넣을 값
        };

    } catch (error: any) {
        console.error('[Crawler] Fatal orchestration error. Recovering smoothly...', error);
        return {
            success: true,
            method: "error_fallback",
            needsManualInput: true,
            partialData: mergedData
        };
    }
}
