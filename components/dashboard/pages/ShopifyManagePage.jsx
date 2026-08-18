"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton } from "../Primitives";
import { supabase, getCurrentUserId } from "@/lib/supabase";

// ─── Shopify brand colors ───────────────────────────────────────────────────
const SHOPIFY_GREEN = "#96BF48";
const SHOPIFY_DARK = "#5E8E3E";
const SHOPIFY_GRAD = "linear-gradient(135deg, #96BF48 0%, #5E8E3E 100%)";

// ─── Shopify-specific status config ─────────────────────────────────────────
const SHOPIFY_STATUS = {
    pending: { label: "Pending", bg: T.yellowBg, color: T.yellow, dot: T.yellow },
    processing: { label: "Processing", bg: T.blueBg, color: T.blue, dot: T.blue },
    delivered: { label: "Fulfilled", bg: T.greenBg, color: T.green, dot: T.green },
    cancelled: { label: "Cancelled", bg: T.redBg, color: T.red, dot: T.red },
    refunded: { label: "Refunded", bg: "rgba(251,191,36,0.12)", color: T.yellow, dot: T.yellow },
};

function StatusBadge({ status }) {
    const s = SHOPIFY_STATUS[status] || SHOPIFY_STATUS["pending"];
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

function formatCurrency(amount, currency = "PKR") {
    if (!amount && amount !== 0) return "—";
    if (currency === "PKR") return `Rs ${Number(amount).toLocaleString()}`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " +
        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function SkeletonRow() {
    return (
        <tr>
            {[100, 160, 100, 130, 70, 90, 100].map((w, i) => (
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
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
    { value: "cancelled", label: "Cancelled" },
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

export default function ShopifyManagePage({ onBack }) {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, perPage: 50, totalOrders: 0, totalPages: 1 });
    const [cursors, setCursors] = useState({ next: null, prev: null, history: { 1: null } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expandedRow, setExpandedRow] = useState(null);

    // ─── Credential state ─────────────────────────────────────────────────────
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({ domain: "" });

    const fetchConfig = async () => {
        try {
            const userId = getCurrentUserId();
            const { data } = await supabase
                .from('users')
                .select('shopify_store_domain')
                .eq('id', userId)
                .single();
            if (data) {
                setConfig({ domain: data.shopify_store_domain || "" });
            }
        } catch (e) {
            console.error("Failed to fetch Shopify config:", e);
        }
    };

    const handleConnectOAuth = () => {
        const domain = config.domain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!domain) return;
        setIsSaving(true);
        const userId = getCurrentUserId();
        window.location.href = `/api/shopify/install?shop=${encodeURIComponent(domain)}&userId=${encodeURIComponent(userId)}`;
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect Shopify? Your stored credentials will be removed.')) return;
        const userId = getCurrentUserId();
        const res = await fetch('/api/shopify/save-credentials', {
            method: 'DELETE',
            headers: { 'x-user-id': userId },
        });
        if (res.ok) {
            setConfig({ domain: "" });
            setSaveMsg(null);
            fetchOrders(1);
        }
    };

    const fetchOrders = useCallback(async (page = 1, pageInfo = null, perPageOverride = null) => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const perPage = perPageOverride ?? pagination.perPage;
            const params = new URLSearchParams({
                page: page.toString(),
                perPage: perPage.toString(),
                status: statusFilter,
                ...(search ? { search } : {}),
                ...(pageInfo ? { pageInfo } : {}),
            });
            const res = await fetch(`/api/shopify/orders?${params}`, {
                headers: { 'x-user-id': userId },
            });
            const data = await res.json();

            if (!data.configured) { setError("not_configured"); return; }
            if (data.error) { setError(data.error); return; }

            setOrders(data.orders || []);
            setPagination(prev => ({ ...(data.pagination || prev), perPage }));
            setCursors(prev => ({
                next: data.nextPageInfo || null,
                prev: data.prevPageInfo || null,
                history: { ...prev.history, [page + 1]: data.nextPageInfo, [page - 1]: prev.history[page - 1] },
            }));
        } catch (e) {
            setError("Failed to fetch orders: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, pagination.perPage]);

    useEffect(() => { fetchConfig(); fetchOrders(1); }, []);
    useEffect(() => { fetchOrders(1); }, [search, statusFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput.trim());
    };

    const goToPage = (p) => {
        if (p < 1 || p > pagination.totalPages) return;
        const cursor = cursors.history[p] ?? null;
        fetchOrders(p, cursor);
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
                background: "linear-gradient(135deg, #2d4a1a 0%, #96BF48 55%, #5E8E3E 100%)",
                padding: "18px 28px 0",
                flexShrink: 0,
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 10, right: 120, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

                {/* Row 1: back + action buttons */}
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {saveMsg && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: saveMsg.type === "success" ? "#bbf7d0" : "#fca5a5" }}>{saveMsg.text}</span>
                        )}
                        {config.domain && !isConfiguring && (
                            <button onClick={handleDisconnect} style={{
                                padding: "5px 12px", borderRadius: T.r8, fontSize: 12, fontWeight: 600,
                                background: "rgba(248,113,113,0.15)", color: "#fca5a5",
                                border: "1px solid rgba(248,113,113,0.3)",
                                cursor: "pointer", fontFamily: "inherit",
                            }}>Disconnect</button>
                        )}
                        <button onClick={() => { setSaveMsg(null); setIsConfiguring(v => !v); }} style={{
                            padding: "5px 12px", borderRadius: T.r8, fontSize: 12, fontWeight: 600,
                            background: "rgba(255,255,255,0.15)", color: "#fff",
                            border: "1px solid rgba(255,255,255,0.25)",
                            cursor: "pointer", fontFamily: "inherit",
                        }}>{isConfiguring ? "Cancel" : config.domain ? "Edit Credentials" : "Connect Store"}</button>
                    </div>
                </div>

                {/* Row 2: brand */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, position: "relative" }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 12,
                        background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                    }}>🏬</div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.2 }}>Shopify</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
                            {loading ? "Loading…" : `${(pagination.totalOrders || 0).toLocaleString()} total orders`}
                        </div>
                    </div>
                </div>

                {/* Row 3: search + chips (hidden when configuring) */}
                {!isConfiguring && (
                    <div style={{
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
                                placeholder="Search by order # or email…"
                                style={{
                                    padding: "7px 12px", fontSize: 12,
                                    background: "rgba(0,0,0,0.2)",
                                    border: "1px solid rgba(255,255,255,0.15)", borderRight: "none",
                                    borderRadius: `${T.r8} 0 0 ${T.r8}`, color: "#fff",
                                    outline: "none", width: 200, fontFamily: "inherit",
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
                                const s = SHOPIFY_STATUS[f.value] || SHOPIFY_STATUS.pending;
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
                    </div>
                )}
            </div>

            {/* ── BODY ── */}
            {isConfiguring ? (
                <div style={{ flex: 1, padding: 40, background: T.bgMain, overflow: "auto" }}>
                    <div style={{ maxWidth: 580, margin: "0 auto", background: T.bgCard, borderRadius: T.r12, border: `1px solid ${T.border}`, padding: 32 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 42, height: 42, borderRadius: T.r10, background: SHOPIFY_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(150,191,72,0.4)" }}>🏬</div>
                            <div>
                                <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Connect Your Shopify Store</div>
                                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Enter your store domain and click Connect — you'll be redirected to authorize</div>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Store Domain</div>
                                <input
                                    type="text"
                                    value={config.domain}
                                    onChange={e => setConfig({ ...config, domain: e.target.value.trim() })}
                                    placeholder="your-store.myshopify.com"
                                    style={{ padding: "10px 14px", borderRadius: T.r8, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box" }}
                                />
                                <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>Custom domains work too — we'll resolve them automatically</div>
                            </div>
                        </div>

                        {saveMsg && (
                            <div style={{ padding: "10px 14px", borderRadius: T.r8, marginBottom: 16, fontSize: 13, background: saveMsg.type === "success" ? T.greenBg : T.redBg, color: saveMsg.type === "success" ? T.green : T.red, border: `1px solid ${saveMsg.type === "success" ? T.green : T.red}44` }}>{saveMsg.text}</div>
                        )}

                        <div style={{ display: "flex", gap: 12 }}>
                            <button
                                onClick={handleConnectOAuth}
                                disabled={isSaving || !config.domain.trim()}
                                style={{ padding: "10px 24px", borderRadius: T.r8, fontSize: 13, fontWeight: 700, background: (isSaving || !config.domain.trim()) ? T.bgHigh : SHOPIFY_GRAD, color: (isSaving || !config.domain.trim()) ? T.textMuted : "#fff", border: "none", cursor: (isSaving || !config.domain.trim()) ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(150,191,72,0.35)", fontFamily: "inherit" }}
                            >
                                {isSaving ? "Redirecting…" : "🛍 Connect with Shopify"}
                            </button>
                            <GradientButton variant="secondary" onClick={() => { setIsConfiguring(false); setSaveMsg(null); }}>Cancel</GradientButton>
                        </div>

                        <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(150,191,72,0.06)", borderRadius: 8, fontSize: 11, color: SHOPIFY_GREEN, lineHeight: 1.7 }}>
                            You'll be redirected to your Shopify store to approve access. No app creation or token copying needed.
                        </div>

                        <div style={{ marginTop: 18, padding: "16px 18px", background: "rgba(37,211,102,0.05)", borderRadius: T.r10, border: "1px solid rgba(37,211,102,0.2)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "#25D366", marginBottom: 8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L0 24l6.335-1.507A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.651-.502-5.176-1.379l-.371-.22-3.762.895.952-3.671-.242-.379A9.959 9.959 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                Auto WhatsApp Notifications
                            </div>
                            <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.7 }}>
                                WhatsApp notifications are <strong style={{ color: T.text }}>automatically active</strong> for Shopify. When you connect your store, Zyro registers webhooks that fire for every order event:
                            </div>
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                                {[
                                    "New order → customer gets order confirmation + COD YES/NO prompt",
                                    "Order paid → customer gets payment received notification",
                                    "Order fulfilled → customer gets shipping confirmation",
                                    "Order cancelled → customer gets cancellation notice",
                                    "Every new order → you get a merchant alert on your WhatsApp",
                                ].map((t, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11, color: T.textMuted }}>
                                        <span style={{ color: "#25D366", flexShrink: 0, marginTop: 1 }}>✓</span>
                                        {t}
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 10, fontSize: 11, color: T.textFaint }}>Requires WhatsApp to be configured in Settings → WhatsApp.</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, overflow: "auto" }}>
                    {error === "not_configured" ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>🏬</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>Shopify Not Connected</div>
                            <div style={{ fontSize: 13, color: T.textMuted, maxWidth: 400, lineHeight: 1.6, marginBottom: 20 }}>Add your Shopify store domain and access token to start syncing orders.</div>
                            <button onClick={() => setIsConfiguring(true)} style={{ padding: "10px 20px", borderRadius: T.r8, fontSize: 13, fontWeight: 700, background: SHOPIFY_GRAD, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(150,191,72,0.35)", fontFamily: "inherit" }}>Configure Now</button>
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
                                    <th style={thStyle}>Order #</th>
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
                                        ? <tr><td colSpan={8} style={{ padding: "60px 40px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>No orders found{search ? ` for "${search}"` : ""}.</td></tr>
                                        : orders.map(order => (
                                            <React.Fragment key={order.id}>
                                                <tr
                                                    onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}
                                                    style={{ cursor: "pointer", background: expandedRow === order.id ? "rgba(150,191,72,0.07)" : "transparent", transition: "background 0.12s" }}
                                                    onMouseEnter={e => { if (expandedRow !== order.id) e.currentTarget.style.background = T.bgCard; }}
                                                    onMouseLeave={e => { if (expandedRow !== order.id) e.currentTarget.style.background = "transparent"; }}
                                                >
                                                    <td style={tdStyle}>
                                                        <span style={{ fontWeight: 700, color: SHOPIFY_GREEN, background: "rgba(150,191,72,0.1)", padding: "2px 8px", borderRadius: T.r4, fontSize: 12, fontFamily: "monospace" }}>#{order.number}</span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                                                        {order.customerEmail && <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>{order.customerEmail}</div>}
                                                    </td>
                                                    <td style={{ ...tdStyle, color: T.textMuted }}>{order.city || "—"}</td>
                                                    <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>{formatDate(order.date)}</td>
                                                    <td style={{ ...tdStyle, maxWidth: 200 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.primaryProduct || "—"}</div>
                                                        <div style={{ fontSize: 10, color: T.textFaint, marginTop: 2 }}>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</div>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontWeight: 700, color: SHOPIFY_GREEN, whiteSpace: "nowrap" }}>{formatCurrency(order.total, order.currency)}</td>
                                                    <td style={tdStyle}><StatusBadge status={order.status} /></td>
                                                    <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted }}>{order.paymentMethod || "—"}</td>
                                                </tr>
                                                {expandedRow === order.id && (
                                                    <tr>
                                                        <td colSpan={8} style={{ padding: "0 16px 16px", background: "rgba(150,191,72,0.04)" }}>
                                                            <div style={{ border: "1px solid rgba(150,191,72,0.25)", borderRadius: T.r10, overflow: "hidden", background: T.bgCard }}>
                                                                <div style={{ padding: "10px 16px", background: "rgba(150,191,72,0.07)", borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: SHOPIFY_GREEN, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                                                    Order Items · #{order.number}
                                                                </div>
                                                                {order.items.length === 0 ? (
                                                                    <div style={{ padding: 16, fontSize: 12, color: T.textMuted }}>No item details available.</div>
                                                                ) : order.items.map((item, i) => (
                                                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < order.items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</div>
                                                                            <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
                                                                                {item.sku && <span style={{ fontSize: 11, color: T.textFaint }}>SKU: {item.sku}</span>}
                                                                                {item.variant && <span style={{ fontSize: 11, color: T.textFaint }}>{item.variant}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                                                                            <span style={{ fontSize: 12, color: T.textMuted }}>×{item.quantity}</span>
                                                                            <span style={{ fontSize: 12, color: T.textFaint }}>{formatCurrency(item.price, order.currency)} each</span>
                                                                            <span style={{ fontSize: 13, fontWeight: 700, color: SHOPIFY_GREEN }}>{formatCurrency(item.subtotal, order.currency)}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid rgba(150,191,72,0.2)", background: "rgba(0,0,0,0.04)", gap: 16, flexWrap: "wrap" }}>
                                                                    <div style={{ display: "flex", gap: 8 }}>
                                                                        {order.customerPhone ? (
                                                                            <a
                                                                                href={`https://wa.me/${order.customerPhone.replace(/\D/g, '').replace(/^0/, '92')}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: T.r8, background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                                                                            >
                                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L0 24l6.335-1.507A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.651-.502-5.176-1.379l-.371-.22-3.762.895.952-3.671-.242-.379A9.959 9.959 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                                                                Contact Customer
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ fontSize: 11, color: T.textFaint }}>No phone on file</span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>Order Total</span>
                                                                        <span style={{ fontSize: 16, fontWeight: 800, color: SHOPIFY_GREEN }}>{formatCurrency(order.total, order.currency)}</span>
                                                                    </div>
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
            )}

            {/* ── PAGINATION ── */}
            {!isConfiguring && !error && !loading && pagination.totalOrders > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: `1px solid ${T.border}`, background: T.bgCard, flexShrink: 0, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: T.textMuted }}>
                            Showing {((pagination.page - 1) * pagination.perPage) + 1}–{Math.min(pagination.page * pagination.perPage, pagination.totalOrders)} of <strong style={{ color: T.text }}>{pagination.totalOrders.toLocaleString()}</strong> orders
                        </span>
                        <select
                            value={pagination.perPage}
                            onChange={e => {
                                const newPerPage = parseInt(e.target.value, 10);
                                setPagination(p => ({ ...p, perPage: newPerPage, page: 1 }));
                                setCursors({ next: null, prev: null, history: { 1: null } });
                                fetchOrders(1, null, newPerPage);
                            }}
                            style={{ fontSize: 12, padding: "3px 6px", background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRadius: T.r6, color: T.textMuted, fontFamily: "inherit", cursor: "pointer" }}
                        >
                            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                        </select>
                    </div>
                    {pagination.totalPages > 1 && (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button onClick={() => goToPage(1)} disabled={pagination.page === 1} style={paginBtnStyle(pagination.page === 1)}>«</button>
                            <button onClick={() => goToPage(pagination.page - 1)} disabled={!cursors.prev && pagination.page === 1} style={paginBtnStyle(!cursors.prev && pagination.page === 1)}>‹</button>
                            {getPageRange(pagination.page, pagination.totalPages).map((p, i) =>
                                p === "..." ? <span key={`e${i}`} style={{ padding: "0 8px", color: T.textFaint, fontSize: 13 }}>…</span> : (
                                    <button key={p} onClick={() => goToPage(p)} style={{ ...paginBtnStyle(false), background: p === pagination.page ? SHOPIFY_GRAD : T.bgElev, color: p === pagination.page ? "#fff" : T.textMuted, fontWeight: p === pagination.page ? 700 : 500, border: `1px solid ${p === pagination.page ? "transparent" : T.borderMid}` }}>{p}</button>
                                )
                            )}
                            <button onClick={() => { if (cursors.next) fetchOrders(pagination.page + 1, cursors.next); }} disabled={!cursors.next} style={paginBtnStyle(!cursors.next)}>›</button>
                            <button onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages} style={paginBtnStyle(pagination.page === pagination.totalPages)}>»</button>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
        </div>
    );
}
