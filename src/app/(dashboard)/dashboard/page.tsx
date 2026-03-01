import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Store, History, ArrowRight, Wand2, TrendingUp, Eye, MessageSquare, Heart, Calendar, RefreshCw } from "lucide-react";
import { StatsCharts } from "./stats-charts";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // 가게 정보 조회
    const { data: store } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .single();

    // 최근 콘텐츠 조회
    const { data: contents, count } = await supabase
        .from("contents")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

    // 모든 콘텐츠 성과 집계
    const { data: allContents } = await supabase
        .from("contents")
        .select("*")
        .eq("user_id", user.id);

    const totalViews = allContents?.reduce((acc, curr) => acc + (curr.views || 0), 0) || 0;
    const totalLikes = allContents?.reduce((acc, curr) => acc + (curr.likes || 0), 0) || 0;
    const totalComments = allContents?.reduce((acc, curr) => acc + (curr.comments || 0), 0) || 0;
    const totalReactions = totalLikes + totalComments;

    // 플랫폼별 발행 비중 계산
    const platformStats = [
        { name: '인스타', count: allContents?.filter(c => c.platform === 'instagram').length || 0, color: '#ec4899' },
        { name: '스레드', count: allContents?.filter(c => c.platform === 'threads').length || 0, color: '#000000' }
    ];

    // 주간 조회수 추이 계산 (최근 7일, 플랫폼별 분리)
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const weeklyData = days.map((dayName, idx) => {
        const d = (idx + 1) % 7; // 요일 인덱스 보정
        const filterByDay = (p: string) => allContents?.filter(c => {
            const date = new Date(c.created_at);
            return date.getDay() === d && c.platform === p;
        }).reduce((acc, curr) => acc + (curr.views || 0), 0) || 0;

        return {
            name: dayName,
            instagram: filterByDay('instagram'),
            threads: filterByDay('threads')
        };
    });

    const platformIcons: Record<string, string> = {
        instagram: "📸",
        threads: "🧵",
    };

    return (
        <div className="space-y-8">
            {/* 인사 헤더 */}
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                    안녕하세요{store ? `, ${store.name} 사장님` : ""}! 👋
                </h1>
                <p className="mt-1 text-gray-500">오늘도 마케팅요정이 도와드릴게요.</p>
            </div>

            {/* 성과 요약 센터 */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-xl text-white">
                            <Eye className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">통합 누적 조회수</p>
                            <h3 className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-pink-50 to-white border-pink-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-500 rounded-xl text-white">
                            <Heart className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">통합 총 반응수</p>
                            <h3 className="text-2xl font-bold text-gray-900">{totalReactions.toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">발행 콘텐츠</p>
                            <h3 className="text-2xl font-bold text-gray-900">{allContents?.length || 0}개</h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 통계 차트 영역 */}
            {store ? (
                <div className="space-y-4">
                    <StatsCharts data={weeklyData} barData={platformStats} />
                </div>
            ) : (
                <Card className="p-8 border-dashed flex flex-col items-center justify-center text-center bg-gray-50/50">
                    <Store className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="font-bold text-gray-900">가게를 등록하면 성과 분석이 시작됩니다</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-4">가게 정보를 바탕으로 정확한 데이터 분석을 제공해 드려요.</p>
                    <Link href="/store">
                        <Button variant="secondary" size="sm">가게 등록하러 가기</Button>
                    </Link>
                </Card>
            )}

            {/* AI 시즌 추천 섹션 */}
            <div className="rounded-3xl bg-gray-900 p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Calendar className="h-48 w-48" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-primary-400 font-bold text-sm uppercase tracking-widest mb-2">
                        <Sparkles className="h-4 w-4" /> AI RECOMMENDATION
                    </div>
                    <h2 className="text-2xl font-bold mb-4">
                        {store?.category?.includes("카페") ? "이번 주말, 감성 가득한 '라떼 아트' 소식은 어떨까요?" :
                            store?.category?.includes("식당") ? "기온이 뚝 떨어진 오늘, '뜨끈한 전골' 추천 글이 딱이에요!" :
                                "오늘 같은 날씨엔 '단골 손님 인터뷰' 스타일의 글을 추천드려요!"}
                    </h2>
                    <p className="text-gray-400 max-w-2xl mb-6">
                        현재 시즌 데이터와 사장님의 업종 트렌드를 분석한 결과입니다.
                        지금 바로 추천 주제로 콘텐츠를 생성하고 매출을 올려보세요!
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link href={`/content/create?topic=${encodeURIComponent(store?.category?.includes("카페") ? "겨울 카페 감성 메뉴" : "오늘의 추천 메뉴")}`}>
                            <Button className="bg-white text-gray-900 hover:bg-gray-100 font-bold border-none">
                                추천 주제로 글쓰기
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                        <Link href="/calendar">
                            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                                마케팅 캘린더 전체보기
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* 퀵 액션 카드 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">


                <Link href="/content/create" className="block h-full">
                    <Card className="group cursor-pointer hover:border-primary-200 h-full">
                        <div className="flex items-center gap-3 h-full">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <CardTitle className="text-base truncate">SNS 콘텐츠 생성</CardTitle>
                                <CardDescription className="text-xs line-clamp-1">인스타 / 스레드 글 생성</CardDescription>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/store" className="block h-full">
                    <Card className="group cursor-pointer hover:border-primary-200 h-full">
                        <div className="flex items-center gap-3 h-full">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                                <Store className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <CardTitle className="text-base truncate">가게 관리</CardTitle>
                                <CardDescription className="text-xs line-clamp-1">{store ? "정보 수정하기" : "가게 등록하기"}</CardDescription>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/content/history" className="block h-full">
                    <Card className="group cursor-pointer hover:border-primary-200 h-full">
                        <div className="flex items-center gap-3 h-full">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                                <History className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <CardTitle className="text-base truncate">생성 기록</CardTitle>
                                <CardDescription className="text-xs line-clamp-1">총 {count ?? 0}개의 콘텐츠</CardDescription>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* 최근 생성 콘텐츠 */}
            {contents && contents.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">최근 생성한 콘텐츠</h2>
                        <Link href="/content/history" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            전체 보기 →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {contents.map((c: any) => (
                            <Card key={c.id} className="p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">{platformIcons[c.platform] || "📄"}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{c.topic}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(c.created_at).toLocaleDateString("ko-KR")}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.content}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* 콘텐츠 없을 때 */}
            {(!contents || contents.length === 0) && store && (
                <Card className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                        <Wand2 className="h-8 w-8 text-primary-400" />
                    </div>
                    <h3 className="font-bold text-gray-900">아직 생성한 콘텐츠가 없어요</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-6">AI가 첫 마케팅 글을 만들어볼까요?</p>
                    <Link href="/content/create">
                        <Button>첫 콘텐츠 만들기</Button>
                    </Link>
                </Card>
            )}
        </div>
    );
}
