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
        reviewKeywords?: string;  // ★ 추가: 리뷰 인기 키워드
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
    // ★ toneMap을 프롬프트에 실제 반영
    const toneMap: Record<string, string> = {
        friendly: "해요체(~해요, ~하네요)를 사용하여 이웃집 사장님처럼 친근하고 다정하게",
        professional: "하십시오체(~합니다)를 쓰되 딱딱하지 않은 신뢰감 있는 전문가 어조로",
        cute: "아기자기하고 발랄한 느낌으로, '~요!', '~죠~' 같은 생동감 있는 종결 어미로",
        trendy: "요즘 유행하는 트렌디한 감성으로, 간결하고 임팩트 있게 (MZ세대 타겟)",
        warm: "감성적이고 따뜻한 단어로, 읽는 사람의 마음을 녹이는 차분한 어조로",
    };

    const toneInstruction = toneMap[storeInfo.tone] || toneMap.friendly;

    // ★ 업종별 톤 매핑
    const categoryToneMap: Record<string, string> = {
        cafe: "친근한 동네 카페 사장님 톤",
        restaurant: "친근한 동네 식당 사장님 톤",
        beauty: "친한 언니/오빠 같은 뷰티 전문가 톤",
        fitness: "응원하는 트레이너 톤",
        academy: "열정 있는 선생님 톤",
        pet: "반려동물을 사랑하는 친구 같은 톤",
        flower: "감성적인 플로리스트 톤",
        realestate: "신뢰감 있는 부동산 전문가 톤 (친근하되 정보는 정확하게)",
        construction: "신뢰감 있는 분양 전문가 톤 (친근하되 정보는 정확하게)",
        medical: "쉽게 설명하는 의료 전문가 톤",
        other: "해당 업종에 맞는 친근한 전문가 톤",
    };

    const categoryTone = categoryToneMap[storeInfo.category] || categoryToneMap.other;

    // ★ 한국 시간(KST) 기준 요일 계산
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const day = kstDate.getUTCDay();
    const postType = (day === 3 || day === 6) ? "B" : "A";

    // ★ 이미지 파트
    const imageParts = images?.map(img => ({
        inlineData: { data: img.base64, mimeType: img.mimeType }
    })) || [];

    // ★ 상황 정보 섹션 (실제 프롬프트에 삽입)
    const contextSection = context ? `
[현재 상황 정보]
- 날씨: ${context.weather || "정보 없음"}
- 요일/시간: ${context.dayOfWeek || ""} ${context.timeContext || ""}
- 오늘의 핵심 타겟: ${context.targetPersona || "모두"}
` : "";

    // ★ 업종별 가이드 (공통)
    const industryGuide = `[업종별 글쓰기 가이드 - ${storeInfo.category}에 맞춰 자동 적용]

■ 음식점/카페
- 소재: 오늘 들어온 재료, 메뉴 먹는 꿀팁, 손님 반응, 계절 메뉴, 조리 비하인드
- 간접 증거: 리뷰 키워드, 재주문율, 단골 에피소드

■ 미용실/네일샵/뷰티
- 소재: 시술 전후 비교, 요즘 트렌드, 계절별 관리 꿀팁, 고객 변신 에피소드
- 간접 증거: 고객 반응, 재방문 예약, 리뷰 키워드

■ 공인중개사/부동산
- 소재: 동네 시세 변화, 매물 특징, 집 볼 때 꿀팁, 전세/매매 체크리스트, 동네 장단점
- 간접 증거: 최근 거래 사례, 고객 후기, 실거래가 기반 정보

■ 분양대행사/분양
- 소재: 분양 현장 현황, 입지 분석, 청약 꿀팁, 모델하우스 비하인드, 주변 개발 호재
- 간접 증거: 청약 경쟁률, 방문자 반응, 실입주 후기

■ 헬스/PT/필라테스
- 소재: 회원 변화 사례, 운동 꿀팁, 자세 교정 비포애프터, 계절별 운동법
- 간접 증거: 회원 후기, 바디 변화, 재등록률

■ 병원/의원/치과
- 소재: 건강 정보, 계절별 주의사항, 치료 전후 관리법, 자주 묻는 질문 답변
- 간접 증거: 환자 문의 빈도, 호전 사례 (개인정보 제외)

■ 학원/교육
- 소재: 학습 꿀팁, 성적 향상 사례, 입시/자격증 정보, 수업 비하인드
- 간접 증거: 합격 후기, 성적 변화, 수강생 반응

■ 꽃집/플라워샵
- 소재: 오늘 들어온 꽃, 계절 꽃 추천, 꽃 오래 보관하는 법, 선물 상황별 추천
- 간접 증거: 고객 반응, 인기 꽃다발, 재주문

■ 기타 업종
핵심 원칙(공감 첫줄, 사장님 정보, 간접 증거, 댓글 유도) 준수.`;

    // ★ 자가 검증 체크리스트 (공통)
    const validationChecklist = `
[AI 자가 검증 체크리스트 - 생성 후 반드시 실행]

■ 검증 1: 첫 문장 공감 테스트
"진짜 그런 사람이 있는가?" 자문해. 없으면 첫 문장 다시 써.
- ❌ "브런치 메뉴 놓쳐서 아쉬웠던 분들 많으시죠?" → 그런 사람 없음
- ✅ "일요일 저녁에 뭐 먹을지 30분째 검색 중인 사람?" → 실제로 많음

■ 검증 2: 직접 칭찬 금지
사장님이 자기 상품/서비스 맛/품질을 직접 칭찬하는 문장 → 간접 증거로 교체.
- ❌ "완전 꿀맛!", "든든하면서도 상큼하게 즐길 수 있답니다"
- ✅ 손님 반응, 리뷰 키워드, 재주문율 등 간접 증거 활용

■ 검증 3: 홍보 문구 필터
아래 표현이 하나라도 있으면 삭제하거나 사장님 말투로 교체:
"준비했어요", "즐길 수 있습니다", "놓치지 마세요", "찾아주시는", "~답니다", "특별한", "소중한", "행복한 추억"

■ 검증 4: 빈 문장 삭제 테스트
"이 문장을 삭제하면 글의 정보가 줄어드는가?" → 아니면 삭제.

■ 검증 5: 사장님 정보 테스트
이 가게 사장님만 알려줄 수 있는 정보가 최소 1개 이상 있는가? 없으면 다시 써.

■ 검증 6: 글 유형별 길이 체크
- 유형 A(일반형): 인스타 7문장 이상이면 줄여. 스레드 6문장 이상이면 줄여.
- 유형 B(정보형): 인스타 6문장 이하면 추가. 스레드 4문장 이하면 추가.

■ 검증 7: 허구 금지
실제로 존재하지 않는 이벤트, 챌린지, 프로모션을 만들어내지 마.

■ 검증 8: 선택지/메뉴판 나열 금지
"A 또는 B" 형태로 표현 후보를 나열하지 마. 메뉴를 3개 이상 연속 나열하지 마.

[검증 순서]
생성 → 검증1~8 순서대로 → 하나라도 실패 시 해당 문장 수정 → 전부 통과 시 출력`;

    // ★ 인스타그램 프롬프트
    const instagramPrompt = `[역할]
너는 자영업 사장님의 인스타그램 계정을 대신 운영하는 마케팅 전문가야.
사장님이 가게에서 직접 쓰는 것처럼 자연스럽고 현장감 있게 써.

[절대 금지 표현]
- "미식여행", "소중한 시간", "달콤하게 만들어 드릴게요", "행복한 추억", "특별한 순간"
- "준비했어요" → "오늘 새로 올렸는데" 또는 "오늘부터 나갑니다"
- "즐길 수 있습니다/즐겨보세요", "놓치지 마세요" → 삭제
- "찾아주시는/찾아주시길" → "시키는/먹는"
- "~답니다" → "~거든요" 또는 "~더라고요"
- 사장님이 자기 상품/서비스를 직접 칭찬하는 표현
- 존재하지 않는 이벤트/챌린지/프로모션 날조
- "A 또는 B" 형태의 선택지 나열
- 메뉴/서비스 3개 이상 연속 나열

${industryGuide}

[글 유형: ${postType === "A" ? "유형 A - 일반형" : "유형 B - 정보형"}]
${postType === "A" ? `- 길이: 4~6문장
- 구조: 1) 공감되는 후킹 첫 문장 2) 본문 2~3문장 (사장님만 아는 정보) 3) 댓글 유도 마무리
- 이모지: 1~3개` : `- 길이: 8~12문장
- 구조: 1) 숫자 활용 후킹 첫 문장 2) 숫자 넘버링(1, 2, 3)으로 정보 구조화 3) 댓글 유도 + 저장 유도
- 이모지: 2~4개`}

[톤앤매너]
- ${toneInstruction}
- ${categoryTone}
- 사진과 연결되는 표현 포함 가능

[해시태그]
- 5~7개. [지역명+업종], [대표상품/서비스명], [상황태그] 위주
- #맛스타그램 #먹스타그램 같은 대형 경쟁 태그 금지

${contextSection}

[활용 데이터]
- 매장명: ${storeInfo.name}
- 업종: ${storeInfo.category}
- 위치: ${storeInfo.location}
- 분위기/특징: ${storeInfo.atmosphere}
- 대표 메뉴/서비스: ${storeInfo.mainProducts}
- 리뷰 인기 키워드: ${storeInfo.reviewKeywords || "없음"}
- 주제: ${topic}

${validationChecklist}

[출력]
글 본문 + 해시태그만 출력. 제목, 설명, 부연 없이.`;

    // ★ 스레드 프롬프트
    const threadsPrompt = `[역할]
너는 자영업 사장님의 스레드 계정을 대신 운영하는 마케팅 전문가야.
광고가 아니라 사장님의 솔직한 이야기를 쓰는 거야.

[스레드 알고리즘 핵심]
- 댓글(답글)이 많을수록 노출 급상승 → 댓글 유도가 가장 중요
- 리포스트와 공유 > 좋아요
- 짧고 공감되는 글 > 길고 정성스러운 글

[절대 금지]
- 광고 냄새나는 표현 전부 ("특별한", "소중한", "행복한 추억", "준비했어요", "즐기실 수 있습니다" 등)
- 사장님이 자기 상품/서비스를 직접 칭찬하는 표현
- 이모지 2개 초과, 해시태그 3개 초과
- 정보 없는 인사치레 문장
- "~답니다" 어투 금지
- 존재하지 않는 이벤트/챌린지 날조
- 메뉴/서비스 3개 이상 연속 나열

${industryGuide}

[글 유형: ${postType === "A" ? "유형 A - 일반형" : "유형 B - 정보형"}]
${postType === "A" ? `- 길이: 3~5문장, 최대 300자
- 구조: 1) 질문/고백/반전 후킹 2) 본문 1~2문장 3) 댓글 유도` : `- 길이: 5~8문장, 최대 500자
- 구조: 1) 숫자 활용 후킹 2) 넘버링(1. 2. 3.) 필수, 3~4개 항목 3) 댓글 유도
- 숫자 넘버링은 3~4개 최적. 5개 넘지 마.`}

[톤앤매너]
- 반말 또는 아주 편한 존댓말. 툭툭 던지는 느낌.
- ${categoryTone}
- 스레드에서 격식 있는 존댓말은 절대 쓰지 마.

[소재 추천 - 직접적 홍보 말고 이런 소재를 써]
- 오늘 업무 비하인드 (재료 입고, 시술 과정, 상담 에피소드 등)
- 고객/손님과 있었던 일
- 이 업종 종사자로서 느낀 점
- 계절/날씨에 따른 변화
- 동네/상권 이야기

${contextSection}

[활용 데이터]
- 매장명: ${storeInfo.name}
- 업종: ${storeInfo.category}
- 위치: ${storeInfo.location}
- 분위기/특징: ${storeInfo.atmosphere}
- 대표 메뉴/서비스: ${storeInfo.mainProducts}
- 리뷰 인기 키워드: ${storeInfo.reviewKeywords || "없음"}
- 주제: ${topic}

${validationChecklist}

[출력]
글 본문만 출력. 해시태그 0~3개. 제목, 설명, 부연 없이.`;

    const prompt = platform === 'instagram' ? instagramPrompt : threadsPrompt;

    console.log(`[Gemini] Generating ${platform} content (Type: ${postType}, Category: ${storeInfo.category}, Tone: ${storeInfo.tone})...`);

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
   - 식품/카페: 질병 예방 및 치료 효능 표방 금지.
   - 뷰티/의료: 치료 효과 보장 표현 금지.
   - 부동산/분양: 확정되지 않은 개발 호재를 확정적으로 표현 금지. 투자 수익 보장 표현 금지.
3. 소비자 기만 금지: '주문 폭주', '단체 추천' 등 근거 없는 표현.
4. 비방 및 비교 금지: 타 경쟁 업체나 제품을 비방하거나 비교하는 표현.

[응답 형식]
반드시 아래와 같은 JSON 구조로만 응답하세요.
{
  "isSafe": boolean,
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
