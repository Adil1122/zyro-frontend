"use client";

import React, { useState, useEffect } from "react";
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area,
} from "recharts";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, ChartTip, PageHeader } from "../Primitives";
import { getCurrentUserId } from "@/lib/supabase";

export default function MarketingPage() {
    const [platform, setPlatform] = useState("meta");
    const [marketingData, setMarketingData] = useState([]);
    const [metaPagination, setMetaPagination] = useState({ pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [metaAdsConnected, setMetaAdsConnected] = useState(false);
    const [metaAdsStats, setMetaAdsStats] = useState(null);
    const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
    const [googleAdsStats, setGoogleAdsStats] = useState(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [credentials, setCredentials] = useState({
        meta_app_id: '',
        meta_app_secret: '',
        google_ads_client_id: '',
        google_ads_client_secret: '',
        google_ads_developer_token: ''
    });

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
    
    const checkMetaAdsConnection = async () => {
        try {
            const userId = getCurrentUserId();
            if (userId) {
                const res = await fetch('/api/meta-ads/stats', {
                    headers: {
                        'x-user-id': userId
                    }
                });
                if (res.ok) {
                    const stats = await res.json();
                    setMetaAdsStats(stats);
                    setMetaAdsConnected(true);
                } else {
                    setMetaAdsConnected(false);
                }
            }
        } catch (err) {
            setMetaAdsConnected(false);
        }
    };

    const checkGoogleAdsConnection = async () => {
        try {
            const userId = getCurrentUserId();
            if (userId) {
                const res = await fetch('/api/google-ads/stats', {
                    headers: {
                        'x-user-id': userId
                    }
                });
                if (res.ok) {
                    const stats = await res.json();
                    setGoogleAdsStats(stats);
                    setGoogleAdsConnected(true);
                } else {
                    setGoogleAdsConnected(false);
                }
            }
        } catch (err) {
            setGoogleAdsConnected(false);
        }
    };

    const loadCredentials = async () => {
        try {
            const userId = getCurrentUserId();
            if (userId) {
                const res = await fetch('/api/user/credentials', {
                    headers: {
                        'x-user-id': userId
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCredentials({
                        meta_app_id: data.meta_app_id || '',
                        meta_app_secret: '',
                        google_ads_client_id: data.google_ads_client_id || '',
                        google_ads_client_secret: '',
                        google_ads_developer_token: ''
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load credentials:", err);
        }
    };

    useEffect(() => {
        // Check if user is logged in
        const userId = getCurrentUserId();
        setIsLoggedIn(!!userId);

        // Check for OAuth success parameters
        const urlParams = new URLSearchParams(window.location.search);
        const metaAdsConnected = urlParams.get('meta_ads_connected');
        const googleAdsConnected = urlParams.get('google_ads_connected');

        if (metaAdsConnected === 'true') {
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            // Force refresh Meta Ads connection status
            setTimeout(() => {
                checkMetaAdsConnection();
            }, 1000);
        }

        if (googleAdsConnected === 'true') {
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            // Force refresh Google Ads connection status
            setTimeout(() => {
                checkGoogleAdsConnection();
            }, 1000);
        }
        
        fetchMarketing();
        checkMetaAdsConnection();
        checkGoogleAdsConnection();
        loadCredentials();
    }, [page]);

    const handleMetaAdsConnect = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                // Redirect to login if not logged in
                window.location.href = '/login';
                return;
            }

            const res = await fetch('/api/meta-ads/auth', {
                headers: {
                    'x-user-id': userId
                }
            });
            const data = await res.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        } catch (err) {
            console.error('Failed to connect Meta Ads:', err);
        }
    };

    const handleMetaAdsStatsRefresh = async () => {
        setLoading(true);
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                setMetaAdsConnected(false);
                return;
            }

            const res = await fetch('/api/meta-ads/stats', {
                headers: {
                    'x-user-id': userId
                }
            });
            const stats = await res.json();
            setMetaAdsStats(stats);
            setMetaAdsConnected(true);
        } catch (err) {
            console.error('Failed to fetch Meta Ads stats:', err);
            setMetaAdsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAdsConnect = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                // Redirect to login if not logged in
                window.location.href = '/login';
                return;
            }

            const res = await fetch('/api/google-ads/auth', {
                headers: {
                    'x-user-id': userId
                }
            });
            const data = await res.json();
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        } catch (err) {
            console.error('Failed to connect Google Ads:', err);
        }
    };

    const handleGoogleAdsStatsRefresh = async () => {
        setLoading(true);
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                setGoogleAdsConnected(false);
                return;
            }

            const res = await fetch('/api/google-ads/stats', {
                headers: {
                    'x-user-id': userId
                }
            });
            const stats = await res.json();
            setGoogleAdsStats(stats);
            setGoogleAdsConnected(true);
        } catch (err) {
            console.error('Failed to fetch Google Ads stats:', err);
            setGoogleAdsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleMetaAdsDisconnect = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) return;

            const res = await fetch('/api/meta-ads/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                }
            });

            if (res.ok) {
                setMetaAdsConnected(false);
                setMetaAdsStats(null);
                alert('Meta Ads disconnected successfully');
            } else {
                const data = await res.json();
                alert('Failed to disconnect Meta Ads: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Failed to disconnect Meta Ads:', err);
            alert('Failed to disconnect Meta Ads: ' + err.message);
        }
    };

    const handleGoogleAdsDisconnect = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) return;

            const res = await fetch('/api/google-ads/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                }
            });

            if (res.ok) {
                setGoogleAdsConnected(false);
                setGoogleAdsStats(null);
                alert('Google Ads disconnected successfully');
            } else {
                const data = await res.json();
                alert('Failed to disconnect Google Ads: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Failed to disconnect Google Ads:', err);
            alert('Failed to disconnect Google Ads: ' + err.message);
        }
    };

    const handleCredentialsSave = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                // Redirect to login if not logged in
                window.location.href = '/login';
                return;
            }

            const res = await fetch('/api/user/credentials', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify(credentials)
            });
            const data = await res.json();
            
            if (!res.ok) {
                if (data.requiresLogin) {
                    // Show login prompt and redirect
                    if (confirm('You must be logged in to save credentials. Would you like to log in now?')) {
                        window.location.href = '/login';
                    }
                    return;
                }
                throw new Error(data.error || 'Failed to save credentials');
            }
            
            alert('Credentials saved successfully!');
            setShowCredentialsModal(false);
            
            // Refresh connection status
            if (credentials.meta_app_id && credentials.meta_app_secret) {
                const metaRes = await fetch('/api/meta-ads/stats');
                if (metaRes.ok) {
                    const metaStats = await metaRes.json();
                    setMetaAdsStats(metaStats);
                    setMetaAdsConnected(true);
                }
            }
            
        } catch (err) {
            console.error('Failed to save credentials:', err);
            alert('Failed to save credentials: ' + err.message);
        }
    };

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

    // Use real Meta Ads stats if available, otherwise use mock data
    const metaCampaigns = metaAdsStats ? metaAdsStats.campaigns.map(c => ({
        name: c.name,
        spend: c.spend,
        rev: c.revenue || c.spend * 3.2,
        roas: c.roas || (c.spend > 0 ? (c.revenue || c.spend * 3.2) / c.spend : 0),
        clicks: c.clicks,
        ctr: c.ctr || (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0),
        conv: Math.floor(c.spend / 500),
        status: c.status
    })) : marketingData.map(c => ({
        name: c.name,
        spend: c.budget,
        rev: c.budget * 3.2,
        roas: 3.2,
        clicks: Math.floor(c.budget / 10),
        ctr: 2.5,
        conv: Math.floor(c.budget / 500),
        status: c.status
    }));

    const mockGoogleCampaigns = [
        { name: "Search — Cotton Kurta Keywords", spend: 6400, rev: 24500, roas: 3.83, clicks: 512, ctr: 5.8, conv: 22, status: "winning" },
        { name: "Search — Shalwar Trouser", spend: 4200, rev: 15400, roas: 3.67, clicks: 380, ctr: 6.2, conv: 18, status: "winning" },
    ];

    const meta = metaAdsStats ? {
        brand: "Meta Ads", subtitle: "Facebook + Instagram campaigns",
        accent: "#1877F2", icon: "meta",
        spend: `Rs ${metaAdsStats.totalSpend.toLocaleString()}`,
        revenue: `Rs ${metaAdsStats.revenue.toLocaleString()}`,
        roas: `${metaAdsStats.roas.toFixed(2)}x`,
        orders: metaAdsStats.totalOrders,
        aov: metaAdsStats.totalOrders > 0 ? `Rs ${Math.round(metaAdsStats.revenue / metaAdsStats.totalOrders).toLocaleString()}` : "Rs 0",
        trend: metaTrend, campaigns: metaCampaigns, creatives: marketingData[0]?.creatives || [],
        account: "Connected Meta Ads Account",
        count: metaCampaigns.length,
        connected: true
    } : {
        brand: "Meta Ads", subtitle: "Facebook + Instagram campaigns",
        accent: "#1877F2", icon: "meta",
        spend: `Rs ${totalSpendCalculated.toLocaleString()}`,
        revenue: `Rs ${(totalSpendCalculated * 3.2).toLocaleString()}`,
        roas: "3.20x",
        orders: Math.floor(totalSpendCalculated / 400),
        aov: "Rs 1,280",
        trend: metaTrend, campaigns: metaCampaigns, creatives: marketingData[0]?.creatives || [],
        account: "Not Connected",
        count: metaPagination.pagination.total,
        connected: false
    };
    // Use real Google Ads stats if available, otherwise use mock data
    const googleCampaigns = googleAdsStats ? googleAdsStats.campaigns.map(c => ({
        name: c.name,
        spend: c.spend,
        rev: c.revenue || c.spend * 3.5,
        roas: c.roas || (c.spend > 0 ? (c.revenue || c.spend * 3.5) / c.spend : 0),
        clicks: c.clicks,
        ctr: c.ctr || (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0),
        conv: Math.floor(c.conversions),
        status: c.status
    })) : mockGoogleCampaigns;

    const google = googleAdsStats ? {
        brand: "Google Ads", subtitle: "Search + Shopping campaigns",
        accent: "#4285F4", icon: "google",
        spend: `$${googleAdsStats.totalSpend.toFixed(2)}`,
        revenue: `$${googleAdsStats.revenue.toFixed(2)}`,
        roas: `${googleAdsStats.roas.toFixed(2)}x`,
        orders: googleAdsStats.totalOrders,
        aov: googleAdsStats.totalOrders > 0 ? `$${Math.round(googleAdsStats.revenue / googleAdsStats.totalOrders).toFixed(2)}` : "$0",
        trend: googleTrend, campaigns: googleCampaigns, creatives: [],
        account: "Connected Google Ads Account",
        count: googleCampaigns.length,
        connected: true
    } : {
        brand: "Google Ads", subtitle: "Search + Shopping campaigns",
        accent: "#4285F4", icon: "google",
        spend: "$19,600", revenue: "$66,000", roas: "3.37x",
        orders: 73, aov: "$904",
        trend: googleTrend, campaigns: googleCampaigns, creatives: [],
        account: "Not Connected",
        count: googleCampaigns.length,
        connected: false
    };
    const active = platform === "meta" ? meta : google;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 1280 }}>
            <PageHeader
                title="Marketing Intelligence"
                subtitle={`AI-powered campaign analysis · ${active.count} campaigns detected`}
                actions={
                    <div style={{ display: "flex", gap: 8 }}>
                        {!isLoggedIn && (
                            <GradientButton size="sm" icon="user" onClick={() => window.location.href = '/login'}>
                                Login Required
                            </GradientButton>
                        )}
                        {isLoggedIn && platform === "meta" && !metaAdsConnected && (
                            <GradientButton size="sm" icon="meta" onClick={handleMetaAdsConnect}>
                                Connect Meta Ads
                            </GradientButton>
                        )}
                        {isLoggedIn && platform === "meta" && metaAdsConnected && (
                            <>
                                <GradientButton variant="secondary" size="sm" icon="refresh" onClick={handleMetaAdsStatsRefresh}>
                                    Refresh Stats
                                </GradientButton>
                                <GradientButton variant="danger" size="sm" icon="close" onClick={handleMetaAdsDisconnect}>
                                    Disconnect
                                </GradientButton>
                            </>
                        )}
                        {isLoggedIn && platform === "google" && !googleAdsConnected && (
                            <GradientButton size="sm" icon="google" onClick={handleGoogleAdsConnect}>
                                Connect Google Ads
                            </GradientButton>
                        )}
                        {isLoggedIn && platform === "google" && googleAdsConnected && (
                            <>
                                <GradientButton variant="secondary" size="sm" icon="refresh" onClick={handleGoogleAdsStatsRefresh}>
                                    Refresh Stats
                                </GradientButton>
                                <GradientButton variant="danger" size="sm" icon="close" onClick={handleGoogleAdsDisconnect}>
                                    Disconnect
                                </GradientButton>
                            </>
                        )}
                        {isLoggedIn && (
                            <GradientButton variant="secondary" size="sm" icon="settings" onClick={() => setShowCredentialsModal(true)}>
                                API Credentials
                            </GradientButton>
                        )}
                        <GradientButton variant="secondary" size="sm" icon="download">Download Report</GradientButton>
                    </div>
                }
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

            {/* API Credentials Modal */}
            {showCredentialsModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1000
                }}>
                    <div style={{
                        background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r12,
                        width: "90%", maxWidth: 600, maxHeight: "80vh", overflow: "auto",
                        boxShadow: T.shadowLg
                    }}>
                        <div style={{
                            padding: "24px 24px 16px", borderBottom: `1px solid ${T.border}`,
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                        }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>API Credentials</div>
                            <button
                                onClick={() => setShowCredentialsModal(false)}
                                style={{ background: "none", border: "none", color: T.textFaint, cursor: "pointer", fontSize: 20 }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{ padding: 24 }}>
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>Meta Ads Configuration</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 4 }}>
                                            App ID
                                        </label>
                                        <input
                                            type="text"
                                            value={credentials.meta_app_id}
                                            onChange={(e) => setCredentials({...credentials, meta_app_id: e.target.value})}
                                            style={{
                                                width: "100%", height: 36, padding: "0 10px",
                                                background: T.bgHigh, border: `1px solid ${T.border}`,
                                                borderRadius: T.r6, color: T.text, fontSize: 13,
                                                outline: "none"
                                            }}
                                            placeholder="Enter Meta App ID"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 4 }}>
                                            App Secret
                                        </label>
                                        <input
                                            type="password"
                                            value={credentials.meta_app_secret}
                                            onChange={(e) => setCredentials({...credentials, meta_app_secret: e.target.value})}
                                            style={{
                                                width: "100%", height: 36, padding: "0 10px",
                                                background: T.bgHigh, border: `1px solid ${T.border}`,
                                                borderRadius: T.r6, color: T.text, fontSize: 13,
                                                outline: "none"
                                            }}
                                            placeholder="Enter Meta App Secret"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>Google Ads Configuration</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 4 }}>
                                            Client ID
                                        </label>
                                        <input
                                            type="text"
                                            value={credentials.google_ads_client_id}
                                            onChange={(e) => setCredentials({...credentials, google_ads_client_id: e.target.value})}
                                            style={{
                                                width: "100%", height: 36, padding: "0 10px",
                                                background: T.bgHigh, border: `1px solid ${T.border}`,
                                                borderRadius: T.r6, color: T.text, fontSize: 13,
                                                outline: "none"
                                            }}
                                            placeholder="Enter Google Ads Client ID"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 4 }}>
                                            Client Secret
                                        </label>
                                        <input
                                            type="password"
                                            value={credentials.google_ads_client_secret}
                                            onChange={(e) => setCredentials({...credentials, google_ads_client_secret: e.target.value})}
                                            style={{
                                                width: "100%", height: 36, padding: "0 10px",
                                                background: T.bgHigh, border: `1px solid ${T.border}`,
                                                borderRadius: T.r6, color: T.text, fontSize: 13,
                                                outline: "none"
                                            }}
                                            placeholder="Enter Google Ads Client Secret"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 4 }}>
                                            Developer Token
                                        </label>
                                        <input
                                            type="password"
                                            value={credentials.google_ads_developer_token}
                                            onChange={(e) => setCredentials({...credentials, google_ads_developer_token: e.target.value})}
                                            style={{
                                                width: "100%", height: 36, padding: "0 10px",
                                                background: T.bgHigh, border: `1px solid ${T.border}`,
                                                borderRadius: T.r6, color: T.text, fontSize: 13,
                                                outline: "none"
                                            }}
                                            placeholder="Enter Google Ads Developer Token"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <GradientButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowCredentialsModal(false)}
                                >
                                    Cancel
                                </GradientButton>
                                <GradientButton
                                    size="sm"
                                    onClick={handleCredentialsSave}
                                >
                                    Save Credentials
                                </GradientButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

