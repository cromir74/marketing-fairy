export function startCronWorker() {
    console.log("[Cron Worker] Starting background worker...");

    // 서버 시작 후 잠시 대기했다가 첫 실행 (서버가 완전히 뜰 시간을 줌)
    setTimeout(() => {
        pingCron();
    }, 10000);

    // 1분(60,000ms)마다 주기적으로 호출
    setInterval(() => {
        pingCron();
    }, 60000);
}

async function pingCron() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const publishUrl = `${baseUrl}/api/cron/publish`;
    const billingUrl = `${baseUrl}/api/cron/billing`;

    // 콘텐츠 발행 크론
    try {
        console.log(`[Cron Worker] Pinging publish API: ${publishUrl}`);
        const res = await fetch(publishUrl);
        if (res.ok) {
            const data = await res.json();
            if (data && data.processed > 0) {
                console.log(`[Cron Worker] Successfully processed ${data.processed} posts.`);
            }
        }
    } catch (error: any) {
        console.error("[Cron Worker] Publish ping failed:", error.message);
    }

    // 정기 결제 크론 (매 시간 호출하여 당일 결제 대상 처리)
    try {
        console.log(`[Cron Worker] Pinging billing API: ${billingUrl}`);
        const res = await fetch(billingUrl);
        if (res.ok) {
            const data = await res.json();
            if (data && data.success > 0) {
                console.log(`[Cron Worker] Successfully renewed ${data.success} subscriptions.`);
            }
        }
    } catch (error: any) {
        console.error("[Cron Worker] Billing ping failed:", error.message);
    }
}
