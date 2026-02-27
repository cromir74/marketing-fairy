import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { HOLIDAYS } from "@/lib/calendar-events";

let aiInstance: GoogleGenAI | null = null;
function getAI() {
    if (!aiInstance) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not defined in environment variables");
        }
        aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return aiInstance;
}

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = await req.json();
        const { year, month } = body;

        if (year === undefined || month === undefined) {
            return NextResponse.json({ error: "연도(year)와 월(month)이 필요합니다." }, { status: 400 });
        }

        // 1. 가게 정보 조회
        const { data: store } = await supabase
            .from("stores")
            .select("*")
            .eq("user_id", user.id)
            .single();

        const category = store?.category || "일반";
        const storeName = store?.name || "우리 매장";
        const mainProducts = store?.mainProducts || "";

        // 2. 최근 발행한 콘텐츠 이력 조회 (최대 10개)
        const { data: recentContents } = await supabase
            .from("contents")
            .select("topic, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

        const recentTopics = recentContents?.map(c => c.topic).join(", ") || "발행 이력 없음";

        // 3. 해당 월의 공휴일 목록 추출
        const targetHolidays: Record<number, string> = {};
        const monthPrefix = (month + 1).toString().padStart(2, '0');
        const lastDate = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= lastDate; day++) {
            const dateKey = `${monthPrefix}-${day.toString().padStart(2, '0')}`;
            if (HOLIDAYS[dateKey]) {
                targetHolidays[day] = HOLIDAYS[dateKey];
            }
        }

        // 4. Gemini API 호출
        const prompt = `당신은 센스 있는 소상공인 마케팅 전문가입니다.
다음 가게 정보를 바탕으로 ${year}년 ${month + 1}월(1일부터 ${lastDate}일까지)의 일별 마케팅(SNS/블로그) 주제를 추천해주세요.

[가게 정보]
- 가게명: ${storeName}
- 업종: ${category}
- 주요 메뉴/서비스: ${mainProducts}

[최근 발행한 주제 이력]
${recentTopics}
(최근 발행한 주제와 너무 비슷하거나 단조로운 주제는 피해주세요!)

[이번 달 주요 공휴일/기념일]
${Object.entries(targetHolidays).map(([day, name]) => `${day}일: ${name}`).join(", ") || "특별한 공휴일 없음"}

[요청 사항]
- 매일매일 다른 컨셉의 주제를 제안해주세요. (예: 메뉴 소개, 일상, 정보 제공, 이벤트, 감성 글 등 혼합)
- 공휴일/기념일이 있는 날은 반드시 해당 기념일과 가게 업종을 연관 지은 특별한 이벤트나 인사말 주제를 추천해주세요. (타입: "holiday")
- 평범한 날은 "season" 또는 "weekday" 타입으로 지정해주세요.
- 1일부터 ${lastDate}일까지 빠짐없이 날짜(day)별로 객체가 들어있는 JSON 배열만 딱 반환하세요.
- 각 객체는 다음 형식을 따르세요: { "day": 숫자, "topic": "추천 주제 내용 (구체적으로)", "type": "holiday" | "season" | "weekday" }
- 절대 다른 텍스트나 markdown 코드 블록(예: \`\`\`json)을 포함하지 말고 순수 JSON 배열만 출력하세요.`;

        console.log(`[Gemini API] Generating ${year}-${month + 1} calendar for ${storeName}...`);

        const response = await (getAI() as any).models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                temperature: 0.8,
            },
        });

        const responseText = response.text || "[]";
        let recommendations = [];
        try {
            recommendations = JSON.parse(responseText);
        } catch (e) {
            console.error("JSON Parsing Error:", responseText);
            return NextResponse.json({ error: "AI가 올바른 형식을 반환하지 않았습니다." }, { status: 500 });
        }

        // 각 항목에 UI에서 사용할 색상/아이콘 보정
        const formattedRecommendations = recommendations.map((r: any) => {
            let icon = '💡';
            let color = 'purple';
            if (r.type === 'holiday') {
                icon = '🎉';
                color = 'red';
            } else if (r.type === 'season') {
                icon = '📅';
                color = 'orange';
            }
            return {
                day: r.day,
                topic: r.topic || "우리 매장의 특별함 소개하기",
                type: r.type || "weekday",
                icon,
                color
            };
        });

        // 5. DB에 저장 (UPSERT)
        const { data, error } = await supabase
            .from("calendar_recommendations")
            .upsert({
                user_id: user.id,
                year,
                month,
                recommendations: formattedRecommendations,
                created_at: new Date().toISOString()
            }, { onConflict: "user_id, year, month" })
            .select()
            .single();

        if (error) {
            console.error("Database Upsert Error:", error);
            throw error;
        }

        return NextResponse.json({ success: true, data: formattedRecommendations });

    } catch (error: any) {
        console.error("Calendar Generation API Error:", error);
        return NextResponse.json(
            { error: error.message || "캘린더 생성 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
