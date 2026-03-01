import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishToInstagram, publishToThreads } from "@/lib/publish";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { platform, imageUrls, content, topic, storeId, scheduledPublishTime } = await request.json();

    // 구독 및 발행 제한 체크 추가
    const { checkPublishLimit } = await import("@/lib/subscription/check-usage");
    const publishCheck = await checkPublishLimit(user.id, platform);
    if (!publishCheck.allowed) {
        const errMsg = 'message' in publishCheck ? publishCheck.message : "발행 제한에 도달했습니다.";
        const reason = 'reason' in publishCheck ? publishCheck.reason : "limit_reached";
        return NextResponse.json({ error: errMsg, reason: reason }, { status: 403 });
    }

    try {
        // --- 예약 발행 처리 (DB 저장만 하고 종료) ---
        if (scheduledPublishTime) {
            console.log(`[Publish] Scheduling ${platform} post for ${new Date(scheduledPublishTime * 1000).toLocaleString()}`);

            // Note: scheduled_at 컬럼이 DB에 있어야 합니다.
            const { error: dbError } = await supabase.from("contents").insert({
                user_id: user.id,
                store_id: storeId,
                platform,
                topic,
                content,
                image_url: imageUrls?.[0] || "",
                image_urls: imageUrls || [],
                is_published: false,
                status: 'pending',
                scheduled_at: new Date(scheduledPublishTime * 1000).toISOString()
            });

            if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);
            return NextResponse.json({ success: true, scheduled: true });
        }

        // --- 즉시 발행 처리 ---
        let resultId = "";

        if (platform === "instagram") {
            resultId = await publishToInstagram(imageUrls, content);
        } else if (platform === "threads") {
            resultId = await publishToThreads(imageUrls, content);
        } else {
            return NextResponse.json({ error: "지원하지 않는 플랫폼입니다." }, { status: 400 });
        }

        // DB 업데이트
        await supabase.from("contents").insert({
            user_id: user.id,
            store_id: storeId,
            platform,
            topic,
            content,
            image_url: imageUrls?.[0] || "",
            image_urls: imageUrls || [],
            is_published: true,
        });

        return NextResponse.json({ success: true, id: resultId });

    } catch (error: any) {
        console.error("[Publish API Error]", error);
        return NextResponse.json({ error: error.message || "발행 중 오류가 발생했습니다." }, { status: 500 });
    }
}
