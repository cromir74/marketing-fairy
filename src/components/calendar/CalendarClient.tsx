"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    CalendarIcon,
    Sparkles,
    Wand2,
    CheckCircle2,
    Clock,
    FileText,
    AlertCircle
} from "lucide-react";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayBottomSheet from "./DayBottomSheet";
import { getSmartRecommendation } from "./CalendarRecommend";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
// toast 대신 alert 또는 다른 UI 컴포넌트 사용 권장
const toast = { error: (msg: string) => alert(msg), success: (msg: string) => alert(msg) };

interface CalendarClientProps {
    store: any;
    contents: any[];
    isPro: boolean;
}

export default function CalendarClient({ store, contents, isPro }: CalendarClientProps) {
    const now = new Date();
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준
        return new Date(d.setDate(diff));
    });

    const [isMobile, setIsMobile] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    // 추천 데이터 조회
    useEffect(() => {
        const fetchRecommendations = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("calendar_recommendations")
                    .select("recommendations")
                    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
                    .eq("year", currentYear)
                    .eq("month", currentMonth)
                    .single();

                if (data) {
                    setAiRecommendations(data.recommendations);
                } else {
                    setAiRecommendations([]);
                }
            } catch (err) {
                console.error("Failed to fetch recommendations:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecommendations();
    }, [currentYear, currentMonth, supabase]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // 요약 데이터 계산
    const thisMonthContents = contents.filter(c => {
        const d = new Date(c.scheduled_at || c.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const stats = {
        published: thisMonthContents.filter(c => c.status === 'published').length,
        scheduled: thisMonthContents.filter(c => c.status === 'scheduled').length,
        remaining: Math.max(0, 30 - thisMonthContents.filter(c => c.status === 'published').length),
        emptyDays: Array.from({ length: 31 }, (_, i) => i + 1).filter(day =>
            !thisMonthContents.some(c => new Date(c.scheduled_at || c.created_at).getDate() === day)
        ).length
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch("/api/calendar/generate", {
                method: "POST",
                body: JSON.stringify({ year: currentYear, month: currentMonth }),
            });
            const result = await res.json();
            if (result.success) {
                setAiRecommendations(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            console.error("AI Generation Error:", err);
            // toast.error("추천 생성 중 오류가 발생했습니다.");
        } finally {
            setIsGenerating(false);
        }
    };

    // 현재 선택된 날짜의 추천 주제 찾기
    const getDayRecommendation = (day: number) => {
        const found = aiRecommendations.find(r => r.day === day);
        if (found) return found;
        return getSmartRecommendation(day, currentMonth, currentYear, store?.category || 'other');
    };

    const todayRecommendation = getDayRecommendation(now.getDate());

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
            {/* 상단 요약 카드 (PC 전용) */}
            {!isMobile && (
                <div className="grid grid-cols-4 gap-4">
                    <Card className="p-4 bg-emerald-50/50 border-emerald-100 flex items-center gap-4">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">이번 달 발행</p>
                            <p className="text-2xl font-black text-emerald-900">{stats.published}건</p>
                        </div>
                    </Card>
                    <Card className="p-4 bg-blue-50/50 border-blue-100 flex items-center gap-4">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">예약 대기</p>
                            <p className="text-2xl font-black text-blue-900">{stats.scheduled}건</p>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gray-50 border-gray-100 flex items-center gap-4">
                        <div className="bg-gray-100 p-2 rounded-xl text-gray-600">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">남은 발행</p>
                            <p className="text-2xl font-black text-gray-700">{stats.remaining}건</p>
                        </div>
                    </Card>
                    <Card className="p-4 bg-primary-50/50 border-primary-100 flex items-center gap-4">
                        <div className="bg-primary-100 p-2 rounded-xl text-primary-600">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-primary-600 font-bold uppercase tracking-wider">추천 빈 날</p>
                            <p className="text-2xl font-black text-primary-900">{stats.emptyDays}일</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* 메인 뷰 */}
            {isMobile ? (
                <WeekView
                    year={currentYear}
                    month={currentMonth}
                    weekStart={currentWeekStart}
                    contents={contents}
                    store={store}
                    aiRecommendations={aiRecommendations}
                    onDayClick={(day) => {
                        setSelectedDay(day);
                        setShowBottomSheet(true);
                    }}
                    onWeekChange={(newWeekStart) => {
                        setCurrentWeekStart(newWeekStart);
                        setCurrentYear(newWeekStart.getFullYear());
                        setCurrentMonth(newWeekStart.getMonth());
                    }}
                />
            ) : (
                <MonthView
                    year={currentYear}
                    month={currentMonth}
                    contents={contents}
                    store={store}
                    aiRecommendations={aiRecommendations}
                    onDayClick={(day) => {
                        setSelectedDay(day);
                        setShowBottomSheet(true);
                    }}
                    onMonthChange={(y, m) => {
                        setCurrentYear(y);
                        setCurrentMonth(m);
                    }}
                />
            )}

            {/* 하단 배너 (PC) / FAB (Mobile) */}
            {isMobile ? (
                <Button
                    onClick={() => setShowBottomSheet(true)}
                    className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 p-0 flex items-center justify-center z-50 text-white"
                >
                    <Sparkles size={28} />
                </Button>
            ) : (
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white flex items-center gap-6 shadow-xl">
                    <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        {isGenerating ? <div className="animate-spin text-white"><Sparkles size={32} /></div> : <Wand2 className="h-8 w-8" />}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold">
                            {aiRecommendations.length > 0 ? "마케팅 요정이 풍성한 마케팅 계획을 짰어요!" : "마케팅 요정에게 한 달 치 계획을 맡겨보세요!"}
                        </h3>
                        <p className="text-white/80 text-sm mt-1">
                            {aiRecommendations.length > 0
                                ? `오늘의 추천: "${todayRecommendation.topic}"`
                                : "제미나이가 사장님의 업종과 이력을 분석해 똑똑한 계획을 세워줍니다."}
                        </p>
                    </div>
                    {aiRecommendations.length > 0 ? (
                        <Link href={`/content/create?topic=${encodeURIComponent(todayRecommendation.topic)}`}>
                            <Button className="bg-white text-indigo-600 hover:bg-gray-100 font-bold border-none" size="lg">
                                추천 주제로 자동 포스팅
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            onClick={handleGenerateAI}
                            disabled={isGenerating}
                            className="bg-indigo-400 text-white hover:bg-indigo-300 font-bold border-2 border-white/20 px-8"
                            size="lg"
                        >
                            {isGenerating ? "계획 짜는 중..." : "AI 마케팅 계획 생성하기"}
                        </Button>
                    )}
                </div>
            )}

            {/* 바텀시트 (모바일 상세) */}
            <DayBottomSheet
                isOpen={showBottomSheet}
                onClose={() => setShowBottomSheet(false)}
                day={selectedDay || now.getDate()}
                month={currentMonth}
                year={currentYear}
                contents={contents.filter(c => {
                    const d = new Date(c.scheduled_at || c.created_at);
                    return d.getDate() === selectedDay && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })}
                recommendation={getDayRecommendation(selectedDay || now.getDate())}
                store={store}
            />
        </div>
    );
}
