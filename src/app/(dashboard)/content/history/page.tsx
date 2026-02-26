import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { History, RefreshCw } from "lucide-react";
import { CopyButton } from "./copy-button";
import { DeleteButton } from "./delete-button";

export default async function HistoryPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: contents, error: fetchError } = await supabase
        .from("contents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

    if (fetchError) {
        console.error("History Fetch Error:", fetchError);
    }

    console.log(`Fetched ${contents?.length || 0} history items for user ${user.id}`);

    const platformLabels: Record<string, string> = {
        instagram: "📸 인스타그램",
        threads: "🧵 스레드",
        blog: "📝 블로그",
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                    <History className="h-7 w-7 text-primary-600" />
                    생성 기록
                </h1>
                <p className="mt-1 text-gray-500">지금까지 만든 콘텐츠를 확인하고 다시 사용해보세요.</p>
            </div>

            {fetchError && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 mb-6">
                    데이터를 불러오는 중 오류가 발생했습니다: {fetchError.message}
                    <br />
                    (Supabase에서 스키마를 생성했는지 확인해주세요.)
                </div>
            )}

            {contents && contents.length > 0 ? (
                <div className="space-y-4">
                    {contents.map((c: any) => (
                        <Card key={c.id} className="p-5">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-500">
                                        {platformLabels[c.platform] || c.platform}
                                    </span>
                                    <span className="text-xs text-gray-300">|</span>
                                    <span className="text-sm font-semibold text-gray-900">{c.topic}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs text-gray-400 mr-1">
                                        {new Date(c.created_at).toLocaleDateString("ko-KR")}
                                    </span>
                                    <CopyButton text={c.content} />
                                    <DeleteButton id={c.id} />
                                </div>
                            </div>
                            <div className="rounded-xl bg-gray-50 p-4 mb-4">
                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed line-clamp-6">
                                    {c.content}
                                </pre>
                            </div>
                            <div className="flex justify-end">
                                <a href={c.platform === 'blog' ? `/automation?reuseId=${c.id}` : `/content/create?reuseId=${c.id}`}>
                                    <button className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 group">
                                        <RefreshCw className="h-3 w-3 transition-transform group-hover:rotate-180" />
                                        이 글로 다시 발행하기
                                    </button>
                                </a>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 text-center">
                    <History className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                    <h3 className="font-bold text-gray-900">아직 생성한 콘텐츠가 없어요</h3>
                    <p className="text-sm text-gray-500 mt-1">콘텐츠를 생성하면 여기에 기록됩니다.</p>
                </Card>
            )}
        </div>
    );
}
