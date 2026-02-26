import { NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/blog-generator";
import { crawlData } from "@/lib/blog-crawler";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60; // Vercel 함수 실행 시간 연장

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const body = await req.json();
        let { topic, images = [], contentLength = "medium", storeId, context } = body;

        if (!topic) {
            return NextResponse.json({ error: "주제(키워드)가 필요합니다." }, { status: 400 });
        }

        // 구독 및 권한 체크 추가
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const { checkFeatureAccess, checkAIGenerationLimit } = await import("@/lib/subscription/check-usage");

        // 1. 프로 전용 기능 체크
        const featureCheck = await checkFeatureAccess(user.id, "blog");
        if (!featureCheck.allowed) {
            return NextResponse.json({ error: featureCheck.message, reason: featureCheck.reason }, { status: 403 });
        }

        // 2. AI 생성 제한 체크
        const aiCheck = await checkAIGenerationLimit(user.id);
        if (!aiCheck.allowed) {
            return NextResponse.json({ error: "지금은 생성이 어려워요. 잠시 후 다시 시도해주세요 😊" }, { status: 403 });
        }

        // 0. URL 이미지가 있다면 서버에서 다운로드하여 base64로 변환
        const processedImages = [];
        for (const img of images) {
            if (!img.base64 && img.url) {
                try {
                    console.log(`[GenerateAPI] Downloading image for analysis: ${img.url}`);
                    const response = await fetch(img.url);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const base64 = Buffer.from(arrayBuffer).toString('base64');
                        processedImages.push({ ...img, base64 });
                    } else {
                        processedImages.push(img);
                    }
                } catch (e) {
                    console.error("Image download error:", e);
                    processedImages.push(img);
                }
            } else {
                processedImages.push(img);
            }
        }
        images = processedImages;

        const keywords = topic.split(",").map((k: string) => k.trim()).filter(Boolean);
        const mainKeyword = keywords[0] || topic;

        // 1.5 가게 정보 가져오기 (업종별 페르소나 적용 위함)
        let storeInfo = undefined;
        if (storeId) {
            const { data: store } = await supabase
                .from("stores")
                .select("*")
                .eq("id", storeId)
                .single();
            if (store) {
                storeInfo = {
                    name: store.name,
                    category: store.category,
                    atmosphere: store.atmosphere,
                    tone: store.tone
                };
            }
        }

        // 1. 네이버 상위 3개 블로그 참조 데이터 가져오기 (Puppeteer 기반)
        console.log(`[API] Start crawling for: ${mainKeyword}`);
        const crawledData = await crawlData(mainKeyword, 3, 0); // 블로그 3개, 뉴스 0개

        // 2. Gemini를 이용한 글 생성 및 이미지 매핑
        const content = await generateBlogPost(
            keywords,
            contentLength,
            crawledData,
            images,
            storeInfo,
            context
        );

        // 법적 규제 검토 추가
        console.log(`[BlogAPI] Running Legal Compliance Check for category: ${storeInfo?.category}`);
        const { checkLegalCompliance } = await import("@/lib/gemini");
        const compliance = await checkLegalCompliance(content, storeInfo?.category || "other");

        // 3. DB에 생성 기록 저장
        if (user && content) {
            console.log(`[GenerateAPI] Saving blog content to history for user: ${user.id}`);
            await supabase.from("contents").insert({
                user_id: user.id,
                store_id: storeId,
                platform: 'blog',
                topic: topic,
                content: content,
                is_published: false,
                status: 'generated'
            });
        }

        return NextResponse.json({
            success: true,
            content,
            compliance,
            crawledCount: crawledData.blogs.length
        });

    } catch (error: any) {
        console.error("Blog Generation API Error:", error);
        return NextResponse.json(
            { error: error.message || "콘텐츠 생성 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
