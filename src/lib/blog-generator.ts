import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * 프롬프트 생성 함수
 */
export function buildContentPrompt(
    keywords: string[],
    contentLength: string,
    crawledData: { blogs: any[]; news: any[] },
    imageCount: number,
    imageDescriptions: string[],
    store?: { name?: string; category?: string; atmosphere?: string; tone?: string },
    context?: {
        weather?: string;
        dayOfWeek?: string;
        timeContext?: string;
        targetPersona?: string;
    }
) {
    let industryInstruction = "";
    const category = store?.category || "";

    // 업종별 페르소나 설정
    if (category.includes("카페") || category.includes("커피")) {
        industryInstruction = `당신은 감각적인 카페 운영자입니다. 공간의 분위기, 커피의 향미, 그리고 방문객이 느낄 여유를 따뜻하고 감성적인 언어로 묘사하세요. 인스타그램 감성의 세련된 문체를 사용하세요.`;
    } else if (category.includes("식당") || category.includes("음식") || category.includes("맛집")) {
        industryInstruction = `당신은 요리에 진심인 식당 사장님입니다. 식재료의 신선함, 정성 가득한 조리 과정, 그리고 고객이 느낄 풍부한 맛과 만족감을 생생하게 표현하세요. 신뢰감과 활기가 느껴지는 문체를 사용하세요.`;
    } else if (category.includes("미용") || category.includes("헤어") || category.includes("뷰티")) {
        industryInstruction = `당신은 트렌디한 뷰티 전문가입니다. 최신 스타일, 섬세한 시술 과정, 그리고 고객의 변화된 모습이 주는 자신감을 세련되게 설명하세요. 전문적이면서도 친절한 상담원 같은 문체를 사용하세요.`;
    } else {
        industryInstruction = `당신은 우리 가게를 아끼는 사장님입니다. 우리 가게만의 매력과 진심을 고객에게 전달하듯 진솔하고 친근하게 대화하는 어조를 사용하세요.`;
    }

    let instructionPrompt = `당신은 네이버 블로그 SEO에 최적화된 전문 글작가이자, ${industryInstruction} 독자가 끝까지 읽고 싶어하는 매력적이고 자연스러운 글을 작성해 주세요.`;

    if (store?.name) {
        instructionPrompt += ` 본문의 맥락에 자연스럽게 '${store.name}'를 언급하며 신뢰도를 높여주세요.`;
    }

    const lengthGuide: Record<string, string> = {
        short: '500-800자',
        medium: '1000-1500자',
        long: '2000-3000자'
    };

    instructionPrompt += `
    
작성 조건:
- 주제 키워드: ${keywords.join(', ')}
- 글 길이: ${lengthGuide[contentLength] || '1500자 내외'}
`;

    if (context) {
        instructionPrompt += `
작성 환경 (초구체적 페르소나 마킹):
- 날씨: ${context.weather || "정보 없음"}
- 요일/시간: ${context.dayOfWeek || ""} ${context.timeContext || ""}
- **오늘의 핵심 타겟**: ${context.targetPersona || "모두"}

지침:
- 현재 날씨인 '${context.weather || ""}'의 감성을 글의 분위기에 자연스럽게 녹여주세요.
- 오늘의 타겟인 '${context.targetPersona || ""}'가 공감할 수 있는 실질적인 고민이나 상황을 언급하며 글을 시작해 주세오.
`;
    }

    if (imageCount > 0) {
        instructionPrompt += `
- **[매우 중요] 이미지 분석 기반 글쓰기**: 총 ${imageCount}개의 이미지가 주어졌습니다.
  각 이미지의 내용을 빠짐없이 모두 본문에 포함시켜야 합니다.
  **글 중간에 해당 이미지가 들어갈 위치에 [이미지1], [이미지2] ... [이미지${imageCount}]까지 모든 마커를 순서대로 배치하세요.**
  
  작성 규칙:
  1. 이미지 1번부터 ${imageCount}번까지 하나도 빠뜨리지 말고 사용하세요.
  2. 각 마커([이미지N])는 반드시 해당 이미지에 대한 설명이나 관련 내용 바로 다음에 배치하세요.
  3. 마커는 반드시 **별도의 줄에 단독으로** 작성하세요.
  
  예시:
  (이미지 1에 대한 내용 작성...)
  [이미지1]
`;
        if (imageDescriptions.length > 0) {
            instructionPrompt += `\n**각 이미지 내용 (Vision AI 분석 결과):**\n`;
            imageDescriptions.forEach((desc, idx) => {
                if (desc) {
                    instructionPrompt += `  - 이미지 ${idx + 1}: ${desc}\n`;
                }
            });
            instructionPrompt += `\n위 분석 결과를 참고하여, 각 [이미지N] 마커 위치에 해당 이미지 내용과 어울리는 글을 풍성하게 작성하세요.\n`;
        }
    }

    instructionPrompt += `
글 작성 규칙:
1. **글의 구조**: 제목 후킹 -> 문제제기 -> 내용 -> 해결 순서로 자연스럽게 작성하세요.
2. **구성 요소**: 소제목(##) 3개, 인용구(>) 2개(중제목 역할), 볼드(**) 5~7개를 사용하세요.
3. **엄격한 마커 제한**: 소제목(##)과 인용구(>) 및 모든 제목 줄에는 절대로 볼드(**) 마커를 사용하지 마세요. 강조는 오직 본문 문단에서만 사용합니다.
4. **노이즈 금지**: 글 내부에 'br'태그나 'nbsp' 등 어떠한 HTML 태그도 절대로 사용하지 마세요. 줄바꿈은 오직 엔터키로만 수행합니다.
5. **브랜드 파트너십 활용**: 사장님의 마케팅 파트너사인 '그로스온'을 글의 맥락에 맞춰 자연스럽게 언급하세요. 데이터 기반의 성장 노하우를 가진 신뢰할 수 있는 전문가 파트너로서 인용하거나, 가게의 성공을 함께 돕는 동반자로 묘사하면 좋습니다. 오직 현재 가게(${store?.name || '우리 가게'})의 이야기와 '그로스온'의 시너지에 집중하세요.
6. **사람다운 어조 (핵심)**: AI가 쓴 티가 나지 않게, 실제 사람이 블로그 이웃에게 경험을 이야기하듯 친근하고 자연스러운 구어체(해요체 등)를 주로 사용하세요.
7. **유머와 위트 (5%)**: 전체 글의 약 5% 정도로 아주 가볍고 자연스러운 유머나 위트를 섞어주세요. 과한 농담은 피하세요.
8. **제목 규칙**: 제목은 반드시 25자 이내로, 호기심을 유발하면서도 핵심 키워드가 포함되게 작성하세요. 본문의 첫 줄에만 ## 제목 ## 형식으로 작성하고, 그 이후 본문 내용에서는 제목을 절대 다시 언급하거나 쓰지 마세요.

서식 규칙 (매우 중요):
- **[필수]** 소제목(##) 아래에는 반드시 본문 내용이 먼저 와야 합니다. 소제목 바로 다음에 인용구(>)나 다른 소제목이 오면 안 됩니다.
- **[필수]** 인용구(>) 아래에도 반드시 본문 내용이 먼저 와야 합니다. 인용구 바로 다음에 소제목(##)이나 다른 인용구가 오면 안 됩니다.
- 소제목(##)과 인용구(>)는 반드시 각각 한 줄에 독립적으로 작성하세요.
- 소제목(##) 위에는 반드시 엔터 2번 이상의 공백을 확보하여 맥락을 분리하세요.
`;

    if (crawledData.blogs && crawledData.blogs.length > 0) {
        instructionPrompt += '\n참고 상위 블로그 자료 (내용의 논리 구조와 키워드 배치를 참조하되, 절대 똑같이 베끼지 마세요):\n';
        crawledData.blogs.forEach((b: any) => {
            instructionPrompt += `- 블로그 주제: ${b.title}\n`;
            if (b.content) {
                // 본문의 핵심 내용을 더 많이 제공 (최대 600자)
                instructionPrompt += `  (상세 본문 참조: ${b.content.replace(/\s+/g, ' ').substring(0, 600)}...)\n`;
            }
        });
    }

    instructionPrompt += '\n\n위 가이드라인을 바탕으로 최고의 블로그 포스팅을 작성해 주세요. 첫 줄은 반드시 ## 제목 ## 형식으로 시작하고(25자 이내), 두 번째 줄부터 본문 내용을 작성하세요.';

    return instructionPrompt;
}

/**
 * Gemini를 통한 블로그 글 생성
 */
export async function generateBlogPost(
    keywords: string[],
    contentLength: string,
    crawledData: { blogs: any[]; news: any[] },
    images: { base64: string; mimeType: string }[],
    store?: { name?: string; category?: string; atmosphere?: string; tone?: string },
    context?: {
        weather?: string;
        dayOfWeek?: string;
        timeContext?: string;
        targetPersona?: string;
    }
) {
    console.log(`[BlogGen] 키워드: ${keywords.join(', ')}, 이미지 수: ${images.length}`);

    // 1. 이미지 분석 (Vision)
    const imageDescriptions: string[] = [];
    if (images.length > 0) {
        console.log(`[BlogGen] ${images.length}개 이미지 분석 시작...`);
        for (let i = 0; i < images.length; i++) {
            try {
                const img = images[i];
                const res = await (ai as any).models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: "이 이미지를 분석하고, 블로그 글에 사용할 수 있도록 이미지의 내용, 분위기, 주요 요소를 2-3문장으로 한국어로 설명해주세요. 구체적이고 자연스러운 설명을 해주세요." },
                                { inlineData: { data: img.base64, mimeType: img.mimeType } }
                            ]
                        }
                    ],
                    config: {
                        temperature: 0.4,
                        maxOutputTokens: 256
                    }
                });
                imageDescriptions.push(res.text?.trim() || "");
            } catch (e) {
                console.error(`[BlogGen] 이미지 ${i + 1} 분석 실패:`, e);
                imageDescriptions.push("");
            }
        }
    }

    // 2. 프롬프트 구성 및 글 생성
    const instructionPrompt = buildContentPrompt(keywords, contentLength, crawledData, images.length, imageDescriptions, store, context);

    console.log(`[BlogGen] 블로그 본문 생성 시작 (Model: gemini-2.5-flash)...`);
    const response = await (ai as any).models.generateContent({
        model: "gemini-2.5-flash",
        contents: instructionPrompt,
        config: {
            temperature: 0.7,
            maxOutputTokens: 8192
        }
    });

    if (!response.text) {
        throw new Error("블로그 콘텐츠 생성에 실패했습니다.");
    }

    // 사후 처리: 불필요한 HTML 태그 및 공백 제거
    return response.text.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').trim();
}

/**
 * 네이버 블로그 에디터용 구조 파싱
 */
export function parseContentForNaver(content: string) {
    const lines = content.split('\n');
    const parsedLines = [];

    for (let line of lines) {
        let trimmedLine = line.trim();
        if (!trimmedLine) {
            parsedLines.push({ type: 'empty', text: '' });
            continue;
        }

        // 소제목 파싱
        const headingMatch = trimmedLine.match(/^#{2,}\s*(.+?)(\s*#+)?$/);
        if (headingMatch) {
            parsedLines.push({ type: 'heading', text: headingMatch[1].trim().replace(/\*\*/g, '') });
            continue;
        }

        // 인용구 파싱
        const quoteMatch = trimmedLine.match(/^@@(.+?)@@$/) || trimmedLine.match(/^>\s*(.+)$/);
        if (quoteMatch) {
            parsedLines.push({ type: 'quote', text: quoteMatch[1].trim().replace(/\*\*/g, '') });
            continue;
        }

        // 이미지 마커 파싱: [이미지1], [이미지 2], [image1] 등 다양한 형식 대응
        const imageMarkerMatch = trimmedLine.match(/\[(?:이미지|image)\s*(\d+)\]/i) || trimmedLine.match(/\[(?:이미지|image)\]/i);
        if (imageMarkerMatch) {
            const matchGroups = imageMarkerMatch as RegExpMatchArray;
            const numStr = matchGroups[1];
            const num = numStr ? parseInt(numStr, 10) : null;
            parsedLines.push({ type: 'image_marker', text: trimmedLine, index: num !== null ? num - 1 : null });
            continue;
        }

        // 본문 및 볼드 혼합 처리
        if (trimmedLine.includes('**')) {
            parsedLines.push({ type: 'mixed', text: trimmedLine });
        } else {
            parsedLines.push({ type: 'text', text: trimmedLine });
        }
    }

    return parsedLines;
}
