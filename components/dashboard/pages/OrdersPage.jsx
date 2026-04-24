"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Badge, PlatformBadge, Card, PageHeader } from "../Primitives";

export default function OrdersPage() {
    const [ordersData, setOrdersData] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sf, setSf] = useState("all");
    const [sel, setSel] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let url = `/api/orders?page=${page}&pageSize=${pageSize}`;
            if (sf !== "all") url += `&status=${sf}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            const res = await fetch(url);
            const json = await res.json();
            setOrdersData(json.data);
            setMeta(json.meta);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, sf, search]);

    const filtered = ordersData;

    const counts = meta?.counts || { all: 0, pending: 0, confirmed: 0, delivered: 0, returned: 0 };

    return (
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, padding: "28px 28px", overflow: "auto" }}>
                <PageHeader
                    title="Orders"
                    subtitle={`${counts.all} total · Manage your shop orders`}
                    actions={<>
                        <GradientButton variant="secondary" size="sm" icon="download">Export CSV</GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="filter">Filter</GradientButton>
                        <GradientButton variant="primary" size="sm" icon="plus">New Order</GradientButton>
                    </>}
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
                    {[
                        ["all", "All Orders", counts.all, T.j300],
                        ["pending", "Pending", counts.pending, T.yellow],
                        ["confirmed", "Confirmed", counts.confirmed, T.blue],
                        ["delivered", "Delivered", counts.delivered, T.green],
                        ["returned", "Returned", counts.returned, T.red],
                    ].map(([v, l, c, col]) => (
                        <button key={v} onClick={() => { setSf(v); setPage(1); }} style={{
                            background: sf === v ? `linear-gradient(135deg, ${col}22 0%, ${col}08 100%)` : T.bgCard,
                            border: `1px solid ${sf === v ? col + "66" : T.border}`,
                            borderRadius: T.r10, padding: "13px 16px", cursor: "pointer",
                            transition: "all 0.15s", fontFamily: "inherit", textAlign: "left",
                            boxShadow: sf === v ? `0 0 0 3px ${col}11` : "none",
                        }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: sf === v ? col : T.text, marginBottom: 2 }}>{c}</div>
                            <div style={{ fontSize: 11, color: T.textFaint, fontWeight: 500 }}>{l}</div>
                        </button>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, padding: "8px 13px" }}>
                        <Icon name="search" size={13} color={T.textFaint} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search orders, customers, tracking numbers..."
                            style={{ border: "none", outline: "none", fontSize: 13, color: T.text, flex: 1, background: "transparent", fontFamily: "inherit" }} />
                    </div>
                    <GradientButton variant="secondary" size="sm" iconRight="chevron">Platform</GradientButton>
                    <GradientButton variant="secondary" size="sm" iconRight="chevron">Date Range</GradientButton>
                    <GradientButton variant="secondary" size="sm" iconRight="chevron">Courier</GradientButton>
                </div>
                <Card pad={0}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(92,168,124,0.03)" }}>
                                {["Order", "Customer", "Platform", "Status", "Courier", "Amount", "Time", "Actions"].map(h => (
                                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((o, i) => (
                                <tr key={o.id} onClick={() => setSel(sel === o.id ? null : o.id)}
                                    style={{
                                        borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                                        cursor: "pointer", transition: "all 0.12s",
                                        background: sel === o.id ? "rgba(92,168,124,0.08)" : "transparent",
                                    }}
                                    onMouseEnter={e => { if (sel !== o.id) e.currentTarget.style.background = "rgba(92,168,124,0.04)"; }}
                                    onMouseLeave={e => { if (sel !== o.id) e.currentTarget.style.background = "transparent"; }}>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, fontWeight: 700, color: T.j200, fontFamily: "monospace" }}>{o.order_id}</span></td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{o.customer}</div>
                                        <div style={{ fontSize: 11, color: T.textFaint, display: "flex", alignItems: "center", gap: 3 }}>
                                            <Icon name="pin" size={10} color={T.textFaint} />{o.city || '—'}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}><PlatformBadge platform="shopify" /></td>
                                    <td style={{ padding: "12px 16px" }}><Badge status={o.status.toLowerCase()} /></td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>TCS</div>
                                            <div style={{ fontSize: 10, color: T.textFaint, fontFamily: "monospace" }}>772938102</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Rs {(o.amount ?? 0).toLocaleString()}</span>
                                        <div style={{ fontSize: 10, color: T.textFaint }}>1 item</div>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, color: T.textFaint }}>{new Date(o.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", gap: 5 }}>
                                            {o.status.toLowerCase() === "pending" && <GradientButton size="xs" variant="primary">Confirm</GradientButton>}
                                            {o.status.toLowerCase() === "confirmed" && <GradientButton size="xs" variant="primary">Book</GradientButton>}
                                            <GradientButton size="xs" variant="ghost">⋯</GradientButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {loading && (
                                <tr>
                                    <td colSpan="8" style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading orders...</td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ padding: 40, textAlign: "center", color: T.textMuted }}>No orders found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {meta && (
                        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 12, color: T.textFaint }}>
                                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, meta.pagination.total)} of {meta.pagination.total} orders
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <GradientButton
                                    variant="secondary"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                >Previous</GradientButton>
                                <GradientButton
                                    variant="secondary"
                                    size="sm"
                                    disabled={page === meta.pagination.lastPage}
                                    onClick={() => setPage(page + 1)}
                                >Next</GradientButton>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
            {sel && (() => {
                const o = ordersData.find(x => x.id === sel);
                if (!o) return null;
                return (
                    <div style={{ width: 340, borderLeft: `1px solid ${T.border}`, background: T.bgCard, overflow: "auto", flexShrink: 0 }}>
                        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: "monospace" }}>{o.order_id}</span>
                            <button onClick={() => setSel(null)} style={{
                                background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r6,
                                width: 28, height: 28, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}><Icon name="close" size={14} color={T.textMuted} /></button>
                        </div>
                        <div style={{ padding: 20 }}>
                            <Badge status={o.status.toLowerCase()} />
                            <div style={{ marginTop: 18, padding: 16, background: T.bgElev, borderRadius: T.r10, marginBottom: 16, border: `1px solid ${T.border}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Customer</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: "50%",
                                        background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 14, fontWeight: 800, color: "#fff"
                                    }}>
                                        {(o.customer || "C").split(" ").map(w => w[0]).join("")}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{o.customer}</div>
                                        <div style={{ fontSize: 11, color: T.textFaint }}>{o.city || '—'}</div>
                                    </div>
                                </div>
                            </div>
                            {[["Amount", `Rs ${(o.amount ?? 0).toLocaleString()}`], ["Items", `1 products`],
                            ["Platform", "Shopify"],
                            ["Courier", "TCS"], ["Tracking", "772938102"], ["Placed", `${new Date(o.time).toLocaleDateString()}`],
                            ].map(([k, v]) => (
                                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                                    <span style={{ fontSize: 12, color: T.textFaint }}>{k}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: k === "Tracking" ? "monospace" : "inherit" }}>{v}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                                {o.status.toLowerCase() === "pending" && <GradientButton variant="primary" full icon="check">Confirm Order</GradientButton>}
                                {o.status.toLowerCase() === "confirmed" && <GradientButton variant="primary" full icon="truck">Book Courier</GradientButton>}
                                <GradientButton variant="secondary" full icon="whatsapp">Send WhatsApp</GradientButton>
                                <GradientButton variant="secondary" full icon="edit">Edit Address</GradientButton>
                                <GradientButton variant="danger" full icon="close">Cancel Order</GradientButton>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
