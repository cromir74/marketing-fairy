"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, CheckCircle2 } from "lucide-react";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

export default function SignUpPage() {
    const [state, formAction, isPending] = useActionState(signUp, null);

    if (state?.success) {
        return (
            <div className="w-full max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">가입 완료!</h1>
                <p className="mt-2 text-sm text-gray-500">
                    이메일을 확인해주세요. 인증 후 로그인할 수 있습니다.
                </p>
                <Link href="/login" className="mt-6 block">
                    <Button className="w-full">로그인 하러가기</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm">
            {/* 로고 */}
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30">
                    <Wand2 className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">무료로 시작하기</h1>
                <p className="mt-1 text-sm text-gray-500">7일 무료 체험, 카드 등록 없이!</p>
            </div>

            {/* 소셜 회원가입 */}
            <SocialLoginButtons />

            {/* 구분선 */}
            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">또는 이메일로 가입</span>
                <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* 이메일 회원가입 폼 */}
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
                    {isPending ? "가입 중..." : "이메일로 가입하기"}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
                    로그인
                </Link>
            </p>
        </div>
    );
}
