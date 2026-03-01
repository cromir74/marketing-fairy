import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishReelsToInstagram } from "@/lib/publish";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    try {
        const { videoUrl, content, reelsHistoryId } = await request.json();

        if (!videoUrl) {
            return NextResponse.json({ error: "비디오 URL이 필요합니다." }, { status: 400 });
        }

        const resultId = await publishReelsToInstagram(videoUrl, content || "AI가 제작한 릴스입니다 ✨");

        // Update reels_history status if needed
        if (reelsHistoryId) {
            await supabase
                .from("reels_history")
                .update({
                    status: 'published',
                    instagram_post_id: resultId
                })
                .eq("id", reelsHistoryId)
                .eq("user_id", user.id);
        }

        return NextResponse.json({ success: true, id: resultId });

    } catch (error: any) {
        console.error("Reels Publish Error:", error);
        return NextResponse.json({ error: error.message || "인스타그램 발행 중 오류가 발생했습니다." }, { status: 500 });
    }
}
