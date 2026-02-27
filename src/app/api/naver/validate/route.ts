import { NextResponse } from 'next/server';
export const dynamic = "force-dynamic";
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import axios from 'axios';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from('naver_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('connected_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return NextResponse.json({ valid: false, message: "연동된 계정이 없습니다." });
    }

    try {
        const nidAut = decrypt(data.nid_aut);
        const nidSes = decrypt(data.nid_ses);

        // MyBlog GET 요청을 통해 status 200 이 나오는지 확인
        const checkRes = await axios.get(`https://blog.naver.com/${data.blog_id}`, {
            headers: {
                'Cookie': `NID_AUT=${nidAut}; NID_SES=${nidSes}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            maxRedirects: 0,
            validateStatus: () => true
        });

        // 200 이면 유효, 아니면 (redirect to login 등) 만료로 간주
        if (checkRes.status === 200) {
            return NextResponse.json({ valid: true });
        } else {
            console.log("Validation failed with status:", checkRes.status);
            // 만료 처리
            await supabase.from('naver_connections').update({ is_active: false }).eq('id', data.id);
            return NextResponse.json({ valid: false, message: "세션이 만료되었습니다." });
        }

    } catch (e: any) {
        console.error("Validation error:", e.message);
        return NextResponse.json({ valid: false, message: "검증 중 오류 발생" });
    }
}
