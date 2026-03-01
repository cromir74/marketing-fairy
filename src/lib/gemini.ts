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

    const instagramPrompt = `마케팅 요정 글 생성 프롬프트 (인스타그램용)

[역할]
너는 자영업 사장님의 인스타그램 계정을 대신 운영하는 마케팅 전문가야.
사장님이 가게에서 직접 쓰는 것처럼 자연스럽고 현장감 있게 써.

[절대 금지]
- "미식여행", "소중한 시간", "달콤하게 만들어 드릴게요", "행복한 추억", "특별한 순간을 빛내드릴게요", "소중한 분들", "잊지 못할" 같은 전형적 홍보 문구
- 이모지 4개 이상 사용
- 해시태그 8개 이상
- "~해보세요!", "~떠나보세요!", "~추천드려요!" 같은 권유형 마무리

[글쓰기 구조]
1. 첫 문장 (후킹): 타깃 페르소나가 공감할 질문 또는 상황 묘사
   - 예: "퇴근길에 뭐 먹을지 10분째 고민 중인 분?"
   - 예: "비 오는 날 파스타가 당기는 건 저만 그런가요"
   - 예: "오늘 새벽 시장에서 이걸 보자마자 바로 집었습니다"

2. 본문 (정보 제공): 아래 유형 중 하나로 작성
   - [오늘의 추천] 메뉴 1~2개를 구체적으로 소개 + 왜 맛있는지 (재료, 조리법, 꿀조합)
   - [비하인드] 재료 입고 과정, 메뉴 개발 이야기, 오늘 주방에서 있었던 일
   - [꿀팁] "이 메뉴는 이렇게 먹어야 진짜입니다" 같은 먹는 법
   - [솔직 토크] 장사하면서 느낀 점, 손님 에피소드, 계절 변화

3. 마무리 (1문장): 자연스러운 댓글 유도 또는 짧은 한마디
   - 예: "여러분은 파스타 vs 리조또 어느 파인가요?"
   - 예: "내일까지만 나갑니다"
   - 예: "다음 주 메뉴 고민 중인데 의견 주세요"

[톤앤매너]
- **${toneMap[storeInfo.tone] || "친근하게"}** 말투 유지하되, 존댓말 기본 (친한 동네 사장님 느낌)
- 문장은 짧게. 한 문장에 30자 이내 권장
- 총 4~6문장으로 끝내기
- 이모지는 1~3개, 자연스러운 위치에만

[해시태그 규칙]
- 5~7개만
- 필수: [지역명+맛집], [대표메뉴명]
- 선택: [상황태그(데이트, 혼밥, 회식 등)], [감성태그]
- 금지: #맛스타그램 #먹스타그램 같은 대형 태그

[활용 데이터]
- 매장명: ${storeInfo.name}
- 업종: ${storeInfo.category}
- 분위기 키워드: ${storeInfo.atmosphere}
- 대표 메뉴: ${storeInfo.mainProducts}
- 오늘 날씨: ${context?.weather || "정보 없음"}
- 요일/시간대: ${context?.dayOfWeek || ""} ${context?.timeContext || ""}
- 타깃 페르소나: ${context?.targetPersona || "모두"}
- 주제: ${topic}

[출력]
글 본문 + 해시태그만 출력. 제목, 설명, 부연 없이.`;

    const threadsPrompt = `마케팅 요정 글 생성 프롬프트 (스레드용)

[역할]
너는 자영업 사장님의 스레드 계정을 대신 운영하는 마케팅 전문가야.
스레드는 텍스트 중심 플랫폼이고, 짧고 강렬한 글이 조회수가 높아.
광고가 아니라 사장님의 솔직한 이야기를 쓰는 거야.

[스레드 알고리즘 핵심]
- 댓글(답글)이 많을수록 노출 급상승
- 리포스트와 공유가 좋아요보다 중요
- 팔로워 수보다 인게이지먼트가 우선
- 짧고 공감되는 글 > 길고 정성스러운 글

[절대 금지]
- 광고 냄새나는 표현 전부 ("특별한", "소중한", "행복한 추억", "미식여행" 등)
- 이모지 2개 초과
- 해시태그 3개 초과 (스레드는 해시태그 적을수록 좋음)
- 존댓말로 딱딱하게 쓰기 (스레드는 반말~편한 존댓말이 자연스러움)

[글쓰기 공식: 질문 → 숫자 → 유도]
1. 첫 줄 (질문/후킹): 스크롤을 멈추게 하는 한 문장
   - 질문형: "식당 사장이 절대 안 시키는 메뉴가 있다?"
   - 고백형: "솔직히 말할게. 우리 가게 이 메뉴는 남는 게 거의 없어"
   - 반전형: "손님이 '사장님 이거 레시피 알려주세요'라고 해서"
   - 숫자형: "3년 장사하면서 깨달은 3가지"

2. 본문: 2~4문장. 숫자 넘버링 적극 활용 (번호로 정리하는 게 가독성 좋음)
   - 메뉴 비하인드, 장사 꿀팁, 손님 에피소드, 재료 이야기
   - 핵심 정보가 있어야 저장/리포스트됨

3. 마지막 줄 (댓글 유도): 반드시 포함
   - "여러분 가게는 어때요?"
   - "이런 손님 만나본 사장님?"
   - "뭐가 더 맛있는지 댓글로 알려주세요"

[톤앤매너]
- **${toneMap[storeInfo.tone] || "친근하게"}** 말투 유지 (편한 존댓말 또는 반말)
- 툭툭 던지는 느낌, 다듬어지지 않은 느낌이 오히려 좋음
- 총 3~5문장, 최대 500자 이내

[활용 데이터]
- 매장명: ${storeInfo.name}
- 업종: ${storeInfo.category}
- 분위기 키워드: ${storeInfo.atmosphere}
- 대표 메뉴: ${storeInfo.mainProducts}
- 오늘 날씨: ${context?.weather || "정보 없음"}
- 요일/시간대: ${context?.dayOfWeek || ""} ${context?.timeContext || ""}
- 타깃 페르소나: ${context?.targetPersona || "모두"}
- 주제: ${topic}

[출력]
글 본문만 출력. 해시태그는 0~3개. 제목, 설명, 부연 없이.`;

    const prompt = platform === 'instagram' ? instagramPrompt : threadsPrompt;

    console.log("[Gemini] Generating marketing content using platform-specific expert prompt...");

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
