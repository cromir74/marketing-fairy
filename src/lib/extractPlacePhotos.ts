export async function extractPlacePhotos(url: string): Promise<string[]> {
    // URL에서 플레이스 ID 추출
    const placeIdMatch = url.match(/place\/(\d+)/);
    if (!placeIdMatch || !placeIdMatch[1]) {
        console.error("플레이스 ID를 추출할 수 없습니다.");
        return [];
    }

    const placeId = placeIdMatch[1];
    const photoUrl = `https://m.place.naver.com/restaurant/${placeId}/photo`;

    let browser;
    try {
        const puppeteer = (await import("puppeteer")).default;
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        );
        await page.setViewport({ width: 390, height: 844 });

        // 사진 탭으로 이동
        await page.goto(photoUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {
            console.log("사진 페이지 로딩 타임아웃 (추출 계속 진행)");
        });

        // 이미지 로딩 대기
        await new Promise((r) => setTimeout(r, 3000));

        // 1차 시도: img 태그에서 가게 사진 추출
        let photos = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll("img"));
            return imgs
                .map((img) => img.src || img.getAttribute("data-src") || "")
                .filter((src) => {
                    if (!src || src.length < 50) return false;
                    // 네이버 가게 사진 도메인만 허용
                    const allowedDomains = [
                        "phinf.pstatic.net",
                        "ldb-phinf",
                        "naverbooking-phinf",
                        "search.pstatic.net/common",
                        "mp-seoul-image-search",
                    ];
                    const blocked = ["icon", "logo", "profile", "sprite", "flag", "badge"];
                    const hasAllowed = allowedDomains.some((d) => src.includes(d));
                    const hasBlocked = blocked.some((b) => src.includes(b));
                    return hasAllowed && !hasBlocked;
                })
                .map((src) => {
                    // 썸네일 → 고화질(640x640)로 변환
                    if (src.includes("?type=")) {
                        return src.replace(/\?type=.*$/, "?type=f640_640");
                    }
                    return src + "?type=f640_640";
                })
                .filter((src, i, arr) => arr.indexOf(src) === i) // 중복 제거
                .slice(0, 10);
        });

        // 2차 시도: 사진이 없으면 스크롤 후 재시도
        if (photos.length === 0) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise((r) => setTimeout(r, 2000));

            photos = await page.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll("img"));
                return imgs
                    .map((img) => img.src || img.getAttribute("data-src") || "")
                    .filter((src) => {
                        if (!src || src.length < 50) return false;
                        const allowedDomains = [
                            "phinf.pstatic.net",
                            "ldb-phinf",
                            "naverbooking-phinf",
                            "search.pstatic.net/common",
                        ];
                        const blocked = ["icon", "logo", "profile", "sprite"];
                        return (
                            allowedDomains.some((d) => src.includes(d)) &&
                            !blocked.some((b) => src.includes(b))
                        );
                    })
                    .map((src) => {
                        if (src.includes("?type=")) {
                            return src.replace(/\?type=.*$/, "?type=f640_640");
                        }
                        return src + "?type=f640_640";
                    })
                    .filter((src, i, arr) => arr.indexOf(src) === i)
                    .slice(0, 10);
            });
        }

        // 3차 시도: 홈 페이지 대표 사진에서라도 가져오기
        if (photos.length === 0) {
            const homeUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
            await page.goto(homeUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => { });
            await new Promise((r) => setTimeout(r, 3000));

            photos = await page.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll("img"));
                return imgs
                    .map((img) => img.src || img.getAttribute("data-src") || "")
                    .filter((src) => {
                        if (!src || src.length < 50) return false;
                        return (
                            (src.includes("phinf.pstatic.net") || src.includes("ldb-phinf")) &&
                            !src.includes("icon") &&
                            !src.includes("logo") &&
                            !src.includes("profile")
                        );
                    })
                    .map((src) => {
                        if (src.includes("?type=")) {
                            return src.replace(/\?type=.*$/, "?type=f640_640");
                        }
                        return src + "?type=f640_640";
                    })
                    .filter((src, i, arr) => arr.indexOf(src) === i)
                    .slice(0, 10);
            });
        }

        console.log(`[사진 크롤링] ${photos.length}장 수집 완료`);
        return photos;
    } catch (error) {
        console.error("Photo extraction error:", error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}
