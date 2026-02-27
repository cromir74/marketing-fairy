import axios from 'axios';
import fs from 'fs-extra';

export interface NaverPublishOptions {
    title: string;
    content: string;
    blogId: string;
    images?: { path: string; mimeType: string }[];
    mode: 'immediate' | 'draft' | 'scheduled';
    scheduledTime?: string;
    onLog?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export class NaverAutomation {
    private onLogCallback?: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    private cookieStr: string = '';
    private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    private addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        console.log(`[NaverAuto][${type}] ${message}`);
        if (this.onLogCallback) this.onLogCallback(message, type);
    }

    async initialize(headless: boolean = true) {
        this.addLog("axios 기반 네이버 포스팅 초기화 성공.");
    }

    async close() {
        // HTTP 통신이므로 리소스 해제 불필요
    }

    async hasSavedCookies(): Promise<boolean> {
        return !!this.cookieStr;
    }

    async setCookies(nidAut: string, nidSes: string): Promise<boolean> {
        if (!nidAut || !nidSes) {
            this.addLog("유효하지 않은 쿠키 값이 전달되었습니다.", "error");
            return false;
        }

        this.cookieStr = `NID_AUT=${nidAut}; NID_SES=${nidSes}`;
        return true;
    }

    async enterEditor() {
        this.addLog("에디터 진입 확인(HTTP 방식이므로 생략)");
        // HTTP 방식에서는 별도의 화면 진입이 없음. 여기서 토큰을 테스트로 받아볼 수도 있음
    }

    private getHeaders(extraHeaders: any = {}) {
        return {
            'User-Agent': this.userAgent,
            'Cookie': this.cookieStr,
            'Referer': 'https://blog.naver.com/GoBlogWrite.naver',
            ...extraHeaders
        };
    }

    async publish(options: NaverPublishOptions): Promise<string> {
        this.onLogCallback = options.onLog;
        const blogId = options.blogId || process.env.NAVER_BLOG_ID;

        if (!blogId) {
            throw new Error("블로그 ID가 입력되지 않았습니다.");
        }

        this.addLog("네이버 토큰(SeOptions) 요청 중...");
        let token = '';
        try {
            const tokenResp = await axios.get(`https://blog.naver.com/PostWriteFormSeOptions.naver?blogId=${blogId}&categoryNo=1`, {
                headers: this.getHeaders()
            });
            token = tokenResp.data?.result?.token;
            if (!token) {
                console.error("[Naver API] Token Error Response:", tokenResp.status, tokenResp.data);
                if (typeof tokenResp.data === 'string' && tokenResp.data.includes('login')) {
                    throw new Error("세션이 만료되었거나 올바르지 않은 쿠키 계정입니다 (NID_AUT, NID_SES 확인 필요). 본인 네이버 계정의 쿠키를 다시 추출해 서버 .env에 갱신해주세요.");
                } else if (typeof tokenResp.data === 'string' && tokenResp.data.includes('Not Found')) {
                    throw new Error("블로그 ID가 잘못되었습니다. 네이버 아이디를 다시 확인해주세요.");
                }
                throw new Error("네이버 에디터 토큰(token)을 발급받지 못했습니다. 터미널 에러 로그를 참조하세요.");
            }
        } catch (e: any) {
            console.error("[Naver API] Token fetching failed:", e.response?.status, e.response?.data || e.message);
            if (e.response && typeof e.response.data === 'string' && e.response.data.includes('login')) {
                throw new Error("세션이 만료되었거나 올바르지 않은 네이버 계정(쿠키)입니다. 다시 쿠키를 추출해 등록해주세요.");
            } else if (e.response?.status === 404 || (typeof e.response?.data === 'string' && e.response?.data.includes('Not Found'))) {
                throw new Error(`블로그 ID(${blogId})가 존재하지 않거나 잘못되었습니다.`);
            } else {
                throw new Error(`네이버 에디터 토큰(token)을 발급받지 못했습니다. 로그를 확인해주세요.`);
            }
        }

        // 3단계: document ID 확인
        this.addLog("editorInfo.id (document ID) 요청 중...");
        const docIdResp = await axios.get(`https://platform.editor.naver.com/api/blogpc001/v1/service_config`, {
            headers: this.getHeaders({
                'Se-Authorization': token,
            })
        });
        const documentId = docIdResp.data?.editorInfo?.id;
        if (!documentId) {
            console.error("[Naver API] Document ID Error Response:", docIdResp.data);
            throw new Error("document ID를 가져오지 못했습니다.");
        }

        this.addLog("editorSource 요청 중...");
        // 4단계: editorSource 확인
        const srcResp = await axios.get(`https://blog.naver.com/PostWriteFormManagerOptions.naver?blogId=${blogId}&categoryNo=1`, {
            headers: this.getHeaders()
        });
        const editorSource = srcResp.data?.result?.formView?.editorSource || "blogpc";

        // 5단계: 이미지 업로드 처리
        const uploadedImages: string[] = [];
        if (options.images && options.images.length > 0) {
            this.addLog(`${options.images.length}개의 이미지 업로드 중...`);
            for (const img of options.images) {
                try {
                    const formData = new FormData();
                    const fileData = await fs.readFile(img.path);
                    const blob = new Blob([fileData], { type: img.mimeType });

                    const fileName = img.path.split(/[\/\\]/).pop() || 'image.jpg';
                    formData.append('image', blob, fileName);

                    const uploadHeaders = {
                        ...this.getHeaders(),
                        // axios will automatically handle Content-Type with boundary for FormData
                    };

                    const uploadResp = await axios.post('https://blog.naver.com/UploadImage.naver?exn=jpg', formData, {
                        headers: uploadHeaders
                    });

                    // _upload_result_ 요소를 파싱해야 할 수도 있지만, 최신 네이버 스펙에선 json을 줄 수도 있음.
                    // 통상적으로 네이버는 XML/HTML 형태를 줄 수 있으므로 확인이 필요
                    const uploadStr = uploadResp.data;
                    const urlMatch = uploadStr.match(/<url>(.*?)<\/url>/) || uploadStr.match(/"url"\s*:\s*"(.*?)"/);
                    let uploadedUrl = '';
                    if (urlMatch && urlMatch[1]) {
                        uploadedUrl = decodeURIComponent(urlMatch[1]);
                        uploadedImages.push(uploadedUrl);
                        this.addLog(`이미지 업로드 완료: ${uploadedUrl}`);
                    } else if (typeof uploadStr === 'object' && uploadStr.url) {
                        uploadedImages.push(uploadStr.url);
                        this.addLog(`이미지 업로드 완료: ${uploadStr.url}`);
                    } else {
                        throw new Error("이미지 URL을 응답에서 찾을 수 없습니다.");
                    }
                } catch (e: any) {
                    this.addLog(`이미지 업로드 실패: ${e.message}`, "error");
                    throw new Error(`이미지 업로드 중 오류: ${e.message}`);
                }
            }
        }

        // 6단계: 글 작성 데이터 구성
        const components: any[] = [];

        // 1) 제목
        components.push({
            id: 'SE-1',
            layout: 'basic',
            value: [
                {
                    "@ctype": "text",
                    nodes: [
                        {
                            "@ctype": "textUnit",
                            value: options.title || "제목 없는 글"
                        }
                    ],
                    style: {}
                }
            ],
            "@ctype": "documentTitle"
        });

        let idCounter = 2;

        // 2) 이미지 삽입
        for (const imgUrl of uploadedImages) {
            components.push({
                id: `SE-${idCounter++}`,
                layout: 'basic',
                value: {
                    "@ctype": "image",
                    src: imgUrl,
                    caption: ""
                },
                "@ctype": "image"
            });
        }

        // 3) 본문 분리 및 구성 (마크다운 파싱 일부 처리)
        const paragraphs = options.content.split('\n');
        for (const p of paragraphs) {
            const trimmed = p.trim();
            if (!trimmed) {
                components.push({
                    id: `SE-${idCounter++}`,
                    layout: 'basic',
                    value: [
                        {
                            "@ctype": "text",
                            nodes: [{ "@ctype": "textUnit", value: " " }],
                            style: { fontSizeCode: "fs19" }
                        }
                    ],
                    "@ctype": "text"
                });
                continue;
            }

            if (trimmed.startsWith('>')) {
                const quoteText = trimmed.substring(1).trim();
                components.push({
                    id: `SE-${idCounter++}`,
                    layout: 'basic',
                    value: [
                        {
                            "@ctype": "text",
                            nodes: [{ "@ctype": "textUnit", value: quoteText }],
                            style: { fontSizeCode: "fs19" }
                        }
                    ],
                    quotationType: "type2",
                    "@ctype": "quotation"
                });
                continue;
            }

            // 간단한 볼드 처리 (Markdown **)
            const isBold = trimmed.startsWith('**') && trimmed.endsWith('**');
            const actualText = isBold ? trimmed.substring(2, trimmed.length - 2) : trimmed;

            components.push({
                id: `SE-${idCounter++}`,
                layout: 'basic',
                value: [
                    {
                        "@ctype": "text",
                        nodes: [
                            {
                                "@ctype": "textUnit",
                                value: actualText
                            }
                        ],
                        style: {
                            fontSizeCode: "fs19",
                            ...(isBold ? { bold: true } : {})
                        }
                    }
                ],
                "@ctype": "text"
            });
        }

        const documentModel = {
            document: {
                version: "2.8.0",
                theme: "default",
                language: "ko",
                id: documentId,
                components: components
            }
        };

        const postData: any = {
            blogId: blogId,
            documentModel: JSON.stringify(documentModel),
            populationParams: JSON.stringify({
                categoryNo: "1",
                secret: false, // 비공개여부 설정 가능
                searchOpen: true,
                replyOpen: true,
                sympathyOpen: true,
                autoSpaceOpen: true
            }),
            productApiVersion: editorSource
        };

        if (options.mode === 'scheduled' && options.scheduledTime) {
            postData.postWriteTimeType = 'reserve';
            // 예: "2026-03-01 15:00:00" 형식 등을 사용할 듯 하나, 네이버 스펙에 맞춰 prePostDate 입력
            const dateObj = new Date(options.scheduledTime);
            postData.prePostDate = dateObj.toISOString(); // 또는 커스텀 형식 (YYYY-MM-DD HH:mm:ss 등 검증 필요)
        }

        this.addLog("글 발행 요청 중...");

        // POST 데이터 구성 (urlencoded 형식인 경우가 많음)
        const params = new URLSearchParams();
        for (const key of Object.keys(postData)) {
            params.append(key, postData[key]);
        }

        const publishResp = await axios.post(`https://blog.naver.com/RabbitWrite.naver`, params.toString(), {
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            }
        });

        if (publishResp.data && publishResp.data.isSuccess) {
            const resultUrl = `https://blog.naver.com/${blogId}/${publishResp.data.logNo}`;
            this.addLog(`발행 완료! URL: ${resultUrl}`, "success");
            return resultUrl;
        } else {
            console.error("Publish Response:", publishResp.data);
            throw new Error(publishResp.data?.message || "RabbitWrite 응답 에러 (성공하지 못함)");
        }
    }
}
