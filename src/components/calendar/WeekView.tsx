"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getSmartRecommendation, getStatusStyle } from "./CalendarRecommend";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface WeekViewProps {
    year: number;
    month: number;
    weekStart: Date;
    contents: any[];
    store: any;
    aiRecommendations: any[];
    onDayClick: (day: number) => void;
    onWeekChange: (newWeekStart: Date) => void;
}

export default function WeekView({ year, month, weekStart, contents, store, aiRecommendations, onDayClick, onWeekChange }: WeekViewProps) {
    const now = new Date();
    const [selectedDay, setSelectedDay] = useState(now.getDate());
    const touchStartX = useRef<number | null>(null);

    // 주의 마지막 날 계산
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    });

    const isToday = (d: Date) =>
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

    const selectedDate = new Date(year, month, selectedDay);
    const dayContents = contents.filter(c => {
        const d = new Date(c.scheduled_at || c.created_at);
        return d.getDate() === selectedDay && d.getMonth() === month && d.getFullYear() === year;
    });

    const dynamicRec = aiRecommendations?.find(r => r.day === selectedDay);
    const recommendation = dynamicRec || getSmartRecommendation(selectedDay, month, year, store?.category || 'other');

    const goToPrevWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        onWeekChange(d);
    };

    const goToNextWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        onWeekChange(d);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNextWeek();
            else goToPrevWeek();
        }
        touchStartX.current = null;
    };

    return (
        <div className="space-y-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {/* 주차 헤더 */}
            <div className="flex items-center justify-between px-2">
                <Button variant="ghost" size="sm" onClick={goToPrevWeek} className="p-0 h-8 w-8"><ChevronLeft size={20} /></Button>
                <div className="text-center">
                    <p className="text-sm font-black text-gray-900">
                        {weekStart.getMonth() + 1}월 {Math.ceil(weekStart.getDate() / 7)}주차
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold">
                        {weekStart.getMonth() + 1}/{weekStart.getDate()} ~ {weekEnd.getMonth() + 1}/{weekEnd.getDate()}
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={goToNextWeek} className="p-0 h-8 w-8"><ChevronRight size={20} /></Button>
            </div>

            {/* 요일 및 날짜 그리드 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-7 mb-4">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                        <div key={day} className={`text-center text-[10px] font-black ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {weekDays.map((d, i) => {
                        const dayNum = d.getDate();
                        const isSel = selectedDay === dayNum;
                        const tdy = isToday(d);

                        // 해당 날짜 콘텐츠 도트
                        const hasPublished = contents.some(c => new Date(c.scheduled_at || c.created_at).getDate() === dayNum && c.status === 'published');
                        const hasScheduled = contents.some(c => new Date(c.scheduled_at || c.created_at).getDate() === dayNum && c.status === 'scheduled');

                        return (
                            <button
                                key={i}
                                onClick={() => {
                                    setSelectedDay(dayNum);
                                    onDayClick(dayNum);
                                }}
                                className={`flex flex-col items-center py-2 relative rounded-2xl transition-all ${isSel ? 'bg-primary-50/50 ring-1 ring-primary-100' : ''}`}
                            >
                                <span className={`text-sm font-bold tabular-nums mb-1 ${tdy ? 'bg-primary-500 text-white h-7 w-7 flex items-center justify-center rounded-full shadow-sm' : isSel ? 'text-primary-600' : 'text-gray-600'}`}>
                                    {dayNum}
                                </span>
                                <div className="flex gap-0.5 h-1">
                                    {hasPublished && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                                    {hasScheduled && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 선택된 날짜 콘텐츠 영역 */}
            <div className="space-y-4 px-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {selectedDate.getMonth() + 1}월 {selectedDay}일의 마케팅
                </h4>

                {dayContents.length > 0 ? (
                    <div className="space-y-2">
                        {dayContents.map((c, i) => {
                            const style = getStatusStyle(c.status);
                            return (
                                <Link key={i} href={`/content/create?reuseId=${c.id}`} className="block">
                                    <div className={`p-3 rounded-2xl border ${style.border} ${style.bg} flex items-center justify-between`}>
                                        <div className="flex items-center gap-3">
                                            <div className="text-xl">{style.icon}</div>
                                            <div>
                                                <div className={`text-[10px] font-bold ${style.text}`}>{style.label}</div>
                                                <div className="text-sm font-bold text-gray-900">{c.topic}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`p-6 rounded-2xl border border-dashed text-center space-y-4 ${recommendation.type === 'holiday' ? 'border-red-200 bg-red-50/30' : 'border-primary-100 bg-primary-50/30'}`}>
                        <div className="inline-block p-3 rounded-2xl bg-white shadow-sm mb-2">
                            <span className="text-3xl">{recommendation.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 mb-1">마케팅 요정의 추천</p>
                            <p className="text-lg font-black text-gray-900 leading-tight">
                                {recommendation.topic}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/content/create?topic=${encodeURIComponent(recommendation.topic)}&date=${year}-${month + 1}-${selectedDay}`} className="flex-1">
                                <Button className="w-full bg-primary-500 hover:bg-primary-600 font-bold rounded-2xl shadow-md shadow-primary-500/20 text-white cursor-pointer">SNS 글쓰기</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
