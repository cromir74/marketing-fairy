"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, ChevronRight, BookOpen, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSmartRecommendation, getStatusStyle } from "./CalendarRecommend";
import Link from "next/link";

interface DayBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    day: number;
    month: number;
    year: number;
    contents: any[];
    store: any;
    recommendation: any;
}

export default function DayBottomSheet({ isOpen, onClose, day, month, year, contents, store, recommendation }: DayBottomSheetProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setTimeout(() => setIsVisible(true), 10);
        } else {
            document.body.style.overflow = "unset";
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const date = new Date(year, month, day);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`relative w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl transition-all duration-300 transform flex flex-col max-h-[85vh]
                ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full md:translate-y-10 opacity-0 scale-95'}`}
            >
                {/* Handle */}
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" onClick={onClose} />

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">
                            {month + 1}월 {day}일 ({dayNames[date.getDay()]})
                        </h2>
                        <p className="text-sm font-bold text-gray-400 mt-0.5">오늘의 마케팅 계획</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 space-y-8 pb-32 custom-scrollbar">
                    {/* 콘텐츠 목록 */}
                    {contents.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">기존 일정</h3>
                            <div className="space-y-3">
                                {contents.map((c, i) => {
                                    const style = getStatusStyle(c.status);
                                    return (
                                        <Link key={i} href={c.platform === 'blog' ? `/automation?reuseId=${c.id}` : `/content/create?reuseId=${c.id}`} className="block">
                                            <div className={`p-4 rounded-3xl border ${style.border} ${style.bg} flex items-center justify-between shadow-sm`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-2xl">{style.icon}</div>
                                                    <div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>{style.label}</span>
                                                        <p className="text-base font-bold text-gray-900">{c.topic}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="text-gray-400" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* AI 추천 */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">AI 마케팅 추천</h3>
                        <div className={`p-8 rounded-[32px] border-2 border-dashed relative overflow-hidden ${recommendation.type === 'holiday' ? 'border-red-100 bg-red-50/30' : 'border-primary-100 bg-primary-50/30'}`}>
                            <div className="absolute -top-4 -right-4 text-8xl opacity-10 rotate-12">{recommendation.icon}</div>

                            <div className="relative z-10 space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm">
                                    <Sparkles size={14} className="text-primary-600" />
                                    <span className="text-[10px] font-black text-primary-800 tracking-wider">SMART RECOMMEND</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900 leading-tight">
                                    {recommendation.topic}
                                </p>
                                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                                    이 주제로 관련 게시물을 작성해보세요. <br />
                                    손쉽게 사장님의 매장을 홍보할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-10">
                    <div className="flex gap-3">
                        <Link href={`/automation?topic=${encodeURIComponent(recommendation.topic)}&date=${year}-${month + 1}-${day}`} className="flex-1">
                            <Button className="w-full h-14 bg-white border-2 border-gray-100 text-gray-700 hover:bg-gray-50 rounded-2xl font-black flex items-center justify-center gap-2" variant="secondary">
                                <BookOpen size={20} />
                                블로그 글쓰기
                            </Button>
                        </Link>
                        <Link href={`/content/create?topic=${encodeURIComponent(recommendation.topic)}&date=${year}-${month + 1}-${day}`} className="flex-1">
                            <Button className="w-full h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-black shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2">
                                <Share2 size={20} />
                                SNS 글쓰기
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
