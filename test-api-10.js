async function test() {
    const url = "https://m.place.naver.com/place/1468165039/home"; // 에버그린
    console.log("API 호출 중: ", url);
    try {
        const res = await fetch("http://localhost:3000/api/place/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });
        const data = await res.json();
        console.log("매장명:", data.name);
        console.log("사진 개수:", data.photos?.length);
        if (data.photos) {
            data.photos.forEach((p, i) => console.log(`[${i + 1}] ${p}`));
        }
    } catch (e) {
        console.error("오류:", e.message);
    }
}

test();
