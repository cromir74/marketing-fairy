import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const body = await request.json();

    // 토스페이먼츠 웹훅 시그니처 검증 로직이 상용 환경에서는 필요합니다.
    const { eventType, data } = body;

    console.log(`[Toss Webhook] Received event: ${eventType}`, data);

    try {
        if (eventType === "PAYMENT_STATUS_CHANGED") {
            const { paymentKey, orderId, status, totalAmount, customerKey, method } = data;

            if (status === "DONE") {
                // 결제 완료 처리
                console.log(`[Toss Webhook] Payment success: ${paymentKey}, orderId: ${orderId}`);

                // 만약 첫 결제가 아닌 정기 결제라면 여기서 기간 갱신 로직을 태울 수 있습니다.
                // 하지만 현재 구조에서는 크론잡에서 승인 후 직접 DB를 업데이트하므로
                // 여기서는 보조적인 상태 확인 용도로 사용합니다.
            } else if (status === "CANCELED") {
                // 결제 취소 처리
                console.log(`[Toss Webhook] Payment canceled: ${paymentKey}`);
            } else if (status === "ABORTED") {
                // 결제 실패 처리
                console.log(`[Toss Webhook] Payment failed: ${paymentKey}`);

                const userId = customerKey;
                if (userId) {
                    await supabase.from("subscriptions").update({
                        status: "payment_failed",
                        updated_at: new Date().toISOString()
                    }).eq("user_id", userId);
                }
            }
        }

        if (eventType === "BILLING_DELETED") {
            const { billingKey, customerKey } = data;
            console.log(`[Toss Webhook] Billing key deleted: ${billingKey} for customer: ${customerKey}`);

            // DB에서 빌링키 정보 삭제 및 구독 중단
            await supabase.from("subscriptions").update({
                billing_key: null,
                status: "canceled",
                updated_at: new Date().toISOString()
            }).eq("user_id", customerKey);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("[Toss Webhook Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
