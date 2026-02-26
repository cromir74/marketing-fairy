const puppeteer = require('puppeteer');

async function extractPlaceData(url) {
    let mobileUrl = url;
    const placeIdMatch = url.match(/place\/(\d+)/);
    let placeId = "";
    if (placeIdMatch && placeIdMatch[1]) {
        placeId = placeIdMatch[1];
        mobileUrl = `https://m.place.naver.com/place/${placeId}/home`;
    }

    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1");

        let photos = [];

        await page.goto(mobileUrl, { waitUntil: "domcontentloaded" });
        await new Promise(r => setTimeout(r, 2000));

        const photoUrl = mobileUrl.replace(/\/home$/, "/photo") + "?filterType=업체";
        console.log(`[테스트] 업체 사진 탭 이동: ${photoUrl}`);

        await page.goto(photoUrl, { waitUntil: "networkidle2" }).catch(() => { });
        await new Promise(r => setTimeout(r, 2000));

        await page.evaluate(async () => {
            window.scrollBy(0, 1000);
            await new Promise(r => setTimeout(r, 500));
        });

        photos = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll("img"));
            const allowedDomains = ["phinf.pstatic.net", "ldb-phinf", "search.pstatic.net"];

            return imgs
                .map((img) => img.src || img.getAttribute("data-src") || "")
                .filter((src) => {
                    if (!src || src.length < 30) return false;
                    const isAllowed = allowedDomains.some(d => src.includes(d));
                    const isBlocked = ["icon", "logo", "profile"].some(b => src.toLowerCase().includes(b));
                    return isAllowed && !isBlocked;
                })
                .map(src => src.includes("?type=") ? src.replace(/\?type=.*$/, "?type=f640_640") : src + "?type=f640_640")
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 10);
        });

        return photos;
    } finally {
        await browser.close();
    }
}

const url = "https://map.naver.com/p/search/%EC%9D%B8%EB%8D%95%EC%9B%90%20%EB%A7%9B%EC%A7%91/place/19862060";
extractPlaceData(url).then(p => {
    console.log("업체 사진 수집 결과:", p.length, "장");
    p.forEach((src, i) => console.log(`${i + 1}: ${src}`));
});
