import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
        return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
    }

    try {
        const response = await fetch(`https://api.json2video.com/v2/movies?project=${projectId}`, {
            method: "GET",
            headers: {
                "x-api-key": process.env.JSON2VIDEO_API_KEY || ""
            }
        });

        if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();

        const status = data.movie?.status === "done" ? "done" :
            data.movie?.status === "error" ? "error" : "rendering";
        const videoUrl = data.movie?.url || null;

        return NextResponse.json({
            status,
            videoUrl
        });
    } catch (error: any) {
        console.error("Reels Status Check Error:", error);
        return NextResponse.json({ error: "상태 확인 중 오류가 발생했습니다.", details: error.message }, { status: 500 });
    }
}
