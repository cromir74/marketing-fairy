"use client";

import { useState } from "react";
import Image from "next/image";

export default function NaverLoginProxy() {
    const [id, setId] = useState("");
    const [pw, setPw] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/naver/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, pw })
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                // 부모 창에 메시지 전송
                if (window.opener) {
                    window.opener.postMessage({ type: "NAVER_LOGIN_SUCCESS" }, "*");
                }
                // 잠시 후 닫기
                setTimeout(() => window.close(), 1500);
            } else {
                setError(data.error || "로그인 연동에 실패했습니다.");
            }
        } catch (err) {
            setError("서버와 통신 중 문제가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="text-center p-8 bg-green-50 rounded-2xl">
                    <div className="text-green-600 text-5xl mb-4">✔️</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">연동 성공!</h2>
                    <p className="text-gray-600">네이버 블로그 연동이 완료되었습니다.<br />이 창은 곧 닫힙니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-[#03C75A] p-6 text-center">
                    <h1 className="text-white text-2xl font-bold">NAVER</h1>
                    <p className="text-white/80 mt-1">블로그 무인 포스팅 연동</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">네이버 아이디</label>
                            <input
                                type="text"
                                className="w-full border-gray-300 rounded-lg p-3 border focus:ring-[#03C75A] focus:border-[#03C75A] outline-none"
                                placeholder="아이디"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                            <input
                                type="password"
                                className="w-full border-gray-300 rounded-lg p-3 border focus:ring-[#03C75A] focus:border-[#03C75A] outline-none"
                                placeholder="비밀번호"
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                required
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full bg-[#03C75A] text-white p-3.5 rounded-lg font-bold text-lg 
                                    ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#03b351] active:bg-[#029a45]'} 
                                    transition-all`}
                            >
                                {loading ? "연동 중..." : "연동하기"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-xs text-gray-500">
                        * 마케팅 요정은 안전한 포스팅을 위해<br />최초 1회 로그인 시점에만 쿠키를 안전하게 수집/암호화하며,<br />비밀번호는 절대 저장하지 않습니다.
                    </div>
                </div>
            </div>
        </div>
    );
}
