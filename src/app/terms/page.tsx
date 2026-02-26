import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] text-gray-900 font-sans">
            <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-6 z-50">
                <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-semibold">홈으로 돌아가기</span>
                </Link>
            </header>

            <main className="pt-32 pb-24 px-6 max-w-3xl mx-auto">
                <div className="bg-white rounded-[2rem] p-10 md:p-14 border border-gray-200 shadow-sm">
                    <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 mb-8 tracking-tight">이용약관</h1>
                    <p className="text-gray-500 mb-8 font-medium">시행일: 2026년 2월 28일</p>

                    <div className="prose prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600">
                        <h2>제1조 (목적)</h2>
                        <p>
                            본 약관은 그로스온(이하 "회사")이 제공하는 마케팅요정 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 서비스 이용조건 및 절차 등 기본적인 사항을 규정함을 목적으로 합니다.
                        </p>

                        <h2>제2조 (용어의 정의)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>"서비스"란 회사가 제공하는 AI 기반 소상공인 마케팅 콘텐츠 자동 생성 및 자동 발행, 관리 기능을 포함한 제반 서비스를 의미합니다.</li>
                            <li>"회원"이란 본 약관에 동의하고 회사와 서비스 이용계약을 체결하여 회사가 제공하는 서비스를 이용하는 자를 의미합니다.</li>
                            <li>"계정(ID)"이란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는 이메일 주소 등을 의미합니다.</li>
                            <li>"비밀번호"란 회원이 부여받은 계정과 일치되는 회원임을 확인하고 비밀보호를 위해 회원 자신이 정한 문자 또는 숫자의 조합을 의미합니다.</li>
                            <li>"콘텐츠"란 회사가 서비스 이용을 위해 회원에게 제공하는 정보, 텍스트, 이미지, 결과물 등을 의미합니다.</li>
                        </ol>

                        <h2>제3조 (약관의 명시와 개정)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면 또는 연결된 화면을 통하여 게시합니다.</li>
                            <li>회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
                            <li>회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행 약관과 함께 서비스 내에 적용일자 7일 전부터 공지합니다. 단, 회원에게 불리하게 약관내용을 변경하는 경우에는 최소한 30일 이상의 사전 유예기간을 두고 공지합니다.</li>
                            <li>회원이 개정되는 약관에 동의하지 않을 권리가 있으며, 개정 약관의 적용일 이후에도 서비스를 계속 이용하는 경우에는 약관의 변경에 동의한 것으로 간주합니다.</li>
                        </ol>

                        <h2>제4조 (서비스의 제공 및 변경)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 회원에게 다음과 같은 서비스를 제공합니다.
                                <ul className="list-disc pl-5 mt-2">
                                    <li>AI 마케팅 콘텐츠 생성 서비스</li>
                                    <li>소셜 미디어(인스타그램, 스레드, 네이버 블로그 등) 자동 발행 연동 서비스</li>
                                    <li>기타 회사가 추가 개발하거나 다른 회사와의 제휴계약 등을 통해 회원에게 제공하는 일체의 서비스</li>
                                </ul>
                            </li>
                            <li>회사는 서비스의 운영상, 기술상의 필요에 따라 제공하고 있는 서비스의 전부 또는 일부를 변경할 수 있습니다. 서비스의 내용, 이용방법, 이용시간에 대하여 변경이 있는 경우에는 변경사유, 변경될 서비스의 내용 및 제공일자 등을 서비스 내에 사전에 공지합니다.</li>
                        </ol>

                        <h2>제5조 (이용요금 및 결제)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사가 제공하는 서비스는 유료 또는 무료로 구분되며, 구체적인 요금 정책은 서비스 홈페이지에 별도로 게시합니다.</li>
                            <li>유료 서비스의 이용요금 납부는 원칙적으로 신용카드 결제 등을 통해 선불로 이루어집니다.</li>
                            <li>회사는 결제와 관련하여 회원이 입력한 정보가 정확하지 않거나, 결제 수단의 한도 초과 등으로 결제가 이루어지지 않은 경우 서비스 제공을 중단할 수 있습니다.</li>
                        </ol>

                        <h2>제6조 (계약해지 및 환불)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회원은 언제든지 서비스 내 설정 화면을 통하여 이용계약 해지(구독 취소)를 신청할 수 있으며, 회사는 관련 법령이 정하는 바에 따라 이를 즉시 처리하여야 합니다.</li>
                            <li>구독을 취소하더라도 이미 결제된 해당 월의 서비스 기간 동안은 계속 서비스를 이용할 수 있으며, 다음 결제일에 자동 결제가 갱신되지 않습니다.</li>
                            <li>결제 후 서비스를 단 한 번도 이용하지 않은 상태에서 7일 이내에 환불을 요청하는 경우, 전액 환불이 가능합니다. 단, 콘텐츠 생성, 발행 이력 등 서비스 이용 내역이 발생한 경우에는 원칙적으로 해당 월의 요금은 환불되지 않습니다.</li>
                        </ol>

                        <h2>제7조 (회원의 의무)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회원은 관련 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항 등을 준수하여야 하며, 기타 회사의 업무에 방해되는 행위를 하여서는 안 됩니다.</li>
                            <li>회원은 다음 각 호의 행위를 하여서는 안 됩니다.
                                <ul className="list-disc pl-5 mt-2">
                                    <li>가입신청 또는 정보 변경 시 허위내용 등록</li>
                                    <li>타인의 정보 도용</li>
                                    <li>회사가 게시한 정보의 변경</li>
                                    <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등)의 송신 또는 게시</li>
                                    <li>회사 및 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                                    <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                                    <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                                </ul>
                            </li>
                        </ol>

                        <h2>제8조 (저작권의 귀속 및 이용제한)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사가 작성한 저작물에 대한 저작권 및 기타 지적재산권은 회사에 귀속됩니다.</li>
                            <li>회원은 서비스를 이용함으로써 얻은 정보 중 회사에게 지적재산권이 귀속된 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</li>
                            <li>회원이 서비스를 이용하여 생성한 콘텐츠(마케팅 글 등)의 저작권은 회원에게 귀속됩니다. 단, 회사는 서비스 운영 및 홍보를 위하여 해당 콘텐츠를 활용할 수 있습니다.</li>
                        </ol>

                        <h2>제9조 (책임제한)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                            <li>회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
                            <li>회사는 회원이 서비스와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</li>
                            <li>연동된 외부 소셜 미디어 플랫폼(인스타그램, 메타, 네이버 등)의 정책 변경, API 장애, 계정 정지 등으로 인해 발생하는 서비스 이용 제한이나 불이익에 대하여 회사는 책임을 지지 않습니다.</li>
                        </ol>

                        <h2>제10조 (준거법 및 재판관할)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사와 회원 간에 제기된 소송은 대한민국법을 준거법으로 합니다.</li>
                            <li>회사와 회원 간 발생한 분쟁에 관한 소송의 관할법원은 민사소송법에 따라 정합니다.</li>
                        </ol>

                        <div className="mt-16 pt-8 border-t border-gray-100">
                            <p className="font-bold text-gray-900 mb-2">부칙</p>
                            <p>이 약관은 2026년 2월 28일부터 적용됩니다.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
