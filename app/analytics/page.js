"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { T } from "@/components/dashboard/constants";
import { getCurrentUserId } from "@/lib/auth";

const RANGES = [
    { label: "Today", days: 1 },
    { label: "7 Days", days: 7 },
    { label: "30 Days", days: 30 },
];

function getDates(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push(d.toISOString().split("T")[0]);
    }
    return out;
}

function shortDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

function pkr(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: T.bgElev, border: `1px solid ${T.borderMid}`,
            borderRadius: 8, padding: "10px 14px", fontSize: 12,
        }}>
            <div style={{ color: T.textMuted, marginBottom: 6, fontWeight: 700 }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
                    {p.name}: <span style={{ fontWeight: 700 }}>{p.name.includes("Revenue") || p.name.includes("Collected") ? `PKR ${Number(p.value).toLocaleString()}` : p.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function AnalyticsPage() {
    const [range, setRange] = useState(7);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRange = useCallback(async (days) => {
        setLoading(true);
        const userId = getCurrentUserId();
        if (!userId) { setLoading(false); return; }

        const dates = getDates(days);
        const results = await Promise.all(
            dates.map(date =>
                fetch(`/api/analytics/daily-pnl?userId=${userId}&date=${date}`)
                    .then(r => r.json())
                    .catch(() => null)
            )
        );

        const parsed = results.filter(Boolean).map(r => ({
            label: shortDate(r.date),
            "Total Orders": r.totalOrders || 0,
            "Completed": r.completedOrders || 0,
            "Cancelled": r.cancelledOrders || 0,
            "Gross Revenue": r.grossRevenue || 0,
            "Collected": r.collectedRevenue || 0,
        }));

        setChartData(parsed);
        setLoading(false);
    }, []);

    useEffect(() => { fetchRange(range); }, [range, fetchRange]);

    const totals = chartData.reduce((acc, d) => ({
        orders: acc.orders + d["Total Orders"],
        completed: acc.completed + d["Completed"],
        cancelled: acc.cancelled + d["Cancelled"],
        revenue: acc.revenue + d["Gross Revenue"],
        collected: acc.collected + d["Collected"],
    }), { orders: 0, completed: 0, cancelled: 0, revenue: 0, collected: 0 });

    const completionRate = totals.orders > 0
        ? Math.round((totals.completed / totals.orders) * 100)
        : 0;
    const cancelRate = totals.orders > 0
        ? Math.round((totals.cancelled / totals.orders) * 100)
        : 0;

    const kpis = [
        { label: "Total Orders", value: loading ? "—" : totals.orders, color: T.textSub },
        { label: "Completed", value: loading ? "—" : totals.completed, color: T.green, sub: `${completionRate}% rate` },
        { label: "Cancelled", value: loading ? "—" : totals.cancelled, color: T.red, sub: `${cancelRate}% rate` },
        { label: "Gross Revenue", value: loading ? "—" : `PKR ${totals.revenue.toLocaleString()}`, color: T.j300 },
        { label: "Collected", value: loading ? "—" : `PKR ${totals.collected.toLocaleString()}`, color: T.green },
    ];

    return (
        <div style={{ padding: "32px 24px", maxWidth: 1000, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: 0 }}>Analytics</h1>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4, margin: "4px 0 0" }}>Revenue and order performance</p>
                </div>
                <div style={{
                    display: "flex", gap: 4, background: T.bgCard,
                    border: `1px solid ${T.border}`, borderRadius: T.r8, padding: 4,
                }}>
                    {RANGES.map(r => (
                        <button key={r.days} onClick={() => setRange(r.days)} style={{
                            padding: "6px 14px", borderRadius: T.r6, fontSize: 12, fontWeight: 700,
                            border: "none", cursor: "pointer", transition: "all 0.15s",
                            background: range === r.days ? T.gradBtn : "transparent",
                            color: range === r.days ? "#fff" : T.textMuted,
                            boxShadow: range === r.days ? T.glowBtn : "none",
                            fontFamily: "inherit",
                        }}>{r.label}</button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
                {kpis.map(k => (
                    <div key={k.label} style={{
                        background: T.bgCard, borderRadius: T.r12,
                        border: `1px solid ${T.border}`, padding: "18px 16px",
                        boxShadow: T.shadow,
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
                            {k.label}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontVariantNumeric: "tabular-nums" }}>
                            {k.value}
                        </div>
                        {k.sub && (
                            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3 }}>{k.sub}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Revenue Area Chart */}
            <div style={{
                background: T.bgCard, borderRadius: T.r12, border: `1px solid ${T.border}`,
                padding: "24px 20px", marginBottom: 16, boxShadow: T.shadow,
            }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>Revenue (PKR)</div>
                {loading ? (
                    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 13 }}>
                        Loading data...
                    </div>
                ) : chartData.length === 0 ? (
                    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 13 }}>
                        No data for this period
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={T.j300} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={T.j300} stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={T.green} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={T.green} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} width={50} tickFormatter={pkr} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: T.textMuted, paddingTop: 12 }} />
                            <Area type="monotone" dataKey="Gross Revenue" stroke={T.j300} strokeWidth={2} fill="url(#gradRevenue)" />
                            <Area type="monotone" dataKey="Collected" stroke={T.green} strokeWidth={2} fill="url(#gradCollected)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Orders Bar Chart */}
            <div style={{
                background: T.bgCard, borderRadius: T.r12, border: `1px solid ${T.border}`,
                padding: "24px 20px", boxShadow: T.shadow,
            }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>Orders by Status</div>
                {loading ? (
                    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 13 }}>
                        Loading data...
                    </div>
                ) : chartData.length === 0 ? (
                    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 13 }}>
                        No data for this period
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} barGap={3} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: T.textMuted, paddingTop: 12 }} />
                            <Bar dataKey="Total Orders" fill={T.j600} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Completed" fill={T.green} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Cancelled" fill={T.red} radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
