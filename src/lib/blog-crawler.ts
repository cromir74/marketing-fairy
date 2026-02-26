import puppeteer, { Browser, Page, Frame } from 'puppeteer';

export interface CrawlResult {
    blogs: Array<{ rank: number; title: string; link: string; content: string }>;
    news: Array<{ rank: number; title: string; link: string; content: string }>;
    errors: string[];
}

let crawlBrowser: Browser | null = null;
let crawlPage: Page | null = null;

async function initCrawlBrowser() {
    if (crawlBrowser && crawlBrowser.isConnected()) {
        try {
            if (crawlPage && !crawlPage.isClosed()) {
                return crawlPage;
            }
        } catch (e) { }
    }

    crawlBrowser = await puppeteer.launch({
        headless: false, // 사용자 요청 및 네이버 탐지 회피용
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,1024'
        ]
    });

    const pages = await crawlBrowser.pages();
    crawlPage = pages.length > 0 ? pages[0] : await crawlBrowser.newPage();

    await crawlPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    return crawlPage;
}

async function closeCrawlBrowser() {
    if (crawlBrowser) {
        await crawlBrowser.close();
        crawlBrowser = null;
        crawlPage = null;
    }
}

async function scrollToBottom(page: Page, addLog: (msg: string) => void) {
    addLog('   스크롤 시작...');
    for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
            window.scrollBy(0, 1000);
        });
        await new Promise(r => setTimeout(r, 500));
    }
    addLog('   스크롤 완료');
}

async function scrollAndExtractContent(page: Page, maxChars = 2000) {
    const hasIframe = await page.evaluate(() => {
        return !!document.querySelector('iframe#mainFrame');
    });

    if (hasIframe) {
        try {
            const frameHandle = await page.$('iframe#mainFrame');
            if (frameHandle) {
                const frame = await frameHandle.contentFrame();
                if (frame) {
                    const scrollCount = Math.floor(Math.random() * 4) + 2;
                    for (let i = 0; i < scrollCount; i++) {
                        await frame.evaluate(() => {
                            window.scrollBy(0, 500 + Math.random() * 500);
                        });
                        await new Promise(r => setTimeout(r, 500 + Math.random() * 700));
                    }

                    const content = await frame.evaluate((maxChars) => {
                        const container = document.querySelector('.se-main-container') ||
                            document.querySelector('#postViewArea') ||
                            document.querySelector('.post_ct') ||
                            document.querySelector('.se_component_wrap');

                        if (container) {
                            return (container as HTMLElement).innerText.replace(/\s+/g, ' ').trim().substring(0, maxChars);
                        }
                        return document.body.innerText.replace(/\s+/g, ' ').trim().substring(0, maxChars);
                    }, maxChars);

                    return content;
                }
            }
        } catch (e: any) {
            console.log('iframe error:', e.message);
        }
    }

    const scrollCount = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < scrollCount; i++) {
        await page.evaluate(() => {
            window.scrollBy(0, 500 + Math.random() * 500);
        });
        await new Promise(r => setTimeout(r, 500 + Math.random() * 700));
    }

    const content = await page.evaluate((maxChars) => {
        const newsSelectors = ['#newsct_article', '#dic_area', '#articeBody', '.newsct_article', '#articleBodyContents'];
        for (let sel of newsSelectors) {
            const el = document.querySelector(sel);
            if (el) {
                return (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim().substring(0, maxChars);
            }
        }

        const generalSelectors = ['article', 'main', '.content', '.article-body', '#content'];
        for (let sel of generalSelectors) {
            const el = document.querySelector(sel);
            if (el && (el as HTMLElement).innerText.length > 100) {
                return (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim().substring(0, maxChars);
            }
        }

        return document.body.innerText.replace(/\s+/g, ' ').trim().substring(0, maxChars);
    }, maxChars);

    return content;
}

export async function crawlData(keyword: string, blogCount = 3, newsCount = 0, addLog: (msg: string, type?: string) => void = console.log): Promise<CrawlResult> {
    const result: CrawlResult = { blogs: [], news: [], errors: [] };
    addLog(`=== 크롤링 시작: "${keyword}" ===`, 'info');

    let page: Page;
    try {
        page = await initCrawlBrowser();
    } catch (error: any) {
        addLog(`브라우저 실행 실패: ${error.message}`, 'error');
        return result;
    }

    // 1. 네이버 블로그 수집
    try {
        addLog(`1. 네이버 블로그 검색...`, 'info');
        const blogUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=${encodeURIComponent(keyword)}&sort=1`;
        await page.goto(blogUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 1500));

        await scrollToBottom(page, (m) => addLog(m, 'info'));

        const blogLinks = await page.evaluate((limit) => {
            const results: any[] = [];
            const allBlogLinks = document.querySelectorAll('a[href*="blog.naver.com"]');

            const validLinks: any[] = [];
            allBlogLinks.forEach(a => {
                const href = (a as HTMLAnchorElement).href;
                const text = (a as HTMLElement).innerText.trim();
                const isPostLink = /blog\.naver\.com\/[^\/]+\/\d+/.test(href);
                const hasValidText = text.length >= 5 && text.length <= 150;

                if (isPostLink && hasValidText) {
                    validLinks.push({ href, text });
                }
            });

            const seen = new Set();
            for (const link of validLinks) {
                if (results.length >= limit) break;
                if (seen.has(link.href)) continue;
                seen.add(link.href);

                results.push({
                    rank: results.length + 1,
                    title: link.text,
                    link: link.href
                });
            }
            return results;
        }, blogCount);

        addLog(`   블로그 ${blogLinks.length}개 발견`, 'info');

        for (const blog of blogLinks) {
            addLog(`   [Blog ${blog.rank}] "${blog.title.substring(0, 25)}..."`, 'info');
            try {
                await page.goto(blog.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
                await new Promise(r => setTimeout(r, 1000));

                const content = await scrollAndExtractContent(page, 1500);

                if (content && content.length > 50) {
                    result.blogs.push({ ...blog, content });
                    addLog(`     -> ${content.length}자 수집`, 'success');
                } else {
                    addLog(`     -> 본문 없음`, 'warning');
                }
            } catch (err) {
                addLog(`     -> 오류`, 'error');
            }
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
        }
    } catch (error: any) {
        addLog(`블로그 오류: ${error.message}`, 'error');
    }

    // 2. 뉴스 수집 (생략 가능하도록)
    if (newsCount > 0) {
        // ... 뉴스 수집 로직 (필요시 동일하게 변환)
    }

    try {
        await closeCrawlBrowser();
    } catch (e) { }

    return result;
}
