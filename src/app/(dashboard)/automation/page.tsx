"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    UserCircle,
    Images,
    Send,
    CalendarClock,
    FileEdit,
    CheckCircle2,
    Clock,
    AlignLeft,
    Wand2,
    X,
    Save,
    Link as LinkIcon,
    Search,
    Info,
    Check,
    Sparkles,
    Loader2,
    AlertTriangle,
    ShieldCheck,
    RefreshCw,
    Cloud,
    Users,
    Calendar,
    CloudRain,
    Sun,
    Crown,
    Cookie
} from "lucide-react";

import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { UsageProgressBar } from "@/components/subscription/UsageProgressBar";
import { UpgradePopup } from "@/components/subscription/UpgradePopup";

import { getCurrentWeather, getDayContext, WeatherInfo } from "@/lib/weather";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

function AutomationPageContent() {
    const searchParams = useSearchParams();
    const queryTopic = searchParams.get("topic");
    const reuseId = searchParams.get("reuseId");

    const [publishMode, setPublishMode] = useState("draft");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");
    const [hasGenerated, setHasGenerated] = useState(false);
    const [store, setStore] = useState<any>(null);
    const [compliance, setCompliance] = useState<any>(null);

    // 상황 인지 상태
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [dayContext, setDayContext] = useState<any>(null);
    const [targetPersona, setTargetPersona] = useState<string>("모두");
    const [isWeatherLoading, setIsWeatherLoading] = useState(false);

    // 구독 및 사용량 상태
    const { subscription, usage, refresh: refreshSubscription, checkAccess } = useSubscription();
    const [showUpgradePopup, setShowUpgradePopup] = useState(false);
    const [pendingFeature, setPendingFeature] = useState("");

    // 가게 정보 가져오기
    useEffect(() => {
        const fetchStore = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("stores")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();
                setStore(data);
            }
        };
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

    // 폼 상태
    const [topic, setTopic] = useState("");

    // 추천 주제 초기화 및 재사용 데이터 불러오기
    useEffect(() => {
        if (queryTopic) {
            setTopic(decodeURIComponent(queryTopic));
        }

        if (reuseId) {
            const fetchHistory = async () => {
                const supabase = createClient();
                const { data } = await supabase
                    .from("contents")
                    .select("*")
                    .eq("id", reuseId)
                    .single();

                if (data) {
                    setTopic(data.topic || "");
                    setGeneratedContent(data.content || "");
                    setHasGenerated(true);

                    // 이미지 재사용 추가
                    if (data.image_urls && data.image_urls.length > 0) {
                        setImages(data.image_urls.map((url: string) => ({
                            url,
                            file: null as any,
                            base64: "",
                            mimeType: "image/jpeg"
                        })));
                    }
                }
            };
            fetchHistory();
        }
    }, [queryTopic, reuseId]);
    const [images, setImages] = useState<{ url: string; file: File; base64: string; mimeType: string }[]>([]);

    // 플레이스 분석 상태
    const [placeUrl, setPlaceUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [placeData, setPlaceData] = useState<any>(null);

    // 네이버 계정 및 발행 상태
    const [naverId, setNaverId] = useState("");
    const [naverPw, setNaverPw] = useState("");

    // 네이버 계어 정보 불러오기 (마운트 시)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedId = localStorage.getItem("nft_naver_id");
            const savedPw = localStorage.getItem("nft_naver_pw");
            if (savedId) setNaverId(savedId);
            if (savedPw) setNaverPw(savedPw);
        }
    }, []);

    // 네이버 계정 정보 저장 (변경 시)
    useEffect(() => {
        if (typeof window !== 'undefined' && naverId) {
            localStorage.setItem("nft_naver_id", naverId);
        }
    }, [naverId]);

    useEffect(() => {
        if (typeof window !== 'undefined' && naverPw) {
            localStorage.setItem("nft_naver_pw", naverPw);
        }
    }, [naverPw]);

    const [isPublishing, setIsPublishing] = useState(false);
    const [publishLogs, setPublishLogs] = useState<{ message: string; type: string }[]>([]);

    // 예약 발행 설정 (기본값: 내일 10:00)
    const [scheduledDate, setScheduledDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [scheduledHour, setScheduledHour] = useState("10");
    const [scheduledMinute, setScheduledMinute] = useState("00");

    // 네이버 세션 동기화 상태
    const [hasSavedCookies, setHasSavedCookies] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);

    // 쿠키 상태 확인
    const checkCookieStatus = async () => {
        try {
            const res = await fetch("/api/naver/login-setup");
            const data = await res.json();
            setHasSavedCookies(data.hasConfigured);
        } catch (e) {
            console.error("Failed to check cookie status:", e);
        }
    };

    useEffect(() => {
        checkCookieStatus();
    }, []);

    const handleSyncNaver = async () => {
        setIsSyncing(true);
        setCaptchaUrl(null);
        try {
            const res = await fetch("/api/naver/login-setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (res.ok) {
                setHasSavedCookies(true);
                alert("네이버 세션 쿠키가 유효합니다! 무인 포스팅이 가능합니다.");
            } else {
                setHasSavedCookies(false);
                alert(data.error || "쿠키가 만료되었거나 설정되지 않았습니다.");
            }
        } catch (err) {
            alert("서버와 통신 중 오류가 발생했습니다.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);

        if (images.length + newFiles.length > 10) {
            alert("최대 10장까지 업로드 가능합니다.");
            return;
        }

        setIsGenerating(true); // 압축 로딩 표시용으로 사용 (또는 별도 상태 추가 가능)

        const processFile = (file: File): Promise<{ url: string; file: File; base64: string; mimeType: string }> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target?.result as string;
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        let width = img.width;
                        let height = img.height;
                        const max_size = 1200;

                        if (width > height) {
                            if (width > max_size) {
                                height *= max_size / width;
                                width = max_size;
                            }
                        } else {
                            if (height > max_size) {
                                width *= max_size / height;
                                height = max_size;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0, width, height);

                        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                        resolve({
                            url: dataUrl,
                            file: file, // 원본 참조 유지
                            base64: dataUrl.split(',')[1],
                            mimeType: "image/jpeg"
                        });
                    };
                    img.onerror = () => {
                        resolve({
                            url: URL.createObjectURL(file),
                            file: file,
                            base64: (event.target?.result as string).split(',')[1],
                            mimeType: file.type
                        });
                    };
                };
                reader.readAsDataURL(file);
            });
        };

        try {
            const processedImages = await Promise.all(newFiles.map(processFile));
            setImages(prev => [...prev, ...processedImages]);
        } catch (err) {
            console.error(err);
            alert("이미지 처리 중 오류가 발생했습니다.");
        } finally {
            setIsGenerating(false);
            if (e.target) e.target.value = "";
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

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
                const keywordsText = data.reviewKeywords && data.reviewKeywords.length > 0
                    ? data.reviewKeywords.slice(0, 3).join(", ")
                    : (data.category || "매장");
                const suggestedTopic = `[${data.name}] ${keywordsText} 특징을 살린 블로그 포스팅`;
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

    const handleGenerate = async () => {
        if (!topic.trim()) {
            alert('주제를 입력해주세요.');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch('/api/blog/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    images,
                    contentLength: "medium",
                    storeId: store?.id,
                    context: {
                        weather: weather?.description,
                        dayOfWeek: dayContext?.dayName,
                        timeContext: dayContext?.timeContext,
                        targetPersona
                    }
                })
            });

            const data = await res.json();

            // 사용량 갱신
            refreshSubscription();

            if (!res.ok && data.reason === "pro_only") {
                setPendingFeature("블로그 생성");
                setShowUpgradePopup(true);
                setIsGenerating(false);
                return;
            }

            if (!res.ok && data.reason === "daily_limit") {
                setGeneratedContent(data.message);
                setIsGenerating(false);
                return;
            }

            if (res.ok && data.success) {
                setGeneratedContent(data.content);
                setCompliance(data.compliance);
                setHasGenerated(true);
            } else {
                alert(data.error || '생성 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error(error);
            alert('네트워크 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!hasGenerated || !generatedContent) {
            alert('발행할 글이 없습니다. 먼저 글을 생성해주세요.');
            return;
        }

        if (!naverId || !naverPw) {
            alert('네이버 아이디와 비밀번호를 입력해주세요.');
            return;
        }

        setIsPublishing(true);
        setPublishLogs([{ message: "발행 엔진 초기화 중...", type: "info" }]);

        try {
            const contentLines = generatedContent.split('\n');
            const extractedTitle = contentLines[0].replace(/^#+\s*/, '').replace(/#+\s*$/, '').trim() || topic;
            const bodyContent = contentLines.slice(1).join('\n').trim();

            const res = await fetch('/api/blog/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: naverId,
                    pw: naverPw,
                    title: extractedTitle,
                    content: bodyContent,
                    images: images.map(img => ({
                        url: img.url,
                        base64: img.base64,
                        mimeType: img.mimeType
                    })),
                    mode: publishMode,
                    scheduledTime: publishMode === 'scheduled' ? `${scheduledDate}T${scheduledHour}:${scheduledMinute}:00` : "",
                    storeId: store?.id,
                    topic: topic
                })
            });

            const data = await res.json();

            // 사용량 갱신
            refreshSubscription();

            if (!res.ok && (data.reason === "limit_reached" || data.reason === "trial_expired" || data.reason === "plan_upgrade_needed" || data.reason === "pro_only")) {
                setPendingFeature("블로그 발행");
                setShowUpgradePopup(true);
                setIsPublishing(false);
                return;
            }

            if (res.ok) {
                setPublishLogs(prev => [...prev, { message: "발행이 성공적으로 완료되었습니다!", type: "success" }]);
                alert('네이버 블로그 발행이 완료되었습니다.');
            } else {
                setPublishLogs(prev => [...prev, { message: `오류: ${data.error}`, type: "error" }]);
                alert(data.error || '발행 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error(error);
            setPublishLogs(prev => [...prev, { message: "네트워크 오류가 발생했습니다.", type: "error" }]);
            alert('네트워크 오류가 발생했습니다.');
        } finally {
            setIsPublishing(false);
        }
    };

    const applyComplianceSuggestion = (original: string, suggestion: string) => {
        setGeneratedContent(prev => prev.replace(original, suggestion));
        // 반영 후 목록에서 제거 (UI 업데이트용)
        setCompliance((prev: any) => ({
            ...prev,
            issues: prev.issues.filter((issue: any) => issue.original !== original)
        }));
    };

    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 페이지 헤더 */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md">
                        <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    블로그 자동 생성 & 발행
                </h1>
                <p className="mt-2 text-gray-500 text-lg">
                    주제와 사진만 입력하면 상위 노출 블로그를 분석하여 자동으로 글을 쓰고 발행합니다.
                </p>
            </div>

            {/* 구독 사용량 표시 */}
            {subscription && subscription.plan !== 'admin' && (
                <Card className="p-4 bg-white/50 border-indigo-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <UsageProgressBar
                            label="블로그 발행"
                            current={usage?.blog_count || 0}
                            limit={30}
                        />
                        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
                            <Crown className="h-5 w-5 text-amber-500" />
                            <div className="text-xs">
                                <p className="font-bold text-indigo-900">
                                    {subscription.plan === 'pro' ? '프로 요금제 이용 중' : '베이직 요금제 이용 중'}
                                </p>
                                <p className="text-indigo-600">
                                    {subscription.plan === 'pro' ? '모든 고급 기능을 자유롭게 사용하세요.' : '블로그 관련 기능은 프로 전용입니다.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-8 lg:grid-cols-12 relative">

                {/* 메인 폼 영역 */}
                <div className="lg:col-span-8 space-y-6">

                    {/* NEW: 플레이스 URL 분석 섹션 */}
                    <section className="rounded-3xl border-2 border-primary-100 bg-gradient-to-br from-primary-50/50 to-white p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <LinkIcon className="h-24 w-24" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary-500" />
                                플레이스 URL 분석으로 시작하기
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">
                                매장 주소만 넣으면 AI가 메뉴와 고객 리뷰를 분석하여 최고의 글을 제안합니다.
                            </p>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                        <LinkIcon className="h-4 w-4" />
                                    </div>
                                    <Input
                                        value={placeUrl}
                                        onChange={(e) => setPlaceUrl(e.target.value)}
                                        placeholder="네이버 플레이스 URL을 입력하세요"
                                        className="pl-9 bg-white border-primary-200 focus:ring-primary-500"
                                    />
                                </div>
                                <Button
                                    onClick={handleAnalyzePlace}
                                    disabled={isAnalyzing}
                                    className="bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-200"
                                >
                                    {isAnalyzing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4 mr-2" />
                                    )}
                                    분석하기
                                </Button>
                            </div>

                            {/* 분석 결과 카드 */}
                            {placeData && (
                                <div className="mt-6 animate-in zoom-in-95 duration-300">
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                                <h3 className="font-bold text-emerald-900">{placeData.name}</h3>
                                                <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">{placeData.category}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-xs text-emerald-700 h-7" onClick={() => setPlaceData(null)}>초기화</Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4 mb-4">
                                            <div className="space-y-2">
                                                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">주요 메뉴</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {placeData.menus.map((m: string, i: number) => (
                                                        <span key={i} className="text-[10px] bg-white border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">{m}</span>
                                                    ))}
                                                    {placeData.menus.length === 0 && <span className="text-xs text-gray-400">메뉴 정보 없음</span>}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">손님 반응 키워드</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {placeData.reviewKeywords.map((k: string, i: number) => (
                                                        <span key={i} className="text-[10px] bg-emerald-100/50 text-emerald-800 px-1.5 py-0.5 rounded font-medium">#{k}</span>
                                                    ))}
                                                    {placeData.reviewKeywords.length === 0 && <span className="text-xs text-gray-400">리뷰 정보 없음</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {placeData.photos && placeData.photos.length > 0 && (
                                            <div className="space-y-3 mb-4">
                                                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">매장 사진 (클릭하여 선택)</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {placeData.photos.map((photo: string, i: number) => {
                                                        const isSelected = images.some(img => img.url === photo);
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-emerald-500 ring-2 ring-emerald-100" : "border-transparent hover:border-emerald-200"}`}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setImages(prev => prev.filter(img => img.url !== photo));
                                                                    } else {
                                                                        if (images.length >= 10) {
                                                                            alert("최대 10장까지 선택 가능합니다.");
                                                                            return;
                                                                        }
                                                                        setImages(prev => [...prev, {
                                                                            url: photo,
                                                                            file: null as any,
                                                                            base64: "",
                                                                            mimeType: "image/jpeg"
                                                                        }]);
                                                                    }
                                                                }}
                                                            >
                                                                <img src={photo} alt={`매장 사진 ${i}`} className="w-16 h-16 object-cover" />
                                                                {isSelected && (
                                                                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                                                        <Check className="h-5 w-5 text-white drop-shadow-md" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                                                    <Info className="h-3 w-3" />
                                                    매장의 강점을 살린 글쓰기 준비가 되었습니다!
                                                </p>
                                                <p className="text-[10px] text-emerald-600/80 pl-4">
                                                    * 본인이 등록한 사진만 사용 가능합니다.
                                                </p>
                                            </div>
                                            <Button size="sm" variant="secondary" className="h-8 text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none" onClick={() => setTopic(`[${placeData.name}] ${placeData.reviewKeywords.slice(0, 3).join(", ")} 특징을 살린 블로그 포스팅`)}>
                                                주제 업데이트
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 초구체적 페르소나 마케팅 섹션 */}
                    <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-indigo-50/50 to-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles className="h-16 w-16 text-indigo-500" />
                        </div>

                        <div className="relative z-10 space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-500" />
                                    초구체적 상황 브리핑
                                </h3>
                                {weather && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-indigo-100 shadow-sm">
                                        <span className="text-xl">{weather.icon}</span>
                                        <span className="text-xs font-semibold text-indigo-700">{weather.description}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/60 p-4 rounded-xl border border-indigo-100/50">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Calendar className="h-4 w-4 text-indigo-400" />
                                        <span className="text-xs font-medium text-indigo-600">현재 시점</span>
                                    </div>
                                    <p className="text-base font-bold text-indigo-900">
                                        {dayContext ? `${dayContext.dayName} ${dayContext.timeContext}` : "정보 로딩 중..."}
                                    </p>
                                </div>
                                <div className="bg-white/60 p-4 rounded-xl border border-indigo-100/50">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Users className="h-4 w-4 text-indigo-400" />
                                        <span className="text-xs font-medium text-indigo-600">공략 타겟</span>
                                    </div>
                                    <p className="text-base font-bold text-indigo-900">{targetPersona}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-indigo-700 ml-1">오늘 누구를 공략할까요?</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {["모두", "직장인", "육아맘", "커플", "학생", "1인 가구", "반려동물 가족", "MZ세대"].map((p) => {
                                        const isProPersona = ["반려동물 가족", "MZ세대"].includes(p);
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => {
                                                    if (isProPersona && !checkAccess("extended_persona")) {
                                                        setPendingFeature(p);
                                                        setShowUpgradePopup(true);
                                                        return;
                                                    }
                                                    setTargetPersona(p);
                                                }}
                                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${targetPersona === p
                                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                                    : "bg-white text-indigo-600 border border-indigo-100 hover:border-indigo-300"
                                                    }`}
                                            >
                                                {p}
                                                {isProPersona && <Crown className="h-3 w-3 text-amber-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 1. 네이버 계정 정보 */}
                    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <UserCircle className="h-5 w-5 text-blue-500" />
                                네이버 계정
                            </h2>
                            <div className="flex items-center gap-2">
                                {hasSavedCookies && (
                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
                                        <ShieldCheck className="h-3.5 w-3.5" /> 세션 연결됨
                                    </span>
                                )}
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                                    <Check className="h-3 w-3" /> 기기 내 자동 저장됨
                                </span>
                            </div>
                        </div>
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                                    <Cookie className="h-4 w-4 text-blue-600" />
                                    환경변수 쿠키 기반 로그인 (Manual Session)
                                </h3>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    네이버의 강력한 보안 정책으로 인해 수동 쿠키 설정 방식을 사용합니다.
                                    서버의 <b>.env</b> 파일에 <b>NAVER_NID_AUT</b>, <b>NAVER_NID_SES</b>를 설정해주세요.
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                className={`h-11 px-6 border-blue-200 text-blue-700 hover:bg-white transition-all shadow-sm ${isSyncing ? "animate-pulse" : ""}`}
                                onClick={handleSyncNaver}
                                disabled={isSyncing}
                            >
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                세션 상태 확인
                            </Button>
                        </div>

                        {captchaUrl && (
                            <div className="mt-4 p-4 border border-amber-100 bg-amber-50 rounded-xl animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> 보안 문자가 발생했습니다
                                </p>
                                <div className="bg-white p-2 rounded-lg border border-amber-200 inline-block mb-2">
                                    <img src={captchaUrl} alt="Captcha" className="h-12" />
                                </div>
                            </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-[11px] font-bold text-gray-700 mb-1">💡 쿠키 가져오는 방법</p>
                                <ol className="text-[10px] text-gray-500 space-y-1 list-decimal ml-4">
                                    <li>PC 크롬에서 네이버 로그인</li>
                                    <li>F12 → Application → Cookies → naver.com</li>
                                    <li>NID_AUT, NID_SES 값 복사</li>
                                </ol>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-[11px] font-bold text-gray-700 mb-1">📟 서버 설정 방법</p>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    서버 SSH 접속 후 .env 파일 수정:<br />
                                    <code className="bg-gray-200 px-1 rounded text-red-600">NAVER_NID_AUT=값</code><br />
                                    <code className="bg-gray-200 px-1 rounded text-red-600">NAVER_NID_SES=값</code>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 2. 콘텐츠 주제 및 사진 */}
                    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlignLeft className="h-5 w-5 text-pink-500" />
                            글 작성 정보
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">포스팅 주제 / 키워드</label>
                                <Input
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="예: 강남역 삼겹살 맛집 추천, 연말 모임장소"
                                    className="bg-gray-50/50 text-base py-6"
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    * 입력하신 키워드로 상위 3개 블로그를 분석하여 트렌디하게 글을 작성합니다.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Images className="h-4 w-4 text-gray-400" />
                                    사진 첨부
                                </label>
                                <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center hover:bg-gray-100/50 transition-colors cursor-pointer group active:scale-[0.99] overflow-hidden">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        style={{ fontSize: '16px' }}
                                    />
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3 group-hover:bg-white group-hover:text-primary-600 transition-colors pointer-events-none">
                                        <Images className="h-6 w-6 text-gray-400 group-hover:text-primary-600" />
                                    </div>
                                    <span className="font-medium text-gray-900 block relative pointer-events-none">사진을 여기로 드래그하거나 클릭하여 업로드</span>
                                    <p className="mt-1 text-sm text-gray-500 pointer-events-none">업로드 된 사진은 내용에 맞게 자동 배치됩니다.</p>
                                </div>

                                {images.length > 0 && (
                                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={img.url} alt={`upload-${idx}`} className="h-full w-full object-cover" />
                                                <button
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full text-lg h-14 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 shadow-md shadow-primary-500/20"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                                        AI가 글을 작성하는 중입니다...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 h-5 w-5" />
                                        AI 블로그 글 생성하기
                                    </>
                                )}
                            </Button>
                        </div>
                    </section>

                    {/* 3. 생성된 글 미리보기 및 편집 */}
                    {hasGenerated && (
                        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FileEdit className="h-5 w-5 text-purple-500" />
                                    작성된 글 확인 및 수정
                                </h2>
                                <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> 생성 완료
                                </span>
                            </div>

                            <Textarea
                                className="min-h-[400px] text-base leading-relaxed bg-gray-50/50 p-4 resize-y focus:bg-white"
                                value={generatedContent}
                                onChange={(e) => setGeneratedContent(e.target.value)}
                                placeholder="생성된 글이 없습니다."
                            />
                            <p className="mt-2 text-sm text-gray-500 flex items-center gap-1.5">
                                <FileEdit className="h-3.5 w-3.5" />
                                위 텍스트 상자에서 내용을 직접 수정할 수 있습니다. 이미지는 에디터 상단/하단 혹은 텍스트 사이 공백에 자동 배치됩니다.
                            </p>

                            {/* 법적 검토 결과 섹션 */}
                            {compliance && (
                                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className={`rounded-xl border p-4 ${compliance.isSafe ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                {compliance.isSafe ? (
                                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                                )}
                                                <h3 className={`font-bold ${compliance.isSafe ? 'text-emerald-900' : 'text-amber-900'}`}>
                                                    법적 규제 검토 결과: {compliance.isSafe ? '안전' : '주의 필요'}
                                                </h3>
                                            </div>
                                            {!compliance.isSafe && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 uppercase">Warning</span>
                                            )}
                                        </div>
                                        <p className={`text-sm mb-4 ${compliance.isSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {compliance.summary}
                                        </p>

                                        {!compliance.isSafe && compliance.issues.length > 0 && (
                                            <div className="space-y-3">
                                                {compliance.issues.map((issue: any, i: number) => (
                                                    <div key={i} className="bg-white/60 rounded-lg p-3 border border-amber-200/50 shadow-sm">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">기존 표현</span>
                                                                    <span className="text-sm font-medium text-gray-900 leading-tight">"{issue.original}"</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">수정 제안</span>
                                                                    <span className="text-sm font-bold text-emerald-700 leading-tight">"{issue.suggestion}"</span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-500 mt-1.5 pl-0.5">• {issue.reason}</p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="flex-shrink-0 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 h-8 text-xs"
                                                                onClick={() => applyComplianceSuggestion(issue.original, issue.suggestion)}
                                                            >
                                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                                바로 수정
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400 px-1">
                                        <Info className="h-3 w-3" />
                                        <span>본 검토 결과는 AI의 분석이며, 법적 최종 판단은 관련 부처의 기준에 따릅니다.</span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 4. 발행 로그 터미널 (이동 및 대형화) */}
                    {(publishLogs.length > 0 || isPublishing) && (
                        <section className="rounded-2xl border border-gray-900 bg-gray-900 p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/90 shadow-sm shadow-red-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/90 shadow-sm shadow-yellow-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/90 shadow-sm shadow-green-500/20"></div>
                                    </div>
                                    <h2 className="text-sm font-bold text-gray-400 tracking-widest uppercase flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Naver Publish Console v1.0
                                    </h2>
                                </div>
                                {isPublishing && (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Live Syncing</span>
                                    </div>
                                )}
                            </div>

                            <div className="font-mono text-sm text-gray-300 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {publishLogs.length === 0 && (
                                    <div className="text-gray-600 italic">연결 대기 중...</div>
                                )}
                                {publishLogs.map((log, i) => (
                                    <div key={i} className={`flex gap-3 py-0.5 border-l-2 pl-3 transition-colors ${log.type === 'error' ? 'border-red-500 bg-red-500/5 text-red-300' :
                                        log.type === 'success' ? 'border-green-500 bg-green-500/5 text-green-300' :
                                            log.type === 'warning' ? 'border-yellow-500 bg-yellow-500/5 text-yellow-300' :
                                                'border-blue-500 bg-blue-500/5 text-blue-300'
                                        }`}>
                                        <span className="opacity-30 flex-shrink-0 font-bold tabular-nums">
                                            [{new Date().toLocaleTimeString([], { hour12: false })}]
                                        </span>
                                        <span className="leading-relaxed font-medium">{log.message}</span>
                                    </div>
                                ))}
                                {isPublishing && (
                                    <div className="flex items-center gap-3 pl-3 py-1 text-gray-500 animate-pulse">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"></div>
                                        </div>
                                        <span className="text-xs italic tracking-tight">AI 엔진이 브라우저 세션을 제어하고 있습니다. 잠시만 기다려 주세요.</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                {/* 사이드 설정 영역 (발행) */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sticky top-24">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Send className="h-5 w-5 text-emerald-500" />
                            최종 발행 설정
                        </h2>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50/50">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="draft"
                                        checked={publishMode === "draft"}
                                        onChange={() => setPublishMode("draft")}
                                        className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-900 block text-sm">임시 저장 (권장)</span>
                                        <span className="text-xs text-gray-500">네이버 블로그 임시저장함에 보관</span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50/50">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="scheduled"
                                        checked={publishMode === "scheduled"}
                                        onChange={() => setPublishMode("scheduled")}
                                        className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-900 block text-sm">예약 발행</span>
                                        <span className="text-xs text-gray-500">지정된 시간에 맞춰 자동 포스팅</span>
                                    </div>
                                </label>

                                {publishMode === "scheduled" && (
                                    <div className="pl-8 pt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 block">날짜</label>
                                            <Input
                                                type="date"
                                                className="h-9 text-sm"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-medium text-gray-700 mb-1 block">시간(시)</label>
                                                <select
                                                    className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                                    value={scheduledHour}
                                                    onChange={(e) => setScheduledHour(e.target.value)}
                                                >
                                                    {Array.from({ length: 24 }).map((_, i) => (
                                                        <option key={i} value={String(i).padStart(2, '0')}>{i}시</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-700 mb-1 block">분 (10분 단위)</label>
                                                <select
                                                    className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                                    value={scheduledMinute}
                                                    onChange={(e) => setScheduledMinute(e.target.value)}
                                                >
                                                    {["00", "10", "20", "30", "40", "50"].map(m => (
                                                        <option key={m} value={m}>{m}분</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 space-y-4">
                                <Button
                                    className={`w-full h-16 text-lg shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-0.5 ${publishMode === 'draft'
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                                        }`}
                                    onClick={handlePublish}
                                    disabled={isPublishing || !hasGenerated}
                                >
                                    {isPublishing ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span className="font-bold">발행 처리 중...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                {publishMode === "draft" ? <Save className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                                                <span className="font-bold text-xl">
                                                    {publishMode === "draft" ? "임시저장" : "예약발행"} 하기
                                                </span>
                                            </div>
                                            <span className="text-[10px] opacity-70 font-medium uppercase tracking-widest">
                                                Naver Blog Automation
                                            </span>
                                        </>
                                    )}
                                </Button>

                                {!hasGenerated && (
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-xs font-medium text-gray-500">
                                            콘텐츠 작성이 완료되면 <br />발행 버튼이 활성화됩니다.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

            </div>
            <UpgradePopup
                isOpen={showUpgradePopup}
                onClose={() => setShowUpgradePopup(false)}
                featureName={pendingFeature}
            />
        </div>
    );
}

export default function AutomationPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12 text-gray-500">로딩 중...</div>}>
            <AutomationPageContent />
        </Suspense>
    );
}
