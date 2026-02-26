import { NextResponse } from 'next/server';
import { NaverAutomation } from '@/lib/naver-automation';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    let automation: NaverAutomation | null = null;
    const tempDir = path.join(os.tmpdir(), 'marketing-fairy-blog');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 구독 및 발행 제한 체크 추가
    const { checkPublishLimit } = await import("@/lib/subscription/check-usage");
    const publishCheck = await checkPublishLimit(user.id, "blog");
    if (!publishCheck.allowed) {
        const errMsg = 'message' in publishCheck ? publishCheck.message : "권한이 없습니다.";
        const reason = 'reason' in publishCheck ? publishCheck.reason : "limit_reached";
        return NextResponse.json({ error: errMsg, reason: reason }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, pw, title, content, images = [], mode = 'draft', scheduledTime, storeId, topic } = body;

        if (!id || !pw || !title || !content) {
            return NextResponse.json({ error: "필수 정보(ID, PW, 제목, 본문)가 누락되었습니다." }, { status: 400 });
        }

        // 1. 임시 이미지 파일 저장 (Puppeteer 업로드를 위해 로컬 경로 필요)
        const savedImagePaths: { path: string, mimeType: string }[] = [];
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        for (const img of images) {
            const fileName = `${uuidv4()}.${img.mimeType.split('/')[1] || 'jpg'}`;
            const filePath = path.join(tempDir, fileName);

            let imageBuffer: Buffer;
            if (img.base64) {
                imageBuffer = Buffer.from(img.base64, 'base64');
            } else if (img.url) {
                // URL로부터 이미지 다운로드 (서버 사이드)
                console.log(`[PublishAPI] Downloading image from URL: ${img.url}`);
                const response = await fetch(img.url);
                if (!response.ok) throw new Error(`이미지 다운로드 실패: ${img.url}`);
                const arrayBuffer = await response.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
            } else {
                continue; // 데이터가 없는 경우 건너뜀
            }

            fs.writeFileSync(filePath, imageBuffer);
            savedImagePaths.push({ path: filePath, mimeType: img.mimeType });
        }

        // 2. 자동화 엔진 실행
        automation = new NaverAutomation();
        await automation.initialize();

        // 발행 과정 로그를 리턴하기 위해 간단한 메시지 캡처 (실제 운영시 SSE 권장)
        const logs: string[] = [];
        const captureLog = (msg: string) => logs.push(msg);

        await automation.login(id, pw);
        await automation.enterEditor();
        const publishedUrl = await automation.publish({
            title,
            content,
            images: savedImagePaths,
            mode,
            scheduledTime,
            onLog: (msg: string) => console.log(`[PublishAPI] ${msg}`)
        });

        // 3. 임시 파일 삭제
        for (const img of savedImagePaths) {
            if (fs.existsSync(img.path)) fs.unlinkSync(img.path);
        }

        // 4. DB에 발행/예약 내역 저장
        const { error: dbError } = await supabase.from("contents").insert({
            user_id: user.id,
            store_id: storeId,
            platform: 'blog',
            topic: topic || title,
            content: content,
            link: publishedUrl, // 발행된 포스트 URL 저장
            is_published: mode !== 'scheduled',
            scheduled_at: mode === 'scheduled' ? scheduledTime : null,
            status: mode === 'scheduled' ? 'pending' : 'published',
            views: 0,
            likes: 0,
            comments: 0
        });

        if (dbError) {
            console.error("DB Save Error (but publish might have succeeded):", dbError);
        }

        return NextResponse.json({ success: true, message: "발행 프로세스가 완료되었습니다." });

    } catch (error: any) {
        console.error("Naver Publish API Error:", error);
        return NextResponse.json({ error: error.message || "발행 중 오류가 발생했습니다." }, { status: 500 });
    } finally {
        if (automation) {
            await automation.close();
        }
    }
}
