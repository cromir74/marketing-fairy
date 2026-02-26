import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchBlogStats } from "@/lib/stats-collector";

export const maxDuration = 300; // 대량 수집 시 시간이 걸릴 수 있음

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 발행된 블로그 포스트들 조회 (최근 10개)
        const { data: posts } = await supabase
            .from("contents")
            .select("*")
            .eq("user_id", user.id)
            .eq("platform", "blog")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(10);

        if (!posts || posts.length === 0) {
            return NextResponse.json({ success: true, message: "업데이트할 포스트가 없습니다." });
        }

        const results = [];
        for (const post of posts) {
            // 주의: 포스트 링크가 있어야 함 (현재 DB에는 link가 없을 수 있음)
            // 임시로 topic 기반 검색이나 저장된 link 활용 로직 필요
            // 만약 link가 없다면 업데이트 건너뜀
            if (post.link) {
                const stats = await fetchBlogStats(post.link);

                // DB 업데이트
                const { error: updateError } = await supabase
                    .from("contents")
                    .update({
                        views: stats.views,
                        likes: stats.likes,
                        comments: stats.comments,
                        last_stats_updated_at: new Date().toISOString()
                    })
                    .eq("id", post.id);

                results.push({ id: post.id, stats, success: !updateError });
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount: results.filter(r => r.success).length,
            details: results
        });

    } catch (error: any) {
        console.error("Stats Refresh Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
