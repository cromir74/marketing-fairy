"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/utils";
import { copyToClipboard } from "@/lib/utils";
import {
    Sparkles,
    Lightbulb,
    Copy,
    Check,
    RefreshCw,
    ImagePlus,
    X,
    Loader2,
    Send,
    Link as LinkIcon,
    Search,
    Info,
    AlertTriangle,
    ShieldCheck,
    Cloud,
    Users,
    Calendar,
    CloudRain,
    Sun,
    Thermometer,
    Crown,
    Lock,
} from "lucide-react";
import { uploadGeneratedImage } from "@/lib/supabase/storage";
import { getCurrentWeather, getDayContext, WeatherInfo } from "@/lib/weather";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { UsageProgressBar } from "@/components/subscription/UsageProgressBar";
import { UpgradeModal } from "@/components/modals/UpgradeModal";

function ContentCreatePageContent() {
    const [store, setStore] = useState<any>(null);
    const [platform, setPlatform] = useState<string>("instagram");
    const [topic, setTopic] = useState("");
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [suggesting, setSuggesting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [images, setImages] = useState<{ preview: string, base64: string, mimeType: string }[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState("");
    const [isReusing, setIsReusing] = useState(false);
    const [compliance, setCompliance] = useState<any>(null);

    // 플레이스 분석 상태
    const [placeUrl, setPlaceUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [placeData, setPlaceData] = useState<any>(null);

    // 상황 인지 상태
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [dayContext, setDayContext] = useState<any>(null);
    const [targetPersona, setTargetPersona] = useState<string>("모두");
    const [isWeatherLoading, setIsWeatherLoading] = useState(false);

    // 구독 및 사용량 상태
    const { subscription, usage, dailyPublishUsage, refresh: refreshSubscription, checkAccess } = useSubscription();
    const [showUpgradePopup, setShowUpgradePopup] = useState(false);
    const [pendingFeature, setPendingFeature] = useState("");
    const [upgradeTrigger, setUpgradeTrigger] = useState<'persona' | 'blog' | 'calendar' | 'deep_analysis' | 'trial_expired' | 'limit_reached'>('persona');

    const isTrial = subscription?.plan === "trial" || subscription?.plan === "free_trial";
    const isTrialPublishLimitReached = isTrial && platform !== "blog" && dailyPublishUsage && (
        (platform === "instagram" && dailyPublishUsage.instagram >= 1) ||
        (platform === "threads" && dailyPublishUsage.threads >= 1)
    );

    useEffect(() => {
        async function fetchStore() {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("stores")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();
                setStore(data);

                // 재사용 로직 추가
                const url = new URL(window.location.href);
                const reuseId = url.searchParams.get("reuseId");
                if (reuseId) {
                    setIsReusing(true);
                    const { data: oldContent } = await supabase
                        .from("contents")
                        .select("*")
                        .eq("id", reuseId)
                        .single();

                    if (oldContent) {
                        if (oldContent.platform === 'blog') {
                            window.location.href = `/automation?reuseId=${reuseId}`;
                            return;
                        }
                        setTopic(oldContent.topic);
                        setGeneratedContent(oldContent.content);
                        setPlatform(oldContent.platform);
                        if (oldContent.image_urls && oldContent.image_urls.length > 0) {
                            setImages(oldContent.image_urls.map((url: string) => ({ preview: url, base64: "", mimeType: "" })));
                        } else if (oldContent.image_url) {
                            setImages([{ preview: oldContent.image_url, base64: "", mimeType: "" }]);
                        }
                    }
                    setIsReusing(false);
                }

                // AI 추천 주제 파라미터 연동
                const topicParam = url.searchParams.get("topic");
                if (topicParam) {
                    setTopic(decodeURIComponent(topicParam));
                }
            }
            setPageLoading(false);
        }
        fetchStore();

        // 날씨 및 요일 정보 초기화
        const ctx = getDayContext();
        setDayContext(ctx);
    }, []);

    // 매장 정보 로드 후 날씨 가져오기
    useEffect(() => {
        if (store?.location) {
            async function fetchWeather() {
                setIsWeatherLoading(true);
                const w = await getCurrentWeather(store.location);
                setWeather(w);
                setIsWeatherLoading(false);
            }
            fetchWeather();
        }
    }, [store?.location]);

    const storeInfo = store
        ? {
            name: store.name,
            category: store.category,
            location: store.location,
            atmosphere: store.atmosphere,
            mainProducts: store.main_products,
            tone: store.tone,
        }
        : null;

    async function handleSuggest() {
        if (!storeInfo) return;
        setSuggesting(true);
        try {
            const res = await fetch("/api/content/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "suggest", storeInfo }),
            });
            const data = await res.json();
            setSuggestedTopics(data.topics || []);
        } catch {
            setSuggestedTopics(["오늘의 추천 메뉴", "계절 한정 이벤트", "가게 일상", "고객 후기", "신메뉴 소개"]);
        }
        setSuggesting(false);
    }

    // 플레이스 분석 핸들러
    const handleAnalyzePlace = async () => {
        if (!placeUrl || (!placeUrl.includes("naver.com") && !placeUrl.includes("naver.me"))) {
            alert("올바른 네이버 플레이스 URL을 입력해주세요.");
            return;
        }

        setIsAnalyzing(true);
        setPlaceData(null);
        try {
            const res = await fetch("/api/place/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: placeUrl }),
            });
            const data = await res.json();
            if (res.ok) {
                setPlaceData(data);
                // 분석된 정보를 바탕으로 주제 자동 설정
                const suggestedTopic = `[${data.name}] ${data.reviewKeywords.slice(0, 3).join(", ")} 특징을 살린 포스팅`;
                setTopic(suggestedTopic);
            } else {
                alert(data.error || "분석 중 오류가 발생했습니다.");
            }
        } catch (err) {
            console.log(err);
            alert("서버와 통신 중 오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    async function handleGenerate() {
        if (!storeInfo || !topic) return;
        setLoading(true);
        setGeneratedContent("");
        try {
            const res = await fetch("/api/content/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate",
                    storeInfo,
                    platform,
                    topic,
                    images: images.filter(img => img.base64).map(img => ({ base64: img.base64, mimeType: img.mimeType })),
                    context: {
                        weather: weather?.description,
                        dayOfWeek: dayContext?.dayName,
                        timeContext: dayContext?.timeContext,
                        targetPersona
                    }
                }),
            });
            const data = await res.json();

            // 사용량 갱신 (생성이 성공했든 실패했든 갱신 시도)
            refreshSubscription();

            if (!res.ok) {
                if (res.status === 403) {
                    // 토스트 대신 alert (간단한 구현)
                    alert(data.error || "지금은 생성이 어려워요. 잠시 후 다시 시도해주세요 😊");
                } else {
                    setGeneratedContent(data.error || "생성에 실패했습니다.");
                }
                setLoading(false);
                return;
            }

            setGeneratedContent(data.content || "생성에 실패했습니다.");
            setCompliance(data.compliance);
        } catch {
            setGeneratedContent("오류가 발생했습니다. 다시 시도해주세요.");
        }
        setLoading(false);
    }

    async function handleCopy() {
        const ok = await copyToClipboard(generatedContent);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    async function handlePublish() {
        if (!generatedContent || !storeInfo) return;

        // 인스타그램은 사진 필수 (Meta v25.0 기준)
        if (platform === "instagram" && images.length === 0) {
            alert("인스타그램 발행에는 최소 1장의 사진이 필요합니다.");
            return;
        }

        setPublishing(true);
        try {
            const imageUrls: string[] = [];
            if (images.length > 0) {
                // 상용 URL이 아닌 base64 이미지만 업로드
                for (let i = 0; i < images.length; i++) {
                    if (images[i].base64) {
                        const url = await uploadGeneratedImage(images[i].preview, `pub_${Date.now()}_${i}.jpg`);
                        imageUrls.push(url);
                    } else {
                        imageUrls.push(images[i].preview); // 이미 업로드된 URL
                    }
                }
            }

            let scheduledPublishTime = undefined;
            if (isScheduled && scheduledAt) {
                const scheduleDate = new Date(scheduledAt);
                const now = new Date();
                const diffMinutes = (scheduleDate.getTime() - now.getTime()) / (1000 * 60);

                if (diffMinutes < 2) {
                    alert("예약 시간은 현재 시간보다 최소 2분 이후여야 합니다.");
                    setPublishing(false);
                    return;
                }
                scheduledPublishTime = Math.floor(scheduleDate.getTime() / 1000);
            }

            const res = await fetch("/api/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    platform,
                    imageUrls,
                    content: generatedContent,
                    topic,
                    storeId: store.id,
                    scheduledPublishTime
                }),
            });

            const data = await res.json();

            // 사용량 갱신
            refreshSubscription();

            if (!res.ok) {
                if (data.reason === "limit_reached" || data.reason === "trial_expired" || data.reason === "plan_upgrade_needed") {
                    setPendingFeature(platform === "blog" ? "블로그 발행" : "SNS 발행");
                    setUpgradeTrigger(data.reason === "trial_expired" ? 'trial_expired' : data.reason === "limit_reached" ? 'limit_reached' : 'blog');
                    setShowUpgradePopup(true);
                } else if (res.status === 403) {
                    alert(data.error || "오늘의 발행을 완료했어요. 내일 다시 시도해주세요.");
                } else {
                    alert(`발행 실패: ${data.error}`);
                }
                setPublishing(false);
                return;
            }

            if (data.success) {
                alert(scheduledPublishTime ? "성공적으로 예약되었습니다!" : `${platform === 'instagram' ? '인스타그램' : platform}에 성공적으로 발행되었습니다!`);
            } else {
                alert(`발행 실패: ${data.error}`);
            }
        } catch (error: any) {
            alert(`오류 발생: ${error.message}`);
        }
        setPublishing(false);
    }

    const applyComplianceSuggestion = (original: string, suggestion: string) => {
        setGeneratedContent(prev => prev.replace(original, suggestion));
        // 반영 후 목록에서 제거
        setCompliance((prev: any) => ({
            ...prev,
            issues: prev.issues.filter((issue: any) => issue.original !== original)
        }));
    };

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (images.length + files.length > 10) {
            alert("최대 10장까지 업로드 가능합니다.");
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                setImages(prev => [
                    ...prev,
                    {
                        preview: result,
                        base64: result.split(",")[1],
                        mimeType: file.type
                    }
                ]);
            };
            reader.readAsDataURL(file);
        });
    }

    function removeImage(index: number) {
        setImages(prev => prev.filter((_, i) => i !== index));
    }

    if (pageLoading || isReusing) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
        );
    }

    if (!store) {
        return (
            <Card className="py-12 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-gray-300 mb-4" />
                <h3 className="font-bold text-gray-900">가게 정보를 먼저 등록해주세요</h3>
                <p className="text-sm text-gray-500 mt-1 mb-6">가게 정보가 있어야 AI가 맞춤 글을 만들 수 있어요.</p>
                <a href="/store">
                    <Button>가게 등록하러 가기</Button>
                </a>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                    <Sparkles className="h-7 w-7 text-primary-600" />
                    SNS 콘텐츠 생성
                </h1>
                <p className="mt-1 text-gray-500">AI가 {store.name}에 맞는 인스타그램, 스레드용 마케팅 글을 만들어줍니다.</p>
            </div>

            {/* 구독 사용량 표시 */}
            {subscription && subscription.plan !== 'admin' && (
                <Card className="p-4 bg-white/50 border-indigo-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <UsageProgressBar
                            label="인스타그램 발행"
                            current={usage?.instagram_count || 0}
                            limit={30}
                        />
                        <UsageProgressBar
                            label="스레드 발행"
                            current={usage?.threads_count || 0}
                            limit={30}
                        />
                    </div>
                    {subscription.plan === 'free_trial' && (
                        <p className="text-[10px] text-indigo-500 mt-3 font-medium flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            무료 체험 중입니다. 7일 후에는 기능이 제한됩니다.
                        </p>
                    )}
                </Card>
            )}

            {/* NEW: 플레이스 URL 분석 섹션 */}
            <section className="rounded-3xl border-2 border-primary-100 bg-gradient-to-br from-primary-50/50 to-white p-6 shadow-sm overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start md:items-end">
                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-bold text-primary-900 flex items-center gap-2">
                            <span className="p-1.5 bg-primary-100 rounded-lg">
                                <LinkIcon className="h-4 w-4 text-primary-600" />
                            </span>
                            플레이스 URL 분석으로 시작하기
                        </label>
                        <p className="text-xs text-gray-500 font-medium pl-1 mb-2">
                            네이버 플레이스 주소를 넣으면 알아서 매장 특징, 메뉴, 리뷰 키워드를 분석해 글감을 제안합니다.
                        </p>
                        <div className="relative flex group shadow-sm transition-shadow hover:shadow-md rounded-xl">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            </div>
                            <input
                                type="url"
                                value={placeUrl}
                                onChange={(e) => setPlaceUrl(e.target.value)}
                                placeholder="예: https://map.naver.com/p/search/..."
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-l-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                                disabled={isAnalyzing}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isAnalyzing) {
                                        e.preventDefault();
                                        handleAnalyzePlace();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleAnalyzePlace}
                                disabled={isAnalyzing || !placeUrl}
                                className="rounded-l-none rounded-r-xl bg-primary-600 hover:bg-primary-700 h-auto py-3 px-6 shadow-inner font-bold"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        분석 중...
                                    </>
                                ) : (
                                    <>
                                        분석하기
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 분석 결과 카드 */}
                {placeData && (
                    <div className="mt-6 animate-in zoom-in-95 duration-300">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                                        <Info className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        분석 결과
                                        <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                            {placeData.category}
                                        </span>
                                    </h4>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPlaceData(null)}
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-4 text-sm bg-white/60 p-4 rounded-xl border border-emerald-50 backdrop-blur-sm">
                                <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-2 items-start">
                                    <span className="font-bold text-gray-500 mt-0.5">매장명</span>
                                    <span className="font-bold text-gray-900">{placeData.name}</span>
                                </div>

                                {placeData.photos && placeData.photos.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-2 items-start">
                                        <span className="font-bold text-gray-500 mt-1">매장 사진</span>
                                        <div className="flex flex-wrap gap-2">
                                            {placeData.photos.map((photo: string, i: number) => {
                                                const isSelected = images.some(img => img.preview === photo);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-primary-500 ring-2 ring-primary-100" : "border-transparent hover:border-gray-200"
                                                            }`}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setImages(prev => prev.filter(img => img.preview !== photo));
                                                            } else {
                                                                if (images.length >= 10) {
                                                                    alert("최대 10장까지 선택 가능합니다.");
                                                                    return;
                                                                }
                                                                setImages(prev => [...prev, { preview: photo, base64: "", mimeType: "image/jpeg" }]);
                                                            }
                                                        }}
                                                    >
                                                        <img src={photo} alt={`매장 사진 ${i}`} className="w-16 h-16 object-cover" />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                                                                <Check className="h-5 w-5 text-white drop-shadow-md" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {placeData.menus && placeData.menus.length > 0 && (
                                    <div className="relative">
                                        <div className={!checkAccess("place_deep_analysis") ? "filter blur-[8px] pointer-events-none select-none" : ""}>
                                            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-2 items-start">
                                                <span className="font-bold text-gray-500 mt-1">주요 메뉴</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {placeData.menus.map((menu: string, i: number) => (
                                                        <span key={i} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium text-xs">
                                                            {menu}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {placeData.reviewKeywords && placeData.reviewKeywords.length > 0 && (
                                    <div className="relative">
                                        <div className={!checkAccess("place_deep_analysis") ? "filter blur-[8px] pointer-events-none select-none" : ""}>
                                            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-2 items-start">
                                                <span className="font-bold text-gray-500 mt-1 flex items-center gap-1">
                                                    리뷰 반응 <Sparkles className="h-3 w-3 text-amber-400" />
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {placeData.reviewKeywords.map((keyword: string, i: number) => (
                                                        <span key={i} className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-bold text-xs">
                                                            #{keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pro 전용 블러 오버레이 */}
                                        {!checkAccess("place_deep_analysis") && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                                <Lock className="h-6 w-6 text-indigo-500 mb-2" />
                                                <p className="text-xs font-bold text-indigo-700">Pro 플랜에서 심화 분석을 확인하세요</p>
                                                <Button
                                                    size="sm"
                                                    className="mt-2 h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3"
                                                    onClick={() => {
                                                        setUpgradeTrigger('deep_analysis');
                                                        setShowUpgradePopup(true);
                                                    }}
                                                >
                                                    업그레이드
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {checkAccess("place_deep_analysis") && (
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8 text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none group transition-all auto-flex gap-1.5"
                                        onClick={() => setTopic(`[${placeData.name}] ${placeData.reviewKeywords.slice(0, 3).join(", ")} 특징을 살린 포스팅`)}
                                    >
                                        <Check className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                        이 정보로 글쓰기 주제 업데이트
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* 좌측: 입력 영역 */}
                <div className="space-y-5">
                    {/* 플랫폼 선택 */}
                    <Card>
                        <p className="text-sm font-semibold text-gray-700 mb-3">플랫폼 선택</p>
                        <div className="flex gap-2">
                            {PLATFORMS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPlatform(p.value)}
                                    className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${platform === p.value
                                        ? "border-primary-500 bg-primary-50 text-primary-700"
                                        : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                                        }`}
                                >
                                    <span className="text-lg block mb-1">{p.icon}</span>
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {platform === "blog" && isTrial && (
                            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-amber-100 rounded-xl">
                                        <Crown className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-amber-900 mb-1">블로그 자동 발행은 프로 전용 기능입니다</h4>
                                        <p className="text-xs text-amber-700 leading-relaxed mb-3">
                                            체험판에서는 블로그 <strong>내용 생성</strong>까지만 가능하며, 실제 발행은 프로 플랜에서 무제한으로 이용하실 수 있습니다.
                                        </p>

                                        {/* Pro Preview Video Placeholder */}
                                        <div className="aspect-video w-full bg-gray-900 rounded-xl overflow-hidden relative group cursor-pointer" onClick={() => setShowUpgradePopup(true)}>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                                                    <Info className="h-6 w-6 text-white" />
                                                </div>
                                                <p className="text-[10px] text-white/80 font-bold mt-2">프로 기능 사용 영상 확인하기</p>
                                            </div>
                                            <img
                                                src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop"
                                                alt="Pro Preview"
                                                className="w-full h-full object-cover opacity-60"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* 주제 입력 */}
                    {/* 초구체적 페르소나 마케팅 섹션 */}
                    <Card className="p-5 border-none shadow-sm bg-gradient-to-br from-indigo-50/50 to-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles className="h-16 w-16 text-indigo-500" />
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-500" />
                                    초구체적 상황 브리핑
                                </h3>
                                {weather && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-full border border-indigo-100 shadow-sm">
                                        <span className="text-lg">{weather.icon}</span>
                                        <span className="text-xs font-semibold text-indigo-700">{weather.description}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/60 p-3 rounded-xl border border-indigo-100/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="text-[11px] font-medium text-indigo-600">현재 시점</span>
                                    </div>
                                    <p className="text-sm font-bold text-indigo-900">
                                        {dayContext ? `${dayContext.dayName} ${dayContext.timeContext}` : "정보 로딩 중..."}
                                    </p>
                                </div>
                                <div className="bg-white/60 p-3 rounded-xl border border-indigo-100/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="text-[11px] font-medium text-indigo-600">공략 타겟</span>
                                    </div>
                                    <p className="text-sm font-bold text-indigo-900">{targetPersona}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-indigo-700 ml-1">오늘 누구를 공략할까요?</label>
                                <div className="flex flex-wrap gap-2">
                                    {["모두", "직장인", "육아맘", "커플", "학생", "1인 가구", "반려동물 가족", "MZ세대"].map((p) => {
                                        const isLocked = p !== "모두" && !checkAccess("persona_select");
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        setPendingFeature(p);
                                                        setUpgradeTrigger('persona');
                                                        setShowUpgradePopup(true);
                                                        return;
                                                    }
                                                    setTargetPersona(p);
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${isLocked
                                                    ? "opacity-40 bg-white text-gray-400 border border-gray-100 cursor-not-allowed"
                                                    : targetPersona === p
                                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                                        : "bg-white text-indigo-600 border border-indigo-100 hover:border-indigo-300"
                                                    }`}
                                            >
                                                {p}
                                                {isLocked && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded font-bold">PRO</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-gray-700">무엇에 대해 쓸까요?</label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 gap-1.5"
                                onClick={handleSuggest}
                                disabled={suggesting}
                            >
                                {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                                AI 주제 추천
                            </Button>
                        </div>

                        {suggestedTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {suggestedTopics.map((t, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setTopic(t)}
                                        className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}

                        <Input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="예: 비 오는 날 따뜻한 라떼 한 잔"
                        />
                    </Card>

                    {/* 사진 업로드 */}
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-700">사진 (최대 10장)</p>
                            <span className="text-xs text-gray-400">{images.length} / 10</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {images.map((img, index) => (
                                <div key={index} className="relative aspect-square">
                                    <img
                                        src={img.preview}
                                        alt={`업로드 미리보기 ${index + 1}`}
                                        className="w-full h-full object-cover rounded-xl border border-gray-100"
                                    />
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-2 -right-2 rounded-full bg-white text-gray-500 shadow-md p-1 hover:text-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}

                            {images.length < 10 && (
                                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                                    <ImagePlus className="h-6 w-6 text-gray-300 mb-1" />
                                    <span className="text-[10px] text-gray-400">사진 추가</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    </Card>

                    {/* 생성 버튼 */}
                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !topic}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                AI가 글을 쓰고 있어요...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5" />
                                {generatedContent ? "다시 생성하기" : "마케팅 글 생성하기"}
                            </>
                        )}
                    </Button>
                </div>

                {/* 우측: 결과 영역 */}
                <div>
                    <Card className="min-h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-semibold text-gray-700">생성 결과</p>
                            {generatedContent && (
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={handleCopy}>
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4 text-green-600" />
                                                복사됨!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                복사
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handlePublish}
                                        disabled={publishing || loading || isTrialPublishLimitReached}
                                        className={`bg-primary-600 hover:bg-primary-700 ${isTrialPublishLimitReached ? 'opacity-50' : ''}`}
                                    >
                                        {publishing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        {isScheduled ? '예약하기' : (
                                            platform === 'instagram' ? '인스타 발행' : '스레드 발행'
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* 안내 문구는 버튼 컨테이너 바깥 (또는 밑)에 위치 (positioning) */}
                            {generatedContent && isTrialPublishLimitReached && (
                                <div className="absolute top-12 right-0 text-right mt-1 z-10 w-max bg-white/90 p-2 rounded-lg border border-red-100 shadow-sm backdrop-blur-sm">
                                    <p className="text-xs text-red-500 font-bold whitespace-nowrap">오늘 발행을 완료했어요 ✅</p>
                                    <p className="text-[10px] text-gray-500 font-medium">내일 다시 발행할 수 있어요</p>
                                </div>
                            )}
                        </div>

                        {/* 예약 발행 설정 영역 */}
                        {generatedContent && (platform === 'instagram' || platform === 'threads') && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        checked={isScheduled}
                                        onChange={(e) => setIsScheduled(e.target.checked)}
                                        className="w-4 h-4 text-primary-600 rounded"
                                    />
                                    <span className="text-sm font-bold text-blue-800">예약 발행하기</span>
                                </label>
                                {isScheduled && (
                                    <div className="space-y-2">
                                        <input
                                            type="datetime-local"
                                            value={scheduledAt}
                                            onChange={(e) => setScheduledAt(e.target.value)}
                                            className="w-full p-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                                        />
                                        <p className="text-[10px] text-blue-600">
                                            * 예약은 최소 2분 후부터 최대 75일 이내까지 가능합니다.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1">
                            {loading ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-400 mb-4" />
                                        <p className="text-sm text-gray-500">AI가 글을 생성하고 있습니다...</p>
                                    </div>
                                </div>
                            ) : generatedContent ? (
                                <Textarea
                                    value={generatedContent}
                                    onChange={(e) => setGeneratedContent(e.target.value)}
                                    className="w-full h-full min-h-[300px] p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary-500 font-sans text-sm leading-relaxed"
                                    placeholder="생성된 내용을 직접 수정할 수 있습니다."
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-center">
                                    <div>
                                        <Sparkles className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                                        <p className="text-sm text-gray-400">
                                            플랫폼과 주제를 선택한 후
                                            <br />
                                            생성 버튼을 눌러주세요.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 법적 검토 결과 섹션 */}
                        {compliance && (
                            <div className="mt-4 p-4 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className={`rounded-xl border p-3 ${compliance.isSafe ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {compliance.isSafe ? (
                                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            )}
                                            <h3 className={`text-sm font-bold ${compliance.isSafe ? 'text-emerald-900' : 'text-amber-900'}`}>
                                                광고법 검토: {compliance.isSafe ? '안전함' : '주의'}
                                            </h3>
                                        </div>
                                    </div>
                                    <p className={`text-[11px] mb-3 ${compliance.isSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        {compliance.summary}
                                    </p>

                                    {!compliance.isSafe && compliance.issues.length > 0 && (
                                        <div className="space-y-2">
                                            {compliance.issues.map((issue: any, i: number) => (
                                                <div key={i} className="bg-white/60 rounded-lg p-2.5 border border-amber-200/50 shadow-sm">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1 py-0.5 rounded flex-shrink-0">기존</span>
                                                            <span className="text-xs font-medium text-gray-800 leading-tight">"{issue.original}"</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded flex-shrink-0">제안</span>
                                                                <span className="text-xs font-bold text-emerald-700 leading-tight">"{issue.suggestion}"</span>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="h-6 text-[10px] px-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none ml-auto"
                                                                onClick={() => applyComplianceSuggestion(issue.original, issue.suggestion)}
                                                            >
                                                                <RefreshCw className="h-2 w-2 mr-1" />
                                                                수정
                                                            </Button>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-1 italic leading-tight">• {issue.reason}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    AI 분석 결과로, 법적 책임은 사용자에게 있습니다.
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <UpgradeModal
                isOpen={showUpgradePopup}
                onClose={() => setShowUpgradePopup(false)}
                trigger={upgradeTrigger}
                blockedFeature={pendingFeature}
            />
        </div >
    );
}

export default function ContentCreatePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12 text-gray-500">로딩 중...</div>}>
            <ContentCreatePageContent />
        </Suspense>
    );
}
