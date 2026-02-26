export async function register() {
    // 서버 사이드(Node.js) 런타임에서만 실행되도록 보장
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // 빌드 단계나 스태틱 생성 단계에서는 실행되지 않도록 함
        if (process.env.NEXT_PHASE !== 'phase-production-build') {
            const { startCronWorker } = await import('./lib/cron-worker');
            startCronWorker();
        }
    }
}
