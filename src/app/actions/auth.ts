"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(prevState: any, formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "이메일과 비밀번호를 입력해주세요." };
    }

    if (password.length < 6) {
        return { error: "비밀번호는 6자 이상이어야 합니다." };
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return { error: `회원가입 실패: ${error.message}` };
    }

    return { success: "가입 완료! 이메일을 확인해주세요." };
}

export async function signIn(prevState: any, formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "이메일과 비밀번호를 입력해주세요." };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        if (error.message === "Email not confirmed") {
            return { error: "이메일 인증이 완료되지 않았습니다. 메일함(스팸함 포함)을 확인하시거나, Supabase -> Authentication -> Settings -> Email Auth에서 'Confirm email' 기능을 꺼주세요." };
        }
        return { error: error.message };
    }

    redirect("/calendar");
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}
