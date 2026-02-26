import { extractPlaceData } from './src/lib/place-crawler';

async function test() {
    const res = await extractPlaceData("https://m.place.naver.com/restaurant/1342365991/home"); // A real place (e.g., Some restaurant)
    console.log(JSON.stringify(res, null, 2));
}
test();
