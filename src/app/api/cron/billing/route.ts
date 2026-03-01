import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    // 크론잡 인증 (예: 유효한 헤더 또는 특정 환경에서의 요청만 허용)
    // const authHeader = request.headers.get('Authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

    try {
        const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
        console.log(`[Cron Billing] Starting renewal process for date: ${today}`);

        // 1. 오늘이 만기일이고 활성 상태인 정기결제 대상 조회
        // current_period_end가 오늘이고 status가 'active'인 사용자
        const { data: dueSubscriptions, error: queryError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("status", "active")
            .gte("current_period_end", `${today}T00:00:00Z`)
            .lt("current_period_end", `${today}T23:59:59Z`)
            .not("billing_key", "is", null);

        if (queryError) {
            console.error("[Cron Billing] Query error:", queryError);
            return NextResponse.json({ error: queryError.message }, { status: 500 });
        }

        if (!dueSubscriptions || dueSubscriptions.length === 0) {
            console.log("[Cron Billing] No subscriptions due for renewal today.");
            return NextResponse.json({ processed: 0, message: "No due subscriptions" });
        }

        console.log(`[Cron Billing] Found ${dueSubscriptions.length} subscriptions to renew.`);

        const results = {
            total: dueSubscriptions.length,
            success: 0,
            failed: 0,
            details: [] as any[]
        };

        const secretKey = process.env.TOSS_SECRET_KEY;
        const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

        for (const sub of dueSubscriptions) {
            try {
                const amount = sub.plan === "pro" ? 230000 : 120000;
                const orderId = `renew_${sub.user_id.slice(0, 8)}_${Date.now()}`;
                const orderName = `[정기결제] 마케팅 요정 ${sub.plan.toUpperCase()} 요금제`;

                console.log(`[Cron Billing] Processing renewal for user: ${sub.user_id}, amount: ${amount}`);

                // 2. 빌링 승인 API 호출
                const response = await fetch(`https://api.tosspayments.com/v1/billing/${sub.billing_key}`, {
                    method: "POST",
                    headers: {
                        Authorization: `Basic ${encodedKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        customerKey: sub.user_id,
                        amount,
                        orderId,
                        orderName,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error(`[Cron Billing] Payment failed for user: ${sub.user_id}`, data);

                    // 실패 처리 (3일 유예기간 등은 추후 구현, 우선 상태만 변경)
                    await supabase.from("subscriptions").update({
                        status: "payment_failed",
                        updated_at: new Date().toISOString()
                    }).eq("user_id", sub.user_id);

                    results.failed++;
                    results.details.push({ userId: sub.user_id, status: "failed", error: data.message });
                    continue;
                }

                // 3. 결제 성공 시 기간 갱신
                const newPeriodStart = new Date();
                const newPeriodEnd = new Date();
                newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

                await supabase.from("subscriptions").update({
                    current_period_start: newPeriodStart.toISOString(),
                    current_period_end: newPeriodEnd.toISOString(),
                    updated_at: new Date().toISOString()
                }).eq("user_id", sub.user_id);

                // 4. 새로운 기간의 사용량 한도 테이블 생성/업데이트
                await supabase.from("usage_limits").upsert({
                    user_id: sub.user_id,
                    period_start: newPeriodStart.toISOString(),
                    period_end: newPeriodEnd.toISOString(),
                    instagram_count: 0,
                    threads_count: 0,
                }, { onConflict: 'user_id,period_start' });

                results.success++;
                results.details.push({ userId: sub.user_id, status: "success", paymentKey: data.paymentKey });

            } catch (err: any) {
                console.error(`[Cron Billing] Internal error for user: ${sub.user_id}`, err);
                results.failed++;
                results.details.push({ userId: sub.user_id, status: "error", error: err.message });
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("[Cron Billing Global Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
