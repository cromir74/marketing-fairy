"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Video, Play, Loader2, ImagePlus, X, Heart, Download, CheckCircle2, Users, Cloud, Thermometer, Sun, CloudRain, Lightbulb, RefreshCw } from "lucide-react";
import { uploadGeneratedImage } from "@/lib/supabase/storage";
import { getCurrentWeather, getDayContext, WeatherInfo } from "@/lib/weather";

const FREE_BGM_OPTIONS = [
    { value: "", label: "없음 (음악 없이 제작)" },
    { value: "https://www.bensound.com/bensound-music/bensound-ukulele.mp3", label: "밝고 경쾌한 (업템포)" },
    { value: "https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3", label: "잔잔하고 감성적" },
    { value: "https://www.bensound.com/bensound-music/bensound-energy.mp3", label: "에너지 넘치는" },
];

const FONTS = [
    { value: "Noto Sans KR", label: "노토 산스" },
    { value: "Black Han Sans", label: "블랙 한 산스 (강조용)" },
    { value: "Nanum Gothic", label: "나눔 고딕" },
];

const COLORS = [
    { value: "#FFFFFF", label: "흰색" },
    { value: "#000000", label: "검은색" },
    { value: "#FFD700", label: "노란색" },
];

export default function ReelsCreatePage() {
    const [store, setStore] = useState<any>(null);
    const [topic, setTopic] = useState("");
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [style, setStyle] = useState("메뉴 소개");
    const [targetPersona, setTargetPersona] = useState<string>("모두");
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [dayContext, setDayContext] = useState<any>(null);

    const [images, setImages] = useState<{ preview: string; base64: string; mimeType: string }[]>([]);
    const [selectedBgm, setSelectedBgm] = useState(FREE_BGM_OPTIONS[0].value);
    const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isWeatherLoading, setIsWeatherLoading] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [reelsHistoryId, setReelsHistoryId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStore() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("stores").select("*").eq("user_id", user.id).single();
                setStore(data);
            }
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

    const handleSuggest = async () => {
        if (!store) return;
        setIsSuggesting(true);
        try {
            const storeInfo = {
                name: store.name,
                category: store.category,
                location: store.location,
                atmosphere: store.atmosphere,
                mainProducts: store.main_products,
            };
            const res = await fetch("/api/content/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "suggest", storeInfo }),
            });
            const data = await res.json();
            setSuggestedTopics(data.topics || []);
        } catch {
            setSuggestedTopics(["오늘의 인기 메뉴 소개", "방문 고객 감사 릴스", "가게 분위기 자랑하기"]);
        }
        setIsSuggesting(false);
    };

    const uploadImagesToSupabase = async (): Promise<string[]> => {
        const publicUrls: string[] = [];
        for (let i = 0; i < images.length; i++) {
            const url = await uploadGeneratedImage(images[i].preview, `reels_${Date.now()}_${i}.jpg`);
            publicUrls.push(url);
        }
        return publicUrls;
    };

    const handleCreateReels = async () => {
        if (!topic || images.length < 3) {
            alert("최소 3장의 사진과 주제를 입력해주세요.");
            return;
        }

        setIsGenerating(true);
        setVideoUrl(null);

        try {
            const uploadedImageUrls = await uploadImagesToSupabase();

            const scriptRes = await fetch("/api/reels/generate-script", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    storeInfo: store,
                    topic,
                    style,
                    persona: targetPersona,
                    context: {
                        weather: weather?.condition || "맑음",
                        dayName: dayContext?.dayName || "평일",
                        timeContext: dayContext?.timeContext || "오늘"
                    }
                })
            });
            if (!scriptRes.ok) throw new Error("대본 생성 실패");
            const { slides } = await scriptRes.json();

            const videoRes = await fetch("/api/reels/generate-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slides,
                    uploadedImageUrls,
                    selectedBgmUrl: selectedBgm,
                    selectedFont,
                    selectedTextColor: selectedColor
                })
            });
            if (!videoRes.ok) throw new Error("렌더링 요청 실패");
            const { projectId } = await videoRes.json();

            setIsGenerating(false);
            setIsRendering(true);
            pollRenderStatus(projectId);
        } catch (error: any) {
            console.error(error);
            alert("오류 발생: " + error.message);
            setIsGenerating(false);
            setIsRendering(false);
        }
    };

    const pollRenderStatus = async (projectId: string) => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/reels/status?projectId=${projectId}`);
                const data = await res.json();
                if (data.status === "done" && data.videoUrl) {
                    setVideoUrl(data.videoUrl);
                    setIsRendering(false);
                } else {
                    setTimeout(checkStatus, 3000);
                }
            } catch (err) {
                setTimeout(checkStatus, 3000);
            }
        };
        await checkStatus();
    };

    const handlePublish = async () => {
        if (!videoUrl) return;
        setIsPublishing(true);
        try {
            const res = await fetch("/api/reels/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoUrl, content: topic })
            });
            if (!res.ok) throw new Error("발행 실패");
            alert("인스타그램 릴스가 성공적으로 게시되었습니다! ✨");
        } catch (err: any) {
            alert("발행 오류: " + err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 8) {
            alert("최대 8장까지만 가능합니다.");
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setImages(prev => [...prev, {
                    preview: dataUrl,
                    base64: dataUrl.split(",")[1],
                    mimeType: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });
    }

    if (!store) {
        return <div className="p-8 text-center text-gray-500">가게 정보를 불러오는 중입니다...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-4 lg:p-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <Video className="h-8 w-8 text-indigo-600" />
                        AI 릴스 메이커 ✨
                    </h1>
                    <p className="mt-2 text-gray-500 font-medium">
                        사진만 골라주세요. AI가 음악과 자막이 포함된 완벽한 15초 영상을 만듭니다.
                    </p>
                </div>
                <Card className="px-5 py-3 bg-white/50 backdrop-blur-sm border-indigo-100 flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">이번 달 잔여 횟수</p>
                        <p className="text-xl font-black text-indigo-600">10 / 10</p>
                    </div>
                    <div className="h-10 w-[2px] bg-gray-100" />
                    <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                </Card>
            </header>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                {/* 컨트롤 패널 */}
                <div className="lg:col-span-7 space-y-6">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-1 bg-indigo-600 rounded-full" />
                            <h2 className="text-lg font-bold text-gray-800">1. 무엇을 홍보할까요?</h2>
                        </div>
                        <Card className="p-6 space-y-5 shadow-sm hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-gray-600 block">릴스 주제</label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-indigo-600 font-bold hover:bg-indigo-50"
                                        onClick={handleSuggest}
                                        disabled={isSuggesting}
                                    >
                                        {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Lightbulb className="w-3 h-3 mr-1" />}
                                        AI 주제 추천
                                    </Button>
                                </div>

                                {suggestedTopics.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {suggestedTopics.map((t, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setTopic(t)}
                                                className="px-3 py-1.5 rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <Input
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="h-12 border-gray-200 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="예) 오늘 아침 들어온 싱싱한 연어 사시미 소개"
                                />
                            </div>
                        </Card>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-1 bg-indigo-600 rounded-full" />
                                <h2 className="text-lg font-bold text-gray-800">2. 타겟과 상황</h2>
                            </div>

                            {weather && (
                                <div className="flex items-center gap-3 px-3 py-1.5 bg-sky-50 rounded-full border border-sky-100">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-lg">{weather.icon}</span>
                                        <span className="text-xs font-bold text-sky-700">{weather.condition}</span>
                                    </div>
                                    <div className="w-[1px] h-3 bg-sky-200" />
                                    <span className="text-xs font-bold text-sky-700">{dayContext?.timeContext}</span>
                                </div>
                            )}
                        </div>

                        <Card className="p-6 space-y-6 shadow-sm">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-600 block">오늘은 누구를 공략할까요? (페르소나)</label>
                                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                                    {["모두", "MZ세대", "커플", "직장인", "육아맘", "학생", "1인가구", "반려동물가족"].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setTargetPersona(p)}
                                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${targetPersona === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-100 hover:border-indigo-200'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-bold text-gray-600 block">릴스 스타일</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {["메뉴 소개", "가게 분위기", "리뷰 하이라이트", "오늘의 추천"].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setStyle(opt)}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border ${style === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.02]' : 'bg-white text-gray-600 border-gray-100 hover:border-indigo-300 hover:bg-gray-50'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-1 bg-indigo-600 rounded-full" />
                            <h2 className="text-lg font-bold text-gray-800">3. 감성 더하기</h2>
                        </div>
                        <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">배경 음악</label>
                                <select
                                    className="w-full h-11 rounded-xl border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                                    value={selectedBgm}
                                    onChange={(e) => setSelectedBgm(e.target.value)}
                                >
                                    {FREE_BGM_OPTIONS.map(bgm => (
                                        <option key={bgm.value} value={bgm.value}>{bgm.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">글꼴 디자인</label>
                                <select
                                    className="w-full h-11 rounded-xl border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                                    value={selectedFont}
                                    onChange={(e) => setSelectedFont(e.target.value)}
                                >
                                    {FONTS.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                        </Card>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-1 bg-indigo-600 rounded-full" />
                            <h2 className="text-lg font-bold text-gray-800">4. 사진 업로드</h2>
                        </div>
                        <Card className="p-6 shadow-sm">
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square group">
                                        <img src={img.preview} alt="" className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" />
                                        <button
                                            onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-2 -right-2 rounded-full bg-white text-gray-400 shadow-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="absolute bottom-1 left-1 bg-black/50 text-[10px] text-white px-1.5 py-0.5 rounded-md font-bold">
                                            #{idx + 1}
                                        </div>
                                    </div>
                                ))}
                                {images.length < 8 && (
                                    <div className="relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                                        <ImagePlus className="h-6 w-6 text-gray-400" />
                                        <span className="text-[10px] mt-1 font-bold text-gray-400">추가하기</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="mt-4 text-[11px] text-gray-400 font-medium text-center">최소 3장에서 최대 8장까지 권장합니다.</p>
                        </Card>
                    </section>

                    <Button
                        size="lg"
                        className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 text-lg font-black transition-all active:scale-[0.98]"
                        onClick={handleCreateReels}
                        disabled={isGenerating || isRendering || images.length < 3 || !topic}
                    >
                        {isGenerating || isRendering ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Sparkles className="w-6 h-6 mr-2" />}
                        {isGenerating ? "AI가 대본을 작성 중..." : isRendering ? "고화질 영상 렌더링 중 (최대 2분)" : "릴스 영상 제작 시작 ✨"}
                    </Button>
                </div>

                {/* 미리보기 패널 */}
                <div className="lg:col-span-5 relative">
                    <div className="sticky top-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-6 w-1 bg-indigo-600 rounded-full" />
                            <h2 className="text-lg font-bold text-gray-800">실시간 미리보기</h2>
                        </div>
                        <Card className="aspect-[9/16] overflow-hidden bg-gray-900 shadow-2xl rounded-[2.5rem] border-[8px] border-gray-800 flex items-center justify-center relative group">
                            {videoUrl ? (
                                <div className="h-full w-full">
                                    <video src={videoUrl} controls autoPlay loop className="h-full w-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-10 px-6 flex flex-col gap-3">
                                        <Button
                                            className="w-full h-12 bg-white text-gray-900 hover:bg-gray-100 font-black rounded-xl text-md"
                                            onClick={handlePublish}
                                            disabled={isPublishing}
                                        >
                                            {isPublishing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                            인스타그램에 올리기
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="w-full h-12 bg-gray-800/80 backdrop-blur-md text-white border-none font-bold rounded-xl"
                                            onClick={() => window.open(videoUrl, "_blank")}
                                        >
                                            <Download className="mr-2 h-5 w-5" /> 내 폰에 저장
                                        </Button>
                                    </div>
                                </div>
                            ) : (isGenerating || isRendering) ? (
                                <div className="text-center p-8 space-y-6">
                                    <div className="relative inline-block">
                                        <div className="w-20 h-20 bg-indigo-600/20 rounded-full animate-ping absolute inset-0" />
                                        <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center relative">
                                            <Loader2 className="w-10 h-10 text-white animate-spin" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-white text-xl font-black mb-2">릴스 제작 중...</p>
                                        <p className="text-gray-400 text-sm font-medium">페이지를 닫지 말고 잠시만 기다려주세요.</p>
                                    </div>
                                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-indigo-500 h-full animate-[loading_10s_ease-in-out_infinite]" style={{ width: isGenerating ? '30%' : '70%' }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-12 space-y-4">
                                    <Video className="w-16 h-16 text-gray-700 mx-auto opacity-20" />
                                    <div className="space-y-1">
                                        <p className="text-gray-500 font-black">대기 중</p>
                                        <p className="text-gray-600 text-xs font-medium">정보 입력 후 만들기 버튼을 눌러주세요.</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes loading {
                    0% { width: 0%; }
                    50% { width: 80%; }
                    100% { width: 95%; }
                }
            `}</style>
        </div>
    );
}
