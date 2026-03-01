import { GoogleGenAI } from "@google/genai";

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

// ── 마케팅 콘텐츠 생성 ──
export async function generateMarketingContent(
    storeInfo: {
        name: string;
        category: string;
        location: string;
        atmosphere: string;
        mainProducts: string;
        tone: string;
    },
    platform: "instagram" | "threads",
    topic: string,
    images?: { base64: string, mimeType: string }[],
    context?: {
        weather?: string;
        dayOfWeek?: string;
        timeContext?: string;
        targetPersona?: string;
    }
) {
    const toneMap: Record<string, string> = {
        friendly: "해요체(~해요, ~하네요)를 사용하여 이웃집 사장님처럼 친근하고 다정하게 말해주세요.",
        professional: "하십시오체(~합니다, ~입니다)를 쓰되, 딱딱한 로봇 같지 않은 신뢰감 있고 정중한 전문가의 어조를 유지하세요.",
        cute: "아기자기하고 발랄한 느낌으로, 이모지와 '~요!', '~죠~' 같은 생동감 있는 종결 어미를 풍부하게 사용하세요.",
        trendy: "요즘 유행하는 트렌디한 감성을 담아, 간결하고 임팩트 있는 문장을 사용하세요. (MZ세대 타겟)",
        warm: "감성적이고 따뜻한 단어를 풍부하게 사용하여, 읽는 사람의 마음을 녹이는 차분한 어조로 작성하세요.",
    };

    const categoryPersona: Record<string, string> = {
        cafe: "원두 향기 가득한 공간에서 행복을 만드는 카페 사장님",
        restaurant: "정성 어린 손맛으로 건강한 한 끼를 대접하는 요리사 사장님",
        beauty: "고객님의 숨겨진 아름다움을 찾아드리는 뷰티 전문가 원장님",
        fitness: "여러분의 건강한 변화를 위해 땀 흘리며 에너지를 나누는 코치님",
        academy: "아이들의 성장을 진심으로 기뻐하며 미래를 함께 고민하는 선생님",
        pet: "반려동물을 가족처럼 사랑하며 행복한 일상을 돕는 친구 같은 사장님",
        flower: "향기로운 꽃으로 일상의 특별한 순간을 디자인하는 플로리스트 사장님",
        other: "고객님의 불편을 해결하며 정성을 다해 서비스를 제공하는 사장님",
    };

    const platformGuide = {
        instagram: `인스타그램 게시글을 작성해줘.
- 첫 문장은 반드시 사람들의 궁금증을 자극하는 강렬한 '후킹(Hook)' 문구로 시작할 것 (예: "혹시 아직도 ~하고 계신가요?", "이걸 몰랐을 땐 저도 고생 좀 했죠..")
- 이모지를 적절히 사용
- 줄바꿈으로 가독성 확보
- 해시태그 10~15개 (마지막 줄에 모아서)
- 200~300자 분량`,

        threads: `스레드(Threads) 게시글을 작성해줘.
- 첫 문장은 임팩트 있는 질문이나 반전이 있는 '후킹' 문구로 시작할 것
- 대화하듯 친근한 말투
- 짧고 임팩트 있게 (100~200자)
- 해시태그 3~5개
- 이모지 최소화`,

    };

    const imageParts = images?.map(img => ({
        inlineData: { data: img.base64, mimeType: img.mimeType }
    })) || [];

    const contextSection = context ? `
[현재 상황 정보]
- 날씨: ${context.weather || "정보 없음"}
- 요일/시간: ${context.dayOfWeek || ""} ${context.timeContext || ""}
- **오늘의 핵심 타겟**: ${context.targetPersona || "모두"}
` : "";

    const prompt = `너는 소상공인 사장님의 ${platform === 'instagram' ? '인스타그램' : '스레드'} 계정을 대신 운영하는 마케팅 전문가야.
절대 광고 대행사가 쓴 것 같은 홍보 문구를 쓰지 마.
사장님이 가게 안에서 손님한테 직접 말하는 것처럼 써.

[글쓰기 규칙]
1. 첫 문장: 타깃 페르소나가 공감할 질문이나 상황 묘사로 시작 (예: "퇴근길에 뭐 먹을지 고민되는 날 있잖아요")
2. 본문: 아래 중 하나의 형식으로 작성
   - 정보형: 오늘의 추천 메뉴 + 왜 추천하는지 (재료, 조리법, 꿀조합)
   - 비하인드형: 재료 입고, 조리 과정, 사장님의 메뉴 개발 이야기
   - 꿀팁형: "이 메뉴는 이렇게 먹으면 더 맛있어요" 같은 먹는 법 안내
3. 톤앤매너: **${toneMap[storeInfo.tone] || "친근하게"}** 말투 유지 (반말/존댓말은 매장 분위기에 맞춤). 이모지는 3개 이하. 감탄사 남발 금지.
4. 해시태그: 핵심 5~7개만. [지역명+맛집], [메뉴명], [상황태그] 위주.
5. 절대 쓰지 말 것: "미식여행", "소중한 시간", "달콤하게 만들어 드릴게요", "행복한 추억", "소중한 분들", "보내드리고 싶어요" 같은 뻔하고 진부한 홍보 표현 금지.
6. 글 길이: 4~6문장. 짧고 임팩트 있게.

[활용할 매장 데이터]
- 매장명: ${storeInfo.name}
- 분위기/특징 키워드: ${storeInfo.atmosphere}
- 대표 메뉴: ${storeInfo.mainProducts}
- 오늘 날씨: ${context?.weather || "정보 없음"}
- 오늘 요일/시간대: ${context?.dayOfWeek || ""} ${context?.timeContext || ""}
- 타깃 페르소나: ${context?.targetPersona || "모두"}
- 주제: ${topic}

[요구사항]
- 플랫폼: ${platform === 'instagram' ? '인스타그램 (Instagram)' : '스레드 (Threads)'}
- ${images && images.length > 0 ? "★중요: 첨부된 사진의 특징을 분석해서 글 내용에 자연스럽게 녹여줘." : ""}
- 출력 형식: 글 본문만 출력. 제목이나 설명 붙이지 마.`;

    console.log("[Gemini] Generating marketing content (Model: gemini-2.5-flash)...");

    const response = await (getAI() as any).models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    ...imageParts
                ]
            }
        ],
        config: {
            maxOutputTokens: 8192,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
            safetySettings: [
                { category: "HARM_CATEGORY_HATE_SPEECH" as any, threshold: "BLOCK_NONE" as any },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any, threshold: "BLOCK_NONE" as any },
                { category: "HARM_CATEGORY_HARASSMENT" as any, threshold: "BLOCK_NONE" as any },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any, threshold: "BLOCK_NONE" as any },
            ],
        },
    });

    if (!response.text) {
        console.error("AI Response Error:", response);
        return "콘텐츠 생성에 실패했습니다. (응답 없음)";
    }

    return response.text ?? "";
}

// ── 주제 추천 ──
export async function suggestTopics(
    storeInfo: {
        name: string;
        category: string;
        mainProducts: string;
    }
) {
    const prompt = `당신은 소상공인 마케팅 전문가입니다.

가게명: ${storeInfo.name}
업종: ${storeInfo.category}
주요 메뉴/서비스: ${storeInfo.mainProducts}
오늘 날짜: ${new Date().toLocaleDateString("ko-KR")}

이 가게에 맞는 SNS 마케팅 주제 5개를 추천해줘.
계절, 요일, 트렌드를 반영해줘.
JSON 배열 형태로만 응답해. 예: ["주제1", "주제2", ...]`;

    const response = await (getAI() as any).models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    try {
        return JSON.parse(response.text ?? "[]") as string[];
    } catch {
        return ["오늘의 추천 메뉴", "계절 한정 이벤트", "가게 일상", "고객 후기", "신메뉴 소개"];
    }
}

// ── 사진 분석 ──
export async function analyzeImage(images: { base64: string, mimeType: string }[]) {
    const imageParts = images.map(img => ({
        inlineData: { data: img.base64, mimeType: img.mimeType }
    }));

    const response = await (getAI() as any).models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    { text: "이 사진들을 마케팅 관점에서 한국어로 종합하여 2-3줄로 설명해줘. 음식이면 맛있어 보이는 포인트, 공간이면 분위기를 묘사해." },
                    ...imageParts
                ],
            },
        ],
        config: {
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    return response.text ?? "";
}

// ── 법적 규제 검토 (광고법 준수 확인) ──
export async function checkLegalCompliance(content: string, category: string) {
    const prompt = `당신은 한국의 광고 관련 법규(식품표시광고법, 의료법, 화장품법, 전자상거래법 등)에 정통한 법률 및 마케팅 전문가입니다.
다음 마케팅 문구를 분석하여 법적으로 문제가 될 수 있는 표현(과대광고, 허위광고)을 찾아내고, 안전한 대체 표현을 제안해주세요.

[분석 대상 텍스트]
"${content}"

[업종 카테고리]
${category}

[검토 기준 (반드시 준수)]
1. 절대적 표현 금지: '최고', '최상', '유일', '독보적', '전국 1등' 등 객관적 근거 없이 1위임을 내세우는 표현.
2. 효능/효과 과장 금지: 
   - 식품/카페: 질병 예방 및 치료 효능 표방 금지 (예: '암 예방', '다이어트 직빵', '아토피 완치' 등). 의약품이나 건강기능식품으로 오인될 수 있는 표현 금지.
   - 뷰티/의료: 치료 효과 보장 표현 금지 (예: '부작용 없음', '100% 보장', '즉각적 회복').
3. 소비자 기만 금지: '주문 폭주', '단체 추천' 등 근거 없는 체험기 유도형 표현.
4. 비방 및 비교 금지: 타 경쟁 업체나 제품을 비방하거나 객관적 근거 없이 비교하는 표현.

[응답 형식]
반드시 아래와 같은 JSON 구조로만 응답하세요.
{
  "isSafe": boolean (위험 요소가 전혀 없으면 true),
  "issues": [
    {
      "original": "문제가 된 부분",
      "reason": "위반 이유",
      "suggestion": "안전한 대체 표현"
    }
  ],
  "summary": "종합적인 법적 위험도 요약 (1줄)"
}`;

    const response = await (getAI() as any).models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    try {
        return JSON.parse(response.text ?? "{}");
    } catch {
        return { isSafe: true, issues: [], summary: "법적 검토를 수행할 수 없습니다." };
    }
}
