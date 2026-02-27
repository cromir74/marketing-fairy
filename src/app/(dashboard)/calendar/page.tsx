import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import CalendarClient from "@/components/calendar/CalendarClient";

export default async function CalendarPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 가게 정보 및 콘텐츠 조회
    const { data: store } = await supabase.from("stores").select("*").eq("user_id", user.id).single();
    const { data: subscription } = await supabase.from("subscriptions").select("plan").eq("user_id", user.id).single();
    const isPro = subscription?.plan === 'pro' || subscription?.plan === 'admin';

    // 베이직 요금제일 경우 제한 화면 표시
    if (!isPro) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center">
                    <CalendarCheck className="h-10 w-10 text-primary-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">프로 전용 기능입니다</h1>
                    <p className="text-gray-500">
                        마케팅 캘린더 전략 제안은 프로 요금제에서만 제공됩니다. <br />
                        지금 업그레이드하고 매월 최적의 포스팅 전략을 받아보세요!
                    </p>
                </div>
                <Link href="/pricing">
                    <Button size="lg" className="bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25 font-bold text-white rounded-full">
                        프로 요금제로 업그레이드
                    </Button>
                </Link>
            </div>
        );
    }

    const { data: contents } = await supabase
        .from("contents")
        .select("*")
        .eq("user_id", user.id);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <CalendarClient
                store={store}
                contents={contents || []}
                isPro={isPro}
            />
        </div>
    );
}
