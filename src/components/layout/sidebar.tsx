"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Store,
    Sparkles,
    History,
    LogOut,
    Wand2,
    ChevronLeft,
    Menu,
    CalendarClock,
    CalendarDays,
    Lock,
    Video,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useState } from "react";
import { useSubscription } from "@/components/subscription/SubscriptionProvider";
import { Crown, Sparkles as SparklesIcon, Zap } from "lucide-react";
import { UpgradeModal } from "@/components/modals/UpgradeModal";

const navItems = [
    { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
    { href: "/store", label: "가게 관리", icon: Store },
    { href: "/calendar", label: "마케팅 캘린더", icon: CalendarDays, proOnly: true, trigger: 'calendar' as const },
    { href: "/content/create", label: "SNS 콘텐츠 생성", icon: Sparkles },
    { href: "/content/scheduled", label: "예약 발행 목록", icon: CalendarClock },
    { href: "/content/history", label: "생성 기록", icon: History },
    { href: "/reels", label: "릴스 만들기", icon: Video },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { subscription, checkAccess } = useSubscription();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeTrigger, setUpgradeTrigger] = useState<'persona' | 'calendar' | 'deep_analysis' | 'trial_expired' | 'limit_reached'>('persona');

    const planLabel = subscription?.plan === 'pro' ? 'Pro' : subscription?.plan === 'admin' ? 'Admin' : 'Basic';
    const isPro = subscription?.plan === 'pro' || subscription?.plan === 'admin';

    return (
        <>
            {/* 모바일 햄버거 */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-2.5 left-2.5 z-[60] rounded-xl bg-white/90 backdrop-blur-sm p-2 shadow-sm border border-gray-100 lg:hidden"
            >
                <Menu className="h-5 w-5 text-gray-700" />
            </button>

            {/* 모바일 오버레이 */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* 사이드바 본체 */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-100 bg-white transition-all duration-300",
                    collapsed ? "w-[72px]" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* 로고 영역 */}
                <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
                    {!collapsed && (
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-500/30">
                                <Wand2 className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-lg font-extrabold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                                마케팅요정
                            </span>
                            {planLabel && (
                                <span className={cn(
                                    "ml-1 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                    isPro ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                                )}>
                                    {isPro && <Crown className="h-2.5 w-2.5" />}
                                    {planLabel}
                                </span>
                            )}
                        </Link>
                    )}
                    {collapsed && (
                        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-500/30">
                            <Wand2 className="h-5 w-5 text-white" />
                        </div>
                    )}
                    <button
                        onClick={() => {
                            setCollapsed(!collapsed);
                            setMobileOpen(false);
                        }}
                        className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ChevronLeft
                            className={cn("h-4 w-4 text-gray-400 transition-transform", collapsed && "rotate-180")}
                        />
                    </button>
                </div>

                {/* 내비게이션 */}
                <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        const isLocked = item.proOnly && !isPro;

                        if (isLocked) {
                            return (
                                <button
                                    key={item.href}
                                    onClick={() => {
                                        setMobileOpen(false);
                                        setUpgradeTrigger(item.trigger || 'persona');
                                        setShowUpgradeModal(true);
                                    }}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-50 transition-all duration-200"
                                >
                                    <item.icon className="h-5 w-5 shrink-0 text-gray-300" />
                                    {!collapsed && (
                                        <>
                                            <span>{item.label}</span>
                                            <Lock className="h-3 w-3 ml-auto text-gray-300" />
                                        </>
                                    )}
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary-50 text-primary-700 shadow-sm"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-600")} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* 업그레이드 배너 (Basic 유저용) */}
                {!collapsed && !isPro && (
                    <div className="mx-3 mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-4 text-white shadow-lg shadow-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="rounded-full bg-white/20 p-1">
                                <Zap className="h-3 w-3 text-yellow-300" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Upgrade to Pro</span>
                        </div>
                        <p className="text-[11px] text-indigo-100 leading-relaxed mb-3">
                            더 정교한 <br />마케팅 기능을 만나보세요.
                        </p>
                        <Link
                            href="/pricing"
                            className="flex items-center justify-center gap-1 w-full py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                        >
                            <SparklesIcon className="h-3 w-3" />
                            할인가로 시작하기
                        </Link>
                    </div>
                )}

                {/* 하단 영역 */}
                <div className="border-t border-gray-100 p-3">
                    <form action={signOut}>
                        <button
                            type="submit"
                            className={cn(
                                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
                            )}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            {!collapsed && <span>로그아웃</span>}
                        </button>
                    </form>
                </div>
            </aside>

            {/* 업그레이드 모달 */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                trigger={upgradeTrigger}
            />
        </>
    );
}
