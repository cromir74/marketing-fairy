"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { CalendarClock, Trash2, Send, Loader2 } from "lucide-react";

export default function ScheduledPage() {
    const [contents, setContents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchScheduled = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("contents")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_published", false)
            .not("scheduled_at", "is", null)
            .order("scheduled_at", { ascending: true });

        setContents(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchScheduled();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("예약을 취소하시겠습니까? (삭제된 기록은 복구할 수 없습니다.)")) return;

        try {
            const res = await fetch("/api/content/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                setContents(prev => prev.filter(c => c.id !== id));
            } else {
                alert(`삭제 실패: ${data.error}`);
            }
        } catch (error: any) {
            alert(`오류 발생: ${error.message}`);
        }
    };

    const platformLabels: Record<string, string> = {
        instagram: "📸 인스타그램",
        threads: "🧵 스레드",
        blog: "📝 블로그",
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                    <CalendarClock className="h-7 w-7 text-primary-600" />
                    예약 발행 목록
                </h1>
                <p className="mt-1 text-gray-500">발행 대기 중인 콘텐츠를 확인하고 관리하세요.</p>
            </div>

            {contents.length > 0 ? (
                <div className="space-y-4">
                    {contents.map((c: any) => (
                        <Card key={c.id} className="p-5">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-sm font-bold text-blue-600">
                                            {platformLabels[c.platform] || c.platform}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            발행 예정: {new Date(c.scheduled_at).toLocaleString("ko-KR")}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900">{c.topic}</h3>
                                </div>
                                <div className="flex gap-1">
                                    <a href={`/content/create?reuseId=${c.id}`}>
                                        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="수정 및 재발행">
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </a>
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="예약 취소"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                                    {c.content}
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 text-center">
                    <CalendarClock className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                    <h3 className="font-bold text-gray-900">예약된 글이 없습니다</h3>
                    <p className="text-sm text-gray-500 mt-1">새로운 콘텐츠를 만들고 예약해보세요.</p>
                </Card>
            )}
        </div>
    );
}
