import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMarketingContent, suggestTopics, analyzeImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // AI 생성 제한 체크
    const { checkAIGenerationLimit } = await import("@/lib/subscription/check-usage");
    const aiCheck = await checkAIGenerationLimit(user.id);
    if (!aiCheck.allowed) {
        return NextResponse.json({ error: "지금은 생성이 어려워요. 잠시 후 다시 시도해주세요 😊" }, { status: 403 });
    }

    const body = await request.json();
    const { action, storeInfo, platform, topic, images, context } = body;

    console.log(`[API] Content Generate Request - Action: ${action}, Images: ${images?.length || 0}`);
    if (images && images.length > 0) {
        images.forEach((img: any, i: number) => {
            console.log(` - Image ${i + 1}: Mime: ${img.mimeType}, Size: ${img.base64.length} chars`);
        });
    }

    try {
        // 주제 추천
        if (action === "suggest") {
            const topics = await suggestTopics(storeInfo);
            return NextResponse.json({ topics });
        }

        // 사진 분석
        if (action === "analyze-image" && images && images.length > 0) {
            const description = await analyzeImage(images);
            return NextResponse.json({ description });
        }

        // 콘텐츠 생성
        if (action === "generate") {
            const content = await generateMarketingContent(
                storeInfo,
                platform,
                topic,
                images,
                context
            );

            // 법적 규제 검토 추가
            console.log("[API] Running Legal Compliance Check...");
            const { checkLegalCompliance } = await import("@/lib/gemini");
            const compliance = await checkLegalCompliance(content, storeInfo.category);

            // DB에 저장 시도
            console.log("Saving content to DB for user:", user.id);
            console.log("Number of images:", images ? images.length : 0);

            const { data: store, error: storeError } = await supabase
                .from("stores")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (storeError) {
                console.error("Store Lookup Error details:", storeError);
            }

            if (store) {
                console.log("Found store ID:", store.id);
                const insertPayload = {
                    user_id: user.id,
                    store_id: store.id,
                    platform,
                    topic,
                    content,
                };

                const { error: insertError } = await supabase
                    .from("contents")
                    .insert(insertPayload);

                if (insertError) {
                    console.error("Content Insert Error details:", insertError);
                    console.error("Payload was:", insertPayload);
                } else {
                    console.log("✅ Content saved successfully to DB");
                }
            } else {
                console.warn("⚠️ No store found for user. Content will not be saved to history. Please register a store first.");
            }

            return NextResponse.json({
                content,
                compliance,
                saved: !!store
            });
        }

        return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "AI 생성 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
