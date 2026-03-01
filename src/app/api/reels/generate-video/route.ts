import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const {
            slides,
            uploadedImageUrls,
            selectedBgmUrl,
            selectedFont,
            selectedTextColor
        } = await request.json();

        if (!slides || !uploadedImageUrls || slides.length === 0 || uploadedImageUrls.length === 0) {
            return NextResponse.json({ error: "슬라이드 텍스트와 이미지가 필요합니다." }, { status: 400 });
        }

        const json2videoPayload = {
            resolution: "custom",
            width: 1080,
            height: 1920,
            quality: "high",
            scenes: slides.map((slide: any, index: number) => ({
                background: {
                    type: "image",
                    src: uploadedImageUrls[index] || uploadedImageUrls[0] // Fallback to first image
                },
                elements: [
                    {
                        type: "text",
                        style: "001",
                        text: slide.text,
                        settings: {
                            "font-family": selectedFont || "Noto Sans KR",
                            "font-size": "70px",
                            "font-weight": "bold",
                            "color": selectedTextColor || "#FFFFFF",
                            "background-color": "rgba(0,0,0,0.5)",
                            "padding": "20",
                            "border-radius": "10",
                            "text-align": "center"
                        },
                        position: "bottom-center",
                        y: "75%",
                        duration: slide.duration || 3
                    }
                ],
                duration: slide.duration || 3
            })),
            elements: selectedBgmUrl ? [
                {
                    type: "audio",
                    src: selectedBgmUrl,
                    volume: 0.3,
                    duration: 15
                }
            ] : []
        };

        const response = await fetch("https://api.json2video.com/v2/movies", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.JSON2VIDEO_API_KEY || ""
            },
            body: JSON.stringify(json2videoPayload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`JSON2Video API Error: ${response.status} ${errBody}`);
        }

        const result = await response.json();
        const projectId = result.project;

        return NextResponse.json({ success: true, projectId });
    } catch (error: any) {
        console.error("Reels Video Generation Error:", error);
        return NextResponse.json({ error: error.message || "영상 생성 요청 중 오류가 발생했습니다." }, { status: 500 });
    }
}
