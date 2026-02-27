"use client";

import { useEffect, useState, useActionState, useRef } from "react";
import { saveStore } from "@/app/actions/store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CATEGORIES, TONES } from "@/lib/utils";
import { Store, CheckCircle2, Search, Loader2, Sparkles, X, Upload } from "lucide-react";

const TARGET_CUSTOMERS = [
    "직장인", "학생", "커플", "가족", "육아맘", "1인 손님", "시니어", "외국인", "반려동물 동반"
];

export default function StorePage() {
    const [state, formAction, isPending] = useActionState(saveStore, null);
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Auto Analysis State
    const [naverUrl, setNaverUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeSuccess, setAnalyzeSuccess] = useState<boolean | null>(null);
    const [showHighlight, setShowHighlight] = useState(false);

    // Form Fields State
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        location: "",
        tone: "",
        phone: "",
        business_hours: "",
        main_products: "",
        atmosphere: "",
        one_liner: "",
    });

    // Custom Fields State
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [naverPlaceUrl, setNaverPlaceUrl] = useState("");
    const [naverRating, setNaverRating] = useState<number | null>(null);

    // Uploading state
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchStore() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("stores")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();
                if (data) {
                    setStore(data);
                    setFormData({
                        name: data.name || "",
                        category: data.category || "",
                        location: data.location || "",
                        tone: data.tone || "",
                        phone: data.phone || "",
                        business_hours: data.business_hours || "",
                        main_products: data.main_products || "",
                        atmosphere: data.atmosphere || "",
                        one_liner: data.one_liner || "",
                    });
                    setSelectedCustomers(data.target_customers || []);
                    setPhotos(data.photos || []);
                    setNaverPlaceUrl(data.naver_place_url || "");
                    setNaverRating(data.naver_rating || null);
                    if (data.naver_place_url) {
                        setNaverUrl(data.naver_place_url);
                    }
                }
            }
            setLoading(false);
        }
        fetchStore();
    }, [state?.success]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomerToggle = (customer: string) => {
        setSelectedCustomers(prev =>
            prev.includes(customer) ? prev.filter(c => c !== customer) : [...prev, customer]
        );
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (photos.length + files.length > 5) {
            alert("사진은 최대 5장까지만 업로드 가능합니다.");
            return;
        }

        setIsUploading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("로그인이 필요합니다.");
            setIsUploading(false);
            return;
        }

        const processAndUpload = async (file: File) => {
            return new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target?.result as string;
                    img.onload = async () => {
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

                        canvas.toBlob(async (blob) => {
                            if (!blob) {
                                resolve(null);
                                return;
                            }
                            const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                            const { data, error } = await supabase.storage
                                .from('stores-photos')
                                .upload(fileName, blob, { contentType: 'image/jpeg' });

                            if (error) {
                                console.error("Upload error:", error);
                                resolve(null);
                            } else {
                                const { data: publicData } = supabase.storage
                                    .from('stores-photos')
                                    .getPublicUrl(fileName);
                                resolve(publicData.publicUrl);
                            }
                        }, "image/jpeg", 0.8);
                    };
                    img.onerror = () => resolve(null);
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        };

        const uploadPromises = files.map(file => processAndUpload(file));
        const uploadedUrls = await Promise.all(uploadPromises);
        const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);

        setPhotos(prev => [...prev, ...successfulUrls]);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const analyzeNaverPlace = async () => {
        if (!naverUrl) return;
        setIsAnalyzing(true);
        setAnalyzeSuccess(null);

        try {
            const res = await fetch("/api/place/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: naverUrl })
            });

            if (res.ok) {
                const data = await res.json();

                // 매핑 로직
                let matchedCategory = "";
                if (data.category) {
                    const catLower = data.category.toLowerCase();
                    // 음식점 키워드 확장 (코다리, 한정식 등 추가)
                    const restaurantKeywords = ['식당', '음식', '맛집', '한식', '중식', '일식', '양식', '고기', '포차', '주점', '술집', '코다리', '한정식', '찜', '탕', '찌개', '면', '국수', '밥'];

                    if (catLower.includes('카페') || catLower.includes('커피') || catLower.includes('베이커리') || catLower.includes('빵') || catLower.includes('디저트')) matchedCategory = "cafe";
                    else if (restaurantKeywords.some(k => catLower.includes(k))) matchedCategory = "restaurant";
                    else if (catLower.includes('미용') || catLower.includes('헤어') || catLower.includes('네일') || catLower.includes('뷰티') || catLower.includes('속눈썹')) matchedCategory = "beauty";
                    else if (catLower.includes('헬스') || catLower.includes('필라테스') || catLower.includes('크로스핏') || catLower.includes('운동') || catLower.includes('요가') || catLower.includes('피트니스')) matchedCategory = "fitness";
                    else if (catLower.includes('학원') || catLower.includes('교육') || catLower.includes('스터디')) matchedCategory = "academy";
                    else if (catLower.includes('꽃') || catLower.includes('식물')) matchedCategory = "flower";
                    else if (catLower.includes('반려동물') || catLower.includes('동물') || catLower.includes('애견')) matchedCategory = "pet";
                    else if (data.category && data.category.trim() !== "") {
                        const exactMatch = CATEGORIES.find(c => c.label.includes(data.category) || data.category.includes(c.label.split('/')[0].trim()));
                        matchedCategory = exactMatch ? exactMatch.value : "other";
                    }
                }

                // 톤앤매너 매핑 로직
                const getMatchedTone = (category: string) => {
                    switch (category) {
                        case "cafe": return "warm"; // 따뜻한
                        case "restaurant": return "friendly"; // 친근한
                        case "beauty": return "trendy"; // 트렌디한
                        case "fitness": return "professional"; // 전문적인
                        case "academy": return "professional"; // 전문적인
                        case "flower": return "warm"; // 따뜻한
                        case "pet": return "cute"; // 귀여운
                        default: return "friendly"; // 기본: 친근한
                    }
                };

                // 위치 정보 포맷 (경기도 안양시 동안구 ...)
                let formattedLocation = data.address || formData.location;
                if (data.address && typeof data.address === 'string') {
                    const parts = data.address.trim().split(/\s+/);
                    // '경기 안양시 동안구' 처럼 앞 3단어만 가져오기 (사용자 요청: 무슨구 까지만)
                    if (parts.length >= 3) {
                        formattedLocation = `${parts[0]} ${parts[1]} ${parts[2]}`;
                    } else if (parts.length >= 2) {
                        formattedLocation = `${parts[0]} ${parts[1]}`;
                    }
                }

                let cleanHours = data.businessHours || formData.business_hours;
                if (data.businessHours && typeof data.businessHours === 'string') {
                    // 영업시간 추출 최적화: 평일 시간 (11:00 - 20:30 형태 등) 추출
                    const timePattern = /\d{1,2}:\d{2}\s*(?:~|-| - )\s*\d{1,2}:\d{2}/;
                    const matches = data.businessHours.match(timePattern);
                    if (matches) {
                        cleanHours = matches[0];
                    } else if (data.businessHours.includes("영업 시작")) {
                        const idx = data.businessHours.indexOf("영업 시작") + 5;
                        cleanHours = data.businessHours.slice(0, idx).trim();
                    }
                }

                setFormData(prev => ({
                    ...prev,
                    name: data.name || prev.name,
                    category: matchedCategory || prev.category,
                    tone: matchedCategory ? getMatchedTone(matchedCategory) : prev.tone,
                    location: formattedLocation,
                    phone: data.phone || prev.phone,
                    business_hours: cleanHours,
                    main_products: data.menus && data.menus.length > 0 && data.menus[0] !== "메뉴 정보 없음" ? data.menus.join(", ") : prev.main_products,
                    atmosphere: data.reviewKeywords && data.reviewKeywords.length > 0 && data.reviewKeywords[0] !== "검색된 키워드 없음"
                        ? (prev.atmosphere ? prev.atmosphere + "\n\n참고 키워드: " + data.reviewKeywords.join(", ") : data.reviewKeywords.join(", "))
                        : prev.atmosphere
                }));

                setNaverPlaceUrl(naverUrl);
                if (data.rating) setNaverRating(data.rating);

                setAnalyzeSuccess(true);
                setShowHighlight(true);
                setTimeout(() => setShowHighlight(false), 1500);
            } else {
                setAnalyzeSuccess(false);
            }
        } catch (error) {
            setAnalyzeSuccess(false);
        }
        setIsAnalyzing(false);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
                <Card><div className="space-y-4 p-6"><div className="h-10 rounded-xl bg-gray-100 animate-pulse" /></div></Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-12">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                    <Store className="h-7 w-7 text-primary-600" />
                    가게 관리
                </h1>
                <p className="mt-1 text-gray-500">
                    {store ? "새로 추가된 항목이 있어요! 입력하면 AI 글 퀄리티가 올라가요 ✨" : "가게 정보를 자세히 입력할수록 AI가 더 좋은 글을 써줍니다."}
                </p>
            </div>

            {state?.success && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700 animate-in fade-in">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    {state.success}
                </div>
            )}

            {/* 섹션 A: 네이버 플레이스 자동 분석 영역 */}
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200 overflow-hidden shadow-sm">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h2 className="text-lg font-bold text-gray-900">네이버 플레이스 URL로 자동 등록</h2>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">URL만 입력하면 가게 정보가 자동으로 채워져요!</p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Input
                                value={naverUrl}
                                onChange={(e) => setNaverUrl(e.target.value)}
                                placeholder="예: https://naver.me/xxxxx 또는 https://map.naver.com/..."
                                disabled={isAnalyzing}
                                className="bg-white"
                            />
                            <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                                네이버 지도에서 내 가게 검색 → 공유 → 링크 복사
                            </p>
                        </div>
                        <Button
                            onClick={analyzeNaverPlace}
                            disabled={!naverUrl || isAnalyzing}
                            className={`bg-purple-600 hover:bg-purple-700 shrink-0 ${isAnalyzing ? 'opacity-80' : ''}`}
                        >
                            {isAnalyzing ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 분석 중...</>
                            ) : (
                                <><Search className="w-4 h-4 mr-2" /> {store ? "다시 분석하기" : "자동 분석하기"}</>
                            )}
                        </Button>
                    </div>

                    {analyzeSuccess === true && (
                        <div className="mt-3 flex items-center gap-1.5 text-sm text-green-600 font-medium animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4" /> 가게 정보를 가져왔어요! 아래에서 확인해주세요.
                        </div>
                    )}
                    {analyzeSuccess === false && (
                        <div className="mt-3 flex items-center gap-1.5 text-sm text-red-500 font-medium animate-in fade-in">
                            <X className="w-4 h-4" /> 가게 정보를 가져오지 못했어요. 아래에서 직접 입력해주세요.
                        </div>
                    )}
                </div>
            </Card>

            <div className="flex items-center justify-center gap-4 text-gray-400">
                <div className="h-px bg-gray-200 w-full max-w-[100px]" />
                <span className="text-sm font-medium">또는 직접 입력하기</span>
                <div className="h-px bg-gray-200 w-full max-w-[100px]" />
            </div>

            <form action={formAction} className="space-y-8">
                {/* 섹션 B: 가게 기본 정보 */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-5">가게 기본 정보</h3>
                    <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="relative">
                                <Input
                                    id="name" name="name" label="가게명 *" placeholder="예: 봄날의 카페"
                                    value={formData.name} onChange={handleInputChange} required
                                    className={showHighlight && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                                />
                                {showHighlight && analyzeSuccess && <span className="absolute right-3 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">자동 입력됨</span>}
                            </div>
                            <div className="relative">
                                <Select
                                    id="category" name="category" label="업종 *" options={[...CATEGORIES]}
                                    value={formData.category} onChange={handleInputChange} required
                                    className={showHighlight && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                                />
                                {showHighlight && analyzeSuccess && <span className="absolute right-9 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded z-10">자동 입력됨</span>}
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="relative">
                                <Input
                                    id="location" name="location" label="위치" placeholder="예: 서울 마포구 연남동"
                                    value={formData.location} onChange={handleInputChange}
                                    className={showHighlight && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                                />
                                {showHighlight && analyzeSuccess && <span className="absolute right-3 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">자동 입력됨</span>}
                            </div>
                            <div className="relative">
                                <Select
                                    id="tone" name="tone" label="톤앤매너" options={[...TONES]}
                                    value={formData.tone} onChange={handleInputChange}
                                    className={showHighlight && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                                />
                                {showHighlight && analyzeSuccess && <span className="absolute right-9 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded z-10">자동 추천됨</span>}
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="relative">
                                <Input
                                    id="phone" name="phone" label="전화번호" placeholder="예: 02-1234-5678"
                                    value={formData.phone} onChange={handleInputChange}
                                    className={showHighlight && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                                />
                                {showHighlight && analyzeSuccess && <span className="absolute right-3 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">자동 입력됨</span>}
                            </div>
                            <div className="relative">
                                <Input
                                    id="business_hours" name="business_hours" label="영업시간" placeholder="예: 매일 10:00-22:00"
                                    value={formData.business_hours} onChange={handleInputChange}
                                    className={showHighlight && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                                />
                                {showHighlight && analyzeSuccess && <span className="absolute right-3 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">자동 입력됨</span>}
                            </div>
                        </div>

                        <div className="relative">
                            <Input
                                id="main_products" name="main_products" label="주요 메뉴 / 서비스" placeholder="예: 아메리카노, 딸기 케이크, 브런치 세트"
                                value={formData.main_products} onChange={handleInputChange}
                                className={showHighlight && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                            />
                            {showHighlight && analyzeSuccess && <span className="absolute right-3 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">자동 입력됨</span>}
                            <p className="text-[11px] text-gray-500 mt-1 pl-1">쉼표(,)로 구분해서 입력해주세요</p>
                        </div>

                        <div className="relative">
                            <Textarea
                                id="atmosphere" name="atmosphere" label="가게 분위기" placeholder="예: 따뜻한 조명, 원목 인테리어, 재즈 음악이 나오는 아늑한 공간" rows={3}
                                value={formData.atmosphere} onChange={handleInputChange}
                                className={showHighlight && analyzeSuccess && analyzeSuccess ? "bg-green-50 transition-colors duration-1000" : "transition-colors duration-1000"}
                            />
                            {showHighlight && analyzeSuccess && <span className="absolute right-3 top-9 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">자동 입력됨</span>}
                        </div>
                    </div>
                </Card>

                {/* 섹션 C: AI 마케팅 추가 정보 */}
                <Card className="p-6">
                    <div className="mb-5">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                            <Sparkles className="h-5 w-5 text-yellow-400" />
                            AI가 더 좋은 글을 쓸 수 있도록 알려주세요
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">(선택사항이지만, 입력하면 마케팅 글 퀄리티가 올라가요!)</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <Input
                                id="one_liner" name="one_liner" label="가게 한 줄 소개" placeholder="예: 연남동 골목에 숨은 수제 디저트 맛집"
                                value={formData.one_liner} onChange={handleInputChange}
                            />
                            <p className="text-[11px] text-gray-500 mt-1 pl-1">인스타그램 소개글이나 블로그 제목에 활용돼요</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">주요 고객층</label>
                            <p className="text-xs text-gray-500 mb-3">우리 가게에 주로 오시는 손님을 모두 선택해주세요</p>
                            <div className="flex flex-wrap gap-2">
                                {TARGET_CUSTOMERS.map(customer => {
                                    const isSelected = selectedCustomers.includes(customer);
                                    return (
                                        <button
                                            key={customer}
                                            type="button"
                                            onClick={() => handleCustomerToggle(customer)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border
                                                ${isSelected
                                                    ? 'bg-purple-100 text-purple-700 border-purple-400'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}
                                        >
                                            {customer}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">대표 사진 업로드</label>
                            <p className="text-xs text-gray-500 mb-3">가게 대표 사진 3~5장을 올려주세요 (메뉴, 매장 외관, 내부 등)</p>

                            {/* Photo Gallery */}
                            {photos.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-3">
                                    {photos.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg bg-gray-100 border overflow-hidden group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={src} alt="가게 이미지" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(idx)}
                                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <div
                                    className={`relative flex items-center justify-center border-2 border-dashed rounded-xl h-24 w-full transition-all cursor-pointer bg-white hover:bg-gray-50 active:bg-gray-100 ${isUploading || photos.length >= 5 ? 'opacity-50 cursor-not-allowed' : 'border-gray-200 text-gray-500'}`}
                                >
                                    {isUploading ? (
                                        <div className="flex items-center text-sm"><Loader2 className="w-5 h-5 mr-2 animate-spin text-gray-400" /> 업로드 중...</div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 pointer-events-none">
                                            <Upload className="w-5 h-5 text-gray-400" />
                                            <span className="text-sm font-medium">사진 추가하기 ({photos.length}/5)</span>
                                        </div>
                                    )}
                                    {!isUploading && photos.length < 5 && (
                                        <input
                                            type="file"
                                            onChange={handleFileUpload}
                                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                            multiple
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                                            style={{ fontSize: '16px' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Hidden fields for custom arrays and auto-fields */}
                <input type="hidden" name="target_customers" value={JSON.stringify(selectedCustomers)} />
                <input type="hidden" name="photos" value={JSON.stringify(photos)} />
                <input type="hidden" name="naver_place_url" value={naverPlaceUrl} />
                <input type="hidden" name="naver_rating" value={naverRating || ""} />

                {state?.error && (
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 animate-in slide-in-from-bottom-2">
                        {state.error}
                    </div>
                )}

                {/* 섹션 D: 하단 버튼 영역 */}
                <div className="flex justify-end pt-2 pb-10">
                    <Button type="submit" disabled={isPending} size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 min-w-[120px]">
                        {isPending ? "저장 중..." : store ? "가게 정보 수정" : "가게 등록"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
