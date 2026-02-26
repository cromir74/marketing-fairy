"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2 } from "lucide-react";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
    const [state, formAction, isPending] = useActionState(signIn, null);
    const searchParams = useSearchParams();
    const oauthError = searchParams.get("error");

    return (
        <div className="w-full max-w-sm">
            {/* 로고 */}
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30">
                    <Wand2 className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">다시 오셨군요!</h1>
                <p className="mt-1 text-sm text-gray-500">마케팅요정에 로그인하세요.</p>
            </div>

            {/* OAuth 에러 메시지 */}
            {oauthError && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                    소셜 로그인에 실패했습니다. 다시 시도해주세요.
                </div>
            )}

            {/* 소셜 로그인 */}
            <SocialLoginButtons />

            {/* 구분선 */}
            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">또는 이메일로 로그인</span>
                <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* 이메일 로그인 폼 */}
            <form action={formAction} className="space-y-4">
                <Input
                    id="email"
                    name="email"
                    type="email"
                    label="이메일"
                    placeholder="hello@example.com"
                    required
                />
                <Input
                    id="password"
                    name="password"
                    type="password"
                    label="비밀번호"
                    placeholder="6자 이상"
                    required
                />

                {state?.error && (
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                        {state.error}
                    </div>
                )}

                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "로그인 중..." : "이메일로 로그인"}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                아직 계정이 없으신가요?{" "}
                <Link href="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
                    회원가입
                </Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="w-full max-w-sm h-96 animate-pulse rounded-2xl bg-gray-100" />}>
            <LoginForm />
        </Suspense>
    );
}
