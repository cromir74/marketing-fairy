require('dotenv').config({ path: '.env.local' });
const { crawlNaverPlace } = require('./src/lib/place-crawler');

// Override fetch globally to log graphql? No, we just want to see Apollo state extraction.
async function test() {
    const fetch = require('node-fetch');
    const html = await fetch('https://m.place.naver.com/restaurant/1826027582/home', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36' }
    }).then((r: any) => r.text());

    // We can't access extractFromApolloState because it's private, but we can do it manually.
    const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});\s*<\/script>/);
    if (!match) return console.log('No apollo state');
    const obj = JSON.parse(match[1]);
    const place = Object.values(obj).find((v: any) => v.name && v.category) as any;
    console.log("Found place?", place ? { name: place.name, category: place.category } : "No");

    // test deepSearchByTypename
    console.log("Keys:", Array.from(new Set(Object.values(obj).map((v: any) => v.__typename))));
}
test().catch(console.error);
