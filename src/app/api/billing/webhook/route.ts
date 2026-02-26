import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 토스페이먼츠 웹훅 핸들러
 * 결제 승인, 빌링키 발급, 정기결제 성공/실패 등 처리
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const body = await request.json();

    // 토스페이먼츠 웹훅 시그니처 검증 로직이 상용 환경에서는 필요합니다.
    const { eventType, data } = body;

    console.log(`[Billing Webhook] Received event: ${eventType}`, data);

    try {
        if (eventType === "PAYMENT_STATUS_CHANGED") {
            const { paymentKey, orderId, status, totalAmount, customerKey } = data;

            if (status === "DONE") {
                // 1. 유저 ID 추출 (orderId 또는 customerKey에 포함됨)
                const userId = customerKey; // 관례적으로 customerKey에 유저 UUID 사용

                // 2. 구독 정보 업데이트
                const { data: currentSub } = await supabase
                    .from("subscriptions")
                    .select("*")
                    .eq("user_id", userId)
                    .single();

                // 기존 구독이 있다면 갱신, 없으면 생성
                const nextPeriodStart = new Date();
                const nextPeriodEnd = new Date();
                nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

                await supabase.from("subscriptions").upsert({
                    user_id: userId,
                    plan: totalAmount >= 200000 ? "pro" : "basic", // 금액에 따른 플랜 결정 (간이 로직)
                    status: "active",
                    current_period_start: nextPeriodStart.toISOString(),
                    current_period_end: nextPeriodEnd.toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

                console.log(`[Billing Webhook] Subscription activated for user: ${userId}`);
            }
        }

        // 빌링키 발급 성공 시 (정기결제 준비 완료)
        if (eventType === "BILLING_KEY_ISSUED") {
            // 빌링키를 유저 테이블이나 별도 테이블에 저장하여 정기 결제 시 사용
            const { billingKey, customerKey } = data;
            // logic to save billingKey...
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("[Billing Webhook Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
