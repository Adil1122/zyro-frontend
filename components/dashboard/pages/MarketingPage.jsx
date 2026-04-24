"use client";

import React, { useState, useEffect } from "react";
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area,
} from "recharts";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, ChartTip, PageHeader } from "../Primitives";

export default function MarketingPage() {
    const [platform, setPlatform] = useState("meta");
    const [marketingData, setMarketingData] = useState([]);
    const [metaPagination, setMetaPagination] = useState({ pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchMarketing = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/marketing?page=${page}`);
                const result = await res.json();
                setMarketingData(result.data || []);
                setMetaPagination(result.meta);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch marketing:", err);
                setLoading(false);
            }
        };
        fetchMarketing();
    }, [page]);

    const metaTrend = [
        { day: "1", spend: 1200, revenue: 4800 },
        { day: "5", spend: 1800, revenue: 7200 },
        { day: "10", spend: 2200, revenue: 9800 },
        { day: "15", spend: 1900, revenue: 8600 },
        { day: "20", spend: 2400, revenue: 11800 },
        { day: "25", spend: 2800, revenue: 14200 },
        { day: "30", spend: 3100, revenue: 15400 },
    ];
    const googleTrend = [
        { day: "1", spend: 800, revenue: 2400 },
        { day: "5", spend: 1100, revenue: 3900 },
        { day: "10", spend: 1400, revenue: 5200 },
        { day: "15", spend: 1500, revenue: 5800 },
        { day: "20", spend: 1700, revenue: 6900 },
        { day: "25", spend: 1800, revenue: 7800 },
        { day: "30", spend: 2000, revenue: 9100 },
    ];

    const statusCfg2 = {
        Active: { label: "Scale", color: T.green, bg: T.greenBg, icon: "trending" },
        Paused: { label: "Paused", color: T.red, bg: T.redBg, icon: "pause" },
        Draft: { label: "Draft", color: T.yellow, bg: T.yellowBg, icon: "eye" },
        scale: { label: "Scale", color: T.green, bg: T.greenBg, icon: "trending" },
        winning: { label: "Winning", color: T.green, bg: T.greenBg, icon: "fire" },
        monitor: { label: "Monitor", color: T.yellow, bg: T.yellowBg, icon: "eye" },
        pause: { label: "Pause", color: T.red, bg: T.redBg, icon: "pause" },
        kill: { label: "Kill", color: T.red, bg: T.redBg, icon: "close" },
        ok: { label: "OK", color: T.blue, bg: T.blueBg, icon: "check" },
    };

    const totalSpendCalculated = marketingData.reduce((sum, c) => sum + Number(c.budget || 0), 0);

    const metaCampaigns = marketingData.map(c => ({
        name: c.name,
        spend: c.budget,
        rev: c.budget * 3.2,
        roas: 3.2,
        clicks: Math.floor(c.budget / 10),
        ctr: 2.5,
        conv: Math.floor(c.budget / 500),
        status: c.status
    }));

    const googleCampaigns = [
        { name: "Search — Cotton Kurta Keywords", spend: 6400, rev: 24500, roas: 3.83, clicks: 512, ctr: 5.8, conv: 22, status: "winning" },
        { name: "Search — Shalwar Trouser", spend: 4200, rev: 15400, roas: 3.67, clicks: 380, ctr: 6.2, conv: 18, status: "winning" },
    ];

    const meta = {
        brand: "Meta Ads", subtitle: "Facebook + Instagram campaigns",
        accent: "#1877F2", icon: "meta",
        spend: `Rs ${totalSpendCalculated.toLocaleString()}`,
        revenue: `Rs ${(totalSpendCalculated * 3.2).toLocaleString()}`,
        roas: "3.20x",
        orders: Math.floor(totalSpendCalculated / 400),
        aov: "Rs 1,280",
        trend: metaTrend, campaigns: metaCampaigns, creatives: marketingData[0]?.creatives || [],
        account: "Zyro Brand PK · Ad Account 8392",
        count: metaPagination.pagination.total
    };
    const google = {
        brand: "Google Ads", subtitle: "Search + Shopping campaigns",
        accent: "#4285F4", icon: "google",
        spend: "Rs 19,600", revenue: "Rs 66,000", roas: "3.37x",
        orders: 73, aov: "Rs 904",
        trend: googleTrend, campaigns: googleCampaigns, creatives: [],
        account: "zyro-brand-pk · ID 123-456-7890",
        count: googleCampaigns.length
    };
    const active = platform === "meta" ? meta : google;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 1280 }}>
            <PageHeader
                title="Marketing Intelligence"
                subtitle={`AI-powered campaign analysis · ${active.count} campaigns detected`}
                actions={<GradientButton variant="secondary" size="sm" icon="download">Download Report</GradientButton>}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[meta, google].map((pl, idx) => {
                    const isActive = (idx === 0 && platform === "meta") || (idx === 1 && platform === "google");
                    return (
                        <button key={pl.brand} onClick={() => { setPlatform(idx === 0 ? "meta" : "google"); setPage(1); }}
                            style={{
                                padding: "16px 20px",
                                background: isActive ? `linear-gradient(135deg, ${pl.accent}22 0%, ${pl.accent}08 100%)` : T.bgCard,
                                border: `1px solid ${isActive ? pl.accent + "88" : T.border}`,
                                borderRadius: T.r12, cursor: "pointer",
                                transition: "all 0.2s", fontFamily: "inherit", textAlign: "left",
                                boxShadow: isActive ? `0 0 0 3px ${pl.accent}22, 0 8px 20px rgba(0,0,0,0.3)` : "none",
                                position: "relative", overflow: "hidden",
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: T.r10,
                                    background: isActive ? pl.accent : T.bgElev,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0, border: `1px solid ${isActive ? pl.accent : T.border}`,
                                }}>
                                    <Icon name={pl.icon} size={22} color="#fff" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>{pl.brand}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3 }}>{pl.subtitle}</div>
                                    <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 9, color: T.textFaint, fontWeight: 600 }}>SPEND</div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginTop: 1 }}>{pl.spend}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, color: T.textFaint, fontWeight: 600 }}>ROAS</div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: T.green, marginTop: 1 }}>{pl.roas}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {loading && <div style={{ padding: 40, textAlign: "center", color: T.text }}>Syncing live campaign data...</div>}

            {!loading && (
                <>
                    <Card style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
                        <div style={{ padding: 20 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
                                {[
                                    ["Total Spend", active.spend, T.text],
                                    ["Revenue", active.revenue, T.j200],
                                    ["ROAS", active.roas, T.green],
                                    ["Orders", active.orders.toString(), T.text],
                                    ["AOV", active.aov, T.text],
                                ].map(([k, v, c]) => (
                                    <div key={k} style={{
                                        padding: "12px 14px", background: T.bgElev, border: `1px solid ${T.border}`,
                                        borderRadius: T.r8,
                                    }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: c, marginTop: 4, letterSpacing: "-0.3px" }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Performance Trend · Last 30 days</div>
                                </div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <AreaChart data={active.trend}>
                                        <defs>
                                            <linearGradient id={`revG-${platform}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={T.j300} stopOpacity={0.35} />
                                                <stop offset="100%" stopColor={T.j300} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: T.textFaint }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip content={<ChartTip formatter={v => `Rs ${v.toLocaleString()}`} />} />
                                        <Area dataKey="revenue" name="Revenue" stroke={T.j300} strokeWidth={2.5} fill={`url(#revG-${platform})`} dot={false} />
                                        <Area dataKey="spend" name="Spend" stroke={active.accent} strokeWidth={2} fill="transparent" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </Card>

                    <Card pad={0} style={{ marginBottom: 14 }}>
                        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{active.brand} Campaigns</div>
                        </div>
                        <div style={{ position: "relative" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(92,168,124,0.03)" }}>
                                        {["Campaign", "Spend", "Revenue", "ROAS", "Orders", "Status", ""].map(h => (
                                            <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {active.campaigns.length === 0 && (
                                        <tr><td colSpan="7" style={{ padding: 40, textAlign: "center", color: T.textFaint }}>No campaigns found for this platform.</td></tr>
                                    )}
                                    {active.campaigns.map((c, i) => {
                                        const s = statusCfg2[c.status] || statusCfg2.monitor;
                                        return (
                                            <tr key={`${c.name}-${i}`} style={{ borderBottom: i < active.campaigns.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                                <td style={{ padding: "13px 14px" }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                                                </td>
                                                <td style={{ padding: "13px 14px" }}><span style={{ fontSize: 13, color: T.textMuted }}>Rs {(c.spend || 0).toLocaleString()}</span></td>
                                                <td style={{ padding: "13px 14px" }}><span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Rs {(c.rev || 0).toLocaleString()}</span></td>
                                                <td style={{ padding: "13px 14px" }}>
                                                    <span style={{ fontSize: 12, fontWeight: 800, color: T.green }}>{c.roas}x</span>
                                                </td>
                                                <td style={{ padding: "13px 14px" }}><span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.conv}</span></td>
                                                <td style={{ padding: "13px 14px" }}>
                                                    <span style={{
                                                        display: "inline-flex", alignItems: "center", gap: 4,
                                                        fontSize: 11, padding: "3px 9px", borderRadius: T.r20, fontWeight: 700,
                                                        background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
                                                    }}>
                                                        <Icon name={s.icon} size={10} color={s.color} />
                                                        {s.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "13px 14px" }}>
                                                    <GradientButton size="xs" variant="ghost" icon="eye">View</GradientButton>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {platform === "meta" && metaPagination.pagination && (
                            <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}` }}>
                                <span style={{ fontSize: 12, color: T.textFaint }}>Page {metaPagination.pagination.page} of {Math.max(1, metaPagination.pagination.lastPage)}</span>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <GradientButton variant="secondary" size="xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</GradientButton>
                                    <GradientButton variant="secondary" size="xs" disabled={page >= metaPagination.pagination.lastPage} onClick={() => setPage(page + 1)}>Next</GradientButton>
                                </div>
                            </div>
                        )}
                    </Card>

                    {active.creatives.length > 0 && (
                        <Card pad={0}>
                            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 14, fontWeight: 700, color: T.text }}>
                                Marketing Creatives
                            </div>
                            <div style={{ padding: 20 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                                    {active.creatives.map(cr => (
                                        <div key={cr.id} style={{ background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r10, padding: 14 }}>
                                            <div style={{ height: 100, borderRadius: T.r8, background: T.border, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Icon name="sparkle" size={24} color={T.j300} />
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{cr.name}</div>
                                            <div style={{ fontSize: 11, color: T.textFaint }}>{cr.type}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

