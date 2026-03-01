import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { userId, plan } = await request.json();

    if (!userId || !plan) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    try {
        // 1. 빌링키 조회
        const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("billing_key")
            .eq("user_id", userId)
            .single();

        if (subError || !subscription?.billing_key) {
            console.error(`[Confirm Payment] Billing key not found for user: ${userId}. Error:`, subError);
            return NextResponse.json({
                error: "Billing key not found for user",
                message: "빌링키를 찾을 수 없습니다. 결제 수단 등록이 선행되어야 합니다."
            }, { status: 404 });
        }

        const billingKey = subscription.billing_key;
        const secretKey = process.env.TOSS_SECRET_KEY;
        const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

        // 2. 결제 금액 및 주문 정보 설정
        const amount = plan === "pro" ? 230000 : 120000;
        const orderId = `first_${userId.slice(0, 8)}_${Date.now()}`;
        const orderName = plan === "pro" ? "마케팅 요정 프로 요금제 (얼리버드)" : "마케팅 요정 베이직 요금제 (얼리버드)";

        console.log(`[Confirm Payment] Executing first payment for user: ${userId}, plan: ${plan}, amount: ${amount}`);

        // 3. 빌링 승인 API 호출
        const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${encodedKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                customerKey: userId,
                amount,
                orderId,
                orderName,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Toss API Error]", data);
            return NextResponse.json({ error: data.message || "Payment approval failed" }, { status: response.status });
        }

        // 4. 구독 상태 업데이트
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const { error: updateError } = await supabase
            .from("subscriptions")
            .update({
                plan,
                status: "active",
                current_period_start: periodStart.toISOString(),
                current_period_end: periodEnd.toISOString(),
                toss_order_id: data.orderId,
                updated_at: new Date().toISOString()
            })
            .eq("user_id", userId);

        if (updateError) {
            console.error("[DB Update Error]", updateError);
            // 결제는 성공했으나 DB 업데이트 실패 상황 -> 로그 남기고 수동 처리 필요할 수 있음
        }

        // 5. 사용량 한도 테이블 초기화
        await supabase.from("usage_limits").upsert({
            user_id: userId,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            instagram_count: 0,
            threads_count: 0,
        }, { onConflict: 'user_id,period_start' });

        // 6. 얼리버드 카운터 업데이트
        const tier = plan === "pro" ? 1 : 2;
        const { data: counter } = await supabase
            .from("earlybird_counter")
            .select("current_count")
            .eq("tier", tier)
            .single();

        if (counter) {
            await supabase
                .from("earlybird_counter")
                .update({ current_count: counter.current_count + 1 })
                .eq("tier", tier);
        }

        return NextResponse.json({
            success: true,
            paymentKey: data.paymentKey,
            orderId: data.orderId,
            amount: data.totalAmount
        });

    } catch (error: any) {
        console.error(`[Payment Confirm Error] User: ${userId}, Plan: ${plan}:`, error);
        return NextResponse.json({
            error: error.message || "Internal Server Error",
            detail: "DB 업데이트 또는 승인 프로세스 중 오류가 발생했습니다."
        }, { status: 500 });
    }
}
