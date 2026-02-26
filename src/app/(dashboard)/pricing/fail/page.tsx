"use client";

import React, { Suspense } from "react";
import { XCircle, AlertCircle, ArrowLeft, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentFailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const errorCode = searchParams.get("code");
    const errorMessage = searchParams.get("message");

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse opacity-20"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-red-500 rounded-full shadow-lg shadow-red-100">
                        <XCircle className="h-12 w-12 text-white" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">결제에 실패했습니다.</h1>
                    <p className="text-gray-500 text-lg">
                        결제 처리 중 문제가 발생했습니다. <br />
                        아래 사유를 확인하시고 다시 시도해주세요.
                    </p>
                </div>

                <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-3">
                    <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>실패 사유:</span>
                    </div>
                    <p className="text-sm text-red-600 bg-white p-3 rounded-xl border border-red-100 font-medium">
                        {errorMessage || "알 수 없는 오류가 발생했습니다."}
                        {errorCode && <span className="block text-[10px] mt-1 opacity-50">Error Code: {errorCode}</span>}
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        size="lg"
                        className="w-full h-14 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-2xl"
                        onClick={() => router.push("/pricing")}
                    >
                        <RefreshCcw className="mr-2 h-5 w-5" />
                        다시 시도하기
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-gray-500 font-bold"
                        onClick={() => router.push("/content/create")}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        대시보드로 돌아가기
                    </Button>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                    <Button
                        size="lg"
                        className="w-full h-14 bg-[#FEE500] hover:bg-[#F4DC00] text-[#391B1B] text-lg font-bold rounded-2xl flex items-center justify-center gap-2"
                        onClick={() => window.open('http://pf.kakao.com/_pujqX/chat', '_blank')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.53 1.49 4.78 3.75 6.1l-1.05 3.86c-.05.21.16.39.34.26l4.47-2.92c.8.14 1.63.2 2.49.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                        </svg>
                        고객센터 문의하기
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function PaymentFailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        }>
            <PaymentFailContent />
        </Suspense>
    );
}
