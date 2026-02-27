import { NextResponse } from 'next/server';
export const dynamic = "force-dynamic";
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import axios from 'axios';

export async function GET(req: Request) {
    const supabase = await createClient();

    const { data: connections, error } = await supabase
        .from('naver_connections')
        .select('*')
        .eq('is_active', true);

    if (error || !connections) {
        return NextResponse.json({ error: error?.message }, { status: 500 });
    }

    let expired = 0;

    for (const conn of connections) {
        try {
            const nidAut = decrypt(conn.nid_aut);
            const nidSes = decrypt(conn.nid_ses);

            const checkRes = await axios.get(`https://blog.naver.com/${conn.blog_id}`, {
                headers: {
                    'Cookie': `NID_AUT=${nidAut}; NID_SES=${nidSes}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                maxRedirects: 0,
                validateStatus: () => true
            });

            if (checkRes.status !== 200) {
                await supabase.from('naver_connections').update({ is_active: false }).eq('id', conn.id);
                expired++;
            }
        } catch (e) {
            console.error(`Error validating connection ${conn.id}:`, e);
        }
    }

    return NextResponse.json({ checked: connections.length, expired });
}
