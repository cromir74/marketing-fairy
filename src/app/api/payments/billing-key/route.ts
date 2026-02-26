import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { authKey, customerKey } = await request.json();

    if (!authKey || !customerKey) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    try {
        console.log(`[Billing Key] Issuing billing key for customer: ${customerKey}`);

        const response = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
            method: "POST",
            headers: {
                Authorization: `Basic ${encodedKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                authKey,
                customerKey,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Toss API Error]", data);
            return NextResponse.json({ error: data.message || "Failed to issue billing key" }, { status: response.status });
        }

        const { billingKey, card } = data;

        // DB에 빌링키 저장
        const { error: dbError } = await supabase
            .from("subscriptions")
            .upsert({
                user_id: customerKey,
                billing_key: billingKey,
                customer_key: customerKey,
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
