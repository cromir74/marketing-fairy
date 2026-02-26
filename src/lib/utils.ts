import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind 클래스 병합 유틸 ──
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── 업종 카테고리 ──
export const CATEGORIES = [
    { value: "cafe", label: "카페 / 디저트" },
    { value: "restaurant", label: "음식점" },
    { value: "beauty", label: "미용 / 네일" },
    { value: "fitness", label: "피트니스 / 요가" },
    { value: "academy", label: "학원 / 교육" },
    { value: "pet", label: "반려동물" },
    { value: "flower", label: "꽃집" },
    { value: "other", label: "기타" },
] as const;

// ── 플랫폼 ──
export const PLATFORMS = [
    { value: "instagram", label: "인스타그램", icon: "📸" },
    { value: "threads", label: "스레드", icon: "🧵" },
] as const;

// ── 톤앤매너 ──
export const TONES = [
    { value: "friendly", label: "친근한" },
    { value: "professional", label: "전문적인" },
    { value: "cute", label: "귀여운" },
    { value: "trendy", label: "트렌디한" },
    { value: "warm", label: "따뜻한" },
] as const;

// ── 클립보드 복사 ──
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

// ── 날짜 포맷 ──
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
