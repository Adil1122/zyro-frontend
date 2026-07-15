"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card } from "../Primitives";
import { getCurrentUserId, supabase } from "@/lib/supabase";

const TCS_STATUS = {
    pending:    { label: "Pending",    bg: T.yellowBg,               color: T.yellow, dot: T.yellow },
    processing: { label: "In Transit", bg: T.blueBg,                 color: T.blue,   dot: T.blue   },
    "on-hold":  { label: "On Hold",    bg: "rgba(167,139,250,0.15)", color: T.purple, dot: T.purple },
    completed:  { label: "Delivered",  bg: T.greenBg,                color: T.green,  dot: T.green  },
    cancelled:  { label: "Returned",   bg: T.redBg,                  color: T.red,    dot: T.red    },
    any:        { label: "All",        bg: T.bgElev,                 color: T.textMuted, dot: T.textFaint },
};

function StatusBadge({ status }) {
    const s = TCS_STATUS[status] || TCS_STATUS["pending"];
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
    return `Rs ${Number(amount).toLocaleString()}`;
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
            {[120, 150, 100, 120, 90, 80, 100].map((w, i) => (
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
    { value: "any",        label: "All" },
    { value: "completed",  label: "Delivered" },
    { value: "processing", label: "In Transit" },
    { value: "pending",    label: "Pending" },
    { value: "cancelled",  label: "Returned" },
];

const FIELD = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>{label}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                padding: "10px 14px", borderRadius: T.r8, background: T.bgElev,
                border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14,
                fontFamily: type === "password" ? "monospace" : "inherit", outline: "none",
            }}
        />
    </div>
);

export default function TCSManagePage({ onBack }) {
    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("any");
    const [expandedRow, setExpandedRow] = useState(null);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [trackingCN, setTrackingCN] = useState("");
    const [trackResult, setTrackResult] = useState(null);
    const [isTracking, setIsTracking] = useState(false);

    const [creds, setCreds] = useState({ apiKey: "", apiPassword: "", costCentreCode: "" });

    const fetchConfig = async () => {
        try {
            const userId = getCurrentUserId();
            const { data } = await supabase
                .from('users')
                .select('tcs_api_key, tcs_api_password, tcs_cost_centre_code')
                .eq('id', userId)
                .single();
            if (data) {
                setCreds({
                    apiKey: data.tcs_api_key || "",
                    apiPassword: data.tcs_api_password || "",
                    costCentreCode: data.tcs_cost_centre_code || "",
                });
            }
        } catch (e) {
            console.error("Failed to fetch TCS config:", e);
        }
    };

    const fetchStats = async () => {
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/tcs/stats", { headers: { 'x-user-id': userId } });
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error("Failed to fetch TCS stats:", e);
        }
    };

    const fetchOrders = useCallback(async (page = 1) => {
        setOrdersLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                perPage: pagination.perPage.toString(),
                status: statusFilter,
                ...(search ? { search } : {}),
            });
            const userId = getCurrentUserId();
            const res = await fetch(`/api/tcs/orders?${params}`, { headers: { 'x-user-id': userId } });
            const data = await res.json();

            if (!data.configured) {
                setError("TCS is not configured. Please set your credentials below.");
                setIsConfiguring(true);
                return;
            }
            if (data.error) { setError(data.error); return; }
            setOrders(data.orders || []);
            setPagination(data.pagination || { page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
        } catch (e) {
            setError("Failed to fetch orders: " + e.message);
        } finally {
            setOrdersLoading(false);
            setLoading(false);
        }
    }, [search, statusFilter, pagination.perPage]);

    useEffect(() => { fetchConfig(); }, []);
    useEffect(() => { fetchStats(); fetchOrders(1); }, [search, statusFilter, fetchOrders]);

    const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput.trim()); };
    const goToPage = (p) => { if (p < 1 || p > pagination.totalPages) return; fetchOrders(p); };

    const handleSaveConfig = async () => {
        if (!creds.apiKey || !creds.apiPassword) {
            alert("API Key and API Password are required.");
            return;
        }
        setIsSaving(true);
        try {
            const userId = getCurrentUserId();
            const { error } = await supabase
                .from('users')
                .update({
                    tcs_api_key: creds.apiKey,
                    tcs_api_password: creds.apiPassword,
                    tcs_cost_centre_code: creds.costCentreCode,
                })
                .eq('id', userId);
            if (error) throw error;
            setIsConfiguring(false);
            fetchStats();
            fetchOrders(1);
        } catch (e) {
            alert("Failed to save: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTrack = async () => {
        if (!trackingCN.trim()) return;
        setIsTracking(true);
        setTrackResult(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch(`/api/tcs/track?cn=${encodeURIComponent(trackingCN.trim())}`, {
                headers: { 'x-user-id': userId },
            });
            const data = await res.json();
            setTrackResult(data);
        } catch (e) {
            setTrackResult({ error: e.message });
        } finally {
            setIsTracking(false);
        }
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
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* ── HEADER ── */}
            <div style={{
                padding: "24px 32px 0", borderBottom: `1px solid ${T.border}`,
                background: T.bgCard, flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <button onClick={onBack} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: T.bgElev, border: `1px solid ${T.borderMid}`,
                        color: T.textMuted, fontSize: 12, fontWeight: 600,
                        borderRadius: T.r8, padding: "6px 12px", cursor: "pointer",
                        transition: "all 0.15s", fontFamily: "inherit",
                    }}>
                        <Icon name="arrow-left" size={13} />
                        Back to Settings
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: T.r8,
                            background: "linear-gradient(135deg, #C8102E, #E63946)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 17, boxShadow: "0 2px 8px rgba(200,16,46,0.4)",
                        }}>🚚</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>
                                TCS Courier Management
                            </div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
                                {loading ? "Loading..." : `${pagination.totalOrders.toLocaleString()} shipments found`}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                        <GradientButton variant="secondary" icon="settings" size="sm" onClick={() => setIsConfiguring(!isConfiguring)}>
                            {isConfiguring ? "View Shipments" : "Configuration"}
                        </GradientButton>
                    </div>
                </div>

                {/* ── STATS ROW ── */}
                {stats?.configured && !stats?.error && (
                    <div style={{ display: "flex", gap: 24, paddingBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Shipments</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 4 }}>{stats.todayShipments}</div>
                        </div>
                        <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>COD Pending</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.yellow, marginTop: 4 }}>{formatCurrency(stats.codPending)}</div>
                        </div>
                        <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Recovered</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.green, marginTop: 4 }}>{formatCurrency(stats.codRecovered)}</div>
                        </div>
                        <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Shipments</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 4 }}>{stats.totalShipments}</div>
                        </div>
                    </div>
                )}

                {/* ── FILTERS ROW ── */}
                {!isConfiguring && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 16, flexWrap: "wrap" }}>
                        <form onSubmit={handleSearch} style={{ display: "flex", gap: 0 }}>
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search tracking # or customer…"
                                style={{
                                    padding: "7px 12px", fontSize: 13, background: T.bgElev,
                                    border: `1px solid ${T.borderMid}`, borderRight: "none",
                                    borderRadius: `${T.r8} 0 0 ${T.r8}`, color: T.text,
                                    outline: "none", width: 230, fontFamily: "inherit",
                                }}
                            />
                            <button type="submit" style={{
                                padding: "7px 13px", background: T.gradBtn, color: "#fff",
                                border: "none", borderRadius: `0 ${T.r8} ${T.r8} 0`,
                                cursor: "pointer", display: "flex", alignItems: "center",
                            }}>
                                <Icon name="search" size={13} color="#fff" />
                            </button>
                        </form>

                        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                            {STATUS_FILTERS.map(f => (
                                <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{
                                    padding: "6px 12px", borderRadius: T.r8, fontSize: 12, fontWeight: 600,
                                    background: statusFilter === f.value ? T.gradBtn : T.bgElev,
                                    color: statusFilter === f.value ? "#fff" : T.textMuted,
                                    border: `1px solid ${statusFilter === f.value ? "transparent" : T.borderMid}`,
                                    cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                                }}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── CONFIGURATION VIEW ── */}
            {isConfiguring ? (
                <div style={{ flex: 1, padding: 40, background: T.bgMain, overflow: "auto" }}>
                    <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

                        {/* Credentials Card */}
                        <Card style={{ padding: 32 }}>
                            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 6 }}>TCS Configuration</h3>
                            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 28 }}>
                                Enter your TCS COD portal credentials to enable shipment booking and tracking.
                            </p>

                            <FIELD
                                label="API Key (Portal Username)"
                                value={creds.apiKey}
                                onChange={v => setCreds(c => ({ ...c, apiKey: v }))}
                                placeholder="Your TCS portal email or API key"
                            />
                            <FIELD
                                label="API Password (Portal Password)"
                                value={creds.apiPassword}
                                onChange={v => setCreds(c => ({ ...c, apiPassword: v }))}
                                placeholder="Your TCS portal password"
                                type="password"
                            />
                            <FIELD
                                label="Cost Centre Code"
                                value={creds.costCentreCode}
                                onChange={v => setCreds(c => ({ ...c, costCentreCode: v }))}
                                placeholder="e.g. CC001 — from Setup → Cost Centre Details"
                            />

                            <div style={{ display: "flex", gap: 12 }}>
                                <GradientButton
                                    variant="primary"
                                    onClick={handleSaveConfig}
                                    disabled={isSaving || !creds.apiKey || !creds.apiPassword}
                                >
                                    {isSaving ? "Saving..." : "Save Configuration"}
                                </GradientButton>
                                <GradientButton variant="secondary" onClick={() => setIsConfiguring(false)}>
                                    Cancel
                                </GradientButton>
                            </div>

                            <div style={{ marginTop: 28, padding: 16, background: "rgba(200,16,46,0.05)", borderRadius: T.r10, border: `1px solid rgba(200,16,46,0.15)` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#C8102E", marginBottom: 8 }}>Where to find your credentials?</div>
                                <ol style={{ fontSize: 12, color: T.textMuted, paddingLeft: 18, lineHeight: 1.7, margin: 0 }}>
                                    <li>Log in to the <strong>TCS COD Portal</strong> at <code style={{ fontSize: 11, background: T.bgHigh, padding: "1px 4px", borderRadius: 3 }}>www.tcscourier.com/cod/</code></li>
                                    <li>Your <strong>portal email + password</strong> are the API Key and API Password.</li>
                                    <li>Go to <strong>Setup → Cost Centre Details</strong> to find your Cost Centre Code.</li>
                                    <li>For developer sandbox access, register at <code style={{ fontSize: 11, background: T.bgHigh, padding: "1px 4px", borderRadius: 3 }}>sandbox.tcscourier.com</code></li>
                                </ol>
                            </div>
                        </Card>

                        {/* Track Shipment Card */}
                        <Card style={{ padding: 24 }}>
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>Track a Shipment</h4>
                            <div style={{ display: "flex", gap: 0 }}>
                                <input
                                    value={trackingCN}
                                    onChange={e => setTrackingCN(e.target.value)}
                                    placeholder="Enter TCS consignment number…"
                                    onKeyDown={e => e.key === 'Enter' && handleTrack()}
                                    style={{
                                        flex: 1, padding: "9px 13px", fontSize: 13,
                                        background: T.bgElev, border: `1px solid ${T.borderMid}`,
                                        borderRight: "none", borderRadius: `${T.r8} 0 0 ${T.r8}`,
                                        color: T.text, outline: "none", fontFamily: "inherit",
                                    }}
                                />
                                <button onClick={handleTrack} disabled={isTracking || !trackingCN.trim()} style={{
                                    padding: "9px 18px", background: T.gradBtn, color: "#fff",
                                    border: "none", borderRadius: `0 ${T.r8} ${T.r8} 0`,
                                    cursor: isTracking ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
                                    fontFamily: "inherit",
                                }}>
                                    {isTracking ? "Tracking…" : "Track"}
                                </button>
                            </div>
                            {trackResult && (
                                <div style={{
                                    marginTop: 14, padding: 14, borderRadius: T.r8,
                                    background: trackResult.error ? T.redBg : T.bgElev,
                                    border: `1px solid ${trackResult.error ? T.red : T.border}`,
                                    fontSize: 13,
                                }}>
                                    {trackResult.error ? (
                                        <span style={{ color: T.red }}>{trackResult.error}</span>
                                    ) : (
                                        <pre style={{ margin: 0, fontSize: 12, color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                            {JSON.stringify(trackResult, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            ) : (
                /* ── ORDERS TABLE ── */
                <div style={{ flex: 1, overflow: "auto", background: T.bgMain }}>
                    {error ? (
                        <div style={{ padding: 80, textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                            <div style={{ color: T.red, fontWeight: 700, marginBottom: 16 }}>{error}</div>
                            <GradientButton variant="primary" onClick={() => setIsConfiguring(true)}>
                                Configure TCS
                            </GradientButton>
                        </div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Tracking #</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>City</th>
                                    <th style={thStyle}>Booked Date</th>
                                    <th style={thStyle}>Amount</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordersLoading
                                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                    : orders.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: "60px 40px", textAlign: "center", color: T.textMuted }}>
                                                    No TCS shipments found. Book your first shipment to get started.
                                                </td>
                                            </tr>
                                        )
                                        : orders.map(order => (
                                            <React.Fragment key={order.id}>
                                                <tr
                                                    onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}
                                                    style={{
                                                        cursor: "pointer",
                                                        background: expandedRow === order.id ? T.bgElev : "transparent",
                                                        transition: "background 0.1s",
                                                    }}
                                                    onMouseEnter={e => { if (expandedRow !== order.id) e.currentTarget.style.background = T.bgCard; }}
                                                    onMouseLeave={e => { if (expandedRow !== order.id) e.currentTarget.style.background = "transparent"; }}
                                                >
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
                                                    <tr>
                                                        <td colSpan={7} style={{ padding: "0 16px 16px", background: T.bgElev }}>
                                                            <Card style={{ padding: 0, background: T.bgCard, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                                                                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 0 }}>
                                                                    <div style={{ padding: 20, borderRight: `1px solid ${T.border}` }}>
                                                                        <div style={{ marginBottom: 20 }}>
                                                                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Delivery Address</div>
                                                                            <div style={{ fontSize: 13, lineHeight: 1.5, color: T.text }}>
                                                                                {order.address.shipping.address1}<br />
                                                                                {order.address.shipping.city}, Pakistan
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ marginBottom: 20 }}>
                                                                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Contact Details</div>
                                                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{order.customerName}</div>
                                                                            <div style={{ fontSize: 13, color: T.j200, fontWeight: 600, marginTop: 2 }}>{order.customerPhone}</div>
                                                                        </div>
                                                                        <div style={{ display: "flex", gap: 10 }}>
                                                                            <GradientButton
                                                                                variant="secondary" size="xs" icon="truck"
                                                                                onClick={() => { setTrackingCN(order.number); setIsConfiguring(true); setTrackResult(null); }}
                                                                            >
                                                                                Track
                                                                            </GradientButton>
                                                                            <GradientButton variant="secondary" size="xs" icon="whatsapp">WhatsApp</GradientButton>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                                                        <div style={{
                                                                            padding: "12px 20px", borderBottom: `1px solid ${T.border}`,
                                                                            fontSize: 10, fontWeight: 700, color: T.textFaint,
                                                                            textTransform: "uppercase", background: "rgba(0,0,0,0.02)",
                                                                        }}>
                                                                            Order Items ({order.itemCount})
                                                                        </div>
                                                                        <div style={{ flex: 1 }}>
                                                                            {order.items?.map((item, i) => (
                                                                                <div key={i} style={{
                                                                                    display: "flex", justifyContent: "space-between",
                                                                                    padding: "12px 20px", borderBottom: i < order.items.length - 1 ? `1px solid ${T.border}` : "none",
                                                                                }}>
                                                                                    <div>
                                                                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                                                                                        <div style={{ fontSize: 11, color: T.textFaint }}>Qty: {item.quantity}</div>
                                                                                    </div>
                                                                                    <div style={{ textAlign: "right" }}>
                                                                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.j200 }}>{formatCurrency(item.subtotal)}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, textAlign: "right", background: "rgba(0,0,0,0.01)" }}>
                                                                            <span style={{ fontSize: 11, color: T.textFaint, fontWeight: 600 }}>GRAND TOTAL: </span>
                                                                            <span style={{ fontSize: 15, fontWeight: 800, color: T.j200 }}>{formatCurrency(order.total)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Card>
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
            {!error && !loading && pagination.totalPages > 1 && !isConfiguring && (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 24px", borderTop: `1px solid ${T.border}`,
                    background: T.bgCard, flexShrink: 0,
                }}>
                    <div style={{ fontSize: 12, color: T.textMuted }}>
                        Showing {((pagination.page - 1) * pagination.perPage) + 1}–{Math.min(pagination.page * pagination.perPage, pagination.totalOrders)} of <strong>{pagination.totalOrders}</strong> shipments
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} style={paginBtnStyle(pagination.page === 1)}>Prev</button>
                        <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} style={paginBtnStyle(pagination.page === pagination.totalPages)}>Next</button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
            `}</style>
        </div>
    );
}

function paginBtnStyle(disabled) {
    return {
        padding: "6px 14px", borderRadius: T.r8, fontSize: 12, fontWeight: 600,
        background: T.bgElev, color: disabled ? T.textGhost : T.textMuted,
        border: `1px solid ${T.borderMid}`, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", transition: "all 0.15s",
    };
}
