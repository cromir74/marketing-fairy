/**
 * 실시간 날씨 정보를 가져오는 유틸리티
 * wttr.in 서비스를 사용하여 지역명 기반으로 날씨 데이터를 가져옵니다.
 */

export interface WeatherInfo {
    temp: string;
    condition: string;
    description: string;
    icon: string;
}

const WMO_MAPPING: Record<number, { desc: string, emoji: string }> = {
    0: { desc: "맑음", emoji: "☀️" },
    1: { desc: "대체로 맑음", emoji: "🌤️" },
    2: { desc: "구름 조금", emoji: "⛅" },
    3: { desc: "흐림", emoji: "☁️" },
    45: { desc: "안개", emoji: "🌫️" },
    48: { desc: "짙은 안개", emoji: "🌫️" },
    51: { desc: "약한 이슬비", emoji: "🌦️" },
    53: { desc: "이슬비", emoji: "🌦️" },
    55: { desc: "강한 이슬비", emoji: "🌧️" },
    56: { desc: "어는 이슬비", emoji: "🌧️" },
    57: { desc: "강하게 어는 이슬비", emoji: "🌧️" },
    61: { desc: "약한 비", emoji: "🌦️" },
    63: { desc: "비", emoji: "🌧️" },
    65: { desc: "강한 비", emoji: "🌧️" },
    66: { desc: "어는 비", emoji: "🌧️" },
    67: { desc: "강하게 어는 비", emoji: "🌧️" },
    71: { desc: "약한 눈", emoji: "🌨️" },
    73: { desc: "눈", emoji: "❄️" },
    75: { desc: "강한 눈", emoji: "❄️" },
    77: { desc: "싸락눈", emoji: "❄️" },
    80: { desc: "약한 소나기", emoji: "☔" },
    81: { desc: "소나기", emoji: "☔" },
    82: { desc: "강한 소나기", emoji: "☔" },
    85: { desc: "약한 눈보라", emoji: "🌨️" },
    86: { desc: "강한 눈보라", emoji: "🌨️" },
    95: { desc: "뇌우", emoji: "⚡" },
    96: { desc: "천둥번개를 동반한 우박", emoji: "⛈️" },
    99: { desc: "강한 천둥번개를 동반한 우박", emoji: "⛈️" },
};

export async function getCurrentWeather(location: string): Promise<WeatherInfo> {
    try {
        const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
        if (!response.ok) throw new Error("Weather API failed");

        const data = await response.json();

        const temp = data.temp_C;
        const code = data.weatherCode;
        const locName = data.detectedLocation;

        const matched = WMO_MAPPING[code] || { desc: "알 수 없음", emoji: "🌡️" };

        return {
            temp: temp,
            condition: matched.desc,
            description: `${matched.desc} (${temp}°C, ${locName})`, // Added location to description so user can see it works
            icon: matched.emoji
        };
    } catch (error) {
        console.error("Weather fetch error:", error);
        return {
            temp: "20",
            condition: "맑음",
            description: "맑음 (기온 정보 없음)",
            icon: "☀️"
        };
    }
}

/**
 * 현재 요일과 시간대를 기반으로 한 상황 텍스트 변환
 */
export function getDayContext() {
    const now = new Date();
    const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const dayName = days[now.getDay()];
    const hour = now.getHours();

    let timeContext = "";
    if (hour >= 6 && hour < 11) timeContext = "상쾌한 아침";
    else if (hour >= 11 && hour < 14) timeContext = "활기찬 점심시간";
    else if (hour >= 14 && hour < 17) timeContext = "나른한 오후";
    else if (hour >= 17 && hour < 21) timeContext = "퇴근길 저녁";
    else timeContext = "감성 돋는 밤";

    return {
        dayName,
        timeContext,
        isWeekend: now.getDay() === 0 || now.getDay() === 6
    };
}
