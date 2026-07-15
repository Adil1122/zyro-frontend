"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card } from "../Primitives";
import { getCurrentUserId, supabase } from "@/lib/supabase";

const DHL_STATUS = {
    pending:    { label: "Pending",    bg: T.yellowBg, color: T.yellow, dot: T.yellow },
    processing: { label: "In Transit", bg: T.blueBg,   color: T.blue,   dot: T.blue },
    "on-hold":  { label: "On Hold",    bg: "rgba(167,139,250,0.15)", color: T.purple, dot: T.purple },
    completed:  { label: "Delivered",  bg: T.greenBg,  color: T.green,  dot: T.green },
    cancelled:  { label: "Exception",  bg: T.redBg,    color: T.red,    dot: T.red },
    any:        { label: "All",        bg: T.bgElev,   color: T.textMuted, dot: T.textFaint },
};

function StatusBadge({ status }) {
    const s = DHL_STATUS[status] || DHL_STATUS["pending"];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: T.r20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, border: `1px solid ${s.color}22`, whiteSpace: "nowrap" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />{s.label}
        </span>
    );
}

function formatCurrency(amount) { return `Rs ${Number(amount).toLocaleString()}`; }
function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " +
        dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function SkeletonRow() {
    return <tr>{[160, 150, 100, 120, 90, 80, 100].map((w, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
            <div style={{ height: 13, width: w, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
        </td>
    ))}</tr>;
}

const STATUS_FILTERS = [
    { value: "any",       label: "All" },
    { value: "completed", label: "Delivered" },
    { value: "processing",label: "In Transit" },
    { value: "pending",   label: "Pending" },
    { value: "cancelled", label: "Exception" },
];

const DHL_GRAD = "linear-gradient(135deg, #D40511 0%, #FFCC00 100%)";

export default function DHLManagePage({ onBack }) {
    const [stats,         setStats]         = useState(null);
    const [orders,        setOrders]        = useState([]);
    const [pagination,    setPagination]    = useState({ page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
    const [loading,       setLoading]       = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [error,         setError]         = useState(null);
    const [search,        setSearch]        = useState("");
    const [searchInput,   setSearchInput]   = useState("");
    const [statusFilter,  setStatusFilter]  = useState("any");
    const [expandedRow,   setExpandedRow]   = useState(null);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [apiKeyInput,     setApiKeyInput]     = useState("");
    const [apiSecretInput,  setApiSecretInput]  = useState("");
    const [accountInput,    setAccountInput]    = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const fetchConfig = async () => {
        try {
            const userId = getCurrentUserId();
            const { data } = await supabase.from('users').select('dhl_api_key, dhl_api_secret, dhl_account_number').eq('id', userId).single();
            if (data?.dhl_api_key)        setApiKeyInput(data.dhl_api_key);
            if (data?.dhl_api_secret)     setApiSecretInput(data.dhl_api_secret);
            if (data?.dhl_account_number) setAccountInput(data.dhl_account_number);
        } catch (e) { console.error("Failed to fetch DHL config:", e); }
    };

    const fetchStats = async () => {
        try {
            const userId = getCurrentUserId();
            const res  = await fetch("/api/dhl/stats", { headers: { 'x-user-id': userId } });
            const data = await res.json();
            setStats(data);
        } catch (e) { console.error("Failed to fetch DHL stats:", e); }
    };

    const fetchOrders = useCallback(async (page = 1) => {
        setOrdersLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: page.toString(), perPage: pagination.perPage.toString(), status: statusFilter, ...(search ? { search } : {}) });
            const userId = getCurrentUserId();
            const res  = await fetch(`/api/dhl/orders?${params}`, { headers: { 'x-user-id': userId } });
            const data = await res.json();
            if (!data.configured) { setError("DHL is not configured. Please add your credentials below."); return; }
            if (data.error)        { setError(data.error); return; }
            setOrders(data.orders || []);
            setPagination(data.pagination || { page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
        } catch (e) { setError("Failed to fetch orders: " + e.message); }
        finally { setOrdersLoading(false); setLoading(false); }
    }, [search, statusFilter, pagination.perPage]);

    useEffect(() => { fetchConfig(); }, []);
    useEffect(() => { fetchStats(); fetchOrders(1); }, [search, statusFilter, fetchOrders]);

    const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput.trim()); };
    const goToPage = (p) => { if (p < 1 || p > pagination.totalPages) return; fetchOrders(p); };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const userId = getCurrentUserId();
            const { error } = await supabase.from('users').update({ dhl_api_key: apiKeyInput, dhl_api_secret: apiSecretInput, dhl_account_number: accountInput }).eq('id', userId);
            if (error) throw error;
            setIsConfiguring(false);
            fetchStats(); fetchOrders(1);
        } catch (e) { alert("Failed to save: " + e.message); }
        finally { setIsSaving(false); }
    };

    const thStyle = { padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", background: T.bgElev };
    const tdStyle = { padding: "14px 16px", fontSize: 13, color: T.text, borderBottom: `1px solid ${T.border}`, verticalAlign: "middle" };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* HEADER */}
            <div style={{ padding: "24px 32px 0", borderBottom: `1px solid ${T.border}`, background: T.bgCard, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.textMuted, fontSize: 12, fontWeight: 600, borderRadius: T.r8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                        <Icon name="arrow-left" size={13} />Back to Settings
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: T.r8, background: DHL_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>✈️</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>DHL Express Management</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>{loading ? "Loading..." : `${pagination.totalOrders.toLocaleString()} shipments found`}</div>
                        </div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                        <GradientButton variant="secondary" icon="settings" size="sm" onClick={() => setIsConfiguring(!isConfiguring)}>
                            {isConfiguring ? "View Shipments" : "Configuration"}
                        </GradientButton>
                        {!isConfiguring && <GradientButton variant="primary" icon="plus" size="sm">Book Shipment</GradientButton>}
                    </div>
                </div>

                {stats?.configured && (
                    <div style={{ display: "flex", gap: 24, paddingBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Shipments</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 4 }}>{stats.todayShipments || 0}</div>
                        </div>
                        <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Shipments</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.j200, marginTop: 4 }}>{stats.totalShipments || 0}</div>
                        </div>
                    </div>
                )}

                <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 16, flexWrap: "wrap" }}>
                    <form onSubmit={handleSearch} style={{ display: "flex", gap: 0 }}>
                        <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search waybill # or customer…" style={{ padding: "7px 12px", fontSize: 13, background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRight: "none", borderRadius: `${T.r8} 0 0 ${T.r8}`, color: T.text, outline: "none", width: 230, fontFamily: "inherit" }} />
                        <button type="submit" style={{ padding: "7px 13px", background: T.gradBtn, color: "#fff", border: "none", borderRadius: `0 ${T.r8} ${T.r8} 0`, cursor: "pointer", display: "flex", alignItems: "center" }}>
                            <Icon name="search" size={13} color="#fff" />
                        </button>
                    </form>
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                        {STATUS_FILTERS.map(f => (
                            <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{ padding: "6px 12px", borderRadius: T.r8, fontSize: 12, fontWeight: 600, background: statusFilter === f.value ? T.gradBtn : T.bgElev, color: statusFilter === f.value ? "#fff" : T.textMuted, border: `1px solid ${statusFilter === f.value ? "transparent" : T.borderMid}`, cursor: "pointer", fontFamily: "inherit" }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CONFIGURATION VIEW */}
            {isConfiguring ? (
                <div style={{ flex: 1, padding: 40, background: T.bgMain, overflow: "auto" }}>
                    <Card style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>DHL Express Configuration</h3>
                        <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>Enter your MyDHL API credentials from the DHL Developer Portal.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>API Key</label>
                                <input type="text" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Your MyDHL API Key" style={{ padding: "10px 14px", borderRadius: T.r8, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>API Secret</label>
                                <input type="password" value={apiSecretInput} onChange={e => setApiSecretInput(e.target.value)} placeholder="Your MyDHL API Secret" style={{ padding: "10px 14px", borderRadius: T.r8, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>DHL Account Number</label>
                                <input type="text" value={accountInput} onChange={e => setAccountInput(e.target.value)} placeholder="e.g. 123456789" style={{ padding: "10px 14px", borderRadius: T.r8, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <GradientButton variant="primary" onClick={handleSaveConfig} disabled={isSaving || !apiKeyInput || !apiSecretInput || !accountInput}>{isSaving ? "Saving..." : "Save Configuration"}</GradientButton>
                            <GradientButton variant="secondary" onClick={() => setIsConfiguring(false)}>Cancel</GradientButton>
                        </div>
                        <div style={{ marginTop: 32, padding: 16, background: "rgba(92,168,124,0.05)", borderRadius: T.r10, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.j200, marginBottom: 6 }}>Setup Instructions</div>
                            <ol style={{ fontSize: 12, color: T.textMuted, paddingLeft: 18, lineHeight: 1.6 }}>
                                <li>Register at <strong>developer.dhl.com</strong></li>
                                <li>Create a new app and subscribe to <strong>MyDHL API</strong></li>
                                <li>Copy your <strong>Consumer Key</strong> (API Key) and <strong>Consumer Secret</strong> (API Secret)</li>
                                <li>Get your <strong>DHL Account Number</strong> from your DHL corporate account</li>
                            </ol>
                        </div>
                    </Card>
                </div>
            ) : (
                <div style={{ flex: 1, overflow: "auto", background: T.bgMain }}>
                    {error ? (
                        <div style={{ padding: 80, textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                            <div style={{ color: T.red, fontWeight: 700 }}>{error}</div>
                        </div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Waybill #</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>City</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Amount</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordersLoading
                                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                    : orders.length === 0
                                        ? <tr><td colSpan={7} style={{ padding: "60px 40px", textAlign: "center", color: T.textMuted }}>No DHL shipments found.</td></tr>
                                        : orders.map(order => (
                                            <React.Fragment key={order.id}>
                                                <tr onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)} style={{ cursor: "pointer", background: expandedRow === order.id ? T.bgElev : "transparent" }}
                                                    onMouseEnter={e => { if (expandedRow !== order.id) e.currentTarget.style.background = T.bgCard; }}
                                                    onMouseLeave={e => { if (expandedRow !== order.id) e.currentTarget.style.background = "transparent"; }}>
                                                    <td style={tdStyle}><span style={{ fontWeight: 700, color: T.j200 }}>{order.number}</span></td>
                                                    <td style={tdStyle}>
                                                        <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                                                        <div style={{ fontSize: 11, color: T.textFaint }}>{order.customerPhone}</div>
                                                    </td>
                                                    <td style={tdStyle}>{order.city}</td>
                                                    <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(order.date)}</td>
                                                    <td style={{ ...tdStyle, fontWeight: 700 }}>{formatCurrency(order.total)}</td>
                                                    <td style={tdStyle}><StatusBadge status={order.status} /></td>
                                                    <td style={tdStyle}>{order.paymentMethod}</td>
                                                </tr>
                                                {expandedRow === order.id && (
                                                    <tr><td colSpan={7} style={{ padding: "0 16px 16px", background: T.bgElev }}>
                                                        <Card style={{ padding: 20, background: T.bgCard, border: `1px solid ${T.border}` }}>
                                                            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
                                                                <div><strong>Delivery:</strong> {order.address.shipping.address1}, {order.address.shipping.city}</div>
                                                                <div style={{ marginTop: 8 }}><strong>Contact:</strong> {order.customerName} · {order.customerPhone}</div>
                                                            </div>
                                                            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                                                                <GradientButton variant="secondary" size="xs" icon="truck">Track</GradientButton>
                                                            </div>
                                                        </Card>
                                                    </td></tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                }
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {!error && !loading && pagination.totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: `1px solid ${T.border}`, background: T.bgCard, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: T.textMuted }}>Showing {((pagination.page - 1) * pagination.perPage) + 1}–{Math.min(pagination.page * pagination.perPage, pagination.totalOrders)} of <strong>{pagination.totalOrders}</strong> shipments</div>
                    <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} style={paginBtnStyle(pagination.page === 1)}>Prev</button>
                        <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} style={paginBtnStyle(pagination.page === pagination.totalPages)}>Next</button>
                    </div>
                </div>
            )}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
        </div>
    );
}

function paginBtnStyle(disabled) {
    return { padding: "6px 14px", borderRadius: T.r8, fontSize: 12, fontWeight: 600, background: T.bgElev, color: disabled ? T.textGhost : T.textMuted, border: `1px solid ${T.borderMid}`, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" };
}
