import { NextResponse } from 'next/server';
export const dynamic = "force-dynamic";
import axios from 'axios';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import querystring from 'querystring';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    try {
        const { id, pw } = await req.json();

        if (!id || !pw) {
            return NextResponse.json({ error: "아이디와 비밀번호를 입력해주세요." }, { status: 400 });
        }

        const agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        const loginData = querystring.stringify({
            id: id,
            pw: pw,
            enctp: '1',
            svctype: '1',
            smart_LEVEL: '1',
            locale: 'ko_KR',
            url: 'https://www.naver.com'
        });

        // 1. 네이버 로그인 요청
        const response = await axios.post('https://nid.naver.com/nidlogin.login', loginData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': agent
            },
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });

        // 2. 응답 쿠키에서 NID_AUT, NID_SES 추출
        const setCookieHeaders = response.headers['set-cookie'] || [];
        let nidAut = '';
        let nidSes = '';

        for (const cookieStr of setCookieHeaders) {
            if (cookieStr.startsWith('NID_AUT=')) nidAut = cookieStr.split(';')[0].split('=')[1];
            if (cookieStr.startsWith('NID_SES=')) nidSes = cookieStr.split(';')[0].split('=')[1];
        }

        if (!nidAut || !nidSes) {
            return NextResponse.json({ error: "네이버 로그인에 실패했습니다. (아이디/비밀번호 오류이거나 2단계 인증/캡차가 발생했을 수 있습니다.)" }, { status: 401 });
        }

        // 3. 쿠키 암호화
        const encryptedAut = encrypt(nidAut);
        const encryptedSes = encrypt(nidSes);

        // 4. 기존 연동 정보가 있다면 삭제 (User당 1개만)
        await supabase.from('naver_connections').delete().eq('user_id', user.id);

        // 5. DB에 새 연동 정보 삽입
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { error: insertError } = await supabase.from('naver_connections').insert({
            user_id: user.id,
            blog_id: id,
            nid_aut: encryptedAut,
            nid_ses: encryptedSes,
            is_active: true,
            expires_at: expiresAt
        });

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            return NextResponse.json({ error: "DB 저장 오류 발생" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "연동 성공", blogId: id, expiresAt });
    } catch (e: any) {
        console.error("Naver connect error:", e);
        return NextResponse.json({ error: "서버 내부 오류: " + e.message }, { status: 500 });
    }
}
