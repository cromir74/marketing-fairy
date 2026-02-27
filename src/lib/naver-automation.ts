import puppeteer, { Browser, Page, ElementHandle, Frame } from 'puppeteer';
import path from 'path';

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

export class NaverAutomation {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private naverId: string = "";
    private onLogCallback?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;

    private addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        console.log(`[NaverAuto][${type}] ${message}`);
        if (this.onLogCallback) this.onLogCallback(message, type);
    }

    async initialize() {
        this.addLog("브라우저 시작 중...");
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1280,1024',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            defaultViewport: { width: 1280, height: 1024 }
        });
        const pages = await this.browser.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
    }

    async close() {
        if (this.browser) await this.browser.close();
    }

    async login(id: string, pw: string) {
        if (!this.page) throw new Error("Browser not initialized");
        this.naverId = id; // 아이디 저장
        this.addLog("네이버 로그인 시도 중...");

        try {
            await this.page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'networkidle2' });

            // 기존 세션 쿠키 삭제 (참조 코드 반영)
            const client = await this.page.target().createCDPSession();
            await client.send('Network.deleteCookies', { name: 'NID_AUT', domain: '.naver.com' });
            await client.send('Network.deleteCookies', { name: 'NID_SES', domain: '.naver.com' });
            await new Promise(r => setTimeout(r, 500));
            await this.page.reload({ waitUntil: 'networkidle2' });
        } catch (e) {
            this.addLog("로그인 페이지 초기화 중 오류 (무시하고 진행)", "warning");
        }

        await this.page.evaluate((id, pw) => {
            const idInput = document.querySelector('#id') as HTMLInputElement;
            const pwInput = document.querySelector('#pw') as HTMLInputElement;
            if (idInput) idInput.value = id;
            if (pwInput) pwInput.value = pw;
        }, id, pw);

        await new Promise(r => setTimeout(r, 500));
        await this.page.click('.btn_login');
        try {
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        } catch (e) {
            this.addLog("로그인 후 네비게이션 대기 시간 초과 (계속 진행)", "warning");
        }

        if (this.page.url().includes('nidlogin.login') || this.page.url().includes('login.naver.com')) {
            // 조금 더 기다려봄
            await new Promise(r => setTimeout(r, 2000));
            if (this.page.url().includes('nidlogin.login')) {
                throw new Error("로그인 실패: 계정 정보를 확인하거나 캡차 입력을 확인하세요.");
            }
        }

        this.addLog("로그인 성공", "success");
    }

    async enterEditor() {
        if (!this.page) throw new Error("Browser not initialized");
        if (!this.naverId) throw new Error("Naver ID not found. Please login first.");

        this.addLog("블로그 에디터 진입 중...");

        try {
            const editorUrl = `https://blog.naver.com/${this.naverId}?Redirect=Write&`;
            await this.page.goto(editorUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            this.addLog(`현재 URL: ${this.page.url()}`);
        } catch (e: any) {
            this.addLog(`에디터 페이지 로드 지연/실패: ${e.message}`, "warning");
        }

        // 도움말/공지/취소 팝업 닫기 시도
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
            // 1. #mainFrame 찾기
            const frameHandle = await this.page.waitForSelector('#mainFrame', { timeout: 15000 });
            if (frameHandle) {
                frame = await frameHandle.contentFrame();
                this.addLog("#mainFrame 진입 성공");
            }
        } catch (e) {
            this.addLog("#mainFrame을 찾을 수 없음, 직접 페이지 탐색 시도...", "warning");
        }

        // 2. 만약 #mainFrame이 없다면 현재 페이지 자체가 에디터일 수 있음
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

        // 프레임 내부에서도 팝업 제거 시도 (임시 저장 글 불러오기 등)
        await this.clearPopups(frame);
        await new Promise(r => setTimeout(r, 500));

        // 1. 제목 입력
        this.addLog(`제목 입력 중: ${title}`);
        try {
            const titleSelector = '.se-ff-nanumbarungothic.se-fs15.se-placeholder, .se-placeholder.se-ff-nanumbarungothic, .se-title-text';
            await frame.waitForSelector(titleSelector, { timeout: 15000 });
            await frame.click(titleSelector);
        } catch (e) {
            this.addLog("제목 입력란 클릭 실패 (포커싱 시도)", "warning");
            await this.page.keyboard.press('Tab');
        }

        await this.page.keyboard.type(title, { delay: 50 });
        await this.page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 800));

        // 2. 본문 파싱 및 입력
        const parsedLines: ParsedLine[] = this.parseContent(content);
        this.addLog(`본문 작성 시작 (${parsedLines.length} 줄)`);

        let markerIdx = 0;
        let isFirstText = true; // 첫 번째 텍스트 라인 감지용

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

        // 인용구 탈출: 화살표 아래 2번 + 엔터 1번 (사용자 가이드 반영)
        this.addLog("인용구 탈출 시도 중...");
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
            // 1. 커서를 문서 맨 끝으로 이동
            await this.page!.keyboard.down('Control');
            await this.page!.keyboard.press('End');
            await this.page!.keyboard.up('Control');
            await new Promise(r => setTimeout(r, 500));

            // 2. 이미지 버튼 클릭 시도 (업로드 엔진 활성화)
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

            // 3. 파일 input 찾아서 업로드
            const inputHandle = await frame.$('input.se-image-attach-input') ||
                await frame.$('input[accept*="image"]') ||
                await frame.$('input[type="file"]');

            if (inputHandle) {
                await inputHandle.uploadFile(imagePath);
                this.addLog("파일 전송 완료, 업로드 대기 중...");
                await new Promise(r => setTimeout(r, 4000)); // 업로드 완료 대기

                // 4. 커서를 다시 문서 맨 끝으로 이동
                await this.page!.keyboard.down('Control');
                await this.page!.keyboard.press('End');
                await this.page!.keyboard.up('Control');
                await new Promise(r => setTimeout(r, 500));

                // 5. 새 문단 생성 (Enter 2번)
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
            await frame.evaluate(() => {
                const textSections = document.querySelectorAll('.se-section-text');
                if (textSections.length > 0) {
                    const last = textSections[textSections.length - 1] as HTMLElement;
                    last.focus();

                    // 커서를 해당 섹션의 맨 끝으로 이동
                    const range = document.createRange();
                    range.selectNodeContents(last);
                    range.collapse(false);
                    const sel = window.getSelection();
                    if (sel) {
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                } else {
                    const content = document.querySelector('.se-content') as HTMLElement;
                    if (content) content.focus();
                }
            });
            await new Promise(r => setTimeout(r, 200));
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
            this.addLog("임시 저장 시도 중...");
            const draftSaved = await frame.evaluate(() => {
                const selectors = [
                    '.save_btn__bzc5B',
                    'button[data-click-area="tpb.save"]',
                    '.save_btn__T1ZzW',
                    '.publish_btn__m9KHH' // 가끔 발행 버튼 근처에 저장 버튼이 있을 수 있음
                ];
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
            else this.addLog("임시 저장 버튼을 찾을 수 없음", "warning");

        } else if (mode === 'immediate') {
            this.addLog("즉시 발행 진행 중...");
            await frame.evaluate(() => {
                const pubBtn = document.querySelector('.publish_btn__WvYpP') ||
                    document.querySelector('.publish_btn__m9KHH') ||
                    document.querySelector('button.publish_btn') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '발행');
                if (pubBtn) (pubBtn as any).click();
            });
            await new Promise(r => setTimeout(r, 2000));

            this.addLog("최종 발행 버튼 클릭...");
            await frame.evaluate(() => {
                const confirmBtn = document.querySelector('.confirm_btn') ||
                    document.querySelector('.se-popup-button-confirm');
                if (confirmBtn) (confirmBtn as any).click();
            });
            await new Promise(r => setTimeout(r, 3000));
            this.addLog("즉시 발행 완료", "success");

            // 발행 후 리다이렉트된 URL 반환
            const postUrl = this.page!.url();
            this.addLog(`발행된 글 주소: ${postUrl}`);
            return postUrl;

        } else if (mode === 'scheduled') {
            this.addLog("예약 발행 설정 시작 (10분 단위)...");

            // 1. 예약 시간 계산
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

            // 10분 단위 올림 처리 (네이버 에디터 기준)
            min = Math.ceil(min / 10) * 10;
            if (min >= 60) {
                min = 0;
                targetHourNum = (targetHourNum + 1) % 24;
            }
            const targetHour = String(targetHourNum).padStart(2, '0');
            const targetMinute = String(min).padStart(2, '0');

            this.addLog(`예약 목표: ${targetDay}일 ${targetHour}:${targetMinute}`);

            try {
                // Step 1: 발행 모달 열기
                await frame.evaluate(() => {
                    const pubBtn = document.querySelector('.publish_btn__WvYpP') ||
                        document.querySelector('.publish_btn__m9KHH') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '발행');
                    if (pubBtn) (pubBtn as any).click();
                });
                await new Promise(r => setTimeout(r, 2000));

                // Step 2: '예약' 옵션 선택
                await frame.evaluate(() => {
                    const labels = Array.from(document.querySelectorAll('label'));
                    const scheduleLabel = labels.find(lbl => lbl.textContent?.trim() === '예약');
                    if (scheduleLabel) {
                        (scheduleLabel as any).click();
                    } else {
                        const radio = document.getElementById('radio_time2');
                        if (radio) (radio as any).click();
                    }
                });
                await new Promise(r => setTimeout(r, 1500));

                // Step 3: 달력 열기 (날짜 입력창 클릭)
                await frame.evaluate(() => {
                    const dateInput = document.querySelector('input[class*="input_date"]') ||
                        document.querySelector('.input_date');
                    if (dateInput) (dateInput as any).click();
                });
                await new Promise(r => setTimeout(r, 1500));

                // Step 4: 날짜 선택
                await frame.evaluate((day: number) => {
                    const dayButtons = Array.from(document.querySelectorAll('.ui-state-default'));
                    const targetBtn = dayButtons.find(btn => btn.textContent?.trim() === String(day));
                    if (targetBtn) {
                        (targetBtn as any).click();
                    }
                }, targetDay);
                await new Promise(r => setTimeout(r, 1000));

                // Step 5: 시간(시) 선택
                await frame.evaluate((hour: string) => {
                    const hourSelect = document.querySelector('select.hour_option__J_heO') ||
                        document.querySelector('select[title="예약 발행 시간 선택"]');
                    if (hourSelect) {
                        (hourSelect as any).value = hour;
                        hourSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, targetHour);
                await new Promise(r => setTimeout(r, 500));

                // Step 6: 분 선택
                await frame.evaluate((minute: string) => {
                    const minuteSelect = document.querySelector('select.minute_option__Vb3xB') ||
                        document.querySelector('select[title="예약 발행 분 선택"]');
                    if (minuteSelect) {
                        (minuteSelect as any).value = minute;
                        minuteSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, targetMinute);
                await new Promise(r => setTimeout(r, 500));

                // Step 7: 최종 발행 완료
                this.addLog("예약 설정 완료, 최종 발행 클릭...");
                await frame.evaluate(() => {
                    const confirmBtn = document.querySelector('button[class*="confirm_btn"]') ||
                        document.querySelector('.confirm_btn');
                    if (confirmBtn) (confirmBtn as any).click();
                });
                await new Promise(r => setTimeout(r, 3000));
                this.addLog(`예약 발행 성공: ${targetDay}일 ${targetHour}시 ${targetMinute}분`, "success");

                return null;
            } catch (e: any) {
                this.addLog(`예약 발행 중 오류: ${e.message}`, "error");
                throw e;
            }
        }
        return null;
    }
}
