"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteButton({ id }: { id: string }) {
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        if (!confirm("이 기록을 삭제하시겠습니까? 한번 삭제하면 복구할 수 없습니다.")) return;

        setDeleting(true);
        try {
            const res = await fetch("/api/content/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                router.refresh(); // 서버 컴포넌트 데이터 갱신
            } else {
                alert(`삭제 실패: ${data.error}`);
            }
        } catch (error: any) {
            alert(`오류 발생: ${error.message}`);
        } finally {
            setDeleting(false);
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
    );
}
