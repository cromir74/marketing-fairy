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

export interface PlaceData extends Partial<PlaceInfo> {
    name: string;
    category: string;
    description: string;
    menus: string[];
    reviewKeywords: string[];
    photos: string[];
    rating?: number;
}

export interface CrawlResult {
    success: boolean;
    data: PlaceInfo | null;
    method: 'graphql' | 'mobile_web' | 'manual' | 'none';
    error?: string;
    needsManualInput?: boolean;
    partialData?: Partial<PlaceInfo>;
}

// ============================================
// 유틸리티
// ============================================
function extractPlaceId(url: string): string | null {
    const patterns = [
        /place\/(\d+)/,
        /\/restaurant\/(\d+)/,
        /\/cafe\/(\d+)/,
        /\/hairshop\/(\d+)/,
        /\/beauty\/(\d+)/,
        /\/hospital\/(\d+)/,
        /\/pharmacy\/(\d+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function getBusinessType(url: string): string {
    if (url.includes('/cafe/')) return 'cafe';
    if (url.includes('/hairshop/') || url.includes('/beauty/')) return 'hairshop';
    if (url.includes('/hospital/')) return 'hospital';
    return 'restaurant';
}

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
};

// ============================================
// 1단계: 모바일 웹 최적화 파싱
// ============================================
async function tryMobileWeb(placeId: string, businessType: string): Promise<CrawlResult> {
    console.log(`[Crawler][MobileWeb] Fetching place ${placeId}`);
    const url = `https://m.place.naver.com/${businessType}/${placeId}/home`;

    try {
        const response = await fetch(url, { headers: BROWSER_HEADERS });
        if (!response.ok) return { success: false, data: null, method: 'mobile_web', error: `HTTP_${response.status}` };

        const html = await response.text();
        let data: Partial<PlaceInfo> = {};

        // 1. JSON-LD 파싱 (가장 공식적이고 변하지 않음)
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch) {
            try {
                const jsonLd = JSON.parse(jsonLdMatch[1]);
                const main = Array.isArray(jsonLd) ? jsonLd[0] : jsonLd;
                data.name = main.name;
                data.address = main.address?.streetAddress;
                data.phone = main.telephone;
                data.description = main.description;
                data.imageUrls = main.image ? (Array.isArray(main.image) ? main.image : [main.image]) : [];
            } catch (e) { }
        }

        // 2. window.__APOLLO_STATE__ 파싱 (상세 정보 포함)
        const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?})(?:;|<\/script>)/);
        if (apolloMatch) {
            try {
                let jsonText = apolloMatch[1].trim();
                if (jsonText.endsWith(';')) jsonText = jsonText.slice(0, -1);
                const state = JSON.parse(jsonText);

                // 상점 정보를 담은 객체 찾기 (다양한 경로 시도)
                let p: any = null;

                // 경로 1: 직접적인 Place or BusinessBase 객체
                const placeKey = Object.keys(state).find(k => k.startsWith('Place:') || k.startsWith('BusinessBase:'));
                if (placeKey) p = state[placeKey];

                // 경로 2: ROOT_QUERY 내의 참조 확인
                if (!p && state.ROOT_QUERY) {
                    const detailKey = Object.keys(state.ROOT_QUERY).find(k => k.startsWith('placeDetail') || k.startsWith('place('));
                    if (detailKey) {
                        const ref = state.ROOT_QUERY[detailKey];
                        // { __ref: "Place:123" } 형태인 경우 해당 객체로 이동
                        if (ref && ref.__ref && state[ref.__ref]) {
                            p = state[ref.__ref];
                        } else {
                            p = ref;
                        }
                    }
                }

                if (p) {
                    data.name = data.name || p.name || p.title || p.bizName;
                    data.category = data.category || p.category || p.businessCategory || p.categoryName || '';
                    data.description = data.description || p.description || p.microReview || p.introduction || '';
                    data.address = data.address || p.address || p.fullAddress || p.roadAddress || p.newAddress;
                    data.roadAddress = data.roadAddress || p.roadAddress || p.commonAddress || '';
                    data.phone = data.phone || p.phone || p.virtualPhone || p.tel || p.phoneNo;
                    data.businessHours = data.businessHours || p.businessHours || p.hoursDescription || '';
                    data.tags = [...new Set([...(data.tags || []), ...(p.tags || []), ...(p.keywords || [])])];
                    data.reviewCount = data.reviewCount || p.visitorReviewCount || p.totalReviewCount || 0;
                    data.reviewScore = data.reviewScore || p.visitorReviewScore || 0;
                    data.x = String(data.x || p.x || p.longitude || '');
                    data.y = String(data.y || p.y || p.latitude || '');

                    if (p.imageUrls || p.images) {
                        const imgs = p.imageUrls || p.images?.map((i: any) => i.url || i);
                        data.imageUrls = [...new Set([...(data.imageUrls || []), ...imgs])];
                    }
                }

                // 메뉴 정보 (정규화된 Apollo Cache 대응)
                const menus = data.menuItems || [];
                for (const key of Object.keys(state)) {
                    if (key.startsWith('Menu:')) {
                        const m = state[key];
                        if (m.name && !menus.some(exist => exist.name === m.name)) {
                            menus.push({ name: m.name, price: String(m.price || m.priceValue || '') });
                        }
                    }
                }
                if (menus.length > 0) data.menuItems = menus;

            } catch (e: any) {
                console.warn('[Crawler][MobileWeb] Apollo parse error:', e.message);
            }
        }

        // 3. 최후의 수단: HTML 타이틀 및 메타태그에서 상호명이라도 추출
        if (!data.name) {
            const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
            if (titleMatch) {
                const title = titleMatch[1].replace(' : 네이버', '').replace('- 네이버 플레이스', '').trim();
                data.name = title;
            }
        }

        // 완성된 데이터 검증
        if (data.name) {
            console.log(`[Crawler][MobileWeb] Successfully extracted: ${data.name}`);
            return {
                success: true,
                method: 'mobile_web',
                data: {
                    name: data.name,
                    category: data.category || '',
                    description: data.description || '',
                    address: data.address || '',
                    roadAddress: data.roadAddress || '',
                    phone: data.phone || '',
                    businessHours: data.businessHours || '',
                    imageUrls: data.imageUrls || [],
                    menuItems: data.menuItems || [],
                    tags: [...new Set(data.tags || [])],
                    reviewCount: data.reviewCount || 0,
                    reviewScore: data.reviewScore || 0,
                    x: data.x || '',
                    y: data.y || '',
                }
            };
        }

        return { success: false, data: null, method: 'mobile_web', error: 'PARSING_FAILED', needsManualInput: true, partialData: data };
    } catch (error: any) {
        return { success: false, data: null, method: 'mobile_web', error: error.message };
    }
}

export async function extractPlaceData(url: string): Promise<PlaceData | null> {
    const r = await crawlNaverPlace(url);
    if (r.success && r.data) {
        return {
            name: r.data.name, category: r.data.category, description: r.data.description,
            address: r.data.address, phone: r.data.phone, businessHours: r.data.businessHours,
            rating: r.data.reviewScore, photos: r.data.imageUrls,
            menus: r.data.menuItems.map(m => `${m.name} (${m.price})`), reviewKeywords: r.data.tags
        };
    }
    return null;
}

export async function crawlNaverPlace(url: string): Promise<CrawlResult> {
    const id = extractPlaceId(url);
    if (!id) return { success: false, data: null, method: 'none', error: 'INVALID_URL', needsManualInput: true };

    const type = getBusinessType(url);
    return await tryMobileWeb(id, type);
}
