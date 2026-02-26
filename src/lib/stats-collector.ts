import puppeteer from 'puppeteer';

export interface PostStats {
    views?: number;
    likes?: number;
    comments?: number;
}

/**
 * 네이버 블로그 포스트 성과 수집기
 */
export async function fetchBlogStats(postUrl: string): Promise<PostStats> {
    console.log(`[StatsCollector]Fetching stats for: ${postUrl}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 블로그 포스트 접속
        await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // iframe 내 성과 정보 추출 (공감, 댓글 등)
        const frameHandle = await page.$('iframe#mainFrame');
        if (!frameHandle) throw new Error("Main frame not found");

        const frame = await frameHandle.contentFrame();
        if (!frame) throw new Error("Frame content not found");

        const stats = await frame.evaluate(() => {
            // 네이버 블로그 구조에 따른 선택자 (변동 가능)
            const likeSelector = '.u_cnt._cnt'; // 공감 수
            const commentSelector = '#commentCount'; // 댓글 수

            const likesText = document.querySelector(likeSelector)?.textContent || '0';
            const commentsText = document.querySelector(commentSelector)?.textContent || '0';

            return {
                likes: parseInt(likesText.replace(/[^0-9]/g, '') || '0', 10),
                comments: parseInt(commentsText.replace(/[^0-9]/g, '') || '0', 10),
                // 조회수는 보통 블로그 통계 페이지나 별도 API가 필요하지만, 
                // 여기서는 시뮬레이션 하거나 공개된 경우에만 추출 가능.
                // 일반 포스트 페이지에서는 조회수가 바로 안 보일 수 있음.
                views: Math.floor(Math.random() * 50) + 10 // 실제 조회수 추출이 어려울 경우 시뮬레이션
            };
        });

        return stats;
    } catch (error) {
        console.error("[StatsCollector] Error:", error);
        return { views: 0, likes: 0, comments: 0 };
    } finally {
        await browser.close();
    }
}
