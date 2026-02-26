import React from "react";

interface UsageProgressBarProps {
    label: string;
    current: number;
    limit: number;
    unit?: string;
}

export function UsageProgressBar({ label, current, limit, unit = "건" }: UsageProgressBarProps) {
    const percentage = Math.min(Math.round((current / limit) * 100), 100);

    // 상태에 따른 색상 결정
    let barColor = "bg-blue-500";
    if (percentage >= 100) barColor = "bg-red-500";
    else if (percentage >= 80) barColor = "bg-yellow-500";

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-700">{label}</span>
                <span className="font-medium text-gray-500">
                    {current} / {limit}{unit} ({percentage}%)
                </span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ease-out ${barColor}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
