import { createClient } from "@/lib/supabase/server";

/**
 * AI 생성 일일 제한 체크
 * Admin 계정(plan: 'admin')은 무제한 허용
 */
export async function checkAIGenerationLimit(userId: string) {
    const supabase = await createClient();

    // 구독 정보 확인
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", userId)
        .single();

    if (subscription?.plan === 'admin') {
        return { allowed: true };
    }

    const plan = subscription?.plan || 'basic';
    let limit = 30; // 기본/프로는 30
    if (plan === 'free_trial' || plan === 'trial') {
        limit = 10;
    }

    const today = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

    // 오늘 사용량 조회
    const { data: usage } = await supabase
        .from("daily_ai_usage")
        .select("generation_count")
        .eq("user_id", userId)
        .eq("date", today)
        .single();

    const currentCount = usage?.generation_count || 0;

    if (currentCount >= limit) {
        return { allowed: false };
    }

    // 사용량 증가 (UPSERT)
    await supabase
        .from("daily_ai_usage")
        .upsert(
            { user_id: userId, date: today, generation_count: currentCount + 1 },
            { onConflict: 'user_id,date' }
        );

    return { allowed: true };
}

/**
 * 플랫폼별 발행 제한 체크
 */
export async function checkPublishLimit(userId: string, platform: 'instagram' | 'threads') {
    const supabase = await createClient();

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (!subscription) {
        return { allowed: false, message: '구독 정보가 없습니다.' };
    }

    if (subscription.plan === 'admin') {
        return { allowed: true };
    }

    const plan = subscription.plan;
    const isTrial = plan === 'free_trial' || plan === 'trial';

    if (isTrial && subscription.trial_ends_at && new Date() > new Date(subscription.trial_ends_at)) {
        return { allowed: false, reason: 'trial_expired', message: '무료 체험이 종료되었습니다.' };
    }

    const today = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

    if (isTrial) {
        if (platform === 'instagram' || platform === 'threads') {
            // 무료 체험: 인스타그램/스레드 매일 1건
            const { data: dailyUsage } = await supabase
                .from("daily_publish_usage")
                .select("*")
                .eq("user_id", userId)
                .eq("date", today)
                .single();

            const countKey = `${platform}_count` as keyof typeof dailyUsage;
            const currentCount = (dailyUsage?.[countKey] as number) || 0;

            if (currentCount >= 1) {
                return { allowed: false, message: '오늘 발행을 완료했어요. 내일 다시 발행할 수 있어요!' };
            }

            // 사용량 증가
            const updateData: any = { user_id: userId, date: today };
            updateData[countKey] = currentCount + 1;
            await supabase.from("daily_publish_usage").upsert(updateData, { onConflict: 'user_id,date' });

            return { allowed: true };
        }
    } else if (plan === 'basic') {
        return await checkMonthlyUsage(supabase, userId, subscription, platform, 30);
    } else if (plan === 'pro') {
        // 프로: 모든 플랫폼 30건
        return await checkMonthlyUsage(supabase, userId, subscription, platform, 30);
    }

    return { allowed: false, message: '권한이 없습니다.' };
}

async function checkMonthlyUsage(supabase: any, userId: string, subscription: any, platform: string, limit: number) {
    const { data: usage } = await supabase
        .from("usage_limits")
        .select("*")
        .eq("user_id", userId)
        .eq("period_start", subscription.current_period_start)
        .single();

    const countKey = `${platform}_count`;
    const currentCount = (usage?.[countKey] as number) || 0;

    if (currentCount >= limit) {
        return { allowed: false, reason: 'limit_reached' };
        // 모달에서 별도로 표시하므로 메시지는 프론트엔드에서 처리하거나 최소 정보만 반환
    }

    const updateData: any = { user_id: userId, period_start: subscription.current_period_start, period_end: subscription.current_period_end };
    updateData[countKey] = currentCount + 1;

    await supabase
        .from("usage_limits")
        .upsert(updateData, { onConflict: 'user_id,period_start' });

    return { allowed: true };
}

/**
 * 특정 기능(블로그, 캘린더 등) 접근 권한 체크
 */
export async function checkFeatureAccess(userId: string, feature: 'marketing_calendar' | 'extended_persona' | 'custom_persona') {
    const supabase = await createClient();

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", userId)
        .single();

    if (subscription?.plan === 'admin') {
        return { allowed: true };
    }

    const proOnlyFeatures = ['marketing_calendar', 'extended_persona', 'custom_persona'];
    if (proOnlyFeatures.includes(feature) && (!subscription || subscription.plan === 'basic' || subscription.plan === 'free_trial' || subscription.plan === 'trial')) {
        if (subscription?.plan === 'basic') {
            const featureNames: Record<string, string> = {

                marketing_calendar: '마케팅 캘린더',
                extended_persona: '확장 페르소나',
                custom_persona: '커스텀 페르소나'
            };
            return {
                allowed: false,
                reason: 'pro_only',
                message: `${featureNames[feature]}은(는) 프로 요금제 전용 기능입니다.`
            };
        }
    }

    return { allowed: true };
}
