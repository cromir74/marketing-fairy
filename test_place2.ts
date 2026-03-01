require('dotenv').config({ path: '.env.local' });
const { crawlNaverPlace } = require('./src/lib/place-crawler');

async function main() {
    console.log('Fetching...');
    const result = await crawlNaverPlace('https://m.place.naver.com/restaurant/1826027582/home');
    console.log("Full Result:");
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
