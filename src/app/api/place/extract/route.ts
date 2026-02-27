import { NextResponse } from "next/server";
import { crawlNaverPlace } from "@/lib/place-crawler";

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url || !url.includes("naver.com") && !url.includes("naver.me")) {
            return NextResponse.json({ error: "올바른 네이버 플레이스 URL이 아닙니다." }, { status: 400 });
        }

        console.log(`[Store API] Received request for URL: ${url}`);
        const result = await crawlNaverPlace(url);

        if (!result.success && !result.needsManualInput) {
            console.error(`[Store API] Extraction failed completely for URL: ${url}`);
            return NextResponse.json({ error: "매장 정보를 추출할 수 없습니다. URL을 확인해 주세요." }, { status: 404 });
        }

        if (result.success) {
            console.log(`[Store API] Successfully extracted data for: ${result.data?.name} via ${result.method}`);
            return NextResponse.json(result.data);
        } else {
            console.warn(`[Store API] Falling back to manual input for: ${url}`);
            return NextResponse.json({
                needsManualInput: true,
                partialData: result.partialData,
                error: result.error
            });
        }
    } catch (error) {
        console.error("Place API route error:", error);
        return NextResponse.json({ error: "내부 서버 오류가 발생했습니다." }, { status: 500 });
    }
}
