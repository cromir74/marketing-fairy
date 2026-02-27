"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

import { PRO_ONLY_FEATURES } from "@/lib/feature-gate";

interface SubscriptionContextType {
    subscription: any;
    usage: any;
    dailyPublishUsage: { instagram: number; threads: number };
    loading: boolean;
    refresh: () => Promise<void>;
    checkAccess: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const [subscription, setSubscription] = useState<any>(null);
    const [usage, setUsage] = useState<any>(null);
    const [dailyPublishUsage, setDailyPublishUsage] = useState({ instagram: 0, threads: 0 });
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchSubscription = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 구독 정보 조회
        const { data: sub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .single();

        setSubscription(sub);

        if (sub) {
            // 사용량 조회 (현재 기간 기준) - 406 오류 방지를 위해 .single() 대신 limit(1) 사용
            const { data: use } = await supabase
                .from("usage_limits")
                .select("*")
                .eq("user_id", user.id)
                .eq("period_start", sub.current_period_start)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            setUsage(use);

            // 무료체험의 경우 일일 사용량 조회
            if (sub.plan === 'trial' || sub.plan === 'free_trial') {
                const today = new Date().toLocaleDateString('en-CA');
                const { data: daily } = await supabase
                    .from("daily_publish_usage")
                    .select("instagram_count, threads_count")
                    .eq("user_id", user.id)
                    .eq("date", today)
                    .maybeSingle();
                if (daily) {
                    setDailyPublishUsage({ instagram: daily.instagram_count || 0, threads: daily.threads_count || 0 });
                }
            }
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const checkAccess = (feature: string) => {
        if (!subscription) return false;
        if (subscription.plan === 'admin') return true;

        if (PRO_ONLY_FEATURES.includes(feature)) {
            return subscription.plan === 'pro';
        }
        return true;
    };

    return (
        <SubscriptionContext.Provider value={{ subscription, usage, dailyPublishUsage, loading, refresh: fetchSubscription, checkAccess }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error("useSubscription must be used within a SubscriptionProvider");
    }
    return context;
};
