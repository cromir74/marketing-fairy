"use client";

import { useEffect, useState } from "react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Calendar, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TrialManager({ children }: { children: React.ReactNode }) {
    const { subscription, loading } = useSubscription();
    const [dailyUsage, setDailyUsage] = useState({ instagram: 0, threads: 0 });
    const [showWelcome, setShowWelcome] = useState(false);

    const isTrial = subscription?.plan === "trial" || subscription?.plan === "free_trial";
    const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
    const now = new Date();
    const daysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isExpired = isTrial && daysLeft <= 0;

    useEffect(() => {
        if (!isTrial || isExpired || !subscription?.user_id) return;

        async function fetchDailyUsage() {
            const supabase = createClient();
            const today = new Date().toLocaleDateString('en-CA');
            const { data } = await supabase
                .from("daily_publish_usage")
                .select("instagram_count, threads_count")
                .eq("user_id", subscription.user_id)
                .eq("date", today)
                .single();

            if (data) {
                setDailyUsage({
                    instagram: data.instagram_count || 0,
                    threads: data.threads_count || 0,
                });
            }
        }
        fetchDailyUsage();
    }, [isTrial, isExpired, subscription?.user_id]);

    useEffect(() => {
        if (isTrial && !isExpired) {
            const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
            if (!hasSeenWelcome && daysLeft === 7) {
                setShowWelcome(true);
            }
        }
    }, [isTrial, isExpired, daysLeft]);

    const closeWelcome = () => {
        localStorage.setItem('hasSeenWelcomeModal', 'true');
        setShowWelcome(false);
    };

    if (loading) return <>{children}</>;

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Trial Banner */}
            {isTrial && !isExpired && (
                <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-purple-600 to-indigo-600 pr-4 pl-14 lg:px-4 py-2.5 shadow-md flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 text-white text-sm font-medium shrink overflow-hidden">
                        <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0">
                            <Sparkles className="h-3 w-3 text-yellow-300" />
                            <span className="hidden xs:inline">무료 체험 중 | </span>D-{daysLeft}
                        </span>
                        <span className="hidden sm:inline opacity-90 text-[13px] whitespace-nowrap">
                            오늘 발행: 인스타 {Math.min(dailyUsage.instagram, 1)}/1 · 스레드 {Math.min(dailyUsage.threads, 1)}/1
                        </span>
                    </div>
                    <Link href="/pricing" className="shrink-0">
                        <Button variant="secondary" size="sm" className="h-7 px-2.5 text-[11px] font-bold bg-white text-indigo-700 hover:bg-gray-50 border-none transition-all whitespace-nowrap">
                            플랜 선택<span className="hidden xs:inline">하기</span> &rarr;
                        </Button>
                    </Link>
                </div>
            )}

            {/* Trial Expired Banner (If we want a banner version, but spec says full overlay) */}
            {isExpired && (
                <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 shadow-md flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white text-sm font-bold">
                        <Lock className="h-4 w-4" />
                        무료 체험이 종료되었습니다
                    </div>
                    <Link href="/pricing">
                        <Button variant="secondary" size="sm" className="h-7 text-xs font-bold bg-white text-red-700 hover:bg-gray-50 border-none transition-all">
                            지금 시작하기 &rarr;
                        </Button>
                    </Link>
                </div>
            )}

            {/* Main Content */}
            <div className={`flex-1 ${isExpired ? "pointer-events-none opacity-50 select-none" : ""}`}>
                {children}
            </div>

            {/* Trial Expired Full Overlay */}
            {isExpired && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden pointer-events-auto">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-rose-500"></div>
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <Lock className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
                            무료 체험이 종료되었어요
                        </h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium">
                            체험 기간 동안 만든 콘텐츠는 안전하게 보관되어 있어요.<br />
                            플랜을 선택하면 바로 이어서 사용할 수 있습니다.
                        </p>

                        <div className="space-y-3">
                            <Link href="/pricing" className="block w-full">
                                <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]">
                                    설문 이벤트 5만원 페이백 받기 &rarr;
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Welcome Onboarding Modal */}
            {showWelcome && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10"></div>

                        <div className="relative text-center z-10">
                            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="h-8 w-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
                                환영합니다! 🎉
                            </h2>
                            <p className="text-indigo-600 font-bold mb-6 text-sm">
                                7일간 무료로 마케팅요정을 체험해보세요.
                            </p>

                            <div className="space-y-3 text-left bg-gray-50 p-4 rounded-xl mb-6">
                                <div className="flex items-start gap-2.5">
                                    <div className="bg-white p-1 rounded-md shadow-sm shrink-0">✨</div>
                                    <p className="text-xs font-semibold text-gray-700 mt-1">AI가 마케팅 글을 자동으로 생성해드려요</p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <div className="bg-white p-1 rounded-md shadow-sm shrink-0">📱</div>
                                    <p className="text-xs font-semibold text-gray-700 mt-1">매일 인스타·스레드에 1건씩 발행해보세요</p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <div className="bg-white p-1 rounded-md shadow-sm shrink-0">👑</div>
                                    <p className="text-xs font-semibold text-gray-700 mt-1">프로 플랜의 모든 기능을 미리 확인해보세요</p>
                                </div>
                            </div>

                            <Button onClick={closeWelcome} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold shadow-md shadow-indigo-200">
                                시작하기
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
