"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton } from "../Primitives";

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
            const res = await fetch(`/api/daraz/orders?${params}`);
            const data = await res.json();

            if (!data.configured) {
                setError("Daraz is not configured. Please add DARAZ_APP_KEY, DARAZ_APP_SECRET and DARAZ_ACCESS_TOKEN to your .env.local and restart the server.");
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
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

            {/* ── HEADER ── */}
            <div style={{
                padding: "24px 32px 0", borderBottom: `1px solid ${T.border}`,
                background: T.bgCard, flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    {/* Back button */}
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

                    {/* Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: T.r8,
                            background: "linear-gradient(135deg, #F57D29 0%, #E85D04 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 17, boxShadow: "0 2px 8px rgba(245,125,41,0.4)",
                        }}>🏪</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>
                                Daraz Orders
                            </div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
                                {loading
                                    ? "Loading…"
                                    : `${(pagination.totalOrders || 0).toLocaleString()} total orders`
                                }
                            </div>
                        </div>
                    </div>

                    {/* Daraz info pill */}
                    <div style={{
                        marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                        background: "rgba(245,125,41,0.12)", border: "1px solid rgba(245,125,41,0.25)",
                        borderRadius: T.r8, padding: "5px 11px", fontSize: 11, color: "#F57D29", fontWeight: 600,
                    }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F57D29", boxShadow: "0 0 5px #F57D29" }} />
                        Daraz Open Platform · PK
                    </div>
                </div>

                {/* ── FILTERS ── */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 16, flexWrap: "wrap" }}>
                    {/* Search (by order ID) */}
                    <form onSubmit={handleSearch} style={{ display: "flex", gap: 0 }}>
                        <input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search by Order ID…"
                            style={{
                                padding: "7px 12px", fontSize: 13, background: T.bgElev,
                                border: `1px solid ${T.borderMid}`, borderRight: "none",
                                borderRadius: `${T.r8} 0 0 ${T.r8}`, color: T.text,
                                outline: "none", width: 220, fontFamily: "inherit",
                            }}
                        />
                        <button type="submit" style={{
                            padding: "7px 13px", background: "linear-gradient(135deg,#F57D29,#E85D04)",
                            color: "#fff", border: "none", borderRadius: `0 ${T.r8} ${T.r8} 0`,
                            cursor: "pointer", display: "flex", alignItems: "center",
                        }}>
                            <Icon name="search" size={13} color="#fff" />
                        </button>
                    </form>

                    {searchInput && (
                        <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{
                            padding: "7px 10px", background: "transparent",
                            border: `1px solid ${T.borderMid}`, borderRadius: T.r8,
                            color: T.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                        }}>✕ Clear</button>
                    )}

                    {/* Status filter tabs */}
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
                        {STATUS_FILTERS.map(f => (
                            <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{
                                padding: "6px 12px", borderRadius: T.r8, fontSize: 12, fontWeight: 600,
                                background: statusFilter === f.value
                                    ? "linear-gradient(135deg,#F57D29,#E85D04)"
                                    : T.bgElev,
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

                {/* Daraz note banner */}
                <div style={{
                    marginBottom: 12, padding: "8px 14px",
                    background: "rgba(245,125,41,0.07)", border: "1px solid rgba(245,125,41,0.15)",
                    borderRadius: T.r8, fontSize: 11, color: "#F57D29", lineHeight: 1.5,
                }}>
                    ⚠️ <strong>Note:</strong> Customer names & phone numbers may appear masked by Daraz's DataMoat privacy system.
                    To access full data, apply for <strong>Sensitive Data Privilege</strong> in your Daraz App Console.
                    &nbsp;Search is limited to <strong>Order ID</strong> (Daraz API does not support name search).
                </div>
            </div>

            {/* ── TABLE ── */}
            <div style={{ flex: 1, overflow: "auto" }}>
                {error ? (
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", padding: "80px 40px", textAlign: "center",
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.red, marginBottom: 8 }}>Connection Error</div>
                        <div style={{ fontSize: 13, color: T.textMuted, maxWidth: 520, lineHeight: 1.6 }}>{error}</div>
                        <div style={{ marginTop: 20 }}>
                            <GradientButton variant="secondary" icon="refresh" onClick={() => fetchOrders(1)}>Retry</GradientButton>
                        </div>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Order ID</th>
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
                                                No orders found{search ? ` for ID "${search}"` : ""}.
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
                                                    <span style={{ fontWeight: 700, color: "#F57D29", fontFamily: "monospace", fontSize: 12 }}>
                                                        #{order.number}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                                                    {order.customerPhone && (
                                                        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 1 }}>{order.customerPhone}</div>
                                                    )}
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
                                                <td style={{ ...tdStyle, fontWeight: 700, color: "#F57D29", whiteSpace: "nowrap" }}>
                                                    {formatCurrency(order.total)}
                                                </td>
                                                <td style={tdStyle}><StatusBadge status={order.status} /></td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted }}>{order.paymentMethod || "—"}</td>
                                            </tr>

                                            {/* ── Expanded row: items ── */}
                                            {expandedRow === order.id && (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: "0 16px 16px", background: T.bgElev }}>
                                                        <div style={{
                                                            border: `1px solid rgba(245,125,41,0.25)`,
                                                            borderRadius: T.r10, overflow: "hidden",
                                                        }}>
                                                            <div style={{
                                                                padding: "10px 14px", background: T.bgCard,
                                                                borderBottom: `1px solid ${T.border}`,
                                                                fontSize: 11, fontWeight: 700, color: "#F57D29",
                                                                textTransform: "uppercase", letterSpacing: "0.07em",
                                                            }}>
                                                                Order Items — #{order.number}
                                                            </div>
                                                            {order.items.length === 0 ? (
                                                                <div style={{ padding: "16px", fontSize: 12, color: T.textMuted }}>
                                                                    Item details not included in this response. Use Daraz API Explorer to fetch order items separately.
                                                                </div>
                                                            ) : order.items.map((item, i) => (
                                                                <div key={i} style={{
                                                                    display: "flex", justifyContent: "space-between",
                                                                    alignItems: "center", padding: "10px 14px",
                                                                    borderBottom: i < order.items.length - 1 ? `1px solid ${T.border}` : "none",
                                                                    background: i % 2 === 0 ? "transparent" : T.bgCard,
                                                                }}>
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
                                                            <div style={{
                                                                display: "flex", justifyContent: "flex-end",
                                                                padding: "10px 14px", borderTop: `1px solid rgba(245,125,41,0.2)`,
                                                                background: T.bgCard, gap: 24, alignItems: "center",
                                                            }}>
                                                                <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>Order Total</span>
                                                                <span style={{ fontSize: 14, fontWeight: 800, color: "#F57D29" }}>{formatCurrency(order.total)}</span>
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
                        {getPageRange(pagination.page, pagination.totalPages).map((p, i) =>
                            p === "..." ? (
                                <span key={`e${i}`} style={{ padding: "0 8px", color: T.textFaint, fontSize: 13 }}>…</span>
                            ) : (
                                <button key={p} onClick={() => goToPage(p)} style={{
                                    ...paginBtnStyle(false),
                                    background: p === pagination.page ? "linear-gradient(135deg,#F57D29,#E85D04)" : T.bgElev,
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
