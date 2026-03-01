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

async function test() {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const html = await fetch('https://m.place.naver.com/restaurant/1826027582/home', {
        headers: BROWSER_HEADERS
    }).then(r => r.text());

    // Find apollo state
    const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});\s*<\/script>/) ||
        html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});/);
    if (!match) return console.log('No apollo state detected.');

    const obj = JSON.parse(match[1]);
    const keys = Array.from(new Set(Object.values(obj).map(v => v.__typename)));
    console.log("ALL Typenames:", keys);
}
test().catch(console.error);
