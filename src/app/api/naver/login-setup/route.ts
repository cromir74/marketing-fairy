import { NextResponse } from 'next/server';
import { NaverAutomation } from '@/lib/naver-automation';
import { createClient } from '@/lib/supabase/server';

/**
 * 네이버 쿠키 상태 확인 및 수동 가이드 제공
 */
export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let automation: NaverAutomation | null = null;
    try {
        automation = new NaverAutomation();
        await automation.initialize(true);

        const success = await automation.loginWithEnvCookies();

        if (success) {
            try {
                await automation.enterEditor();
                return NextResponse.json({
                    success: true,
                    message: "네이버 세션이 유효합니다. 자동 포스팅이 가능합니다."
                });
            } catch (editorError: any) {
                return NextResponse.json({
                    success: false,
                    error: editorError.message || "에디터 진입에 실패했습니다. 쿠키를 재확인해주세요."
                }, { status: 403 });
            }
        } else {
            return NextResponse.json({
                success: false,
                error: "쿠키가 유효하지 않거나 만료되었습니다. .env의 NID_AUT, NID_SES를 갱신해주세요."
            }, { status: 401 });
        }

    } catch (error: any) {
        console.error("Naver Cookie Check Error:", error);
        return NextResponse.json({ error: error.message || "상태 확인 중 오류가 발생했습니다." }, { status: 500 });
    } finally {
        if (automation) {
            await automation.close();
        }
    }
}

/**
 * 현재 설정된 환경변수 존재 여부 확인
 */
export async function GET() {
    const hasNidAut = !!process.env.NAVER_NID_AUT;
    const hasNidSes = !!process.env.NAVER_NID_SES;

    return NextResponse.json({
        hasConfigured: hasNidAut && hasNidSes,
        details: {
            NAVER_NID_AUT: hasNidAut ? "configured" : "missing",
            NAVER_NID_SES: hasNidSes ? "configured" : "missing"
        }
    });
}
