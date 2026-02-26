import { extractPlaceData } from './src/lib/place-crawler';

async function test() {
    const url = "https://m.place.naver.com/place/1468165039/home"; // 에버그린
    console.log("시작: ", url);
    const data = await extractPlaceData(url);
    if (data) {
        console.log("매장명:", data.name);
        console.log("사진 개수:", data.photos.length);
        data.photos.forEach((p, i) => console.log(`[${i + 1}] ${p}`));
    } else {
        console.log("데이터 추출 실패");
    }
}

test();
