"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sparkles, CalendarCheck, Plus } from "lucide-react";
import Link from "next/link";
import { getSmartRecommendation, getStatusStyle } from "./CalendarRecommend";

interface MonthViewProps {
    year: number;
    month: number;
    contents: any[];
    store: any;
    aiRecommendations: any[];
    onDayClick: (day: number) => void;
    onMonthChange: (year: number, month: number) => void;
}

export default function MonthView({ year, month, contents, store, aiRecommendations, onDayClick, onMonthChange }: MonthViewProps) {
    const now = new Date();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const days = Array.from({ length: lastDate }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

    const contentByDate: Record<number, any[]> = {};
    contents.forEach(c => {
        const date = new Date(c.scheduled_at || c.created_at);
        if (date.getMonth() === month && date.getFullYear() === year) {
            const d = date.getDate();
            if (!contentByDate[d]) contentByDate[d] = [];
            contentByDate[d].push(c);
        }
    });

    const goToPrevMonth = () => {
        if (month === 0) onMonthChange(year - 1, 11);
        else onMonthChange(year, month - 1);
    };

    const goToNextMonth = () => {
        if (month === 11) onMonthChange(year + 1, 0);
        else onMonthChange(year, month + 1);
    };

    const goToToday = () => {
        onMonthChange(now.getFullYear(), now.getMonth());
    };

    const platformShort: Record<string, string> = {
        instagram: "인스타",
        threads: "스레드",
        blog: "블로그"
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="h-8 w-8 p-0">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={goToToday} className="h-7 px-2 text-[11px] font-bold">
                        오늘
                    </Button>
                    <span className="text-sm font-bold px-2 tabular-nums">{year}년 {month + 1}월</span>
                    <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden shadow-xl border-none">
                <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                        <div key={day} className={`py-3 text-center text-xs font-bold ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 bg-white">
                    {emptyDays.map(d => (
                        <div key={`empty-${d}`} className="h-32 border-r border-b border-gray-50 bg-gray-50/20" />
                    ))}
                    {days.map(day => {
                        const dayContents = contentByDate[day] || [];
                        const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;

                        // 동적 추천 확인
                        const dynamicRec = aiRecommendations?.find(r => r.day === day);
                        const recommendation = dynamicRec || getSmartRecommendation(day, month, year, store?.category || 'other');

                        return (
                            <div
                                key={day}
                                onClick={() => onDayClick(day)}
                                className={`h-40 border-r border-b border-gray-50 p-2 transition-colors hover:bg-primary-50/30 relative group cursor-pointer
                                ${isToday ? 'bg-primary-50/50 border-l-4 border-l-primary-500' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-bold tabular-nums ${isToday ? 'bg-primary-500 text-white h-6 w-6 flex items-center justify-center rounded-full' : 'text-gray-900'}`}>
                                        {day}
                                    </span>
                                </div>

                                <div className="space-y-1 overflow-y-auto max-h-[75px] custom-scrollbar">
                                    {dayContents.map((c, i) => {
                                        const style = getStatusStyle(c.status);
                                        return (
                                            <Link key={i} href={c.platform === 'blog' ? `/automation?reuseId=${c.id}` : `/content/create?reuseId=${c.id}`} className="block">
                                                <div className={`px-1.5 py-0.5 rounded border ${style.bg} ${style.border} ${style.text} text-[10px] font-bold truncate flex items-center gap-1 hover:opacity-80 transition-opacity`}>
                                                    <span>{style.icon}</span>
                                                    [{platformShort[c.platform]}] {c.topic}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {dayContents.length === 0 && (
                                    <div className="mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <div className={`p-1.5 rounded-xl border border-dashed ${recommendation.type === 'holiday' ? 'border-red-200 bg-red-50/50' : recommendation.type === 'season' ? 'border-orange-200 bg-orange-50/50' : 'border-primary-200 bg-primary-50/50'}`}>
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500 mb-0.5">
                                                <Sparkles className={`h-2 w-2 ${recommendation.color === 'red' ? 'text-red-500' : recommendation.color === 'orange' ? 'text-orange-500' : 'text-primary-500'}`} />
                                                <span className={recommendation.color === 'red' ? 'text-red-600' : recommendation.color === 'orange' ? 'text-orange-600' : 'text-primary-600'}>
                                                    {recommendation.type === 'holiday' ? '공휴일 추천' : 'AI 추천'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-700 leading-tight line-clamp-2 font-medium mb-2">
                                                {recommendation.topic}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <Link href={`/automation?topic=${encodeURIComponent(recommendation.topic)}&date=${year}-${month + 1}-${day}`} className="flex-1">
                                                    <button className="w-full px-1 py-0.5 bg-white border border-gray-200 text-[8px] font-bold rounded hover:bg-gray-50">블로그</button>
                                                </Link>
                                                <Link href={`/content/create?topic=${encodeURIComponent(recommendation.topic)}&date=${year}-${month + 1}-${day}`} className="flex-1">
                                                    <button className="w-full px-1 py-0.5 bg-white border border-gray-200 text-[8px] font-bold rounded hover:bg-gray-50">SNS</button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/content/create?date=${year}-${month + 1}-${day}`}>
                                        <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                            <Plus size={14} />
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
