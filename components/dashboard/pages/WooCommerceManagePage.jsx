"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, PageHeader } from "../Primitives";
import { getCurrentUserId, supabase } from "@/lib/supabase";

// ─── Status badge config for WooCommerce statuses ──────────────────────────
const WC_STATUS = {
    pending: { label: "Pending", bg: T.yellowBg, color: T.yellow, dot: T.yellow },
    processing: { label: "Processing", bg: T.blueBg, color: T.blue, dot: T.blue },
    "on-hold": { label: "On Hold", bg: "rgba(167,139,250,0.15)", color: T.purple, dot: T.purple },
    completed: { label: "Completed", bg: T.greenBg, color: T.green, dot: T.green },
    cancelled: { label: "Cancelled", bg: T.redBg, color: T.red, dot: T.red },
    refunded: { label: "Refunded", bg: "rgba(251,191,36,0.12)", color: T.yellow, dot: T.yellow },
    failed: { label: "Failed", bg: T.redBg, color: T.red, dot: T.red },
    any: { label: "All", bg: T.bgElev, color: T.textMuted, dot: T.textFaint },
};

function StatusBadge({ status }) {
    const s = WC_STATUS[status] || WC_STATUS["pending"];
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
    if (currency === "PKR") return `Rs ${Number(amount).toLocaleString()}`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " +
        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── Skeleton row ───────────────────────────────────────────────────────────
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
    { value: "any", label: "All Orders" },
    { value: "processing", label: "Processing" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
    { value: "on-hold", label: "On Hold" },
];

export default function WooCommerceManagePage({ onBack }) {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("any");
    const [expandedRow, setExpandedRow] = useState(null);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({
        url: "",
        key: "",
        secret: ""
    });

    const fetchConfig = async () => {
        try {
            const userId = getCurrentUserId();
            const { data, error } = await supabase
                .from('users')
                .select('wc_store_url, wc_consumer_key, wc_consumer_secret')
                .eq('id', userId)
                .single();
            
            if (data) {
                setConfig({
                    url: data.wc_store_url || "",
                    key: data.wc_consumer_key || "",
                    secret: data.wc_consumer_secret || ""
                });
            }
        } catch (e) {
            console.error("Failed to fetch WooCommerce config:", e);
        }
    };

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
            const userId = getCurrentUserId();
            const res = await fetch(`/api/woocommerce/orders?${params}`, {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();

            if (!data.configured) {
                setError("WooCommerce is not configured. Please set your API credentials in .env.local and restart the server.");
                return;
            }
            if (data.error) {
                setError(data.error);
                return;
            }
            setOrders(data.orders || []);
            setPagination(data.pagination || { page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
        } catch (e) {
            setError("Failed to fetch orders: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, pagination.perPage]);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const userId = getCurrentUserId();
            const { error } = await supabase
                .from('users')
                .update({ 
                    wc_store_url: config.url,
                    wc_consumer_key: config.key,
                    wc_consumer_secret: config.secret
                })
                .eq('id', userId);

            if (error) throw error;
            setIsConfiguring(false);
            fetchOrders(1);
        } catch (e) {
            alert("Failed to save: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        fetchOrders(1);
    }, [search, statusFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput.trim());
    };

    const goToPage = (p) => {
        if (p < 1 || p > pagination.totalPages) return;
        fetchOrders(p);
    };

    // ─── Columns Header ───────────────────────────────────────────────────────
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
                    }}
                        onMouseEnter={e => e.currentTarget.style.color = T.text}
                        onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
                    >
                        <Icon name="arrow-left" size={13} />
                        Back to Settings
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: T.r8,
                            background: "linear-gradient(135deg, #7F54B3, #9B6DB5)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 17, boxShadow: "0 2px 8px rgba(127,84,179,0.4)",
                        }}>🛒</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>
                                WooCommerce Orders
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                        <GradientButton variant="secondary" icon="settings" size="sm" onClick={() => setIsConfiguring(!isConfiguring)}>
                            {isConfiguring ? "View Orders" : "Configuration"}
                        </GradientButton>
                    </div>
                </div>

                {/* ── FILTERS ROW ── */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 16, flexWrap: "wrap" }}>
                    {/* Search */}
                    <form onSubmit={handleSearch} style={{ display: "flex", gap: 0 }}>
                        <input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search order # or email…"
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

                    {searchInput && (
                        <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{
                            padding: "7px 10px", background: "transparent",
                            border: `1px solid ${T.borderMid}`, borderRadius: T.r8,
                            color: T.textMuted, cursor: "pointer", fontSize: 12,
                            fontFamily: "inherit",
                        }}>✕ Clear</button>
                    )}

                    {/* Status filter tabs */}
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
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

                    {/* Refresh */}
                    <button onClick={() => fetchOrders(pagination.page)} style={{
                        padding: "7px 10px", background: T.bgElev,
                        border: `1px solid ${T.borderMid}`, borderRadius: T.r8,
                        color: T.textMuted, cursor: "pointer", display: "flex",
                        alignItems: "center", transition: "all 0.15s",
                    }}
                        onMouseEnter={e => e.currentTarget.style.color = T.text}
                        onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
                    >
                        <Icon name="refresh" size={14} />
                    </button>
                </div>
            </div>

            {/* ── CONFIGURATION VIEW ── */}
            {isConfiguring ? (
                <div style={{ flex: 1, padding: 40, background: T.bgMain, overflow: "auto" }}>
                    <Card style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>WooCommerce Configuration</h3>
                        <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>
                            Enter your WooCommerce REST API credentials to sync your store data.
                        </p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>Store URL</label>
                                <input 
                                    type="text" 
                                    value={config.url} 
                                    onChange={e => setConfig({ ...config, url: e.target.value })}
                                    placeholder="https://your-store.com"
                                    style={{
                                        padding: "10px 14px", borderRadius: T.r8, background: T.bgElev,
                                        border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14,
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>Consumer Key</label>
                                <input 
                                    type="text" 
                                    value={config.key} 
                                    onChange={e => setConfig({ ...config, key: e.target.value })}
                                    placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    style={{
                                        padding: "10px 14px", borderRadius: T.r8, background: T.bgElev,
                                        border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14,
                                        fontFamily: "monospace", outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>Consumer Secret</label>
                                <input 
                                    type="password" 
                                    value={config.secret} 
                                    onChange={e => setConfig({ ...config, secret: e.target.value })}
                                    placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    style={{
                                        padding: "10px 14px", borderRadius: T.r8, background: T.bgElev,
                                        border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14,
                                        fontFamily: "monospace", outline: "none"
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                            <GradientButton variant="primary" onClick={handleSaveConfig} disabled={isSaving || !config.url || !config.key || !config.secret}>
                                {isSaving ? "Saving..." : "Save Connection"}
                            </GradientButton>
                            <GradientButton variant="secondary" onClick={() => setIsConfiguring(false)}>
                                Cancel
                            </GradientButton>
                        </div>

                        <div style={{ marginTop: 32, padding: 16, background: "rgba(127,84,179,0.05)", borderRadius: T.r10, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.purple, marginBottom: 6 }}>How to get these keys?</div>
                            <ol style={{ fontSize: 12, color: T.textMuted, paddingLeft: 18, lineHeight: 1.6 }}>
                                <li>Go to your <strong>WooCommerce Store Admin</strong>.</li>
                                <li>Navigate to <strong>WooCommerce → Settings → Advanced → REST API</strong>.</li>
                                <li>Click <strong>Add Key</strong> → Permissions: <strong>Read/Write</strong>.</li>
                                <li>Generate and copy the <strong>Consumer Key</strong> and <strong>Consumer Secret</strong>.</li>
                            </ol>
                        </div>
                    </Card>
                </div>
            ) : (
                /* ── TABLE BODY ── */
                <div style={{ flex: 1, overflow: "auto" }}>
                {error ? (
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", padding: "80px 40px", textAlign: "center",
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.red, marginBottom: 8 }}>Connection Error</div>
                        <div style={{ fontSize: 13, color: T.textMuted, maxWidth: 500, lineHeight: 1.6 }}>{error}</div>
                        <div style={{ marginTop: 20 }}>
                            <GradientButton variant="secondary" icon="refresh" onClick={() => fetchOrders(1)}>
                                Retry
                            </GradientButton>
                        </div>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Order #</th>
                                <th style={thStyle}>Customer</th>
                                <th style={thStyle}>City</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Items</th>
                                <th style={thStyle}>Total</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                                : orders.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={8} style={{ padding: "60px 40px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
                                                No orders found{search ? ` for "${search}"` : ""}.
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
                                                    transition: "background 0.12s",
                                                }}
                                                onMouseEnter={e => { if (expandedRow !== order.id) e.currentTarget.style.background = T.bgCard; }}
                                                onMouseLeave={e => { if (expandedRow !== order.id) e.currentTarget.style.background = "transparent"; }}
                                            >
                                                <td style={tdStyle}>
                                                    <span style={{ fontWeight: 700, color: T.j200 }}>#{order.number}</span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                                                    <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>{order.customerEmail}</div>
                                                </td>
                                                <td style={{ ...tdStyle, color: T.textMuted }}>{order.city || "—"}</td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>{formatDate(order.date)}</td>
                                                <td style={{ ...tdStyle, textAlign: "center" }}>
                                                    <span style={{
                                                        display: "inline-block", minWidth: 22, textAlign: "center",
                                                        background: T.bgHigh, borderRadius: T.r4,
                                                        padding: "2px 7px", fontSize: 12, fontWeight: 700, color: T.textMuted,
                                                    }}>{order.itemCount}</span>
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: 700, color: T.j200, whiteSpace: "nowrap" }}>
                                                    {formatCurrency(order.total, order.currency)}
                                                </td>
                                                <td style={tdStyle}>
                                                    <StatusBadge status={order.status} />
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted }}>{order.paymentMethod || "—"}</td>
                                            </tr>
                                            {/* ── Expanded row: Detailed Order View ── */}
                                            {expandedRow === order.id && (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: "0 16px 16px 16px", background: T.bgElev }}>
                                                        <div style={{
                                                            display: "grid", gridTemplateColumns: "320px 1fr", gap: 16,
                                                            border: `1px solid ${T.borderMid}`, borderRadius: T.r10,
                                                            overflow: "hidden", background: T.bgCard,
                                                        }}>
                                                            {/* LEFT: Customer Full Details */}
                                                            <div style={{ padding: 20, borderRight: `1px solid ${T.border}` }}>
                                                                <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
                                                                    Customer Information
                                                                </div>

                                                                {/* Contact info */}
                                                                <div style={{ marginBottom: 20 }}>
                                                                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{order.customerName}</div>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: T.textMuted, fontSize: 12 }}>
                                                                        <Icon name="mail" size={12} />
                                                                        {order.customerEmail || "No email"}
                                                                    </div>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: T.textMuted, fontSize: 12 }}>
                                                                        <Icon name="whatsapp" size={12} />
                                                                        {order.customerPhone || "No phone"}
                                                                    </div>
                                                                </div>

                                                                {/* Billing Address */}
                                                                <div style={{ marginBottom: 20 }}>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, marginBottom: 8 }}>BILLING ADDRESS</div>
                                                                    <div style={{ fontSize: 12, lineHeight: 1.6, color: T.text }}>
                                                                        {order.address?.billing?.address1}<br />
                                                                        {order.address?.billing?.address2 && <>{order.address.billing.address2}<br /></>}
                                                                        {order.address?.billing?.city}, {order.address?.billing?.state} {order.address?.billing?.postcode}<br />
                                                                        {order.address?.billing?.country}
                                                                    </div>
                                                                </div>

                                                                {/* Shipping Address (if different) */}
                                                                <div>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, marginBottom: 8 }}>SHIPPING ADDRESS</div>
                                                                    <div style={{ fontSize: 12, lineHeight: 1.6, color: T.text }}>
                                                                        {order.address?.shipping?.first_name} {order.address?.shipping?.last_name}<br />
                                                                        {order.address?.shipping?.address1}<br />
                                                                        {order.address?.shipping?.address2 && <>{order.address.shipping.address2}<br /></>}
                                                                        {order.address?.shipping?.city}, {order.address?.shipping?.state} {order.address?.shipping?.postcode}<br />
                                                                        {order.address?.shipping?.country}
                                                                    </div>
                                                                </div>

                                                                <div style={{ marginTop: 24 }}>
                                                                    <GradientButton variant="secondary" size="xs" full icon="whatsapp">
                                                                        Contact Customer
                                                                    </GradientButton>
                                                                </div>
                                                            </div>

                                                            {/* RIGHT: Order Items */}
                                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                                <div style={{
                                                                    padding: "12px 20px", borderBottom: `1px solid ${T.border}`,
                                                                    fontSize: 11, fontWeight: 700, color: T.textFaint,
                                                                    textTransform: "uppercase", letterSpacing: "0.07em",
                                                                    background: "rgba(0,0,0,0.02)",
                                                                }}>
                                                                    Order Items ({order.itemCount})
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    {order.items.map((item, i) => (
                                                                        <div key={i} style={{
                                                                            display: "flex", justifyContent: "space-between",
                                                                            alignItems: "center", padding: "12px 20px",
                                                                            borderBottom: i < order.items.length - 1 ? `1px solid ${T.border}` : "none",
                                                                        }}>
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</div>
                                                                                <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>SKU: {item.sku || "N/A"}</div>
                                                                            </div>
                                                                            <div style={{ display: "flex", gap: 32, alignItems: "center", textAlign: "right" }}>
                                                                                <div style={{ minWidth: 40 }}>
                                                                                    <div style={{ fontSize: 10, color: T.textFaint }}>QTY</div>
                                                                                    <div style={{ fontSize: 13, fontWeight: 700 }}>×{item.quantity}</div>
                                                                                </div>
                                                                                <div style={{ minWidth: 80 }}>
                                                                                    <div style={{ fontSize: 10, color: T.textFaint }}>PRICE</div>
                                                                                    <div style={{ fontSize: 12 }}>{formatCurrency(item.price, order.currency)}</div>
                                                                                </div>
                                                                                <div style={{ minWidth: 100 }}>
                                                                                    <div style={{ fontSize: 10, color: T.textFaint }}>TOTAL</div>
                                                                                    <div style={{ fontSize: 13, fontWeight: 800, color: T.j200 }}>{formatCurrency(item.subtotal, order.currency)}</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {/* Summary Footer */}
                                                                <div style={{
                                                                    padding: "16px 20px", background: "rgba(0,0,0,0.03)",
                                                                    borderTop: `1px solid ${T.border}`,
                                                                    display: "flex", justifyContent: "flex-end", gap: 40,
                                                                }}>
                                                                    <div style={{ textAlign: "right" }}>
                                                                        <div style={{ fontSize: 11, color: T.textFaint, fontWeight: 600 }}>PAYMENT METHOD</div>
                                                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 2 }}>{order.paymentMethod || "N/A"}</div>
                                                                    </div>
                                                                    <div style={{ textAlign: "right" }}>
                                                                        <div style={{ fontSize: 11, color: T.textFaint, fontWeight: 600 }}>GRAND TOTAL</div>
                                                                        <div style={{ fontSize: 18, fontWeight: 900, color: T.j200, marginTop: 1 }}>{formatCurrency(order.total, order.currency)}</div>
                                                                    </div>
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
            {!error && !loading && pagination.totalPages > 1 && (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 24px", borderTop: `1px solid ${T.border}`,
                    background: T.bgCard, flexShrink: 0,
                }}>
                    <div style={{ fontSize: 12, color: T.textMuted }}>
                        Showing {((pagination.page - 1) * pagination.perPage) + 1}–{Math.min(pagination.page * pagination.perPage, pagination.totalOrders)} of <strong style={{ color: T.text }}>{pagination.totalOrders.toLocaleString()}</strong> orders
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button onClick={() => goToPage(1)} disabled={pagination.page === 1} style={paginBtnStyle(pagination.page === 1)}>«</button>
                        <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} style={paginBtnStyle(pagination.page === 1)}>‹</button>

                        {/* Page number pills */}
                        {getPageRange(pagination.page, pagination.totalPages).map((p, i) =>
                            p === "..." ? (
                                <span key={`e${i}`} style={{ padding: "0 8px", color: T.textFaint, fontSize: 13 }}>…</span>
                            ) : (
                                <button key={p} onClick={() => goToPage(p)} style={{
                                    ...paginBtnStyle(false),
                                    background: p === pagination.page ? T.gradBtn : T.bgElev,
                                    color: p === pagination.page ? "#fff" : T.textMuted,
                                    fontWeight: p === pagination.page ? 700 : 500,
                                    border: `1px solid ${p === pagination.page ? "transparent" : T.borderMid}`,
                                }}>{p}</button>
                            )
                        )}

                        <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} style={paginBtnStyle(pagination.page === pagination.totalPages)}>›</button>
                        <button onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages} style={paginBtnStyle(pagination.page === pagination.totalPages)}>»</button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}

function paginBtnStyle(disabled) {
    return {
        padding: "5px 10px", borderRadius: T.r6, fontSize: 13,
        background: T.bgElev, color: disabled ? T.textGhost : T.textMuted,
        border: `1px solid ${T.borderMid}`, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, fontFamily: "inherit", transition: "all 0.12s",
    };
}

function getPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
}
