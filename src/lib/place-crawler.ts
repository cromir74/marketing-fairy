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

import * as cheerio from 'cheerio';

export async function extractPlaceData(url: string): Promise<PlaceData | null> {
    let targetUrl = url;

    // 1. 단축 URL (naver.me) 해결
    if (url.includes("naver.me")) {
        try {
            console.log(`[Crawler] Resolving short URL: ${url}`);
            const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
            targetUrl = res.url;
            console.log(`[Crawler] Resolved to: ${targetUrl}`);
            if (!targetUrl.includes("place")) {
                console.warn("[Crawler] Resolved URL might be incorrect (no 'place' in URL)");
            }
        } catch (e: any) {
            console.error("[Crawler] URL Resolution failed", e.message);
        }
    }

    // 2. 모바일 URL로 변환 (모바일 페이지가 데이터 추출이 더 용이함)
    let mobileUrl = targetUrl;

    // URL에서 매장 ID 추출 시도 (다양한 패턴 대응)
    const placeIdMatch = targetUrl.match(/place\/(\d+)/) || targetUrl.match(/id=(\d+)/) || targetUrl.match(/\/(\d+)\//);

    if (placeIdMatch && placeIdMatch[1] && placeIdMatch[1].length >= 6) {
        mobileUrl = `https://m.place.naver.com/place/${placeIdMatch[1]}/home`;
        console.log(`[Crawler] Target ID identified: ${placeIdMatch[1]}`);
    } else {
        mobileUrl = targetUrl.replace("map.naver.com", "m.place.naver.com");
        if (!mobileUrl.includes("m.place.naver.com")) {
            // 주소가 변환되지 않았을 때 수동 보정
            if (mobileUrl.includes("map.naver.com/p/")) {
                const parts = mobileUrl.split("/");
                const id = parts.find(p => /^\d+$/.test(p));
                if (id) {
                    mobileUrl = `https://m.place.naver.com/place/${id}/home`;
                }
            }
        }
    }

    console.log(`[Crawler] Final Mobile URL: ${mobileUrl}`);

    // --- 1단계: Cheerio 기반 고밀도 데이터 추출 (브라우저 없이 소스 파싱) ---
    try {
        console.log("[Crawler] Starting high-performance Fetch/Cheerio extraction...");
        const res = await fetch(mobileUrl, {
            headers: {
                'User-Agent': "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        // 네이버 플레이스는 __INITIAL_STATE__ 스크립트 태그에 거의 모든 정보가 포함되어 있음
        const scripts = $('script').toArray();
        const stateScript = scripts.find(s => {
            const content = $(s).text() || "";
            return content.includes('__INITIAL_STATE__') || content.includes('__APOLLO_STATE__');
        });

        if (stateScript) {
            const stateText = $(stateScript).text() || "";
            // 정규식으로 JSON 추출 (여러 변수명 대응)
            const jsonMatch = stateText.match(/window\.__[A-Z0-9_]+_STATE__\s*=\s*({[\s\S]*?});/) ||
                stateText.match(/window\.__[A-Z0-9_]+_STATE__\s*=\s*({[\s\S]*})/);

            const jsonText = jsonMatch ? jsonMatch[1] : null;

            if (jsonText) {
                try {
                    const state = JSON.parse(jsonText);
                    // 1. __INITIAL_STATE__ 방식 (기존)
                    let place = state.place?.rootData?.place || state.place?.place || state.placeDetail?.rootData?.place;

                    // 2. __APOLLO_STATE__ 방식 (신규)
                    if (!place) {
                        const placeKey = Object.keys(state).find(k => k.startsWith('Place:')) ||
                            Object.keys(state).find(k => k.startsWith('BusinessBase:'));
                        if (placeKey) {
                            place = state[placeKey];
                            console.log(`[Crawler] Found data in Apollo state with key: ${placeKey}`);
                        }
                    }

                    if (place) {
                        console.log(`[Crawler] Successfully parsed state for: ${place.name || place.title}`);

                        // 상세 영업시간 조립
                        let bHours = "";
                        const bizHours = place.bizHour || place.businessHours?.bizHours || place.bizHourInfo;
                        if (Array.isArray(bizHours)) {
                            bHours = bizHours.map((h: any) => {
                                const day = h.day || h.type;
                                let time = h.businessTime || h.time || "";
                                if (h.breakTime) time += ` (브레이크타임 ${h.breakTime})`;
                                if (h.lastOrder) time += ` (라스트오더 ${h.lastOrder})`;
                                return `${day}: ${time}`;
                            }).join("\n");
                        } else if (typeof bizHours === 'string') {
                            bHours = bizHours;
                        }

                        // 메뉴/키워드 추출
                        const menus = (place.menuInfo?.menus || []).map((m: any) => m.name || m.label).slice(0, 5);
                        const keywords = (place.visitorReviewStats?.analysis?.themes || []).map((t: any) => t.label || t.text).slice(0, 8);

                        return {
                            name: place.name || place.title || "매장명 확인 불가",
                            category: place.category || place.categoryPath?.slice(-1)[0] || "업종 정보 없음",
                            description: place.description || "",
                            menus: menus.length > 0 ? menus : ["메뉴 정보 없음"],
                            reviewKeywords: keywords.length > 0 ? keywords : ["검색된 키워드 없음"],
                            photos: [],
                            phone: place.phone || place.tel || "",
                            address: place.roadAddress || place.address || "",
                            businessHours: bHours || place.bizHourInfo || "",
                            rating: place.visitorReviewScore || 0
                        };
                    }
                } catch (e: any) {
                    console.error("[Crawler] JSON Parsing failed", e.message);
                }
            }
        }
        console.log("[Crawler] Cheerio extraction couldn't find valid JSON state, falling back to Puppeteer...");
    } catch (e: any) {
        console.warn("[Crawler] Cheerio extraction failed, trying Puppeteer fallback...", e.message);
    }

    let browser;
    try {
        const puppeteer = (await import("puppeteer")).default;
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        if (browser) console.log("[Crawler] Browser launched successfully");
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
                            if (!name && business.name) {
                                name = business.name;
                                console.log(`[Crawler] Found name from API: ${name}`);
                            }
                            if (!category && business.category) category = business.category;
                            if (!description && business.description) description = business.description;
                            if (!phone && (business.phone || business.tel)) phone = business.phone || business.tel;
                            if (!address && (business.roadAddress || business.address)) address = business.roadAddress || business.address;
                            if (!businessHours && business.bizHourInfo) businessHours = business.bizHourInfo;
                            if (!rating && business.visitorReviewScore) rating = parseFloat(business.visitorReviewScore);
                        }

                        const analysisMenus = data.visitorReviewStats?.analysis?.menus || data.menuInfo?.menus;
                        if (analysisMenus && Array.isArray(analysisMenus) && menus.length === 0) {
                            menus = analysisMenus.map((m: any) => m.label || m.name || m.menu).filter(Boolean).slice(0, 5);
                            console.log(`[Crawler] Captured menus from API: ${menus.length} items`);
                        }

                        const themes = data.visitorReviewStats?.analysis?.themes || data.visitorReviewStats?.tells;
                        if (themes && Array.isArray(themes) && reviewKeywords.length === 0) {
                            reviewKeywords = themes.map((t: any) => t.label || t.item?.name || t.text).filter(Boolean).slice(0, 8);
                            console.log(`[Crawler] Captured keywords from API: ${reviewKeywords.length} items`);
                        }
                    }
                } catch (e) { }
            }
        });

        console.log(`[Crawler] Navigating to: ${mobileUrl}`);
        await page.goto(mobileUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(err => {
            console.log("[Crawler] Navigation timeout or error:", err.message);
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));

        // DOM 기반 백업 추출 (셀렉터 업데이트 - 2026.02 기준 최신화)
        const domData = await page.evaluate(async () => {
            // 1. 매장명
            let n = document.querySelector(".Fc96A, .G_678, ._3X_z6, ._3h98D, h1")?.textContent?.trim() || "";
            if (!n) {
                const headerName = document.querySelector('[role="heading"], .name_main')?.textContent?.trim();
                if (headerName) n = headerName;
            }

            // 2. 업종
            let c = document.querySelector(".DJJvD, ._3ocDE, .Y_G_X, .lnJFt, ._3it_H")?.textContent?.trim() || "";

            // 3. 주소
            const addrEl = document.querySelector(".pz7wy, .LDgIH, .IHacz, .xbdPI, .PkgBl, .v_address");
            const addr = addrEl ? addrEl.textContent?.replace("지도보기", "").replace("복사", "").trim() : "";

            // 4. 전화번호
            const telEl = document.querySelector('a[href^="tel:"], ._31_pX, .phone');
            const tel = telEl ? (telEl.getAttribute('href')?.replace('tel:', '') || telEl.textContent?.trim()) : "";

            // 5. 영업시간 상세 추출 (펼치기 시도)
            let hours = "";
            try {
                // 펼치기 버튼 찾기 (텍스트나 클래스 기반)
                const expandBtn = Array.from(document.querySelectorAll('a[role="button"], .gKP9i, .RMgN0')).find(el =>
                    el.textContent?.includes("영업시간") || el.textContent?.includes("영업 중") || el.querySelector('.U_7p7')
                ) as HTMLElement;

                if (expandBtn) {
                    expandBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 500)); // 렌더링 대기

                    // 펼쳐진 요일별 정보 수집
                    const hourRows = document.querySelectorAll('.gKP9i, .RMgN0, .v_business_hours_row');
                    const hourList: string[] = [];

                    hourRows.forEach(row => {
                        const day = row.querySelector('span')?.textContent?.trim();
                        // 시간 영역 내부의 각 줄(운영시간, 브레이크타임 등)을 분리하여 수집
                        const timeContainer = row.querySelector('div');
                        let timeText = "";
                        if (timeContainer) {
                            // 직접 텍스트뿐만 아니라 자식 요소들의 텍스트를 공백으로 구분하여 수집
                            const children = Array.from(timeContainer.childNodes);
                            timeText = children.map(node => node.textContent?.trim()).filter(t => t).join(" ");
                        } else {
                            timeText = row.querySelector('._1M_6r')?.textContent?.trim() || "";
                        }

                        // 요일이 1~2글자이거나 평일/주말 같은 경우만 수집 (불필요한 안내문구 제외)
                        if (day && timeText && (day.length <= 2 || ["평일", "주말"].includes(day))) {
                            // "접기" 문구가 포함된 경우 제거
                            let cleanTime = timeText.replace(/접기$/, "").trim();
                            // 브레이크타임, 라스트오더 앞에 줄바꿈 및 간격 추가 가능
                            cleanTime = cleanTime.replace(/(브레이크타임|라스트오더)/g, " ($1)");
                            hourList.push(`${day}: ${cleanTime}`);
                        }
                    });

                    if (hourList.length > 0) {
                        hours = hourList.join("\n");
                    }
                }
            } catch (e) { }

            // 펼치기 실패 시 혹은 정보 없을 시 요약 정보라도 수집
            if (!hours) {
                const timeEl = document.querySelector(".w9QyJ, ._2Ry6s, time, .gKP9i, .RMgN0");
                if (timeEl) hours = timeEl.textContent?.trim() || "";
            }

            // 6. 설명
            const d = document.querySelector(".Z0_tG, ._1M_6r, ._3Hy_A, ._2yqT0, .T88S9")?.textContent?.trim() || "";

            return { name: n, category: c, description: d, address: addr, phone: tel, businessHours: hours };
        });

        console.log("[Crawler] DOM Data extracted:", !!domData.name);

        if (!name || name === "네이버 플레이스") name = domData.name || "";
        if (!category) category = domData.category || "";
        if (!description) description = domData.description || "";
        if (!address) address = domData.address || "";
        if (!phone) phone = domData.phone || "";
        if (!businessHours) businessHours = domData.businessHours || "";

        // 최종 매장명 백업 (Page Title)
        if (!name || name === "네이버 플레이스" || name === "매장명 확인 불가") {
            const pageTitle = await page.title();
            console.log(`[Crawler] Extraction weak. Falling back to page title: ${pageTitle}`);
            if (pageTitle && !pageTitle.includes("네이버 지도") && !pageTitle.includes("네이버 플레이스")) {
                name = pageTitle.split(":")[0].trim();
            } else if (pageTitle) {
                name = pageTitle.replace(" - 네이버 플레이스", "").trim();
            }
        }

        console.log(`[Crawler] Final result: ${name}, ${category}`);

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
    } catch (error: any) {
        console.error("[Crawler] Fatal error during extraction:", error.message);

        // 브라우저 실행 실패 시 상세 정보를 위한 fetch fallback (Regex 기반 추출)
        try {
            console.log("[Crawler] Attempting robust fetch fallback...");
            const res = await fetch(mobileUrl, {
                headers: {
                    'User-Agent': "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
                }
            });
            const html = await res.text();

            // 1. 이름 추출
            const nameMatch = html.match(/<title>(.*?)<\/title>/) || html.match(/"name":"(.*?)"/) || html.match(/class="Fc96A">(.*?)<\/span>/);
            let fallbackName = nameMatch ? nameMatch[1].replace(" - 네이버 플레이스", "").split(":")[0].trim() : "";

            // 2. 업종 추출
            const categoryMatch = html.match(/"category":"(.*?)"/) || html.match(/class="DJJvD">(.*?)<\/span>/);
            const fallbackCategory = categoryMatch ? categoryMatch[1] : "";

            // 3. 주소 추출
            const addressMatch = html.match(/"address":"(.*?)"/) || html.match(/"roadAddress":"(.*?)"/);
            const fallbackAddress = addressMatch ? addressMatch[1] : "";

            // 4. 전화번호 추출
            const phoneMatch = html.match(/"phone":"(.*?)"/) || html.match(/"tel":"(.*?)"/);
            const fallbackPhone = phoneMatch ? phoneMatch[1] : "";

            if (fallbackName && fallbackName !== "네이버 플레이스" && fallbackName !== "네이버 지도") {
                console.log(`[Crawler] Fetch fallback successful: ${fallbackName}`);
                return {
                    name: fallbackName,
                    category: fallbackCategory || "업종 정보 없음",
                    description: "",
                    menus: ["메뉴 정보 없음"],
                    reviewKeywords: ["검색된 키워드 없음"],
                    photos: [],
                    phone: fallbackPhone || "",
                    address: fallbackAddress || "",
                    businessHours: "",
                    rating: 0
                };
            }
        } catch (e) {
            console.error("[Crawler] Fetch fallback also failed");
        }
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
