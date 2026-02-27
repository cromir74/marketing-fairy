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
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mb-24 w-full box-border">
                {/* Basic Plan */}
                <div className="bg-white rounded-[2rem] p-5 sm:p-10 border border-gray-200 shadow-xl shadow-gray-100/50 flex flex-col hover:border-primary-200 transition-all w-full box-border">
                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">베이직</h3>
                            <p className="text-gray-500 text-sm font-medium">SNS 자동화의 시작</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl">
                            <Zap className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    <div className="mb-6 sm:mb-8">
                        <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                            <span className="text-gray-400 line-through text-sm sm:text-lg font-bold">₩150,000</span>
                            <span className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">₩120,000</span>
                            <span className="text-gray-500 text-xs sm:text-sm font-bold">/월</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold text-primary-600 mt-2 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            선착순 1차 얼리버드 할인가 적용
                        </p>
                    </div>

                    <Button
                        variant="secondary"
                        className="w-full h-14 text-sm sm:text-base font-bold bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100 transition-all rounded-2xl"
                        onClick={() => handlePayment("basic")}
                    >
                        베이직 시작하기
                    </Button>

                    <div className="mt-8 space-y-4 flex-grow">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">포함된 기능:</p>
                        <ul className="space-y-3.5 flex-col">
                            <FeatureItem text="AI 마케팅 글 자동 생성" />
                            <FeatureItem text="인스타그램 자동 발행 (월 30건)" />
                            <FeatureItem text="스레드 자동 발행 (월 30건)" />
                            <FeatureItem text="네이버 플레이스 기본 분석" />
                            <FeatureItem text="예약 발행 및 법적 규제 검토" />
                            <div className="pt-2 space-y-3.5">
                                <FeatureItem text="네이버 블로그 발행" disabled />
                                <FeatureItem text="마케팅 캘린더 (시즌/요일 전략)" disabled />
                            </div>
                        </ul>
                    </div>
                </div>

                {/* Pro Plan */}
                <div className="bg-white rounded-[2rem] p-5 sm:p-10 border-2 border-primary-500 shadow-2xl shadow-primary-100/50 flex flex-col md:scale-105 relative z-10 transition-all w-full box-border mt-4 md:mt-0">
                    <div className="absolute -top-3 right-6 bg-gray-900 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-yellow-400" fill="currentColor" />
                        가장 인기
                    </div>

                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">프로</h3>
                            <div className="flex flex-col gap-1">
                                <p className="text-primary-600 text-sm font-bold">완벽한 AI 마케팅 솔루션</p>
                                {!loading && earlybird.tier1 > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-black animate-pulse border border-red-100">
                                            얼리버드 이벤트 선착순 진행 중!
                                        </span>
                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-black">
                                            남은 자리: {earlybird.tier1}명
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-primary-50 p-2 rounded-xl">
                            <Crown className="h-5 w-5 text-primary-600" />
                        </div>
                    </div>

                    <div className="mb-6 sm:mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                            <span className="text-gray-400 line-through text-sm sm:text-lg font-bold">₩290,000</span>
                            <span className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight">₩230,000</span>
                            <span className="text-gray-500 text-xs sm:text-sm font-bold">/월</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold text-primary-600 mt-2 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            선착순 1차 얼리버드 특별 할인가 (평생 할인)
                        </p>
                    </div>

                    <Button
                        className="w-full h-14 text-sm sm:text-base font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 rounded-2xl transition-all"
                        onClick={() => handlePayment("pro")}
                    >
                        프로 시작하기
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <div className="mt-8 space-y-4 flex-grow bg-primary-50/30 -mx-5 -mb-5 sm:-mx-10 sm:-mb-10 p-5 sm:p-10 rounded-b-[2rem]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">베이직의 모든 기능 +</p>
                        <ul className="space-y-3.5 flex-col">
                            <FeatureItem text="네이버 블로그 자동 발행 (월 30건)" highlight />
                            <FeatureItem text="마케팅 캘린더 (시즌/요일 전략 제안)" highlight />
                            <FeatureItem text="페르소나 마케팅 전체 (기본 + 확장 + 커스텀)" highlight />
                            <FeatureItem text="네이버 플레이스 심화 분석" highlight />
                        </ul>
                    </div>
                </div>
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
        <div className={`flex items-start gap-2 sm:gap-3 ${disabled ? "opacity-30" : "opacity-100"}`}>
            <div className={`shrink-0 mt-0.5`}>
                {icon ? icon : (
                    disabled ? <X className="h-4 w-4 text-gray-400" /> : <Check className={`h-4 w-4 ${highlight ? "text-primary-600" : "text-emerald-500"}`} />
                )}
            </div>
            <span className={`text-[13px] sm:text-sm flex-1 break-keep leading-[1.3] ${highlight ? "font-bold text-gray-900" : "text-gray-600"} ${disabled ? "line-through" : ""}`}>
                {text}
            </span>
        </div>
    );
}
