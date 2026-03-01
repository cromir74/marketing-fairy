export const PRO_ONLY_FEATURES = [
    'marketing_calendar',     // 마케팅 캘린더
    'persona_select',         // 페르소나 선택 (모두 제외 전체)
    'place_deep_analysis',    // 플레이스 심화 분석 (리뷰키워드, 경쟁비교, 주간전략)
    'custom_persona',         // 커스텀 페르소나 생성
];

export type FeatureKey = typeof PRO_ONLY_FEATURES[number];

export function isProFeature(feature: string): boolean {
    return PRO_ONLY_FEATURES.includes(feature);
}
