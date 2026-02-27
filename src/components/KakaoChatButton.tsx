"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default function KakaoChatButton() {
    return (
        <a
            href="http://pf.kakao.com/_pujqX/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-[100px] md:bottom-6 right-4 md:right-6 z-[100] w-14 h-14 bg-[#FEE500] hover:bg-[#F4DC00] text-[#391B1B] rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 group"
            aria-label="카카오톡 채팅 상담"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-7 h-7"
            >
                <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.53 1.49 4.78 3.75 6.1l-1.05 3.86c-.05.21.16.39.34.26l4.47-2.92c.8.14 1.63.2 2.49.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
            </svg>
            <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                카카오톡 문의하기
            </span>
        </a>
    );
}
