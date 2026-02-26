import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishToInstagram, publishToThreads } from "@/lib/publish";

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const results = [];

    try {
        console.log(`[Cron] Starting safe publishing cycle...`);

        // 무한 루프 방지를 위해 최대 10개까지만 한 번에 처리 (또는 시간 제한)
        let processedCount = 0;
        const startTime = Date.now();

        while (processedCount < 10 && (Date.now() - startTime < 50000)) { // 최대 50초간 실행
            // 1. 안전하게 다음 처리할 게시물 점유 (RPC 호출)
            const { data: claimedPosts, error: claimError } = await supabase
                .rpc('claim_next_pending_post');

            if (claimError) {
                console.error(`[Cron] Claim failed:`, claimError);
                break;
            }

            if (!claimedPosts || claimedPosts.length === 0) {
                break; // 더 이상 처리할 게시물 없음
            }

            const post = claimedPosts[0];
            processedCount++;

            try {
                console.log(`[Cron] Processing claimed post ${post.id} (${post.platform})...`);

                let resultId = "";
                const imageUrls = post.image_urls && post.image_urls.length > 0
                    ? post.image_urls
                    : [post.image_url].filter(Boolean);

                if (post.platform === "instagram") {
                    resultId = await publishToInstagram(imageUrls, post.content);
                } else if (post.platform === "threads") {
                    resultId = await publishToThreads(imageUrls, post.content);
                }

                // 2. 발행 성공 상태 업데이트
                await supabase
                    .from("contents")
                    .update({
                        status: 'published',
                        is_published: true,
                        error_message: null
                    })
                    .eq("id", post.id);

                results.push({ id: post.id, status: "success", resultId });
                console.log(`[Cron] Successfully published post ${post.id}`);

            } catch (publishError: any) {
                console.error(`[Cron] Failed to publish post ${post.id}:`, publishError);

                // 3. 발행 실패 상태 업데이트
                await supabase
                    .from("contents")
                    .update({
                        status: 'failed',
                        error_message: publishError.message
                    })
                    .eq("id", post.id);

                results.push({ id: post.id, status: "error", error: publishError.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        });

    } catch (error: any) {
        console.error("[Cron API Global Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
