"use client";

import React, { useState, useEffect } from "react";
import {
    Check,
    X,
    Sparkles,
    Crown,
    ArrowRight,
    AlertCircle,
    BadgePercent,
    Infinity,
    Zap,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";

export default function PricingPage() {
    const [earlybird, setEarlybird] = useState<{ tier1: number, tier2: number }>({ tier1: 0, tier2: 0 });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient();

            // 유저 정보 조회
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            // 카운터 조회
            const { data } = await supabase.from("earlybird_counter").select("*");
            if (data) {
                const counters = data.reduce((acc: any, curr: any) => {
                    // DB의 tier가 숫자(1, 2)인 경우 tier1, tier2로 키를 변환하여 저장
                    const key = typeof curr.tier === 'number' ? `tier${curr.tier}` : curr.tier;
                    acc[key] = curr.max_count - curr.current_count;
                    return acc;
                }, {});
                setEarlybird(counters);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    const handlePayment = async (plan: string) => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        if (!["basic", "pro"].includes(plan)) {
            alert("올바르지 않은 요금제 선택입니다.");
            return;
        }

        try {
            console.log(`Starting billing registration for plan: ${plan}, user: ${user.id}`);
            const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);

            // 정기결제의 경우 빌링 등록창을 띄웁니다.
            console.log(`[Pricing Page] Initializing payment with customerKey: ${user.id}`);
            const payment = tossPayments.payment({ customerKey: user.id });

            // successUrl에 플랜 정보를 전달하여 후속 처리(빌링키 발급 및 첫 결제)에서 사용합니다.
            const successUrl = `${window.location.origin}/pricing/success?plan=${plan}`;
            const failUrl = `${window.location.origin}/pricing/fail`;

            console.log(`Requesting billing auth for ${plan}, successUrl: ${successUrl}`);

            await payment.requestBillingAuth({
                method: "CARD",
                successUrl: successUrl,
                failUrl: failUrl,
                customerName: user.email?.split("@")[0] || "고객님",
                customerEmail: user.email,
            });

        } catch (error: any) {
            if (error.code === "USER_CANCEL") {
                console.log("User canceled the billing registration.");
                return;
            }

            console.error("Payment Request Error Detail:", {
                message: error.message,
                code: error.code,
                error: error
            });
            alert(`결제 요청 중 오류가 발생했습니다: ${error.message || "알 수 없는 에러"}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfcfd] py-16 px-4 md:py-24 overflow-x-hidden w-full max-w-[100vw] box-border">
            {/* Header */}
            <div className="max-w-4xl mx-auto text-center mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold animate-bounce">
                    <BadgePercent className="h-4 w-4" />
                    얼리버드 이벤트 선착순 진행 중!
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                    사장님의 마케팅 전문가,<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">마케팅 요정</span>을 선택하세요
                </h1>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                    복잡한 마케팅, 이제 AI에게 맡기세요. <br className="hidden md:block" />
                    지금 가입하시면 평생 할인된 가격으로 이용하실 수 있습니다.
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 sm:gap-8 mb-24 w-full box-border">
                {/* Basic Plan */}
                <Card isHoverable className="relative overflow-hidden border-gray-200 bg-white shadow-xl shadow-gray-100/50 flex flex-col group hover:border-primary-200 transition-all duration-300 w-full max-w-full box-border">
                    <div className="p-5 sm:p-8 pb-0">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">베이직</h3>
                                <p className="text-sm text-gray-500">SNS 자동화의 시작</p>
                            </div>
                            <div className="bg-gray-100 p-2 rounded-xl">
                                <Zap className="h-5 w-5 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-1 mb-6 sm:mb-8">
                            <div className="flex items-baseline gap-1.5 sm:gap-2">
                                <span className="text-gray-400 line-through text-sm sm:text-lg">150,000원</span>
                                <span className="text-2xl sm:text-4xl font-black text-gray-900 shrink">120,000원</span>
                                <span className="text-gray-500 font-medium shrink-0">/ 월</span>
                            </div>
                            <p className="text-xs font-bold text-primary-600 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                선착순 1차 얼리버드 할인가 적용
                            </p>
                        </div>

                        <Button
                            variant="secondary"
                            className="w-full h-14 text-sm sm:text-base font-bold border-2 hover:bg-gray-50 transition-colors"
                            onClick={() => handlePayment("basic")}
                        >
                            베이직 시작하기
                        </Button>
                    </div>

                    <div className="p-5 sm:p-8 space-y-4 flex-grow">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">포함된 기능:</p>
                        <div className="space-y-4">
                            <FeatureItem text="AI 마케팅 글 자동 생성" />
                            <FeatureItem text="인스타그램 자동 발행 (월 30건)" />
                            <FeatureItem text="스레드 자동 발행 (월 30건)" />
                            <FeatureItem text="네이버 플레이스 기본 분석 (상호명·평점·영업시간)" />
                            <FeatureItem text="예약 발행 및 법적 규제 검토" />

                            <div className="pt-2 space-y-4">
                                <FeatureItem text='페르소나 마케팅 ("모두" 단일만 가능)' disabled />
                                <FeatureItem text="네이버 블로그 발행" disabled />
                                <FeatureItem text="마케팅 캘린더 (시즌/요일 전략)" disabled />
                                <FeatureItem text="플레이스 심화 분석" disabled />
                                <FeatureItem text="커스텀 페르소나" disabled />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Pro Plan */}
                <Card isHoverable className="relative overflow-hidden border-2 border-primary-600 bg-white shadow-2xl shadow-primary-100/50 flex flex-col md:scale-105 z-10 transition-all duration-300 w-full max-w-full box-border mt-4 md:mt-0">
                    <div className="absolute top-0 right-0 bg-primary-600 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-bl-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        가장 인기
                    </div>

                    <div className="p-5 sm:p-8 pb-0 mt-6 sm:mt-4">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">프로</h3>
                                <p className="text-sm text-gray-500">완벽한 AI 마케팅 솔루션</p>
                            </div>
                            <div className="bg-primary-100 p-2 rounded-xl">
                                <Crown className="h-5 w-5 text-primary-600" />
                            </div>
                        </div>

                        <div className="space-y-1 mb-6 sm:mb-8">
                            <div className="flex items-baseline gap-1.5 sm:gap-2">
                                <span className="text-gray-400 line-through text-sm sm:text-lg">290,000원</span>
                                <span className="text-2xl sm:text-4xl font-black text-gray-900 shrink">230,000원</span>
                                <span className="text-gray-500 font-medium shrink-0">/ 월</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-primary-600 flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    선착순 1차 얼리버드 특별 할인가 (평생 할인)
                                </p>
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                    {loading ? "조회 중..." : `남은 자리: ${earlybird.tier1}명`}
                                </span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 text-sm sm:text-base font-bold bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-200"
                            onClick={() => handlePayment("pro")}
                        >
                            프로 시작하기
                            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                    </div>

                    <div className="p-5 sm:p-8 space-y-4 flex-grow bg-primary-50/30">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">베이직의 모든 기능 +</p>
                        <div className="space-y-4">
                            <FeatureItem text="네이버 블로그 자동 발행 (월 30건)" highlight />
                            <FeatureItem text="마케팅 캘린더 (시즌/요일 전략 제안)" highlight />
                            <FeatureItem text="페르소나 마케팅 전체 (기본 + 확장 + 커스텀)" highlight />
                            <FeatureItem text="네이버 플레이스 심화 분석 (리뷰 키워드·경쟁 비교·주간 전략)" highlight />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Bottom Info */}
            <div className="max-w-3xl mx-auto rounded-3xl border border-gray-100 bg-gray-50/50 p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <AlertCircle className="h-10 w-10 text-primary-500" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">자주 묻는 질문</h4>
                    <p className="text-sm text-gray-500">
                        얼리버드 가격은 평생 유지되나요? **네, 가입하신 시점의 할인가가 해지 전까지 평생 고정됩니다.** <br />
                        해지는 언제든 가능하며, 남은 기간 동안은 모든 기능을 그대로 이용하실 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ text, disabled = false, highlight = false, icon }: { text: string, disabled?: boolean, highlight?: boolean, icon?: React.ReactNode }) {
    return (
        <div className={`flex items-start gap-2.5 sm:gap-3 ${disabled ? "opacity-30" : "opacity-100"}`}>
            <div className="shrink-0 mt-0.5">
                {icon ? icon : (
                    disabled ? <X className="h-4 w-4 text-gray-400" /> : <Check className={`h-4 w-4 ${highlight ? "text-primary-600" : "text-emerald-500"}`} />
                )}
            </div>
            <span className={`text-xs sm:text-sm flex-1 break-keep leading-[1.4] ${highlight ? "font-bold text-gray-900" : "text-gray-600"} ${disabled ? "line-through" : ""}`}>
                {text}
            </span>
        </div>
    );
}
