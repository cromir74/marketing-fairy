"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    Legend
} from 'recharts';
import { Card } from "@/components/ui/card";

export function StatsCharts({ data: rawData, barData: rawBarData }: { data?: any[], barData?: any[] }) {
    const data = rawData && rawData.length > 0 ? rawData : [
        { name: '월', views: 0 },
        { name: '화', views: 0 },
        { name: '수', views: 0 },
        { name: '목', views: 0 },
        { name: '금', views: 0 },
        { name: '토', views: 0 },
        { name: '일', views: 0 },
    ];

    const barData = rawBarData && rawBarData.length > 0 ? rawBarData : [
        { name: '블로그', count: 0, color: '#10b981' },
        { name: '인스타', count: 0, color: '#ec4899' },
        { name: '스레드', count: 0, color: '#000000' }
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
                <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">주간 콘텐츠 조회수 추이</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                            <Line
                                name="블로그"
                                type="monotone"
                                dataKey="blog"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#10b981' }}
                            />
                            <Line
                                name="인스타"
                                type="monotone"
                                dataKey="instagram"
                                stroke="#ec4899"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#ec4899' }}
                            />
                            <Line
                                name="스레드"
                                type="monotone"
                                dataKey="threads"
                                stroke="#000000"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#000000' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">플랫폼별 발행 비중</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {[0, 1, 2].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#ec4899' : '#000000'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
