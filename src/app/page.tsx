"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Wand2, Sparkles, Send, ArrowRight, Check, X,
    Users, MessageSquare, ChevronDown, Mail, Instagram,
    Menu, Layout, BarChart2, Brain, MapPin, Target, Zap
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";


export default function LandingPage() {
    const [user, setUser] = useState<User | null>(null);
    const [earlybird, setEarlybird] = useState<{ tier1: number }>({ tier1: 0 });
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showFloating, setShowFloating] = useState(false);

    useEffect(() => {
        // Force light mode for this redesign
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");

        async function fetchData() {
            try {
                const supabase = createClient();

                // Check session
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setUser(session.user);
                }

                // Fetch counters
                const { data } = await supabase.from("earlybird_counter").select("*");
                if (data) {
                    const counters = data.reduce((acc: any, curr: any) => {
                        const key = typeof curr.tier === "number" ? `tier${curr.tier}` : curr.tier;
                        acc[key] = curr.max_count - curr.current_count;
                        return acc;
                    }, {});
                    setEarlybird(counters);
                }
            } catch { }
            // Small delay for smooth entry
            setTimeout(() => setLoading(false), 300);
        }
        fetchData();

        // Scroll animations
        const scrollObserver = new IntersectionObserver(
            (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );
        document.querySelectorAll(".reveal-on-scroll").forEach((el) => scrollObserver.observe(el));

        // Floating CTA visibility
        let isHeroVisible = true;
        let isPricingVisible = false;

        const updateFloatingVis = () => setShowFloating(!isHeroVisible && !isPricingVisible);

        const ctaObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.target.id === "hero-cta") isHeroVisible = entry.isIntersecting;
                if (entry.target.id === "pricing") isPricingVisible = entry.isIntersecting;
            });
            updateFloatingVis();
        }, { threshold: 0.1 });

        const heroCtaEl = document.getElementById("hero-cta");
        const pricingEl = document.getElementById("pricing");
        if (heroCtaEl) ctaObserver.observe(heroCtaEl);
        if (pricingEl) ctaObserver.observe(pricingEl);

        return () => {
            scrollObserver.disconnect();
            ctaObserver.disconnect();
        };
    }, []);

    const scrollTo = (id: string) => {
        setMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            const offset = 100; // Header offset
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    };

    const navItems = [
        { id: "features", label: "기능" },
        { id: "compare", label: "비교" },
        { id: "pricing", label: "요금제" },
        { id: "faq", label: "FAQ" },
    ];

    return (
        <div className="min-h-screen w-full overflow-x-hidden max-w-[100vw] bg-[#FAFAFA] text-gray-900 font-sans selection:bg-primary-100 selection:text-primary-900">

            {/* ─── HEADER (FLOATING BENTO) ─── */}
            <header className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center">
                <div className="w-full max-w-5xl bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between transition-all hover:shadow-md">
                    <Link href="/" onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2 group">
                        <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-lg bg-green-50 group-hover:bg-primary-50 transition-colors">
                            <Wand2 className="h-4 w-4 text-primary-600" />
                        </div>
                        <span className="text-lg font-bold tracking-tight font-display text-gray-900 whitespace-nowrap shrink-0">
                            마케팅요정
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => (
                            <button key={item.id} onClick={() => scrollTo(item.id)} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        {user ? (
                            <Link href="/dashboard" className="hidden sm:flex items-center justify-center bg-gray-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm">
                                대시보드로 이동
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
                                    로그인
                                </Link>
                                <Link href="/signup" className="hidden sm:flex items-center justify-center bg-gray-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm">
                                    무료 시작
                                </Link>
                            </>
                        )}
                        <button className="md:hidden p-2 text-gray-500 shrink-0" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-full mt-2 left-4 right-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl md:hidden">
                        <div className="flex flex-col gap-2">
                            {navItems.map((item) => (
                                <button key={item.id} onClick={() => scrollTo(item.id)} className="w-full text-left px-4 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50">{item.label}</button>
                            ))}
                            <div className="h-px bg-gray-100 my-2" />
                            {user ? (
                                <Link href="/dashboard" className="mt-2 bg-gray-900 text-white px-4 py-3 rounded-xl font-medium text-center shadow-sm">대시보드로 이동</Link>
                            ) : (
                                <>
                                    <Link href="/login" className="px-4 py-3 rounded-xl font-medium text-gray-700 text-center hover:bg-gray-50">로그인</Link>
                                    <Link href="/signup" className="mt-2 bg-gray-900 text-white px-4 py-3 rounded-xl font-medium text-center shadow-sm">무료 시작하기</Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* ─── HERO SECTION ─── */}
            <section className="pt-48 pb-20 px-6 max-w-5xl mx-auto text-center reveal-on-scroll">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-semibold tracking-wide mb-8 shadow-sm animate-float">
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                    가장 완벽한 AI 마케팅 자동화
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-gray-900 tracking-tight leading-[1.2] sm:leading-[1.1] mb-8 break-keep">
                    사장님, 마케팅은 <br className="hidden sm:block" />
                    <span className="text-primary-500">요정에게 맡기세요</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                    인스타그램, 스레드, 블로그 마케팅 글을 AI가 알아서 써줍니다.<br />
                    매달 130만원 통째로 나갔던 대행사 비용, 이제 월 23만원으로 해결하세요.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link id="hero-cta" href={user ? "/dashboard" : "/signup"} className="w-full sm:w-auto flex items-center justify-center bg-gray-900 text-white h-14 px-8 rounded-2xl text-base font-semibold hover:bg-gray-800 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5">
                        {user ? "대시보드로 이동" : "7일 무료 체험 시작"}
                    </Link>
                    <button onClick={() => scrollTo("features")} className="w-full sm:w-auto flex items-center justify-center bg-white border border-gray-200 text-gray-700 h-14 px-8 rounded-2xl text-base font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                        작동 방식 보기
                    </button>
                </div>
                <p className="mt-6 text-sm text-gray-400 font-medium">✨ 카드 등록 없이 5초만에 가입 완료</p>
            </section>

            {/* ─── INTEGRATION MARQUEE ─── */}
            <section className="py-10 border-y border-gray-100 bg-white">
                <div className="relative flex overflow-hidden mask-linear-gradient max-w-7xl mx-auto">
                    <div className="flex animate-marquee whitespace-nowrap min-w-full shrink-0 items-center justify-around gap-12 px-8">
                        <MarqueeItem icon={<Instagram className="text-pink-600 w-5 h-5" />} text="INSTAGRAM" />
                        <MarqueeItem icon={<MessageSquare className="text-gray-900 w-5 h-5" />} text="THREADS" />
                        <MarqueeItem icon={<Layout className="text-green-500 w-5 h-5" />} text="NAVER BLOG" />
                        <MarqueeItem icon={<Brain className="text-purple-500 w-5 h-5" />} text="AI ENGINE" />
                    </div>
                    <div className="flex animate-marquee whitespace-nowrap min-w-full shrink-0 items-center justify-around gap-12 px-8" aria-hidden>
                        <MarqueeItem icon={<Instagram className="text-pink-600 w-5 h-5" />} text="INSTAGRAM" />
                        <MarqueeItem icon={<MessageSquare className="text-gray-900 w-5 h-5" />} text="THREADS" />
                        <MarqueeItem icon={<Layout className="text-green-500 w-5 h-5" />} text="NAVER BLOG" />
                        <MarqueeItem icon={<Brain className="text-purple-500 w-5 h-5" />} text="AI ENGINE" />
                    </div>
                </div>
            </section>

            {/* ─── 3-STEP PROCESS ─── */}
            <section className="py-24 px-6 bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 reveal-on-scroll">
                        <h2 className="text-3xl sm:text-4xl font-display font-black text-gray-900 mb-4 tracking-tight break-keep">이렇게 쉬울 수 없습니다</h2>
                        <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">복잡한 설정 없이, 3단계만으로 전문 마케터 수준의 콘텐츠를 받아보세요.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative reveal-on-scroll">
                        {/* Connecting Lines (Desktop only) */}
                        <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 z-0 border-t-2 border-dashed border-gray-300 pointer-events-none" />

                        {/* Step 1 */}
                        <div className="bg-[#FAFAFA] rounded-[2rem] p-8 border border-gray-200 relative z-10 hover:shadow-md transition-shadow">
                            <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black mb-6 shadow-sm">01</div>
                            <MapPin className="text-primary-500 w-8 h-8 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2 font-display">가게 링크로 자동 등록</h3>
                            <p className="text-gray-500 font-medium text-sm leading-relaxed">네이버 플레이스 URL만 붙여넣으세요. AI가 가게 정보와 분위기를 단숨에 분석합니다.</p>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-[#FAFAFA] rounded-[2rem] p-8 border border-gray-200 relative z-10 hover:shadow-md transition-shadow">
                            <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black mb-6 shadow-sm">02</div>
                            <Sparkles className="text-purple-500 w-8 h-8 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2 font-display">AI가 맞춤 글 생성</h3>
                            <p className="text-gray-500 font-medium text-sm leading-relaxed">업종, 메뉴, 분위기에 맞는 마케팅 글을 인스타·스레드·블로그용으로 각각 생성합니다.</p>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-[#FAFAFA] rounded-[2rem] p-8 border border-gray-200 relative z-10 hover:shadow-md transition-shadow">
                            <div className="bg-gray-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black mb-6 shadow-sm">03</div>
                            <Send className="text-blue-500 w-8 h-8 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2 font-display">채널별 자동 발행</h3>
                            <p className="text-gray-500 font-medium text-sm leading-relaxed">인스타그램, 스레드, 블로그 각각의 발행 버튼을 누르면 해당 채널에 바로 업로드됩니다.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── BENTO GRID FEATURES ─── */}
            <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
                <div className="mb-16 reveal-on-scroll">
                    <h2 className="text-3xl sm:text-4xl font-display font-black text-gray-900 mb-4 tracking-tight break-keep">마케팅 자동화의 정수</h2>
                    <p className="text-xl text-gray-500 font-medium">가게 링크 하나면 AI가 전체 컨셉을 파악해 글을 써냅니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[340px]">
                    {/* Main Large Bento */}
                    <div className="md:col-span-2 bg-white rounded-[2.5rem] p-10 border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden group reveal-on-scroll">
                        <div className="relative z-10 max-w-md">
                            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-500 mb-6 drop-shadow-sm">
                                <Send className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3 font-display">클릭 한 번에 자동 발행</h3>
                            <p className="text-gray-500 leading-relaxed font-medium">마음에 드는 문구를 골랐다면 '발행하기' 버튼만 누르세요. 인스타그램, 스레드, 네이버 블로그 3곳에 복사 붙여넣기 없이 즉시 업로드됩니다.</p>
                        </div>
                        {/* Minimal Mockup Graphic inside Bento */}
                        <div className="absolute right-0 bottom-0 top-1/2 translate-y-10 translate-x-10 md:translate-y-0 w-3/4 md:w-1/2 md:h-full pointer-events-none opacity-80 group-hover:opacity-100 group-hover:translate-x-4 transition-all duration-700">
                            <div className="absolute inset-y-10 left-10 right-0 bg-gray-50 rounded-tl-3xl border-t border-l border-gray-200 shadow-xl overflow-hidden p-6 flex flex-col gap-4">
                                <div className="w-full h-8 bg-gray-200/50 rounded-lg animate-pulse" />
                                <div className="w-5/6 h-4 bg-gray-200/50 rounded-md" />
                                <div className="w-4/6 h-4 bg-gray-200/50 rounded-md" />
                                <div className="mt-4 flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center"><Instagram className="w-4 h-4 text-pink-500" /></div>
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><Layout className="w-4 h-4 text-green-500" /></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Small Bento 1 */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm flex flex-col reveal-on-scroll delay-100 hover:shadow-lg transition-shadow">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-6 font-bold shadow-sm">
                            <Brain className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 font-display">AI 페르소나 적용</h3>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">MZ세대, 직장인, 아이 엄마 등 다양한 타겟에 맞춘 특화 말투로 맞춤형 페르소나 글을 생성합니다.</p>
                        <div className="mt-auto pt-6 flex gap-2">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">#20대여성</span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">#감성톤</span>
                        </div>
                    </div>

                    {/* Small Bento 2 */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm flex flex-col reveal-on-scroll delay-200 hover:shadow-lg transition-shadow">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 font-bold shadow-sm">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 font-display">매장 완벽 최적화</h3>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">네이버 플레이스 링크만 입력하면, AI가 매장의 분위기, 위치, 영업시간을 분석해 가장 완벽한 마케팅 포인트를 찾습니다.</p>
                    </div>

                    {/* Medium Bento (spanning bottom 2 cols) */}
                    <div className="md:col-span-2 bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative reveal-on-scroll delay-300 group text-white">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black pointer-events-none" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl group-hover:bg-primary-500/30 transition-colors" />
                        <div className="relative z-10 flex flex-col h-full justify-center">
                            <div className="inline-flex items-center gap-2 mb-4">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500" />
                                </span>
                                <span className="text-primary-400 font-bold text-sm tracking-widest uppercase">Live Automation</span>
                            </div>
                            <h3 className="text-3xl font-bold font-display leading-snug max-w-md">사장님은 비즈니스에만<br />집중하세요.</h3>
                            <p className="text-gray-400 mt-4 max-w-sm">콘텐츠 기획부터 작성, 업로드까지 마케팅요정이 빈틈없이 관리합니다.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── BEFORE / AFTER COMPARISON (BENTO STYLE) ─── */}
            <section id="compare" className="py-24 px-6 bg-white border-y border-gray-100">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 reveal-on-scroll">
                        <h2 className="text-3xl sm:text-4xl font-display font-black text-gray-900 mb-4 tracking-tight break-keep">퀄리티의 차이가 곧 매출의 차이</h2>
                        <p className="text-gray-500 text-xl font-medium">고객을 멈추게 하는 글의 비밀을 확인해보세요.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-stretch reveal-on-scroll">
                        {/* Before Box */}
                        <div className="bg-[#FAFAFA] border border-gray-200 rounded-[2rem] p-8 flex flex-col relative shadow-sm">
                            <div className="flex items-center gap-2 mb-8">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500"><X className="w-4 h-4 font-bold" /></div>
                                <span className="font-bold text-gray-600 tracking-wide text-sm">일반적인 작성 방식</span>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-grow">
                                <p className="text-gray-500 font-medium whitespace-pre-wrap leading-relaxed">
                                    오늘도 영업합니다~<br />
                                    아메리카노 4,500원<br />
                                    딸기케이크 신메뉴 나왔어요<br />
                                    많이 와주세요 🙏
                                </p>
                            </div>
                            <div className="mt-6 flex justify-between items-center px-2">
                                <div className="flex gap-4">
                                    <div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">좋아요</span><span className="text-gray-600 font-bold">5개</span></div>
                                    <div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">저장</span><span className="text-gray-600 font-bold">0개</span></div>
                                </div>
                            </div>
                        </div>

                        {/* After Box */}
                        <div className="bg-white border-2 border-primary-100 ring-4 ring-primary-50 rounded-[2rem] p-8 flex flex-col relative shadow-xl shadow-primary-900/5">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 z-10">
                                <Target className="w-3.5 h-3.5 text-primary-400" /> 조회수 10배 차이
                            </div>
                            <div className="flex items-center gap-2 mb-8">
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600"><Sparkles className="w-4 h-4" /></div>
                                <span className="font-bold text-primary-600 tracking-wide text-sm">마케팅요정 자동 생성</span>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-2xl flex-grow">
                                <p className="text-gray-900 font-bold whitespace-pre-wrap leading-relaxed text-lg">
                                    퇴근길, 연남동 골목에서 피어오르는<br />
                                    커피 향을 따라가 보세요.<br /><br />
                                    오늘 하루 고생한 당신을 위한<br />
                                    달콤한 딸기 케이크 한 조각. 🍓<br />
                                    봄날의 카페에서 작은 위로를 선물합니다.
                                </p>
                            </div>
                            <div className="mt-6 flex justify-between items-center px-2">
                                <div className="flex gap-6">
                                    <div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">좋아요</span><span className="text-primary-600 font-black text-xl">147개</span></div>
                                    <div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">저장</span><span className="text-primary-600 font-black text-xl">32개</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── AGENCY COMPARISON ─── */}
            <section className="py-24 px-6 bg-[#FAFAFA]">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16 reveal-on-scroll">
                        <h2 className="text-3xl sm:text-4xl font-display font-black text-gray-900 mb-4 tracking-tight break-keep">대행사에 맡기면 얼마일까요?</h2>
                        <p className="text-xl text-gray-500 font-medium">같은 일을 하는데, 비용은 이렇게 다릅니다.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 reveal-on-scroll">
                        {/* Agency Card */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-200 p-10 flex flex-col shadow-sm">
                            <div className="self-start bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-8">
                                기존 대행사
                            </div>

                            <ul className="space-y-6 flex-grow mb-8">
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">블로그 운영 대행</span>
                                    <span className="text-gray-900 font-bold">월 40~60만원</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">인스타그램 운영 대행</span>
                                    <span className="text-gray-900 font-bold">월 30~50만원</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">스레드 운영 대행</span>
                                    <span className="text-gray-900 font-bold">월 20~30만원</span>
                                </li>
                            </ul>

                            <div className="pt-6 border-t border-gray-200 mt-auto">
                                <div className="text-2xl font-black text-red-600 mb-1">통합 마케팅 월 100~150만원</div>
                                <div className="text-sm text-red-400 font-medium">연간 1,200~1,800만원</div>
                            </div>
                        </div>

                        {/* Marketing Fairy Card */}
                        <div className="bg-white rounded-[2.5rem] border-2 border-primary-500 p-10 flex flex-col relative shadow-xl shadow-primary-900/5">
                            <div className="self-start bg-primary-50 text-primary-600 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-8">
                                마케팅요정
                            </div>

                            <ul className="space-y-6 flex-grow mb-8">
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">블로그 자동 발행</span>
                                    <span className="text-primary-600 font-bold">✅ 포함</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">인스타그램 자동 발행</span>
                                    <span className="text-primary-600 font-bold">✅ 포함</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">스레드 자동 발행</span>
                                    <span className="text-primary-600 font-bold">✅ 포함</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">AI 글 자동 생성</span>
                                    <span className="text-primary-600 font-bold">✅ 포함</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">마케팅 캘린더</span>
                                    <span className="text-primary-600 font-bold">✅ 포함</span>
                                </li>
                                <li className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                                    <span className="text-gray-600 font-medium">법적 규제 자동 검토</span>
                                    <span className="text-primary-600 font-bold">✅ 포함</span>
                                </li>
                            </ul>

                            <div className="pt-6 border-t border-gray-200 mt-auto">
                                <div className="text-2xl font-black text-primary-600 mb-1">프로 월 23만원부터</div>
                                <div className="text-sm text-primary-500 font-medium">연간 276만원 (최대 1,524만원 절약)</div>
                            </div>
                        </div>
                    </div>

                    {/* Banner below comparison */}
                    <div className="bg-gray-900 rounded-[2rem] p-8 text-center reveal-on-scroll">
                        <div className="text-white text-3xl font-black mb-2 tracking-tight">연간 최대 1,524만원 절약</div>
                        <div className="text-gray-400 font-medium text-lg">그 비용이면 직원 한 명 월급입니다.</div>
                    </div>
                </div>
            </section>

            {/* ─── PRICING BENTO ─── */}
            <section id="pricing" className="py-24 px-4 sm:px-6 w-full max-w-[100vw] xl:max-w-5xl mx-auto box-border overflow-x-hidden">
                <div className="text-center mb-16 reveal-on-scroll">
                    <h2 className="text-3xl sm:text-4xl font-display font-black text-gray-900 mb-4 tracking-tight break-keep">명확하고 투명한 요금제</h2>
                    <p className="text-gray-500 text-xl font-medium">대행사 비용 150만원 대신, 월 20만원대로 해결하세요.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 reveal-on-scroll w-full box-border">
                    {/* Basic Plan */}
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-gray-200 shadow-sm flex flex-col hover:border-gray-300 transition-colors w-full max-w-full box-border">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display">베이직</h3>
                        <p className="text-gray-500 font-medium mb-6">SNS 자동화의 시작</p>
                        <div className="mb-8">
                            <div className="text-gray-400 line-through text-lg font-bold mb-1">₩150,000</div>
                            <div className="flex items-baseline gap-1 sm:gap-2">
                                <span className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-gray-900 tracking-tight shrink">₩120,000</span>
                                <span className="text-gray-500 font-bold shrink-0">/월</span>
                            </div>
                        </div>

                        <ul className="space-y-5 mb-10 flex-grow">
                            <FeatureItem text="인스타그램 자동 발행 (월 30건)" />
                            <FeatureItem text="스레드 자동 발행 (월 30건)" />
                            <FeatureItem text="네이버 플레이스 기본 분석" />
                            <FeatureItem text="예약 발행 및 법적 규제 검토" />
                            <FeatureItem text="네이버 블로그 자동 발행" excluded />
                        </ul>

                        <Link href={user ? "/dashboard" : "/signup"} className="w-full flex justify-center items-center h-14 rounded-xl border-2 border-gray-200 text-gray-800 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all box-border">
                            {user ? "대시보드로 이동" : "베이직 시작하기"}
                        </Link>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 border-2 border-primary-500 shadow-xl shadow-primary-900/10 flex flex-col relative transform md:-translate-y-4 w-full max-w-full box-border">
                        <div className="absolute -top-4 right-6 md:right-10 bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase shadow-md flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />
                            가장 인기
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display">프로</h3>
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-6 gap-3">
                            <p className="text-primary-600 font-bold">완벽한 AI 마케팅 솔루션</p>
                            {!loading && earlybird.tier1 > 0 && (
                                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-black animate-pulse border border-red-100 w-fit shrink-0">
                                    얼리버드 잔여 {earlybird.tier1}명
                                </span>
                            )}
                        </div>

                        <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 w-full box-border overflow-hidden">
                            <div className="text-gray-400 line-through text-lg font-bold mb-1">₩290,000</div>
                            <div className="flex items-baseline gap-1 sm:gap-2">
                                <span className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-gray-900 tracking-tight shrink">₩230,000</span>
                                <span className="text-gray-500 font-bold shrink-0">/월</span>
                            </div>
                        </div>

                        <ul className="space-y-5 mb-10 flex-grow font-medium text-gray-900">
                            <FeatureItem text="베이직의 모든 기능 포함" highlight />
                            <FeatureItem text="네이버 블로그 자동 발행 (월 30건)" highlight />
                            <FeatureItem text="마케팅 캘린더 (시즌/요일 전략)" highlight />
                            <FeatureItem text="페르소나 마케팅 전체 (기본+확장)" highlight />
                            <FeatureItem text="네이버 플레이스 심화 분석" highlight />
                        </ul>

                        <Link href={user ? "/dashboard" : "/signup"} className="w-full flex justify-center items-center h-14 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-all shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] box-border">
                            {user ? "대시보드로 이동" : "프로 시작하기"}
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ACCORDION ─── */}
            <section id="faq" className="py-24 px-6 max-w-3xl mx-auto">
                <div className="text-center mb-16 reveal-on-scroll">
                    <h2 className="text-3xl font-display font-black text-gray-900 mb-4 tracking-tight break-keep">자주 묻는 질문</h2>
                </div>
                <div className="space-y-4 reveal-on-scroll">
                    <FAQItem q="AI가 쓴 글이 어색하지 않나요?" a="마케팅요정은 특정 업종 메뉴 데이터 및 수만 건의 인기 게시글 패턴을 학습한 AI를 사용합니다. 일반적인 AI 봇의 딱딱한 말투가 아닌, 사람 냄새 나는 다양한 페르소나 스타일로 자연스럽게 작성됩니다." openByDefault />
                    <FAQItem q="네이버 블로그에 정말 자동으로 올라가나요?" a="네, 글 생성 후 채널별로 각각 최적화된 발행 버튼을 누르면 복사/붙여넣기 없이 계정에 연동된 블로그, 인스타그램, 스레드에 즉시 업로드 됩니다." />
                    <FAQItem q="블로그, 인스타 연동은 어떻게 하나요?" a="마이페이지에서 각 소셜 계정을 한 번만 로그인하여 연동해 두시면, 이후로는 마케팅요정 안에서 클릭 한 번으로 각 채널에 개별 발행이 가능합니다." />
                    <FAQItem q="글 작성 개수에 제한이 있나요?" a="베이직은 인스타그램·스레드 각 월 30건 발행 가능합니다. 프로는 인스타그램·스레드 각 월 30건에 네이버 블로그 월 30건이 추가되어 총 월 90건 발행할 수 있어요." />
                    <FAQItem q="무료 체험 기간이 끝나면 자동 결제되나요?" a="아니요! 가입 시 카드 등록 절차가 없기 때문에 7일 체험 종료 후 원치 않으시면 자동으로 결제되지 않습니다. 부담 없이 100% 기능을 테스트해 보세요." />
                </div>
            </section>

            {/* ─── FINAL CTA ─── */}
            <section className="py-24 px-6 border-t border-gray-200/60 bg-white text-center">
                <div className="max-w-4xl mx-auto bg-gray-900 rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-2xl reveal-on-scroll">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white mb-6 leading-tight relative z-10 break-keep">마케팅 자동화의 시작,<br />버튼 하나면 충분합니다.</h2>
                    <p className="text-xl text-gray-400 mb-10 font-medium relative z-10 max-w-xl mx-auto">1분이면 설정을 완료하고 바로 컨텐츠를 올릴 수 있습니다.</p>
                    <Link href={user ? "/dashboard" : "/signup"} className="inline-flex items-center justify-center bg-white text-gray-900 h-16 px-10 rounded-2xl text-lg font-bold shadow-xl hover:scale-105 transition-transform relative z-10">
                        {user ? "대시보드로 이동하기" : "무료로 첫 글 작성해보기"}
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="bg-[#FAFAFA] border-t border-gray-200 py-16 px-6">
                <div className="max-w-7xl mx-auto grid gap-12 md:grid-cols-4">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center"><Wand2 className="w-3.5 h-3.5 text-primary-600" /></div>
                            <span className="text-xl font-black font-display text-gray-900">마케팅요정</span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mb-6">소상공인 사장님들의 마케팅 성공을 돕는 완벽한 파트너.<br />금쪽같은 영업 시간을 돌려드립니다.</p>
                        <div className="flex gap-4">
                            <Link href="#" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm"><Instagram className="w-4 h-4" /></Link>
                            <a href="http://pf.kakao.com/_pujqX" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#FEE500] border border-gray-200 flex items-center justify-center text-[#391B1B] hover:scale-110 transition-transform shadow-sm" aria-label="카카오톡 채널">
                                {/* SVG for Kakao Bubble */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.53 1.49 4.78 3.75 6.1l-1.05 3.86c-.05.21.16.39.34.26l4.47-2.92c.8.14 1.63.2 2.49.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                                </svg>
                            </a>
                            <Link href="mailto:goodcn@naver.com" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm"><Mail className="w-4 h-4" /></Link>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">링크</h4>
                        <ul className="space-y-3 text-sm font-medium text-gray-500">
                            <li><button onClick={() => scrollTo("features")} className="hover:text-gray-900 transition-colors">주요 기능</button></li>
                            <li><button onClick={() => scrollTo("compare")} className="hover:text-gray-900 transition-colors">비용 비교</button></li>
                            <li><button onClick={() => scrollTo("pricing")} className="hover:text-gray-900 transition-colors">요금제</button></li>
                            <li><button onClick={() => scrollTo("faq")} className="hover:text-gray-900 transition-colors">자주 묻는 질문</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest">법적 고지</h4>
                        <ul className="space-y-3 text-sm font-medium text-gray-500">
                            <li><Link href="/privacy" className="hover:text-gray-900 transition-colors">개인정보처리방침</Link></li>
                            <li><Link href="/terms" className="hover:text-gray-900 transition-colors">이용약관</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-200">
                    <div className="flex justify-center md:justify-start mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">© 2026 Marketing Fairy. All rights reserved.</p>
                    </div>
                    {/* TODO: 실제 사업자 정보로 교체 필요 */}
                    <div className="pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-400 leading-relaxed text-center md:text-left">
                            상호명: 그로스온 | 대표: 박계홍 | 사업자등록번호: 145-03-04014 | 주소: 경기도 안양시 동안구 시민대로327번길 11-41, 3층 3783호(관양동, 동안청년오피스) | 이메일: goodcn@naver.com
                        </p>
                    </div>
                </div>
                {/* Spacer for floating CTA on mobile */}
                <div className="h-20 md:hidden" />
            </footer>

            {/* ─── MOBILE FLOATING CTA ─── */}
            {showFloating && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
                    <Link
                        href={user ? "/dashboard" : "/signup"}
                        className="w-full flex items-center justify-center bg-gray-900 text-white h-14 rounded-2xl text-base font-bold shadow-[0_-4px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-transform max-w-[calc(100vw-2rem)] mx-auto"
                    >
                        {user ? "대시보드로 이동 →" : "7일 무료 체험 시작 →"}
                    </Link>
                </div>
            )}
        </div>
    );
}

// Helper Components
function MarqueeItem({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm">
            {icon}
            <span className="font-bold text-sm tracking-widest text-gray-800">{text}</span>
        </div>
    );
}

function FeatureItem({ text, highlight = false, excluded = false }: { text: string, highlight?: boolean; excluded?: boolean }) {
    return (
        <li className={`flex items-start gap-3 ${excluded ? "opacity-50" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${highlight ? "bg-primary-100 text-primary-600" : excluded ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {excluded ? <X className="w-3.5 h-3.5 font-bold" /> : <Check className="w-3.5 h-3.5 font-bold" />}
            </div>
            <span className={`flex-1 break-keep leading-tight ${highlight ? "text-gray-900 font-bold" : "text-gray-600 font-medium"} ${excluded ? "line-through text-gray-400" : ""}`}>{text}</span>
        </li>
    );
}

function FAQItem({ q, a, openByDefault = false }: { q: string, a: string, openByDefault?: boolean }) {
    const [open, setOpen] = useState(openByDefault);
    return (
        <div className="bg-white border text-left border-gray-200 rounded-2xl overflow-hidden transition-all hover:border-gray-300 shadow-sm">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-6">
                <span className="font-bold text-gray-900 text-lg">{q}</span>
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-transform duration-300 ${open ? "border-gray-900 bg-gray-900 text-white rotate-180" : "border-gray-200 text-gray-400"}`}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>
            <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-96 pb-6 opacity-100" : "max-h-0 opacity-0"}`}>
                <p className="text-gray-500 font-medium leading-relaxed">{a}</p>
            </div>
        </div>
    );
}
