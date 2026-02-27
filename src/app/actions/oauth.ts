'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
    const supabase = await createClient()
    const headersList = await headers()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || headersList.get('origin') || 'http://localhost:3000'
    const origin = siteUrl.replace(/\/$/, ''); // 트레일링 슬래시 제거

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error) {
        return redirect('/login?error=' + encodeURIComponent(error.message))
    }

    return redirect(data.url)
}

export async function signInWithKakao() {
    const supabase = await createClient()
    const headersList = await headers()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || headersList.get('origin') || 'http://localhost:3000'
    const origin = siteUrl.replace(/\/$/, ''); // 트레일링 슬래시 제거

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        return redirect('/login?error=' + encodeURIComponent(error.message))
    }

    return redirect(data.url)
}
