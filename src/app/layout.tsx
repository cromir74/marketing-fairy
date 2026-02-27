import type { Metadata } from "next";
import "./globals.css";

import KakaoChatButton from "@/components/KakaoChatButton";

export const metadata: Metadata = {
    title: "마케팅요정 - AI 소상공인 마케팅 자동화",
    description: "AI가 인스타그램, 스레드, 블로그 마케팅 글을 자동으로 만들어줍니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body className="antialiased">
                {children}
                <KakaoChatButton />
            </body>
        </html>
    );
}
