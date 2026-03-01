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
    // UI 호환성을 위한 필드
    reviewKeywords: string[];
    menus: string[];
    photos: string[];
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
        } as any);
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
        } as any);

        if (!response.ok) {
            console.warn(`[Crawler][Step1] Naver API Error: ${response.status}`);
            return null;
        }

        const data = await response.json() as any;
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
            keywords {
              name
            }
            visitorReviewCount
            visitorReviewScore
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
        } as any);

        if (!response.ok) {
            console.warn(`[Crawler][Step2] GraphQL HTTP Status: ${response.status} -> Skipped`);
            return {};
        }

        const json = await response.json() as any;

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
        if (p.visitorReviewCount !== undefined) info.reviewCount = p.visitorReviewCount;
        if (p.visitorReviewScore !== undefined) info.reviewScore = p.visitorReviewScore;

        const baseTags = Array.isArray(p.tags) ? p.tags : [];
        const kds = Array.isArray(p.keywords) ? p.keywords : [];
        const keywordTags = kds.map((k: any) => k.name).filter(Boolean);
        info.tags = Array.from(new Set([...baseTags, ...keywordTags]));

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

// Helper: Deep search for objects by typename in Apollo state
function deepSearchByTypename(obj: any, typename: string, results: any[] = []) {
    if (!obj || typeof obj !== 'object') return results;

    if (obj.__typename === typename) {
        results.push(obj);
    }

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            if (val && typeof val === 'object') {
                deepSearchByTypename(val, typename, results);
            }
        }
    }
    return results;
}

// 1-4. HTML에서 Apollo State 추출 및 파싱
async function extractFromApolloState(html: string): Promise<Partial<PlaceInfo> | null> {
    try {
        const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});\s*<\/script>/) ||
            html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});\n/) ||
            html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});/);

        if (!match) return null;

        const apollo = JSON.parse(match[1]);
        const info: Partial<PlaceInfo> = {};

        // 1. 기본 정보 (Place, Restaurant 등 다양한 타입이 가능하므로 필드 기반 검색 추가)
        let place = Object.values(apollo).find((v: any) => v.__typename === 'PlaceDetailBase' || v.__typename === 'Place' || v.__typename === 'Restaurant') as any;
        if (!place) {
            place = Object.values(apollo).find((v: any) => v.name && (v.address || v.roadAddress)) as any;
        }

        if (place) {
            info.name = place.name;
            info.address = place.address || place.roadAddress || '';
            info.roadAddress = place.roadAddress || place.address || '';
            info.phone = place.phone || place.virtualPhone;
            info.category = place.category;
            info.description = place.description;
            info.reviewCount = place.visitorReviewsTotal || 0;
            info.reviewScore = place.visitorReviewsScore || 0;
            info.tags = place.tags || [];

            // 추가 키워드 탐색 (분위기/서비스 관련)
            const placeKeywords = deepSearchByTypename(apollo, 'PlaceReviewKeyword');
            const visitorKeywords = deepSearchByTypename(apollo, 'VisitorReviewKeyword');
            const otherKeywords = deepSearchByTypename(apollo, 'ReviewKeywordItem') || deepSearchByTypename(apollo, 'Keyword');

            // GraphQL / Apollo 상태에서 테마나 키워드 항목이 label 또는 item.name, text 등의 필드에 나뉨
            const allKeywords = [...placeKeywords, ...visitorKeywords, ...otherKeywords]
                .map(k => k.name || k.keyword || k.text || k.label || k.item?.name)
                .filter(Boolean)
                .filter(k => typeof k === 'string'); // 객체 제외 필터링

            // visitorReviewStats의 tell/theme 구조가 Apollo State root에 있을 수 있음
            const reviewStats = Object.values(apollo).filter((v: any) => v.tells || (v.analysis && v.analysis.themes));
            reviewStats.forEach((stat: any) => {
                const tells = stat.tells || [];
                tells.forEach((t: any) => {
                    const kv = t.item?.name || t.text || t.label;
                    if (kv) allKeywords.push(kv);
                });
                const themes = stat.analysis?.themes || [];
                themes.forEach((t: any) => {
                    const kv = t.label || t.item?.name || t.text;
                    if (kv) allKeywords.push(kv);
                });
            });

            if (allKeywords.length > 0) {
                info.tags = Array.from(new Set([...(info.tags || []), ...allKeywords]));
            }

            if (place.coordinate) {
                info.x = place.coordinate.x;
                info.y = place.coordinate.y;
            }
        }

        // 2. 영업 시간 (Recursive Search)
        const workingHours = [...deepSearchByTypename(apollo, 'WorkingHoursInfo'), ...deepSearchByTypename(apollo, 'BizHour')];
        if (workingHours.length > 0) {
            info.businessHours = workingHours.map(h => {
                const day = h.day || h.dayName || '';
                const start = h.businessHours?.start || h.startTime || '';
                const end = h.businessHours?.end || h.endTime || '';
                const breakTime = (h.breakHours && h.breakHours[0]) ? ` (브레이크 ${h.breakHours[0].start}~${h.breakHours[0].end})` : '';
                return `${day}: ${start}~${end}${breakTime}`;
            }).filter(s => s.length > 5).join('\n');
        }

        // 3. 메뉴 (Recursive Search)
        const menus = [...deepSearchByTypename(apollo, 'Menu'), ...deepSearchByTypename(apollo, 'MenuItem'), ...deepSearchByTypename(apollo, 'PlaceMenuItem')];
        if (menus.length > 0) {
            // ID 또는 이름 중복 제거
            const seen = new Set();
            info.menuItems = menus.filter(m => {
                const name = m.name || m.menuName;
                if (!name || seen.has(name)) return false;
                seen.add(name);
                return true;
            }).map(m => ({
                name: m.name || m.menuName,
                price: m.price || '',
                description: m.description || m.desc,
                imageUrl: m.images?.[0] || m.image || m.imageUrl
            }));
        }

        // 4. 이미지 (FsasReview 등에서 추출 가능하나 우선 메뉴/기본 이미지)
        const imageList = new Set<string>();
        if (place?.images) place.images.forEach((img: any) => imageList.add(img.url || img));
        menus.forEach(m => { if (m.images?.[0]) imageList.add(m.images[0]); });
        info.imageUrls = Array.from(imageList);

        return info;
    } catch (e) {
        console.warn('[Crawler] Apollo State parsing failed:', e);
        return null;
    }
}

// ============================================
// 메인 크롤링 오케스트레이터
// ============================================

export async function crawlNaverPlace(url: string): Promise<CrawlResult> {
    console.log('[Crawler] Starting Advanced API + State Crawler. Target URL:', url);

    const placeId = extractPlaceId(url);
    if (!placeId) {
        return { success: false, error: 'INVALID_URL' };
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
        y: '',
        reviewKeywords: [],
        menus: [],
        photos: []
    };

    try {
        // ---------------------------------------------------------
        // 단계 0: HTML 스크래핑 및 Apollo State 파싱 (가장 상세함)
        // ---------------------------------------------------------
        console.log('[Crawler] Step 0: Fetching HTML for State Extraction');
        const targetUrl = url.includes('m.place.naver.com') ? url : `https://m.place.naver.com/restaurant/${placeId}/home`;

        try {
            const res = await fetch(targetUrl, {
                headers: BROWSER_HEADERS,
                timeout: 8000
            } as any);
            const html = await res.text();
            const stateData = await extractFromApolloState(html);

            if (stateData) {
                console.log('[Crawler] Step 0 Success: Extracted from Apollo State');
                Object.assign(mergedData, stateData);
            }
        } catch (e) {
            console.warn('[Crawler] Step 0 Failed:', e);
        }

        // ---------------------------------------------------------
        // 단계 1: 네이버 지역 검색 API (정보 보완)
        // ---------------------------------------------------------
        if (!mergedData.name) {
            console.log('[Crawler] Step 1: Attempting Local Search API');
            const queryName = await extractPlaceName(url, placeId);
            if (queryName) {
                const step1Data = await fetchNaverLocalAPI(queryName, placeId);
                if (step1Data) {
                    console.log('[Crawler] Step 1 Success:', step1Data.name);
                    Object.assign(mergedData, step1Data);
                }
            }
        }

        // ---------------------------------------------------------
        // 단계 2: 네이버 GraphQL 조회 (최종 보완)
        // ---------------------------------------------------------
        if (!mergedData.businessHours || mergedData.menuItems.length === 0) {
            console.log('[Crawler] Step 2: Attempting GraphQL Detail API');
            const step2Data = await fetchPlaceDetailGraphQL(placeId);
            for (const [key, value] of Object.entries(step2Data)) {
                if (value && (!mergedData[key as keyof PlaceInfo] || (Array.isArray(value) && value.length === 0))) {
                    (mergedData as any)[key] = value;
                }
            }
        }

        // ---------------------------------------------------------
        // 최종 검증 및 결합
        // ---------------------------------------------------------
        const hasBasicInfo = !!(mergedData.name && (mergedData.address || mergedData.roadAddress));
        const lacksDetails = !mergedData.menuItems || mergedData.menuItems.length === 0 || !mergedData.businessHours;

        if (!hasBasicInfo) {
            console.warn('[Crawler] Failed to extract basic info.');
            return {
                success: true,
                method: 'fallback',
                needsManualInput: true,
                partialData: mergedData
            };
        }

        mergedData.reviewKeywords = mergedData.tags || [];
        mergedData.menus = mergedData.menuItems?.map(m => m.name) || [];
        mergedData.photos = mergedData.imageUrls || [];

        return {
            success: true,
            method: mergedData.businessHours ? "state_extraction" : "api_combo",
            data: mergedData,
            needsManualInput: lacksDetails,
            partialData: mergedData
        };

    } catch (error: any) {
        console.error('[Crawler] Fatal orchestration error:', error);
        return {
            success: true,
            method: "error_fallback",
            needsManualInput: true,
            partialData: mergedData
        };
    }
}

