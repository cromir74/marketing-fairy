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
    // 모바일 URL 혹은 PC URL 등 다양한 형태 대응 (고유 ID 추출)
    let mobileUrl = url;
    const placeIdMatch = url.match(/place\/(\d+)/);
    if (placeIdMatch && placeIdMatch[1]) {
        mobileUrl = `https://m.place.naver.com/place/${placeIdMatch[1]}/home`;
    } else {
        mobileUrl = url.replace("map.naver.com", "m.place.naver.com").replace("naver.me", "m.place.naver.com");
    }

    let browser;
    try {
        const puppeteer = (await import("puppeteer")).default;
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1");

        let name = "";
        let category = "";
        let description = "";
        let menus: string[] = [];
        let reviewKeywords: string[] = [];
        let phone = "";
        let address = "";
        let businessHours = "";
        let rating = 0;

        page.on("response", async (response) => {
            const resUrl = response.url();
            const status = response.status();
            const contentType = response.headers()["content-type"] || "";

            if (status === 200 && contentType.includes("json") && (resUrl.includes("graphql") || resUrl.includes("api/search/allSearch") || resUrl.includes("place-site"))) {
                try {
                    const json = await response.json();
                    const jsonArray = Array.isArray(json) ? json : [json];

                    for (const item of jsonArray) {
                        const data = item?.data;
                        if (!data) continue;

                        // 1. 기본 정보 (business)
                        if (data.business) {
                            if (!name && data.business.name) name = data.business.name;
                            if (!category && data.business.category) category = data.business.category;
                            if (!description && data.business.description) description = data.business.description;
                            if (!phone && data.business.phone) phone = data.business.phone;
                            if (!address && data.business.roadAddress) address = data.business.roadAddress;
                            if (!businessHours && data.business.bizHourInfo) businessHours = data.business.bizHourInfo;
                            if (!rating && data.business.visitorReviewScore) rating = parseFloat(data.business.visitorReviewScore);
                        }

                        // 2. 메뉴 정보 (analysis.menus 가 가장 정확함)
                        const analysisMenus = data.visitorReviewStats?.analysis?.menus;
                        if (analysisMenus && Array.isArray(analysisMenus) && menus.length === 0) {
                            menus = analysisMenus.map((m: any) => m.label).filter((t: any) => t).slice(0, 5);
                        }

                        // 구버전/백업 메뉴 정보
                        if (data.menuInfo?.menus && menus.length === 0) {
                            menus = data.menuInfo.menus.map((m: any) => m.name || m.menu || "").filter((t: any) => t).slice(0, 5);
                        }

                        // 3. 리뷰 키워드 (analysis.themes 가 정확함)
                        const themes = data.visitorReviewStats?.analysis?.themes;
                        if (themes && Array.isArray(themes) && reviewKeywords.length === 0) {
                            reviewKeywords = themes.map((t: any) => t.label).filter((v: any) => v).slice(0, 8);
                        }

                        // 구버전 리뷰 키워드 백업
                        if (data.visitorReviewStats?.tells && reviewKeywords.length === 0) {
                            reviewKeywords = data.visitorReviewStats.tells.map((t: any) => t.item?.name || t.text || "").filter((t: any) => t).slice(0, 8);
                        }
                    }

                    // allSearch API 응답 구조 대응
                    if (json && json.result && json.result.place) {
                        const place = json.result.place;
                        if (!name && place.name) name = place.name;
                        if (!category && place.category) category = place.category;
                        if (!description && place.description) description = place.description;
                        if (!phone && place.phone) phone = place.phone;
                        if (!address && place.roadAddress) address = place.roadAddress;

                        // rating logic for allSearch
                        if (!rating && place.rating) rating = parseFloat(place.rating);

                        if (place.menus && place.menus.length > 0 && menus.length === 0) {
                            if (Array.isArray(place.menus)) {
                                menus = place.menus.map((m: any) => m.name || m.menu || "").filter((t: string) => t).slice(0, 5);
                            } else if (typeof place.menus === 'string') {
                                menus = place.menus.split(',').map((m: string) => m.trim()).filter((t: string) => t).slice(0, 5);
                            }
                        }
                    }
                } catch (e) { }
            }
        });

        await page.goto(mobileUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {
            console.log("페이지 로딩 타임아웃 도달 (추출 계속 진행)");
        });

        // 데이터가 충분히 가로채질 때까지 잠시 대기
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // DOM 백업 추출 추가 (이름, 카테고리, 주소, 전화번호, 영업시간 등)
        const domData = await page.evaluate(async () => {
            const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            // 1. 이름
            let n = document.querySelector("h1")?.textContent?.trim() || "";
            if (!n || n === "네이버 플레이스" || n === "플레이스") {
                n = document.querySelector(".Fc96A, .G_678, ._3X_z6, .SP_09, ._3X_z6")?.textContent?.trim() || "";
            }

            // 2. 카테고리
            let c = document.querySelector(".DJJvD, ._3ocDE, .Y_G_X, ._279_U, .z79_U, .lnJFt")?.textContent?.trim() || "";

            // 3. 주소 (도로명 주소를 우선 순위로)
            const addrEl = document.querySelector(".pz7wy, a.PkgBl span, .LDgIH, .IHacz, .xbdPI");
            const addr = addrEl ? addrEl.textContent?.trim() : "";

            // 4. 전화번호
            const telEl = document.querySelector('a[href^="tel:"]');
            const tel = telEl ? telEl.getAttribute('href')?.replace('tel:', '') : "";

            // 5. 영업시간 (펼쳐보기 클릭 및 평일 시간 추출)
            let hours = "";
            const expandBtn = document.querySelector('a.gKP9i, a._2p67S, a.RMgN0') as HTMLElement;
            if (expandBtn) {
                if (expandBtn.getAttribute('aria-expanded') === 'false') {
                    expandBtn.click();
                    await wait(500); // 짧게 대기
                }

                // 평일(월~금) 중 하나를 찾아서 시간 추출
                const rows = Array.from(document.querySelectorAll('.w9QyJ, ._2Ry6s, ._2p67S ._2Ry6s'));
                const weekdayRow = rows.find(row => {
                    const day = row.querySelector('.i8cJw, ._3_3Sh')?.textContent || '';
                    return ['월', '화', '수', '목', '금'].some(d => day.includes(d));
                });

                if (weekdayRow) {
                    const timeEl = weekdayRow.querySelector('.H3ua4, ._2Ry6s');
                    if (timeEl) {
                        // 첫 줄(메인 시간)만 가져오기 (브레이크타임 제외)
                        hours = timeEl.textContent?.split('\n')[0].trim() || "";
                    }
                }

                // 여전히 없으면 버튼 텍스트라도
                if (!hours) hours = expandBtn.textContent?.trim() || "";
            }

            if (!hours) {
                const timeEl = document.querySelector('time');
                if (timeEl) {
                    hours = timeEl.parentElement?.textContent?.trim() || timeEl.textContent?.trim() || "";
                }
            }

            // 6. 설명
            const d = document.querySelector(".Z0_tG, ._1M_6r")?.textContent?.trim() || "";

            return { name: n, category: c, description: d, address: addr, phone: tel, businessHours: hours };
        });

        if (!name && domData.name && domData.name !== "네이버 플레이스") name = domData.name;
        if (!category) category = domData.category;
        if (!description) description = domData.description;
        if (!address) address = domData.address || "";
        if (!phone) phone = domData.phone || "";
        if (!businessHours) businessHours = domData.businessHours || "";

        // 여전히 이름이 없으면 타이틀에서 추출 시도
        if (!name || name === "매장명 확인 불가" || name === "네이버 플레이스") {
            const pageTitle = await page.title();
            if (pageTitle && pageTitle !== "네이버 플레이스") {
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
