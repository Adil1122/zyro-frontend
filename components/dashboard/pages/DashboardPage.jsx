"use client";

import React, { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Line,
    PieChart, Pie, Cell,
} from "recharts";
import { T, salesData, revenueData, platformData, orders } from "../constants";
import Icon from "../Icon";
import { GradientButton, Badge, PlatformBadge, Card, KPI, ChartTip, PageHeader } from "../Primitives";

export default function DashboardPage() {
    const [range, setRange] = useState("7d");
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/dashboard-stats');
                const data = await res.json();
                setStats(data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch dashboard stats:", err);
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h`;
        return `${Math.floor(diffHrs / 24)}d`;
    };

    if (loading) return (
        <div style={{ padding: "28px 32px", color: T.text, textAlign: "center" }}>
            <Icon name="refresh" size={24} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ marginTop: 10 }}>Loading Zyro Intelligence...</div>
        </div>
    );

    if (!stats) return <div style={{ padding: 28, color: T.red }}>Error connecting to backend database.</div>;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 1280 }}>
            <PageHeader
                title="Good morning, Ahmad"
                subtitle={`${new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Here's your Zyro overview`}
                actions={<>
                    <div style={{ display: "flex", background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, padding: 3 }}>
                        {["Today", "7d", "30d", "90d"].map(r => (
                            <button key={r} onClick={() => setRange(r)} style={{
                                padding: "5px 12px", borderRadius: T.r6, fontSize: 12, fontWeight: 600,
                                cursor: "pointer", fontFamily: "inherit",
                                background: range === r ? T.gradBtn : "transparent",
                                color: range === r ? "#fff" : T.textMuted,
                                border: "none", transition: "all 0.15s",
                                boxShadow: range === r ? T.glowBtn : "none",
                            }}>{r}</button>
                        ))}
                    </div>
                    <GradientButton variant="secondary" size="sm" icon="download">Export</GradientButton>
                    <GradientButton variant="primary" size="sm" icon="plus">Manual Order</GradientButton>
                </>}
            />
            <div style={{
                background: "linear-gradient(90deg, rgba(251,191,36,0.1) 0%, rgba(17,51,46,0.3) 100%)",
                border: `1px solid rgba(251,191,36,0.3)`, borderRadius: T.r10, padding: "12px 18px",
                display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: T.r6, background: "rgba(251,191,36,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <Icon name="alert" size={14} color={T.yellow} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Attention needed</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {stats.kpis.pendingOrders} orders need courier booking · Webhook sync active · {stats.kpis.pendingOrders > 5 ? 'High volume today' : 'Stable traffic'}
                    </div>
                </div>
                <GradientButton variant="ghost" size="sm" iconRight="arrow">Review</GradientButton>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                <KPI label="Revenue Today" value={`Rs ${stats.kpis.revenueToday.toLocaleString()}`} sub={`${stats.kpis.ordersToday} orders · Live Data`} delta="18.4%" deltaUp icon="dollar" highlight />
                <KPI label="Pending Action" value={stats.kpis.pendingOrders.toString()} sub="Need courier booking" delta="Urgent" icon="truck" />
                <KPI label="WhatsApp AI Rate" value={stats.kpis.aiRate} sub="Handled without you" delta="2.1%" deltaUp icon="ai" />
                <KPI label="COD Due" value={`Rs ${stats.kpis.codDue.toLocaleString()}`} sub="Active in transit" icon="pkg" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Orders by Platform</div>
                            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Real-time platform distribution</div>
                        </div>
                        <div style={{ display: "flex", gap: 14 }}>
                            {[[T.j300, "Woo"], [T.j100, "Daraz"], [T.j500, "Shopify"]].map(([c, n]) => (
                                <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                                    <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{n}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={salesData} barSize={10} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(92,168,124,0.05)" }} />
                            <Bar dataKey="woo" name="WooCommerce" stackId="a" fill={T.j300} />
                            <Bar dataKey="daraz" name="Daraz" stackId="a" fill={T.j100} />
                            <Bar dataKey="shopify" name="Shopify" stackId="a" fill={T.j500} radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Revenue Trend</div>
                            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Monthly performance vs targets</div>
                        </div>
                        <div style={{ padding: "3px 9px", borderRadius: T.r20, background: T.greenBg, border: `1px solid ${T.green}33` }}>
                            <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>↑ 23.4%</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={stats.charts.revenueTrend}>
                            <defs>
                                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={T.j300} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={T.j300} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<ChartTip formatter={v => `Rs ${v.toLocaleString()}`} />} />
                            <Area dataKey="revenue" name="Revenue" stroke={T.j300} strokeWidth={2.5} fill="url(#rg)" dot={false} />
                            <Line dataKey="target" name="Target" stroke={T.textFaint} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
                <Card pad={0}>
                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Recent Orders</div>
                            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Live feed from direct database</div>
                        </div>
                        <GradientButton variant="ghost" size="sm" iconRight="arrow">View all</GradientButton>
                    </div>
                    {stats.recentOrders.map((o, i) => (
                        <div key={o.id} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "11px 20px",
                            borderBottom: i < stats.recentOrders.length - 1 ? `1px solid ${T.border}` : "none",
                            cursor: "pointer", transition: "background 0.1s",
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <div style={{
                                width: 34, height: 34, borderRadius: "50%",
                                background: `linear-gradient(135deg, ${T.j500} 0%, ${T.j600} 100%)`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, color: T.j100, flexShrink: 0,
                                border: `1px solid ${T.borderMid}`,
                            }}>{o.customer.split(" ").map(w => w[0]).join("")}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{o.customer}</div>
                                <div style={{ fontSize: 11, color: T.textFaint, display: "flex", gap: 6, alignItems: "center" }}>
                                    <span style={{ fontFamily: "monospace", color: T.j300 }}>{o.id}</span>
                                    <span>·</span><span>{o.city}</span>
                                </div>
                            </div>
                            <PlatformBadge platform={o.platform.toLowerCase().includes('woo') ? 'woo' : o.platform.toLowerCase().includes('daraz') ? 'daraz' : 'shopify'} />
                            <Badge status={o.status.toLowerCase()} />
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, minWidth: 80, textAlign: "right" }}>Rs {o.amount.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: T.textFaint, minWidth: 36, textAlign: "right" }}>{formatTime(o.time)}</div>
                        </div>
                    ))}
                </Card>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <Card>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>Platform Split</div>
                        <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 12 }}>Detailed database stats</div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <PieChart width={160} height={130}>
                                <Pie data={stats.charts.platformSplit} cx={80} cy={60} innerRadius={42} outerRadius={60} dataKey="value" strokeWidth={3} stroke={T.bgCard} paddingAngle={2}>
                                    {stats.charts.platformSplit.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                            </PieChart>
                        </div>
                        {stats.charts.platformSplit.map(pp => (
                            <div key={pp.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: pp.color }} />
                                    <span style={{ fontSize: 12, color: T.textMuted }}>{pp.name}</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{pp.value}</span>
                            </div>
                        ))}
                    </Card>

                    <Card pad={16}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Quick Actions</div>
                        {[
                            { icon: "truck", label: "Book couriers", sub: `${stats.kpis.pendingOrders} pending`, color: T.j300 },
                            { icon: "check", label: "Confirm orders", sub: "3 awaiting", color: T.yellow },
                            { icon: "pkg", label: "Approve POs", sub: "2 low stock", color: T.green },
                            { icon: "chat", label: "Reply to support", sub: "1 escalated", color: T.red },
                        ].map(a => (
                            <button key={a.label} style={{
                                display: "flex", alignItems: "center", gap: 11, width: "100%",
                                padding: "10px 12px", borderRadius: T.r8, marginBottom: 6,
                                border: `1px solid ${T.border}`, cursor: "pointer",
                                background: T.bgElev, transition: "all 0.15s",
                                fontFamily: "inherit", textAlign: "left",
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderBright; e.currentTarget.style.background = T.bgHigh; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bgElev; }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: T.r6, background: `${a.color}22`,
                                    border: `1px solid ${a.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                                }}>
                                    <Icon name={a.icon} size={13} color={a.color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.label}</div>
                                    <div style={{ fontSize: 10, color: T.textFaint }}>{a.sub}</div>
                                </div>
                                <Icon name="arrow" size={13} color={T.textFaint} />
                            </button>
                        ))}
                    </Card>
                </div>
            </div>
        </div>
    );
}
