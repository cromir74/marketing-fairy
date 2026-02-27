import { NextResponse } from 'next/server';
export const dynamic = "force-dynamic";
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('naver_connections')
        .select('blog_id, expires_at, is_active')
        .eq('user_id', user.id)
        .order('connected_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return NextResponse.json({ isConnected: false });
    }

    return NextResponse.json({
        isConnected: data.is_active,
        blogId: data.blog_id,
        expiresAt: data.expires_at,
        isActive: data.is_active
    });
}
