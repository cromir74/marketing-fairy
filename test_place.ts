require('dotenv').config({ path: '.env.local' });
const { crawlNaverPlace } = require('./src/lib/place-crawler');

async function main() {
    console.log('Fetching place...');
    const result = await crawlNaverPlace('https://naver.me/xcJq4QpW');
    console.log(JSON.stringify(result.data, null, 2));
}

main().catch(console.error);
