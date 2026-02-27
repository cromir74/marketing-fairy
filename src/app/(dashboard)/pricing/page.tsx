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
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mb-24 w-full box-border px-4 sm:px-0">
                {/* Basic Plan */}
                <div className="bg-white rounded-[2rem] p-5 sm:p-10 border border-gray-200 shadow-sm flex flex-col hover:border-primary-200 transition-all w-full max-w-full sm:max-w-none mx-auto box-border overflow-hidden">
                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 font-display">베이직</h3>
                            <p className="text-gray-500 text-sm font-medium">SNS 자동화의 시작</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl">
                            <Zap className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>

                    <div className="mb-6 sm:mb-8">
                        <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                            <span className="text-gray-400 line-through text-sm sm:text-lg font-bold">₩150,000</span>
                            <span className="text-2xl sm:text-4xl md:text-5xl font-display font-black text-gray-900 tracking-tight">₩120,000</span>
                            <span className="text-gray-500 text-xs sm:text-sm font-bold">/월</span>
                        </div>
                    </div>

                    <ul className="space-y-3.5 sm:space-y-5 mb-8 sm:mb-10 flex-grow">
                        <FeatureItem text="AI 마케팅 글 자동 생성" />
                        <FeatureItem text="인스타그램 자동 발행 (월 30건)" />
                        <FeatureItem text="스레드 자동 발행 (월 30건)" />
                        <FeatureItem text="네이버 플레이스 기본 분석" />
                        <FeatureItem text="예약 발행 및 법적 규제 검토" />
                        <FeatureItem text="네이버 블로그 자동 발행" excluded />
                    </ul>

                    <button
                        onClick={() => handlePayment("basic")}
                        className="w-full flex justify-center items-center h-14 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 font-bold hover:bg-gray-100 transition-all"
                    >
                        베이직 시작하기
                    </button>
                </div>

                {/* Pro Plan */}
                <div className="bg-white rounded-[2rem] p-5 sm:p-10 border-2 border-primary-500 shadow-xl shadow-primary-900/10 flex flex-col relative md:-translate-y-4 w-full max-w-full sm:max-w-none mx-auto box-border overflow-hidden">
                    <div className="absolute top-4 right-5 bg-gray-900 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1.5 z-20">
                        <Zap className="w-3 h-3 text-yellow-400" fill="currentColor" />
                        가장 인기
                    </div>

                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 font-display">프로</h3>
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
                            <Sparkles className="h-5 w-5 text-primary-600" />
                        </div>
                    </div>

                    <div className="mb-6 sm:mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                            <span className="text-gray-400 line-through text-sm sm:text-lg font-bold">₩290,000</span>
                            <span className="text-2xl sm:text-4xl md:text-5xl font-display font-black text-gray-900 tracking-tight">₩230,000</span>
                            <span className="text-gray-500 text-xs sm:text-sm font-bold">/월</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold text-primary-600 mt-2 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            선착순 1차 얼리버드 특별 할인가 (평생 할인)
                        </p>
                    </div>

                    <ul className="space-y-3.5 sm:space-y-5 mb-8 sm:mb-10 flex-grow font-medium text-gray-900">
                        <FeatureItem text="베이직의 모든 기능 포함" highlight />
                        <FeatureItem text="네이버 블로그 자동 발행 (월 30건)" highlight />
                        <FeatureItem text="마케팅 캘린더 (시즌/요일 전략)" highlight />
                        <FeatureItem text="페르소나 마케팅 전체 (기본+확장)" highlight />
                        <FeatureItem text="네이버 플레이스 심화 분석" highlight />
                    </ul>

                    <button
                        onClick={() => handlePayment("pro")}
                        className="w-full flex justify-center items-center h-14 rounded-2xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
                    >
                        프로 시작하기
                    </button>
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

function FeatureItem({ text, highlight = false, excluded = false }: { text: string, highlight?: boolean; excluded?: boolean }) {
    return (
        <li className={`flex items-start gap-2 sm:gap-3 ${excluded ? "opacity-50" : ""}`}>
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${highlight ? "bg-primary-100 text-primary-600" : excluded ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {excluded ? <X className="w-3 sm:w-3.5 h-3 sm:h-3.5 font-bold" /> : <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 font-bold" />}
            </div>
            <span className={`flex-1 break-keep [word-break:keep-all] [overflow-wrap:anywhere] leading-[1.3] text-[13px] sm:text-base ${highlight ? "text-gray-900 font-bold" : "text-gray-600 font-medium"} ${excluded ? "line-through text-gray-400" : ""}`}>{text}</span>
        </li>
    );
}
