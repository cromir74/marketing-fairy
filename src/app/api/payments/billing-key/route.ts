import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { authKey, customerKey } = await request.json();

    if (!authKey || !customerKey) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const normalizedCustomerKey = customerKey.trim();
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
        console.error("[Billing Key] TOSS_SECRET_KEY is missing in environment variables!");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    try {
        console.log(`[Billing Key] Process starting for customer: ${normalizedCustomerKey}`);

        // 0. 이미 빌링키가 등록되어 있는지 선확인 (멱등성 처리)
        const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("billing_key")
            .eq("user_id", normalizedCustomerKey)
            .single();

        if (existingSub?.billing_key) {
            console.log(`[Billing Key] Billing key already exists for user: ${normalizedCustomerKey}. Skipping Toss API call.`);
            return NextResponse.json({
                success: true,
                message: "Existing billing key found",
                isExisting: true
            });
        }

        console.log(`- authKey: ${authKey?.trim()?.substring(0, 10)}...`);
        console.log(`- secretKey check: ${secretKey.startsWith("test_sk") ? "TEST MODE" : "LIVE MODE"}`);

        const tossUrl = "https://api.tosspayments.com/v1/billing/authorizations/issue";
        const requestBody = { authKey: authKey.trim(), customerKey: normalizedCustomerKey };

        console.log(`[Billing Key] Requesting Toss API: ${tossUrl}`);

        const response = await fetch(tossUrl, {
            method: "POST",
            headers: {
                Authorization: `Basic ${encodedKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Billing Key] Toss API Error Response:", {
                status: response.status,
                data: data
            });
            return NextResponse.json({
                error: data.message || "Failed to issue billing key",
                code: data.code || "UNKNOWN_ERROR"
            }, { status: response.status });
        }

        console.log("[Billing Key] Successfully issued billing key from Toss.");


        const { billingKey, card } = data;

        // DB에 빌링키 저장
        const { error: dbError } = await supabase
            .from("subscriptions")
            .upsert({
                user_id: normalizedCustomerKey,
                billing_key: billingKey,
                customer_key: normalizedCustomerKey,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (dbError) {
            console.error("[DB Error]", dbError);
            return NextResponse.json({ error: "Failed to store billing key" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            billingKey: billingKey,
            cardCompany: card.company,
            cardNumber: card.number
        });

    } catch (error: any) {
        console.error("[Billing Key Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
