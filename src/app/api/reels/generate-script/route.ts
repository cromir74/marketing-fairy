import { NextRequest, NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const { storeInfo, topic, style } = await request.json();

        if (!storeInfo) {
            return NextResponse.json({ error: "가게 정보가 필요합니다." }, { status: 400 });
        }

        const ai = getAI();

        const prompt = `당신은 15초 인스타그램 릴스용 짧은 문구를 만드는 전문가입니다.

[규칙]
- 총 3~5개의 짧은 문구를 생성 (각 문구는 슬라이드 1장에 대응)
- 각 문구는 최대 15자 이내 (한글 기준, 릴스 화면에 크게 보여야 함)
- 첫 번째 문구: 후킹 (질문 또는 강렬한 한 마디)
- 중간 문구: 핵심 정보 (메뉴명, 특징, 가격 등)
- 마지막 문구: CTA (방문 유도 또는 저장 유도)
- 광고 냄새 나는 표현 금지 (진부한 수식어 대신 생동감 있는 표현 사용)
- 업종(${storeInfo.category})에 맞는 톤 자동 적용

[가게 데이터]
가게명: ${storeInfo.name}
업종: ${storeInfo.category}
위치: ${storeInfo.location}
분위기: ${storeInfo.atmosphere}
대표 메뉴/서비스: ${storeInfo.mainProducts}
리뷰 키워드: ${storeInfo.reviewKeywords || "없음"}
릴스 주제: ${topic}
릴스 스타일: ${style}

[출력 형식]
반드시 아래와 같은 JSON 배열 형식으로만 응답해. duration 합계는 15초가 되어야 해.
[
  {"slide": 1, "text": "문구1", "duration": 3},
  {"slide": 2, "text": "문구2", "duration": 3},
  {"slide": 3, "text": "문구3", "duration": 3},
  {"slide": 4, "text": "문구4", "duration": 3},
  {"slide": 5, "text": "문구5", "duration": 3}
]`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", // Use stable model
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });

        let text = response.text || "[]";

        // Remove markdown code blocks if any
        if (text.includes('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const slides = JSON.parse(text);

        return NextResponse.json({ slides });
    } catch (error: any) {
        console.error("Reels Script Generation Error:", error);
        return NextResponse.json({ error: error.message || "스크립트 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
