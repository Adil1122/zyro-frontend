"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton } from "../Primitives";
import { getCurrentUserId } from "@/lib/supabase";

// ─── Daraz-specific status config ──────────────────────────────────────────
const DARAZ_STATUS = {
    pending: { label: "Pending", bg: T.yellowBg, color: T.yellow, dot: T.yellow },
    processing: { label: "Processing", bg: T.blueBg, color: T.blue, dot: T.blue },
    packed: { label: "Packed", bg: "rgba(167,139,250,0.15)", color: T.purple, dot: T.purple },
    shipped: { label: "Shipped", bg: "rgba(92,168,124,0.15)", color: T.j200, dot: T.j300 },
    delivered: { label: "Delivered", bg: T.greenBg, color: T.green, dot: T.green },
    cancelled: { label: "Cancelled", bg: T.redBg, color: T.red, dot: T.red },
    returned: { label: "Returned", bg: "rgba(251,191,36,0.12)", color: T.yellow, dot: T.yellow },
};

function StatusBadge({ status }) {
    const s = DARAZ_STATUS[status] || DARAZ_STATUS["pending"];
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: T.r20,
            background: s.bg, color: s.color, fontSize: 11, fontWeight: 600,
            border: `1px solid ${s.color}22`, whiteSpace: "nowrap",
        }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
            {s.label}
        </span>
    );
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return "—";
    return `Rs ${Number(amount).toLocaleString()}`;
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    // Daraz returns "YYYY-MM-DD HH:mm:ss +0800" — convert to ISO 8601 for reliable parsing
    const iso = dateStr.replace(' ', 'T').replace(/(\d{2}:\d{2}:\d{2}) ([+-]\d{4})$/, '$1$2');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " +
        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function SkeletonRow() {
    return (
        <tr>
            {[100, 160, 100, 130, 160, 90, 100, 60].map((w, i) => (
                <td key={i} style={{ padding: "14px 16px" }}>
                    <div style={{
                        height: 13, width: w, borderRadius: T.r4,
                        background: T.bgHigh,
                        animation: "pulse 1.4s ease-in-out infinite",
                    }} />
                </td>
            ))}
        </tr>
    );
}

const STATUS_FILTERS = [
    { value: "all", label: "All Orders" },
    { value: "processing", label: "Processing" },
    { value: "pending", label: "Pending" },
    { value: "packed", label: "Packed" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "returned", label: "Returned" },
    { value: "canceled", label: "Cancelled" },
];

function getPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
}

function paginBtnStyle(disabled) {
    return {
        padding: "5px 10px", borderRadius: T.r6, fontSize: 13,
        background: T.bgElev, color: disabled ? T.textGhost : T.textMuted,
        border: `1px solid ${T.borderMid}`, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, fontFamily: "inherit", transition: "all 0.12s",
    };
}

export default function DarazManagePage({ onBack }) {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expandedRow, setExpandedRow] = useState(null);
    const [isConfigured, setIsConfigured] = useState(null);

    // Credentials form state
    const [creds, setCreds] = useState({ accessToken: "", region: "pk" });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null);
    const [showManualToken, setShowManualToken] = useState(false);

    const userId = getCurrentUserId();

    const fetchOrders = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                perPage: pagination.perPage.toString(),
                status: statusFilter,
                ...(search ? { search } : {}),
            });
            const res = await fetch(`/api/daraz/orders?${params}`, {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();

            if (!data.configured) {
                setIsConfigured(false);
                setLoading(false);
                return;
            }
            if (data.error) {
                setError(data.error);
                return;
            }
            setIsConfigured(true);
            setOrders(data.orders || []);
            setPagination(data.pagination || { page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
        } catch (e) {
            setError("Failed to fetch orders: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, pagination.perPage, userId]);

    const handleConnectOAuth = async (e) => {
        e.preventDefault();
        setSaveMsg(null);

        if (creds.accessToken.trim()) {
            // Manual token path
            setSaving(true);
            try {
                const res = await fetch('/api/daraz/save-credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                    body: JSON.stringify({ accessToken: creds.accessToken, region: creds.region }),
                });
                const data = await res.json();
                if (data.success) {
                    setSaveMsg({ success: true, text: 'Daraz connected successfully!' });
                    setIsConfigured(true);
                    fetchOrders(1);
                } else {
                    setSaveMsg({ success: false, text: data.error || 'Failed to save' });
                }
            } catch (err) {
                setSaveMsg({ success: false, text: err.message });
            } finally {
                setSaving(false);
            }
            return;
        }

        // OAuth path — direct browser navigation to the GET initiate endpoint
        // which server-redirects to Daraz (avoids async JS navigation issues)
        if (!userId) {
            setSaveMsg({ success: false, text: 'Not logged in. Please refresh and try again.' });
            return;
        }
        const params = new URLSearchParams({ userId, region: creds.region });
        window.location.href = `/api/daraz/initiate?${params}`;
    };

    const handleDisconnect = async () => {
        if (!confirm("Disconnect Daraz? Your stored credentials will be removed.")) return;
        const res = await fetch("/api/daraz/save-credentials", {
            method: "DELETE",
            headers: { "x-user-id": userId },
        });
        if (res.ok) {
            setIsConfigured(false);
            setCreds({ accessToken: "", region: "pk" });
            setSaveMsg(null);
        }
    };

    useEffect(() => { fetchOrders(1); }, [search, statusFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput.trim());
    };

    const goToPage = (p) => {
        if (p < 1 || p > pagination.totalPages) return;
        fetchOrders(p);
    };

    const thStyle = {
        padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700,
        color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.07em",
        borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap",
        background: T.bgElev,
    };
    const tdStyle = {
        padding: "14px 16px", fontSize: 13, color: T.text,
        borderBottom: `1px solid ${T.border}`, verticalAlign: "middle",
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bgMain }}>

            {/* ── HERO HEADER ── */}
            <div style={{
                background: "linear-gradient(135deg, #7c3200 0%, #E85D04 50%, #F57D29 100%)",
                padding: "18px 28px 0",
                flexShrink: 0,
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 10, right: 120, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

                {/* Row 1: back + platform pill */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, position: "relative" }}>
                    <button onClick={onBack} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff", fontSize: 12, fontWeight: 600,
                        borderRadius: T.r8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit",
                    }}>
                        <Icon name="arrow-left" size={13} color="#fff" />
                        Back to Settings
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.2)", borderRadius: 20, padding: "4px 12px" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isConfigured ? "#4ade80" : "rgba(255,255,255,0.3)", boxShadow: isConfigured ? "0 0 8px #4ade80" : "none" }} />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Open Platform · PK</span>
                    </div>
                </div>

                {/* Row 2: brand + disconnect */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, position: "relative" }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 12,
                        background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                    }}>🏪</div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.2 }}>Daraz</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
                            {loading ? "Loading…" : `${(pagination.totalOrders || 0).toLocaleString()} total orders`}
                        </div>
                    </div>
                    {isConfigured && (
                        <button onClick={handleDisconnect} style={{
                            marginLeft: "auto", padding: "6px 14px", borderRadius: T.r8,
                            fontSize: 12, fontWeight: 600,
                            background: "rgba(255,255,255,0.12)", color: "#fff",
                            border: "1px solid rgba(255,255,255,0.2)",
                            cursor: "pointer", fontFamily: "inherit",
                        }}>Disconnect</button>
                    )}
                </div>

                {/* Row 3: search + status chips — only when connected */}
                {isConfigured === true && <div style={{
                    display: "flex", gap: 8, alignItems: "center",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    padding: "10px 0",
                    marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28,
                    background: "rgba(0,0,0,0.15)",
                }}>
                    <form onSubmit={handleSearch} style={{ display: "flex", gap: 0, flexShrink: 0 }}>
                        <input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search by Order ID…"
                            style={{
                                padding: "7px 12px", fontSize: 12,
                                background: "rgba(0,0,0,0.2)",
                                border: "1px solid rgba(255,255,255,0.15)", borderRight: "none",
                                borderRadius: `${T.r8} 0 0 ${T.r8}`, color: "#fff",
                                outline: "none", width: 190, fontFamily: "inherit",
                            }}
                        />
                        <button type="submit" style={{
                            padding: "7px 11px", background: "rgba(255,255,255,0.15)",
                            border: "1px solid rgba(255,255,255,0.15)", borderLeft: "none",
                            borderRadius: `0 ${T.r8} ${T.r8} 0`,
                            cursor: "pointer", display: "flex", alignItems: "center",
                        }}>
                            <Icon name="search" size={13} color="#fff" />
                        </button>
                    </form>
                    {searchInput && (
                        <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{
                            padding: "6px 10px", background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.15)", borderRadius: T.r8,
                            color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12,
                            fontFamily: "inherit", flexShrink: 0,
                        }}>✕</button>
                    )}
                    <div style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none", flex: 1 }}>
                        {STATUS_FILTERS.map(f => {
                            const s = DARAZ_STATUS[f.value] || DARAZ_STATUS.pending;
                            const active = statusFilter === f.value;
                            return (
                                <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{
                                    display: "inline-flex", alignItems: "center", gap: 5,
                                    padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                    background: active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)",
                                    color: active ? "#fff" : "rgba(255,255,255,0.55)",
                                    border: `1px solid ${active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                                    cursor: "pointer", fontFamily: "inherit",
                                    whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
                                }}>
                                    {f.value !== "all" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />}
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => fetchOrders(pagination.page)} title="Refresh" style={{
                        padding: "7px 10px", background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.15)", borderRadius: T.r8,
                        cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0,
                    }}>
                        <Icon name="refresh" size={14} color="rgba(255,255,255,0.85)" />
                    </button>
                </div>}

                {/* DataMoat notice — only when connected */}
                {isConfigured === true && <div style={{
                    marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28,
                    paddingTop: 7, paddingBottom: 7,
                    background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.5,
                }}>
                    ⚠️ Customer names &amp; phones may be masked by Daraz's DataMoat privacy system. Apply for <strong style={{ color: "rgba(255,255,255,0.85)" }}>Sensitive Data Privilege</strong> in your Daraz App Console. Search is limited to Order ID.
                </div>}
            </div>

            {/* ── BODY ── */}
            <div style={{ flex: 1, overflow: "auto" }}>
                {isConfigured === false ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "40px 24px" }}>
                        <div style={{ width: "100%", maxWidth: 520, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 42, height: 42, borderRadius: T.r10, background: "linear-gradient(135deg,#F57D29,#E85D04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(245,125,41,0.4)" }}>🏪</div>
                                <div>
                                    <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Connect Your Daraz Store</div>
                                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Get credentials from open.daraz.com → My Apps → your app</div>
                                </div>
                            </div>
                            <form onSubmit={handleConnectOAuth} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Region</div>
                                    <select value={creds.region} onChange={e => setCreds(p => ({ ...p, region: e.target.value }))} style={{ width: "100%", padding: "9px 12px", fontSize: 13, background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRadius: 8, color: T.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}>
                                        <option value="pk">Pakistan (pk)</option>
                                        <option value="bd">Bangladesh (bd)</option>
                                        <option value="lk">Sri Lanka (lk)</option>
                                        <option value="my">Malaysia (my)</option>
                                        <option value="sg">Singapore (sg)</option>
                                    </select>
                                </div>
                                <div>
                                    <button type="button" onClick={() => setShowManualToken(p => !p)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "#F57D29", fontFamily: "inherit", textDecoration: "underline" }}>
                                        {showManualToken ? "▾ Hide manual token" : "▸ Have an Access Token? Paste it manually"}
                                    </button>
                                    {showManualToken && (
                                        <input type="password" value={creds.accessToken} onChange={e => setCreds(p => ({ ...p, accessToken: e.target.value }))} placeholder="Paste Access Token from Daraz API Explorer" style={{ width: "100%", marginTop: 8, padding: "9px 12px", fontSize: 13, background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRadius: 8, color: T.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                                    )}
                                </div>
                                {saveMsg && (
                                    <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 12, background: saveMsg.success ? T.greenBg : T.redBg, border: `1px solid ${saveMsg.success ? T.green : T.red}`, color: saveMsg.success ? T.green : T.red }}>{saveMsg.text}</div>
                                )}
                                <button type="submit" disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: saving ? T.bgHigh : "linear-gradient(135deg,#F57D29,#E85D04)", color: saving ? T.textMuted : "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                                    {saving ? (creds.accessToken.trim() ? "Connecting…" : "Redirecting to Daraz…") : (creds.accessToken.trim() ? "✓ Save & Connect" : "🔗 Connect with Daraz")}
                                </button>
                            </form>
                            <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(245,125,41,0.06)", borderRadius: 8, fontSize: 11, color: "#F57D29", lineHeight: 1.7 }}>
                                Select your region and click <strong>Connect with Daraz</strong> — you'll be redirected to log in with your Daraz seller account and authorize access.
                            </div>
                        </div>
                    </div>
                ) : error ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.red, marginBottom: 8 }}>Connection Error</div>
                        <div style={{ fontSize: 13, color: T.textMuted, maxWidth: 520, lineHeight: 1.6 }}>{error}</div>
                        <div style={{ marginTop: 20 }}><GradientButton variant="secondary" icon="refresh" onClick={() => fetchOrders(1)}>Retry</GradientButton></div>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ position: "sticky", top: 0, zIndex: 2 }}>
                                <th style={thStyle}>Order ID</th>
                                <th style={thStyle}>Customer</th>
                                <th style={thStyle}>City</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Product</th>
                                <th style={thStyle}>Total</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                                : orders.length === 0
                                    ? <tr><td colSpan={8} style={{ padding: "60px 40px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>No orders found{search ? ` for ID "${search}"` : ""}.</td></tr>
                                    : orders.map(order => (
                                        <React.Fragment key={order.id}>
                                            <tr
                                                onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}
                                                style={{ cursor: "pointer", background: expandedRow === order.id ? "rgba(245,125,41,0.07)" : "transparent", transition: "background 0.12s" }}
                                                onMouseEnter={e => { if (expandedRow !== order.id) e.currentTarget.style.background = T.bgCard; }}
                                                onMouseLeave={e => { if (expandedRow !== order.id) e.currentTarget.style.background = "transparent"; }}
                                            >
                                                <td style={tdStyle}>
                                                    <span style={{ fontWeight: 700, color: "#F57D29", background: "rgba(245,125,41,0.1)", padding: "2px 8px", borderRadius: T.r4, fontSize: 12, fontFamily: "monospace" }}>#{order.number}</span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                                                    {order.customerPhone && <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>{order.customerPhone}</div>}
                                                </td>
                                                <td style={{ ...tdStyle, color: T.textMuted }}>{order.city || "—"}</td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>{formatDate(order.date)}</td>
                                                <td style={{ ...tdStyle, maxWidth: 200 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.primaryProduct || "—"}</div>
                                                    <div style={{ fontSize: 10, color: T.textFaint, marginTop: 2 }}>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</div>
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: "#F57D29", whiteSpace: "nowrap" }}>{formatCurrency(order.total)}</td>
                                                <td style={tdStyle}><StatusBadge status={order.status} /></td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted }}>{order.paymentMethod || "—"}</td>
                                            </tr>
                                            {expandedRow === order.id && (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: "0 16px 16px", background: "rgba(245,125,41,0.04)" }}>
                                                        <div style={{ border: "1px solid rgba(245,125,41,0.25)", borderRadius: T.r10, overflow: "hidden", background: T.bgCard }}>
                                                            <div style={{ padding: "10px 16px", background: "rgba(245,125,41,0.07)", borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: "#F57D29", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                                                Order Items · #{order.number}
                                                            </div>
                                                            {order.items.length === 0 ? (
                                                                <div style={{ padding: 16, fontSize: 12, color: T.textMuted }}>Item details not included in this response.</div>
                                                            ) : order.items.map((item, i) => (
                                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < order.items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</div>
                                                                        {item.sku && <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>SKU: {item.sku}</div>}
                                                                    </div>
                                                                    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                                                                        <div>
                                                                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Status</div>
                                                                            <div style={{ fontSize: 11, color: T.textMuted }}>{item.status || "—"}</div>
                                                                        </div>
                                                                        <span style={{ fontSize: 12, color: T.textMuted }}>×{item.quantity}</span>
                                                                        <span style={{ fontSize: 13, fontWeight: 700, color: "#F57D29" }}>{formatCurrency(item.subtotal)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid rgba(245,125,41,0.2)", background: "rgba(0,0,0,0.04)", gap: 24, alignItems: "center" }}>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>Order Total</span>
                                                                <span style={{ fontSize: 16, fontWeight: 800, color: "#F57D29" }}>{formatCurrency(order.total)}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                            }
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── PAGINATION ── */}
            {!error && !loading && pagination.totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: `1px solid ${T.border}`, background: T.bgCard, flexShrink: 0, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ fontSize: 12, color: T.textMuted }}>
                        Showing {((pagination.page - 1) * pagination.perPage) + 1}–{Math.min(pagination.page * pagination.perPage, pagination.totalOrders)} of <strong style={{ color: T.text }}>{pagination.totalOrders.toLocaleString()}</strong> orders
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button onClick={() => goToPage(1)} disabled={pagination.page === 1} style={paginBtnStyle(pagination.page === 1)}>«</button>
                        <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} style={paginBtnStyle(pagination.page === 1)}>‹</button>
                        {getPageRange(pagination.page, pagination.totalPages).map((p, i) =>
                            p === "..." ? <span key={`e${i}`} style={{ padding: "0 8px", color: T.textFaint, fontSize: 13 }}>…</span> : (
                                <button key={p} onClick={() => goToPage(p)} style={{ ...paginBtnStyle(false), background: p === pagination.page ? "linear-gradient(135deg,#F57D29,#E85D04)" : T.bgElev, color: p === pagination.page ? "#fff" : T.textMuted, fontWeight: p === pagination.page ? 700 : 500, border: `1px solid ${p === pagination.page ? "transparent" : T.borderMid}` }}>{p}</button>
                            )
                        )}
                        <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} style={paginBtnStyle(pagination.page === pagination.totalPages)}>›</button>
                        <button onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages} style={paginBtnStyle(pagination.page === pagination.totalPages)}>»</button>
                    </div>
                </div>
            )}

            <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
        </div>
    );
}
