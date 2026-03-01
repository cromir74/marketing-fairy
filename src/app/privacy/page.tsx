import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
                    <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 mb-8 tracking-tight">개인정보처리방침</h1>
                    <p className="text-gray-500 mb-8 font-medium">시행일: 2026년 2월 28일</p>

                    <div className="prose prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600">
                        <p>
                            그로스온(이하 '회사'라 합니다)은 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
                        </p>

                        <h2>제1조 (개인정보의 처리 목적)</h2>
                        <p>
                            회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li><strong>회원 가입 및 관리</strong><br />회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 등을 목적으로 개인정보를 처리합니다.</li>
                            <li><strong>재화 또는 서비스 제공</strong><br />서비스 제공, 요금결제·정산, 소셜 미디어(인스타그램, 스레드 등) 계정 연동 및 콘텐츠 발행을 목적으로 개인정보를 처리합니다.</li>
                            <li><strong>고충처리</strong><br />민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보 등을 목적으로 개인정보를 처리합니다.</li>
                        </ol>

                        <h2>제2조 (처리하는 개인정보의 항목)</h2>
                        <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>필수항목: 이메일 주소, 비밀번호, 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보, 결제 기록</li>
                            <li>선택항목: 연동된 소셜 미디어 계정 정보(접근 토큰, 프로필 정보 등), 사업장 정보(주소, 상호명 등)</li>
                        </ul>

                        <h2>제3조 (개인정보의 처리 및 보유 기간)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</li>
                            <li>각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
                                <ul className="list-disc pl-5 mt-2">
                                    <li>회원 가입 및 관리: 회원 탈퇴 시까지</li>
                                    <li>재화 또는 서비스 제공: 재화·서비스 공급완료 및 요금결제·정산 완료 시까지</li>
                                    <li>단, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지 보유합니다.
                                        <ul className="list-disc pl-5 mt-1">
                                            <li>관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지</li>
                                            <li>서비스 이용에 따른 채권·채무관계 잔존 시에는 해당 채권·채무관계 정산 시까지</li>
                                        </ul>
                                    </li>
                                </ul>
                            </li>
                        </ol>

                        <h2>제4조 (개인정보의 파기절차 및 파기방법)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</li>
                            <li>정보주체로부터 동의받은 개인정보 보유기간이 경과하거나 처리목적이 달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나 보관장소를 달리하여 보존합니다.</li>
                            <li>파기절차: 회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
                            <li>파기방법: 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 파기하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.</li>
                        </ol>

                        <h2>제5조 (정보주체와 법정대리인의 권리·의무 및 그 행사방법에 관한 사항)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>정보주체는 회사에 대해 언제든지 등록되어 있는 자신의 개인정보 열람, 정정, 삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다.</li>
                            <li>제1항에 따른 권리 행사는 회사에 대해 서면, 전화, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</li>
                            <li>개인정보의 정정 및 삭제 요구는 다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 그 삭제를 요구할 수 없습니다.</li>
                        </ol>

                        <h2>제6조 (개인정보의 안전성 확보조치에 관한 사항)</h2>
                        <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                            <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                            <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                        </ul>

                        <h2>제7조 (개인정보 보호책임자에 관한 사항)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                                <ul className="list-none pl-5 mt-2">
                                    <li>▶ 개인정보 보호책임자</li>
                                    <li>성명: 박계홍</li>
                                    <li>직책: 대표</li>
                                    <li>연락처: goodcn@naver.com</li>
                                </ul>
                            </li>
                            <li>정보주체께서는 회사의 서비스(또는 사업)을 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.</li>
                        </ol>

                        <div className="mt-16 pt-8 border-t border-gray-100">
                            <p className="font-bold text-gray-900 mb-2">시행일자</p>
                            <p>이 개인정보처리방침은 2026년 2월 28일부터 적용됩니다.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
