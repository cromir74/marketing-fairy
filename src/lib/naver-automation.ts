import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page, Frame } from 'puppeteer';
import path from 'path';
import fs from 'fs-extra';

puppeteer.use(StealthPlugin());

export interface NaverPublishOptions {
    title: string;
    content: string;
    images?: { path: string; mimeType: string }[];
    mode: 'immediate' | 'draft' | 'scheduled';
    scheduledTime?: string;
    onLog?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

interface ParsedLine {
    type: 'heading' | 'quote' | 'image_marker' | 'mixed' | 'text' | 'empty';
    text: string;
    index?: number | null;
}

const COOKIE_FILE = path.join(process.cwd(), 'naver-cookies.json');

export class NaverAutomation {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private naverId: string = "";
    private onLogCallback?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;

    private addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        console.log(`[NaverAuto][${type}] ${message}`);
        if (this.onLogCallback) this.onLogCallback(message, type);
    }

    async initialize(headless: boolean = true) {
        this.addLog("브라우저 시작 중 (Stealth 적용)...");
        this.browser = await (puppeteer as any).launch({
            headless: headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1280,1024',
            ],
            defaultViewport: { width: 1280, height: 1024 }
        });
        const pages = await this.browser!.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser!.newPage();

        // 실제 브라우저처럼 언어 설정
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        });
    }

    async close() {
        if (this.browser) await this.browser.close();
    }

    /**
     * 쿠키 파일이 존재하는지 확인
     */
    async hasSavedCookies(): Promise<boolean> {
        return await fs.pathExists(COOKIE_FILE);
    }

    /**
     * 환경변수(.env)에 저장된 NAVER_NID_AUT, NAVER_NID_SES 쿠키로 로그인 설정
     */
    async loginWithEnvCookies(): Promise<boolean> {
        if (!this.page) throw new Error("Browser not initialized");

        const nidAut = process.env.NAVER_NID_AUT;
        const nidSes = process.env.NAVER_NID_SES;

        if (!nidAut || !nidSes) {
            this.addLog("환경변수(NAVER_NID_AUT, NAVER_NID_SES)가 설정되지 않았습니다.", "error");
            return false;
        }

        try {
            this.addLog("환경변수 쿠키 적용 중...");
            const cookies = [
                { name: 'NID_AUT', value: nidAut, domain: '.naver.com', path: '/' },
                { name: 'NID_SES', value: nidSes, domain: '.naver.com', path: '/' }
            ];
            await this.page.setCookie(...cookies);

            // 로그인 여부 확인을 위해 블로그 메인으로 이동
            await this.page.goto('https://section.blog.naver.com/', { waitUntil: 'networkidle2' });

            // 로그인 상태 확인 (내 블로그 링크 등이 있는지 확인)
            const isLoggedIn = await this.page.evaluate(() => {
                return !!document.querySelector('.user_info') || !!document.querySelector('.btn_logout') || !!document.querySelector('.nav_my');
            });

            if (isLoggedIn) {
                this.addLog("환경변수 쿠키로 로그인 성공", "success");
                return true;
            }
        } catch (e: any) {
            this.addLog(`쿠키 설정 중 오류: ${e.message}`, "error");
        }

        this.addLog("쿠키 로그인 실패 또는 만료됨", "warning");
        return false;
    }

    /**
     * 기존 ID/PW 로그인 메서드 제거 (사용자 요청)
     */
    async login(id: string, pw: string) {
        throw new Error("ID/PW 로그인은 더 이상 지원하지 않습니다. .env의 NID_AUT, NID_SES를 갱신해주세요.");
    }

    async enterEditor() {
        if (!this.page) throw new Error("Browser not initialized");

        this.addLog("블로그 에디터 진입 중...");

        try {
            const editorUrl = `https://blog.naver.com/GoBlogWrite.naver`;
            await this.page.goto(editorUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // 로그인 페이지로 리다이렉트 되었는지 확인
            const currentUrl = this.page.url();
            if (currentUrl.includes('nidlogin.login')) {
                throw new Error("쿠키가 만료되었습니다. .env의 NID_AUT, NID_SES를 갱신해주세요.");
            }

            // 에디터 로드 확인
            const isEditorLoaded = await this.page.evaluate(() => {
                return !!document.querySelector('#mainFrame') || !!document.querySelector('.se-main-container');
            });

            if (!isEditorLoaded) {
                // 한 번 더 확인 (지연 발생 가능)
                await new Promise(r => setTimeout(r, 3000));
            }

        } catch (e: any) {
            if (e.message.includes("쿠키가 만료")) throw e;
            this.addLog(`에디터 진입 실패: ${e.message}`, "error");
            throw new Error(`에디터 진입 중 오류가 발생했습니다: ${e.message}`);
        }

        await new Promise(r => setTimeout(r, 2000));
        await this.clearPopups(this.page);
    }

    private async clearPopups(target: Page | Frame) {
        try {
            const closed = await target.evaluate(() => {
                let found = false;
                const closeSelectors = [
                    '.se-popup-button-close', '.btn_close', '.se_popup_close', '.popup_close',
                    '.se-popup-button-cancel', '.btn_cancel', '.se-help-panel-close-button'
                ];
                closeSelectors.forEach(selector => {
                    const btns = document.querySelectorAll(selector);
                    btns.forEach(btn => { (btn as any).click(); found = true; });
                });
                const allElements = Array.from(document.querySelectorAll('button, a, span'));
                const cancelBtn = allElements.find(el => el.textContent?.trim() === '취소');
                if (cancelBtn) { (cancelBtn as any).click(); found = true; }
                return found;
            });
            if (closed) this.addLog("에디터 방해 팝업(취소/닫기) 처리 완료");
        } catch (e) { }
    }

    async publish(options: NaverPublishOptions): Promise<string | null> {
        if (!this.page) throw new Error("Browser not initialized");
        this.onLogCallback = options.onLog;

        const { title, content, images = [], mode, scheduledTime } = options;

        this.addLog("에디터 프레임 찾는 중...");
        let frame: any = null;

        try {
            const frameHandle = await this.page.waitForSelector('#mainFrame', { timeout: 15000 });
            if (frameHandle) {
                frame = await frameHandle.contentFrame();
                this.addLog("#mainFrame 진입 성공");
            }
        } catch (e) {
            this.addLog("#mainFrame을 찾을 수 없음, 직접 페이지 탐색 시도...", "warning");
        }

        if (!frame) {
            const frames = this.page.frames();
            const targetFrame = frames.find(f => f.name() === 'mainFrame') ||
                frames.find(f => f.url().includes('editor'));
            if (targetFrame) {
                frame = targetFrame;
                this.addLog("에디터 프레임 탐색 성공");
            } else {
                const isEditor = await this.page.evaluate(() => {
                    return !!document.querySelector('.se-ff-nanumbarungothic') || !!document.querySelector('.se-main-container');
                });
                if (isEditor) {
                    frame = this.page;
                    this.addLog("현재 페이지를 에디터로 인식함");
                }
            }
        }

        if (!frame) throw new Error("네이버 에디터를 로드할 수 없습니다. (프레임 인식 실패)");

        await this.clearPopups(frame);
        await new Promise(r => setTimeout(r, 500));

        // 1. 제목 입력
        this.addLog(`제목 입력 중: ${title}`);
        try {
            await frame.waitForSelector('.se-section-documentTitle', { timeout: 15000 });
            await frame.click('.se-section-documentTitle');
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {
            this.addLog("제목 영역을 찾을 수 없어 기본 셀렉터 시도", "warning");
            const titleSelector = '.se-ff-nanumbarungothic.se-fs15.se-placeholder, .se-placeholder.se-ff-nanumbarungothic, .se-title-text';
            await frame.click(titleSelector).catch(() => { });
        }

        await this.typeTextSlowly(title, 30);
        await this.page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 800));

        // 2. 본문 파싱 및 입력
        const parsedLines: ParsedLine[] = this.parseContent(content);
        this.addLog(`본문 작성 시작 (${parsedLines.length} 줄)`);

        let markerIdx = 0;
        let isFirstText = true;

        for (const line of parsedLines) {
            if (line.type === 'heading') {
                await this.applyHeadingStyle(frame, line.text);
            } else if (line.type === 'quote') {
                await this.insertQuotation(frame, line.text);
            } else if (line.type === 'image_marker') {
                const imgIndex = (line.index !== undefined && line.index !== null) ? line.index : markerIdx++;
                if (images && images[imgIndex]) {
                    await this.insertImage(frame, images[imgIndex].path);
                }
            } else if (line.type === 'mixed') {
                await this.ensureLastSectionFocus(frame);
                if (isFirstText) {
                    await this.ensureFontSize16(frame);
                    isFirstText = false;
                }
                await this.processMixedLine(frame, line.text);
            } else if (line.type === 'empty') {
                await this.page.keyboard.press('Enter');
            } else {
                await this.ensureLastSectionFocus(frame);
                if (isFirstText && line.text.trim()) {
                    await this.ensureFontSize16(frame);
                    isFirstText = false;
                }
                await this.typeTextSlowly(line.text, 20);
                await this.page.keyboard.press('Enter');
            }
            await new Promise(r => setTimeout(r, 200));
        }

        return await this.handlePublishAction(frame, mode, scheduledTime);
    }

    private parseContent(content: string): ParsedLine[] {
        const lines = content.split('\n');
        const parsedLines: ParsedLine[] = [];
        for (let line of lines) {
            let trimmedLine = line.trim();
            if (!trimmedLine) {
                parsedLines.push({ type: 'empty', text: '' });
                continue;
            }

            const headingMatch = trimmedLine.match(/^#{2,}\s*(.+?)(\s*#+)?$/);
            if (headingMatch) {
                parsedLines.push({ type: 'heading', text: headingMatch[1].trim().replace(/\*\*/g, '') });
                continue;
            }

            const quoteMatch = trimmedLine.match(/^@@(.+?)@@$/) || trimmedLine.match(/^>\s*(.+)$/);
            if (quoteMatch) {
                parsedLines.push({ type: 'quote', text: quoteMatch[1].trim().replace(/\*\*/g, '') });
                continue;
            }

            const imageMarkerMatch = trimmedLine.match(/^\[(?:이미지|image)\s*(\d+)\]/i) || trimmedLine.match(/^\[(?:이미지|image)\]/i);
            if (imageMarkerMatch) {
                const matchGroups = imageMarkerMatch as RegExpMatchArray;
                const numStr = matchGroups[1];
                const num = numStr ? parseInt(numStr, 10) : null;
                parsedLines.push({ type: 'image_marker', text: trimmedLine, index: num !== null ? num - 1 : null });
                continue;
            }

            if (trimmedLine.includes('**')) {
                parsedLines.push({ type: 'mixed', text: trimmedLine });
            } else {
                parsedLines.push({ type: 'text', text: trimmedLine });
            }
        }
        return parsedLines;
    }

    private async typeTextSlowly(text: string, delay: number = 30) {
        if (!this.page) return;
        await this.page.keyboard.type(text, { delay });
    }

    private async applyHeadingStyle(frame: Frame, text: string) {
        this.addLog(`소제목 적용: ${text}`);
        try {
            await frame.click('button[data-name="font-size"]');
            await new Promise(r => setTimeout(r, 400));
            await frame.evaluate(() => {
                const opt = document.querySelector('button[data-value="fs19"]');
                if (opt) (opt as any).click();
            });
            await new Promise(r => setTimeout(r, 400));
        } catch (e) { }

        await this.page!.keyboard.down('Control');
        await this.page!.keyboard.press('b');
        await this.page!.keyboard.up('Control');

        await this.typeTextSlowly(text);
        await this.page!.keyboard.press('Enter');

        await this.page!.keyboard.down('Control');
        await this.page!.keyboard.press('b');
        await this.page!.keyboard.up('Control');

        await this.ensureFontSize16(frame);
    }

    private async insertQuotation(frame: Frame, text: string) {
        this.addLog(`인용구 삽입: ${text.substring(0, 20)}...`);
        await frame.click('button[data-name="quotation"]');
        await new Promise(r => setTimeout(r, 600));

        await frame.evaluate(() => {
            const opts = document.querySelectorAll('.se-quotation-style-option, .se-toolbar-option');
            if (opts.length >= 2) (opts[1] as any).click();
        });
        await new Promise(r => setTimeout(r, 500));

        await this.page!.keyboard.down('Control');
        await this.page!.keyboard.press('b');
        await this.page!.keyboard.up('Control');

        await this.typeTextSlowly(text);
        await new Promise(r => setTimeout(r, 500));

        await this.page!.keyboard.press('ArrowDown');
        await new Promise(r => setTimeout(r, 300));
        await this.page!.keyboard.press('ArrowDown');
        await new Promise(r => setTimeout(r, 300));
        await this.page!.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 500));

        await this.ensureFontSize16(frame);
    }

    private async processMixedLine(frame: Frame, text: string) {
        const regex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const beforeText = text.slice(lastIndex, match.index);
            if (beforeText) await this.typeTextSlowly(beforeText);

            const boldText = match[1];
            await this.page!.keyboard.down('Control');
            await this.page!.keyboard.press('b');
            await this.page!.keyboard.up('Control');
            await new Promise(r => setTimeout(r, 100));

            await this.typeTextSlowly(boldText);

            await this.page!.keyboard.down('Control');
            await this.page!.keyboard.press('b');
            await this.page!.keyboard.up('Control');
            await new Promise(r => setTimeout(r, 100));

            lastIndex = regex.lastIndex;
        }

        const remainingText = text.slice(lastIndex);
        if (remainingText) await this.typeTextSlowly(remainingText);
        await this.page!.keyboard.press('Enter');
    }

    private async insertImage(frame: Frame, imagePath: string) {
        this.addLog(`이미지 삽입 중: ${path.basename(imagePath)}`);
        try {
            await this.page!.keyboard.down('Control');
            await this.page!.keyboard.press('End');
            await this.page!.keyboard.up('Control');
            await new Promise(r => setTimeout(r, 500));

            await frame.evaluate(() => {
                const imgBtn = document.querySelector('button[data-name="image"]') ||
                    document.querySelector('.se-toolbar-item-image') ||
                    document.querySelector('button.se-image-add-button') ||
                    Array.from(document.querySelectorAll('button')).find(b =>
                        b.getAttribute('aria-label')?.includes('이미지') ||
                        b.getAttribute('title')?.includes('이미지')
                    );
                if (imgBtn) (imgBtn as any).click();
            });
            await new Promise(r => setTimeout(r, 1000));

            const inputHandle = await frame.$('input.se-image-attach-input') ||
                await frame.$('input[accept*="image"]') ||
                await frame.$('input[type="file"]');

            if (inputHandle) {
                await inputHandle.uploadFile(imagePath);
                this.addLog("파일 전송 완료, 업로드 대기 중...");
                await new Promise(r => setTimeout(r, 4000));

                await this.page!.keyboard.down('Control');
                await this.page!.keyboard.press('End');
                await this.page!.keyboard.up('Control');
                await new Promise(r => setTimeout(r, 500));

                await this.page!.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 200));
                await this.page!.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 500));
            } else {
                this.addLog("이미지 input 요소를 찾을 수 없습니다", "warning");
            }
        } catch (e: any) {
            this.addLog(`이미지 삽입 실패: ${e.message}`, "error");
        }
    }

    private async ensureLastSectionFocus(frame: Frame) {
        try {
            const focused = await frame.evaluate(() => {
                const textSection = document.querySelector('.se-section-text') as HTMLElement;
                if (textSection) {
                    textSection.click();
                    textSection.focus();
                    return true;
                }
                const textSections = document.querySelectorAll('.se-section-text--active');
                if (textSections.length > 0) {
                    (textSections[textSections.length - 1] as HTMLElement).focus();
                    return true;
                }
                return false;
            });

            if (!focused) {
                await frame.click('.se-main-container').catch(() => { });
            }
            await new Promise(r => setTimeout(r, 300));
        } catch (e) { }
    }

    private async ensureFontSize16(frame: Frame) {
        try {
            await frame.click('button[data-name="font-size"]');
            await new Promise(r => setTimeout(r, 300));
            await frame.evaluate(() => {
                const opt = document.querySelector('button[data-value="fs16"]');
                if (opt) (opt as any).click();
            });
        } catch (e) { }
    }

    private async handlePublishAction(frame: any, mode: 'immediate' | 'draft' | 'scheduled', scheduledTime?: string): Promise<string | null> {
        this.addLog(`발행 프로세스 시작 (모드: ${mode})`);

        if (mode === 'draft') {
            const draftSaved = await frame.evaluate(() => {
                const selectors = ['.save_btn__bzc5B', 'button[data-click-area="tpb.save"]', '.save_btn__T1ZzW'];
                for (const s of selectors) {
                    const btn = document.querySelector(s);
                    if (btn && (btn.textContent?.includes('저장') || btn.getAttribute('aria-label')?.includes('저장'))) {
                        (btn as any).click(); return true;
                    }
                }
                const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('저장'));
                if (saveBtn) { (saveBtn as any).click(); return true; }
                return false;
            });
            await new Promise(r => setTimeout(r, 3000));
            if (draftSaved) this.addLog("임시 저장 완료", "success");
            return null;

        } else if (mode === 'immediate') {
            await frame.evaluate(() => {
                const pubBtn = document.querySelector('.publish_btn__WvYpP') ||
                    document.querySelector('.publish_btn__m9KHH') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '발행');
                if (pubBtn) (pubBtn as any).click();
            });
            await new Promise(r => setTimeout(r, 2000));

            await frame.evaluate(() => {
                const confirmBtn = document.querySelector('.confirm_btn') ||
                    document.querySelector('.se-popup-button-confirm');
                if (confirmBtn) (confirmBtn as any).click();
            });
            await new Promise(r => setTimeout(r, 3000));
            this.addLog("즉시 발행 완료", "success");

            return this.page!.url();

        } else if (mode === 'scheduled') {
            let targetDate: Date;
            if (scheduledTime) {
                targetDate = new Date(scheduledTime);
            } else {
                const now = new Date();
                targetDate = new Date(now);
                targetDate.setDate(now.getDate() + 1);
                targetDate.setHours(10, 0, 0, 0);
            }

            const targetDay = targetDate.getDate();
            let targetHourNum = targetDate.getHours();
            let min = targetDate.getMinutes();

            min = Math.ceil(min / 10) * 10;
            if (min >= 60) {
                min = 0;
                targetHourNum = (targetHourNum + 1) % 24;
            }
            const targetHour = String(targetHourNum).padStart(2, '0');
            const targetMinute = String(min).padStart(2, '0');

            try {
                await frame.evaluate(() => {
                    const pubBtn = document.querySelector('.publish_btn__WvYpP') ||
                        document.querySelector('.publish_btn__m9KHH') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '발행');
                    if (pubBtn) (pubBtn as any).click();
                });
                await new Promise(r => setTimeout(r, 2000));

                await frame.evaluate(() => {
                    const labels = Array.from(document.querySelectorAll('label'));
                    const scheduleLabel = labels.find(lbl => lbl.textContent?.trim() === '예약');
                    if (scheduleLabel) (scheduleLabel as any).click();
                });
                await new Promise(r => setTimeout(r, 1500));

                await frame.evaluate(() => {
                    const dateInput = document.querySelector('input[class*="input_date"]') ||
                        document.querySelector('.input_date');
                    if (dateInput) (dateInput as any).click();
                });
                await new Promise(r => setTimeout(r, 1500));

                await frame.evaluate((day: number) => {
                    const dayButtons = Array.from(document.querySelectorAll('.ui-state-default'));
                    const targetBtn = dayButtons.find(btn => btn.textContent?.trim() === String(day));
                    if (targetBtn) (targetBtn as any).click();
                }, targetDay);
                await new Promise(r => setTimeout(r, 1000));

                await frame.evaluate((hour: string) => {
                    const hourSelect = document.querySelector('select.hour_option__J_heO') ||
                        document.querySelector('select[title="예약 발행 시간 선택"]');
                    if (hourSelect) {
                        (hourSelect as any).value = hour;
                        hourSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, targetHour);
                await new Promise(r => setTimeout(r, 500));

                await frame.evaluate((minute: string) => {
                    const minuteSelect = document.querySelector('select.minute_option__Vb3xB') ||
                        document.querySelector('select[title="예약 발행 분 선택"]');
                    if (minuteSelect) {
                        (minuteSelect as any).value = minute;
                        minuteSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, targetMinute);
                await new Promise(r => setTimeout(r, 500));

                await frame.evaluate(() => {
                    const confirmBtn = document.querySelector('button[class*="confirm_btn"]') ||
                        document.querySelector('.confirm_btn');
                    if (confirmBtn) (confirmBtn as any).click();
                });
                await new Promise(r => setTimeout(r, 3000));
                return null;
            } catch (e: any) {
                this.addLog(`예약 발행 실패: ${e.message}`, "error");
                throw e;
            }
        }
        return null;
    }
}
