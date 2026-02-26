"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { CheckCircle2, Sparkles, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import ConfettiEffect from "@/components/ConfettiEffect";

function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refresh } = useSubscription();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const activationStarted = useRef(false);

    // URL 파라미터 로깅 (디버깅용)
    useEffect(() => {
        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            params[key] = value;
        });
        console.log("[Success Page] Redirect Parameters:", params);
    }, [searchParams]);

    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const plan = searchParams.get("plan");

    // 일반 결제 결과 파라미터들
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");

    useEffect(() => {
        if (activationStarted.current) return;

        async function activateSubscription() {
            // 정기 결제 등록(Billing Auth) 결과 확인
            const isBillingAuth = authKey && customerKey;
            // 일반 결제 승인 결과 확인 (필요한 경우)
            const isStandardPayment = paymentKey && orderId && amount;

            if (!isBillingAuth && !isStandardPayment && authKey !== "test") {
                console.error("[Success Page] Missing parameters:", { authKey, customerKey, paymentKey, orderId, amount });
                setStatus("error");
                setErrorMessage("필수 결제 정보가 누락되었습니다. (존재하지 않는 정보입니다)");
                return;
            }

            activationStarted.current = true;

            // [데모용] authKey가 "test"인 경우 실제 API 호출 없이 성공 화면을 보여줍니다.
            if (authKey === "test") {
                setTimeout(() => setStatus("success"), 800);
                return;
            }

            setStatus("loading");

            try {
                if (isBillingAuth) {
                    console.log("[Success Page] Starting billing key issuance...");
                    // 1. 빌링키 발급 및 저장
                    const billingRes = await fetch("/api/payments/billing-key", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ authKey, customerKey }),
                    });

                    const billingData = await billingRes.json();
                    if (!billingRes.ok) {
                        console.error("[Success Page] Billing Key Error:", billingData);
                        throw new Error(billingData.error || "빌링키 발급에 실패했습니다.");
                    }

                    console.log("[Success Page] Billing key issued. Confirming first payment...");
                    // 2. 첫 결제 승인
                    const confirmRes = await fetch("/api/payments/confirm", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: customerKey, plan }),
                    });

                    const confirmData = await confirmRes.json();
                    if (!confirmRes.ok) {
                        console.error("[Success Page] Payment Confirm Error:", confirmData);
                        throw new Error(confirmData.error || "결제 승인에 실패했습니다.");
                    }
                } else if (isStandardPayment) {
                    // 일반 결제인 경우 (현재 마케팅 요정은 빌링 위주이므로 로그만 남김)
                    console.log("[Success Page] Standard payment detected, but billing flow was expected.", { paymentKey, orderId });
                }

                // 3. 전역 구독 상태 새로고침
                try {
                    console.log("[Success Page] Refreshing subscription state...");
                    await refresh();
                } catch (refreshErr) {
                    console.warn("[Success Page] State refresh failed, but payment might be okay:", refreshErr);
                }

                setStatus("success");
            } catch (error: any) {
                console.error("[Success Page] Activation Error:", error);

                // 만약 에러 내용에 "이미 처리된" 등의 내용이 있으면 성공으로 간주할 수도 있음
                // 하지만 일단은 에러 상태로 보냄. 단, 활성화는 되었을 수 있으므로 UI에 대시보드 이동 버튼을 표시할 것.
                setStatus("error");
                setErrorMessage(error.message || "구독 활성화 중 오류가 발생했습니다.");
            }
        }

        activateSubscription();
    }, [authKey, customerKey, plan, paymentKey, orderId, amount, refresh]);

    if (status === "loading") {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 space-y-6">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">구독을 활성화하고 있습니다</h1>
                    <p className="text-gray-500">잠시만 기다려 주세요...</p>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 space-y-8 animate-in fade-in duration-500">
                <div className="bg-red-100 p-4 rounded-full">
                    <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <div className="text-center space-y-4 max-w-sm">
                    <h1 className="text-3xl font-black text-gray-900">오류가 발생했습니다</h1>
                    <p className="text-gray-500 text-lg leading-relaxed">{errorMessage}</p>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-sm text-amber-700 text-left">
                        <p className="font-bold mb-1">참고하세요:</p>
                        결제가 이미 완료되었을 수 있습니다. 잠시 후 대시보드에서 구독 상태가 {plan?.toUpperCase()}로 표시되는지 확인해 주세요.
                    </div>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button
                        size="lg"
                        className="w-full h-14 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl"
                        onClick={() => router.push("/dashboard")}
                    >
                        대시보드로 이동하기
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full h-12 text-gray-500 font-bold"
                        onClick={() => router.push("/pricing")}
                    >
                        요금제 페이지로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            {status === "success" && <ConfettiEffect />}
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-green-500 rounded-full shadow-lg shadow-green-100">
                        <CheckCircle2 className="h-12 w-12 text-white" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">결제가 완료되었습니다!</h1>
                    <p className="text-gray-500 text-lg">
                        이제 마케팅 요정 {plan?.toUpperCase()} 요금제의 <br />
                        모든 기능을 마음껏 이용하실 수 있습니다.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span>활성화된 혜택:</span>
                    </div>
                    <ul className="text-sm text-gray-600 text-left space-y-2">
                        <li className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                            {plan === "pro" ? "네이버 블로그 자동 발행 활성화" : "인스타그램/스레드 자동 발행 활성화"}
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                            {plan === "pro" ? "마케팅 캘린더 전략 제안" : "무제한 AI 글 생성 (베타)"}
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                            {plan === "pro" ? "확장 페르소나 전체 이용 가능" : "기본 페르소나 제공"}
                        </li>
                    </ul>
                </div>

                <Button
                    size="lg"
                    className="w-full h-14 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-2xl"
                    onClick={() => router.push("/content/create")}
                >
                    시작하기
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 space-y-6">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">결제 정보를 불러오고 있습니다</h1>
                    <p className="text-gray-500">잠시만 기다려 주세요...</p>
                </div>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
