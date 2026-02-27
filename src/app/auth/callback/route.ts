import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    let next = searchParams.get("next") ?? "/calendar";

    if (!next.startsWith("/")) {
        next = "/calendar";
    }

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                // forwardedHost가 주어지면 해당 호스트 기반으로 리다이렉트 (프로토콜은 origin의 프로토콜 유지)
                const protocol = origin.split(":")[0];
                return NextResponse.redirect(`${protocol}://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    // 에러 시 로그인 페이지로
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
