export interface PlaceData {
    name: string;
    category: string;
    description: string;
    menus: string[];
    reviewKeywords: string[];
    photos: string[];
    phone?: string;
    address?: string;
    businessHours?: string;
    rating?: number;
}

export async function extractPlaceData(url: string): Promise<PlaceData | null> {
    let targetUrl = url;

    // 1. 단축 URL (naver.me) 해결
    if (url.includes("naver.me")) {
        try {
            console.log(`[Crawler] Resolving short URL: ${url}`);
            const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
            targetUrl = res.url;
            console.log(`[Crawler] Resolved to: ${targetUrl}`);
        } catch (e) {
            console.error("[Crawler] URL Resolution failed", e);
        }
    }

    // 2. 모바일 URL로 변환 (모바일 페이지가 데이터 추출이 더 용이함)
    let mobileUrl = targetUrl;
    const placeIdMatch = targetUrl.match(/place\/(\d+)/);
    if (placeIdMatch && placeIdMatch[1]) {
        mobileUrl = `https://m.place.naver.com/place/${placeIdMatch[1]}/home`;
    } else {
        mobileUrl = targetUrl.replace("map.naver.com", "m.place.naver.com");
        if (!mobileUrl.includes("m.place.naver.com")) {
            // 기타 형태 대응
            if (mobileUrl.includes("naver.com") && !mobileUrl.includes("m.place")) {
                // 특정 파라미터나 경로 처리 로직 추가 가능
            }
        }
    }

    let browser;
    try {
        const puppeteer = (await import("puppeteer")).default;
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1");

        let name = "";
        let category = "";
        let description = "";
        let menus: string[] = [];
        let reviewKeywords: string[] = [];
        let phone = "";
        let address = "";
        let businessHours = "";
        let rating = 0;

        // JSON 응답 가로채기 강화
        page.on("response", async (response) => {
            const resUrl = response.url();
            const status = response.status();
            const contentType = response.headers()["content-type"] || "";

            if (status === 200 && contentType.includes("json") &&
                (resUrl.includes("graphql") || resUrl.includes("api/search/allSearch") || resUrl.includes("place-site") || resUrl.includes("gateway"))) {
                try {
                    const json = await response.json();
                    const jsonArray = Array.isArray(json) ? json : [json];

                    for (const item of jsonArray) {
                        // GraphQL 응답 구조 대응
                        const data = item?.data || item;

                        // 1. 기본 정보 추출
                        const business = data.business || data.root?.place || data.place;
                        if (business) {
                            if (!name && business.name) name = business.name;
                            if (!category && business.category) category = business.category;
                            if (!description && business.description) description = business.description;
                            if (!phone && (business.phone || business.tel)) phone = business.phone || business.tel;
                            if (!address && (business.roadAddress || business.address)) address = business.roadAddress || business.address;
                            if (!businessHours && business.bizHourInfo) businessHours = business.bizHourInfo;
                            if (!rating && business.visitorReviewScore) rating = parseFloat(business.visitorReviewScore);
                        }

                        // 2. 메뉴 정보
                        const analysisMenus = data.visitorReviewStats?.analysis?.menus || data.menuInfo?.menus;
                        if (analysisMenus && Array.isArray(analysisMenus) && menus.length === 0) {
                            menus = analysisMenus.map((m: any) => m.label || m.name || m.menu).filter(Boolean).slice(0, 5);
                        }

                        // 3. 리뷰 키워드
                        const themes = data.visitorReviewStats?.analysis?.themes || data.visitorReviewStats?.tells;
                        if (themes && Array.isArray(themes) && reviewKeywords.length === 0) {
                            reviewKeywords = themes.map((t: any) => t.label || t.item?.name || t.text).filter(Boolean).slice(0, 8);
                        }
                    }
                } catch (e) { }
            }
        });

        // 타임아웃 넉넉히 설정
        await page.goto(mobileUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(err => {
            console.log("[Crawler] Navigation timeout or error, continuing with fallback:", err.message);
        });

        // 추가 렌더링 대기
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // DOM 기반 백업 추출 (셀렉터 업데이트)
        const domData = await page.evaluate(async () => {
            const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            // 이름 셀렉터 (네이버 플레이스 모바일 최신 기준)
            let n = document.querySelector(".Fc96A, .G_678, ._3X_z6, h1")?.textContent?.trim() || "";

            // 업종/카테고리
            let c = document.querySelector(".DJJvD, ._3ocDE, .Y_G_X, .lnJFt")?.textContent?.trim() || "";

            // 주소
            const addrEl = document.querySelector(".pz7wy, .LDgIH, .IHacz, .xbdPI");
            const addr = addrEl ? addrEl.textContent?.trim() : "";

            // 전화번호
            const telEl = document.querySelector('a[href^="tel:"]');
            const tel = telEl ? telEl.getAttribute('href')?.replace('tel:', '') : "";

            // 영업시간
            let hours = "";
            const timeEl = document.querySelector(".w9QyJ, ._2Ry6s, time");
            if (timeEl) {
                hours = timeEl.textContent?.trim() || "";
            }

            // 설명
            const d = document.querySelector(".Z0_tG, ._1M_6r, ._3Hy_A")?.textContent?.trim() || "";

            return { name: n, category: c, description: d, address: addr, phone: tel, businessHours: hours };
        });

        if (!name || name === "네이버 플레이스") name = domData.name || "";
        if (!category) category = domData.category || "";
        if (!description) description = domData.description || "";
        if (!address) address = domData.address || "";
        if (!phone) phone = domData.phone || "";
        if (!businessHours) businessHours = domData.businessHours || "";

        // 최종 매장명 백업 (Page Title)
        if (!name || name === "네이버 플레이스" || name === "매장명 확인 불가") {
            const pageTitle = await page.title();
            if (pageTitle && !pageTitle.includes("네이버 지도") && !pageTitle.includes("네이버 플레이스")) {
                name = pageTitle.split(":")[0].trim();
            } else if (pageTitle) {
                name = pageTitle.replace(" - 네이버 플레이스", "").trim();
            }
        }

        return {
            name: name || "매장명 확인 불가",
            category: category || "",
            description: description || "",
            menus: menus.length > 0 ? menus : ["메뉴 정보 없음"],
            reviewKeywords: reviewKeywords.length > 0 ? reviewKeywords : ["검색된 키워드 없음"],
            photos: [],
            phone: phone || "",
            address: address || "",
            businessHours: businessHours || "",
            rating: rating || 0
        };
    } catch (error) {
        console.error("Place extraction error:", error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * 네이버 이미지 URL을 고화질(f800_800)로 변환
 */
function optimizeImageUrl(url: string): string {
    if (!url) return url;
    if (url.includes("search.pstatic.net")) {
        // f800_800 대신 가장 범용적인 고화질 파라미터인 w800 (가로 800px) 사용
        if (url.includes("?type=") || url.includes("&type=")) {
            return url.replace(/type=[^&]*/, "type=w800");
        }
        return url + (url.includes("?") ? "&type=w800" : "?type=w800");
    }
    return url;
}
