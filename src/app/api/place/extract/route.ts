import { NextResponse } from "next/server";
import { extractPlaceData } from "@/lib/place-crawler";

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url || !url.includes("naver.com") && !url.includes("naver.me")) {
            return NextResponse.json({ error: "올바른 네이버 플레이스 URL이 아닙니다." }, { status: 400 });
        }

        console.log(`[Store API] Received request for URL: ${url}`);
        const data = await extractPlaceData(url);

        if (!data) {
            console.error(`[Store API] Extraction failed for URL: ${url}`);
            return NextResponse.json({ error: "매장 정보를 추출할 수 없습니다. URL을 확인해 주세요." }, { status: 404 });
        }

        console.log(`[Store API] Successfully extracted data for: ${data.name}`);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Place API route error:", error);
        return NextResponse.json({ error: "내부 서버 오류가 발생했습니다." }, { status: 500 });
    }
}
