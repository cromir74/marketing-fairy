import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // 유저 세션 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log(`[Cancel Subscription] Processing cancellation for user: ${user.id}`);

        // 1. 구독 정보 조회
        const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("status, current_period_end")
            .eq("user_id", user.id)
            .single();

        if (subError || !subscription) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        // 2. 상태 업데이트 (즉시 해지가 아닌 기간 만료 시 중단하도록 설정)
        // 실제로는 'canceled' 상태로 두고 크론잡에서 기간 만료 시 다음 결제를 안 하도록 처리
        const { error: updateError } = await supabase
            .from("subscriptions")
            .update({
                status: "canceled",
                updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);

        if (updateError) {
            console.error("[DB Update Error]", updateError);
            return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "정기 결제가 취소되었습니다. 이번 이용 기간이 지나면 구독이 종료됩니다.",
            expiresAt: subscription.current_period_end
        });

    } catch (error: any) {
        console.error("[Cancellation Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
