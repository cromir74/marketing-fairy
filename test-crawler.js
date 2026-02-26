const tsx = require('tsx/cjs/api');
const path = require('path');

async function test() {
    const crawler = await import('./src/lib/place-crawler.ts');
    const res = await crawler.extractPlaceData("https://naver.me/5qA1x4i1"); // Just a random naver place or I'll use a valid one
    console.log(JSON.stringify(res, null, 2));
}
test();
