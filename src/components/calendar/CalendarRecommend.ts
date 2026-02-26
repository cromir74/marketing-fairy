import { HOLIDAYS, SEASON_TOPICS, getSeason, getMonthPhase } from "@/lib/calendar-events";

export interface Recommendation {
    type: 'holiday' | 'season' | 'weekday';
    icon: string;
    color: string;
    topic: string;
}

export function getSmartRecommendation(day: number, month: number, year: number, category: string): Recommendation {
    const date = new Date(year, month, day);
    const weekday = date.getDay();
    const dateKey = `${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    // 1. 공휴일 체크
    if (HOLIDAYS[dateKey]) {
        const holidayName = HOLIDAYS[dateKey];
        let topic = `${holidayName} 특별 이벤트/인사`;

        if (holidayName === '발렌타인데이') {
            topic = category === 'cafe' ? "발렌타인 커플 세트 메뉴 소개" : "발렌타인 디너 코스 예약 안내";
        } else if (holidayName === '어버이날') {
            topic = category === 'restaurant' ? "어버이날 가족 식사 예약 받아요" : "어버이날 감사 이벤트";
        } else if (holidayName === '크리스마스') {
            topic = category === 'cafe' ? "크리스마스 한정 메뉴 & 분위기" : "크리스마스 특별 코스";
        }

        return { type: 'holiday', icon: '🎉', color: 'red', topic };
    }

    // 2. 시즌 추천
    const season = getSeason(month);
    const phase = getMonthPhase(day);
    const catKey = (category === 'cafe' || category === 'restaurant') ? category : 'other';
    const topics = SEASON_TOPICS[catKey][season];

    if (topics && topics.length > 0) {
        let topicIndex = 0;
        if (phase === '중') topicIndex = 1;
        if (phase === '말') topicIndex = 2;

        return {
            type: 'season',
            icon: '📅',
            color: 'orange',
            topic: topics[topicIndex] || topics[0]
        };
    }

    // 3. 요일별 기본 추천
    const weekdayTopics: Record<number, string> = {
        1: "한 주의 시작! 이번 주 추천 메뉴/서비스",
        2: "우리 매장의 숨은 인기 메뉴 소개",
        3: "주중 힐링 타임 - 매장 분위기 소개",
        4: "이번 주말 예고 / 예약 안내",
        5: "불금 특별 이벤트 / 주말 영업 안내",
        6: "주말 방문 손님 감사 / 현장 분위기",
        0: "편안한 일요일 - 다음 주 예고"
    };

    return {
        type: 'weekday',
        icon: '💡',
        color: 'purple',
        topic: weekdayTopics[weekday] || "우리 매장만의 특별함 원포인트"
    };
}

export function getStatusStyle(status: string) {
    switch (status) {
        case 'published':
            return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '✅', label: '발행완료' };
        case 'scheduled':
            return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '⏰', label: '예약됨' };
        case 'draft':
            return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', icon: '✏️', label: '임시저장' };
        case 'failed':
            return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '⚠️', label: '실패' };
        default:
            return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', icon: '📝', label: '기타' };
    }
}
