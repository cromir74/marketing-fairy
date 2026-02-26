"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function RefreshButton() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleRefresh = async () => {
        setLoading(true);
        setSuccess(false);
        try {
            const res = await fetch("/api/stats/refresh");
            if (res.ok) {
                setSuccess(true);
                router.refresh(); // 최신 데이터 반영을 위해 페이지 새로고침
                setTimeout(() => setSuccess(false), 3000);
            } else {
                alert("성과 갱신 중 오류가 발생했습니다.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className={`text-xs ${success ? 'text-emerald-600' : 'text-gray-400 hover:text-primary-600'} transition-all`}
        >
            {loading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : success ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {loading ? "데이터 수집 중..." : success ? "갱신 완료" : "성과 데이터 실시간 갱신하기"}
        </Button>
    );
}
