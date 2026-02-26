"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    trigger?: 'persona' | 'blog' | 'calendar' | 'deep_analysis' | 'trial_expired' | 'limit_reached';
    blockedFeature?: string;
}

export function UpgradeModal({
    isOpen,
    onClose,
    trigger = 'blog',
    blockedFeature
}: UpgradeModalProps) {
    const router = useRouter();

    const getMessage = () => {
        switch (trigger) {
            case 'persona': return "페르소나 마케팅은 Pro 전용이에요";
            case 'blog': return "블로그 발행은 Pro에서 가능해요";
            case 'calendar': return "마케팅 캘린더로 전략적 발행하세요";
            case 'deep_analysis': return "심화 분석으로 경쟁력을 높이세요";
            case 'trial_expired': return "무료 체험이 종료되었어요";
            case 'limit_reached': return "이번 달 발행 한도를 모두 사용했어요";
            default: return blockedFeature ? `[${blockedFeature}] 기능은 Pro 요금제 전용입니다` : "Pro 기능이 필요하신가요?";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-hidden border-none shadow-2xl">
                <DialogHeader className="space-y-4 pt-4">
                    <div className="mx-auto bg-indigo-50 p-4 rounded-full w-fit animate-pulse">
                        <Crown className="h-10 w-10 text-indigo-600" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">
                        {getMessage()}
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-500 font-medium">
                        프로 요금제로 업그레이드하고 <br />전문적인 마케팅 기능을 모두 이용해보세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 my-2 border border-indigo-100 space-y-3">
                    <div className="flex items-center gap-3 text-sm font-bold text-indigo-900">
                        <CheckCircle2 className="h-5 w-5 text-indigo-500 fill-indigo-100" />
                        <span>블로그 + 인스타 + 스레드 월 90건 발행</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-indigo-900">
                        <CheckCircle2 className="h-5 w-5 text-indigo-500 fill-indigo-100" />
                        <span>직장인·커플·학생 등 맞춤 페르소나 마케팅</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-indigo-900">
                        <CheckCircle2 className="h-5 w-5 text-indigo-500 fill-indigo-100" />
                        <span>리뷰 키워드 분석 & 주간 전략 제안</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-indigo-900">
                        <CheckCircle2 className="h-5 w-5 text-indigo-500 fill-indigo-100" />
                        <span>마케팅 캘린더로 시즌별 최적 발행</span>
                    </div>
                </div>

                <div className="text-center py-2">
                    <p className="text-xs font-bold text-gray-400">월 230,000원부터 (얼리버드 할인)</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">대행사 비용 대비 1/5 가격으로 압도적인 성과</p>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
                    <Button
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-14 text-lg font-black shadow-lg shadow-indigo-200 rounded-xl"
                        onClick={() => {
                            onClose();
                            router.push("/pricing");
                        }}
                    >
                        <Sparkles className="mr-2 h-5 w-5" />
                        프로 시작하기
                    </Button>
                    <Button variant="ghost" className="text-gray-400 font-bold hover:bg-transparent" onClick={onClose}>
                        나중에 할게요
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
