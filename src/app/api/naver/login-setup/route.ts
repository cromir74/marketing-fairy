import { NextResponse } from 'next/server';
import { NaverAutomation } from '@/lib/naver-automation';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 관리자 또는 특정 권한 체크가 필요할 수 있음
    // if (user.email !== '원하는관리자이메일') ...

    let automation: NaverAutomation | null = null;
    try {
        const body = await req.json();
        const { id, pw } = body;

        if (!id || !pw) {
            return NextResponse.json({ error: "아이디와 비밀번호가 필요합니다." }, { status: 400 });
        }

        automation = new NaverAutomation();
        await automation.initialize(true); // 우선 headless로 시도

        await automation.login(id, pw);

        return NextResponse.json({
            success: true,
            message: "네이버 로그인이 성공적으로 완료되었으며 쿠키가 저장되었습니다."
        });

    } catch (error: any) {
        console.error("Naver Login Setup Error:", error);

        // 캡차 발생 시 public 폴더에 이미지가 저장됨을 NaverAutomation에서 처리함
        if (error.message.includes("캡차")) {
            return NextResponse.json({
                error: error.message,
                captchaUrl: "/naver_captcha.png"
            }, { status: 403 });
        }

        return NextResponse.json({ error: error.message || "로그인 설정 중 오류가 발생했습니다." }, { status: 500 });
    } finally {
        if (automation) {
            await automation.close();
        }
    }
}

/**
 * 현재 쿠키 상태 확인
 */
export async function GET() {
    const automation = new NaverAutomation();
    const hasCookies = await automation.hasSavedCookies();
    return NextResponse.json({ hasSavedCookies: hasCookies });
}
