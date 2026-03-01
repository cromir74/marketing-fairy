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

interface UpgradePopupProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    featureName?: string;
}

export function UpgradePopup({
    isOpen,
    onClose,
    title = "프로 기능이 필요하신가요?",
    description,
    featureName
}: UpgradePopupProps) {
    const router = useRouter();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader className="space-y-3">
                    <div className="mx-auto bg-amber-50 p-3 rounded-full w-fit">
                        <Crown className="h-8 w-8 text-amber-500" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">{title}</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        {description || (
                            <>
                                <span className="font-bold text-indigo-600">[{featureName}]</span> 기능을 사용하시려면<br /> 프로 요금제로 업그레이드가 필요합니다.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-gray-50 rounded-xl p-4 my-4 space-y-2">
                    <p className="text-xs font-bold text-gray-500 mb-2">프로 요금제 혜택:</p>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>심층 플레이스 분석 전략</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>마케팅 캘린더 및 시즌별 추천</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>커스텀 페르소나 및 상황 마케팅 전체</span>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center flex-col gap-2 mt-4">
                    <Button
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-base font-bold shadow-lg shadow-indigo-100"
                        onClick={() => {
                            onClose();
                            router.push("/pricing");
                        }}
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        지금 업그레이드하기
                    </Button>
                    <Button variant="ghost" className="text-gray-400 text-sm" onClick={onClose}>
                        다음에 할게요
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
