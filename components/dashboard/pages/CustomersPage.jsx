"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, KPI, PageHeader } from "../Primitives";

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [meta, setMeta] = useState({ pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/customers?page=${page}&search=${search}`);
                const result = await res.json();
                setCustomers(result.data || []);
                setMeta(result.meta);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch customers:", err);
                setLoading(false);
            }
        };
        fetchCustomers();
    }, [page, search]);

    const tierCfg = {
        VIP: { bg: "rgba(167,139,250,0.15)", c: T.purple },
        Regular: { bg: T.blueBg, c: T.blue },
        Watch: { bg: T.redBg, c: T.red },
        New: { bg: T.greenBg, c: T.green },
    };

    const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const vipCount = customers.filter(c => (c.totalSpent || 0) > 20000).length;

    return (
        <div style={{ padding: "28px 32px", maxWidth: 1280 }}>
            <PageHeader
                title="Customers"
                subtitle={`${meta.pagination.total} total customers · Rs ${(totalSpent / 1000000).toFixed(1)}M lifetime value (current view)`}
                actions={<>
                    <GradientButton variant="secondary" size="sm" icon="download">Export</GradientButton>
                    <GradientButton variant="primary" size="sm" icon="plus">Add Customer</GradientButton>
                </>}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                <KPI label="Total Customers" value={meta.pagination.total.toLocaleString()} sub="All-time" icon="customers" />
                <KPI label="VIP Tier" value={vipCount} sub="Rs 20k+ spent" icon="fire" highlight />
                <KPI label="Avg Spend" value={`Rs ${Math.floor(totalSpent / (customers.length || 1)).toLocaleString()}`} sub="Per customer" icon="dollar" />
                <KPI label="Lifetime Value" value={`Rs ${(totalSpent / 1000).toFixed(0)}k`} sub="Synced selection" delta="12%" deltaUp icon="sparkle" />
            </div>
            <Card pad={0}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, padding: "7px 12px", maxWidth: 360 }}>
                        <Icon name="search" size={13} color={T.textFaint} />
                        <input
                            placeholder="Search name, phone, city..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            style={{ border: "none", outline: "none", fontSize: 13, color: T.text, flex: 1, background: "transparent", fontFamily: "inherit" }}
                        />
                    </div>
                </div>
                <div style={{ position: "relative", minHeight: loading ? "200px" : "auto" }}>
                    {loading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <span style={{ color: T.text, fontSize: 13 }}>Syncing...</span>
                        </div>
                    )}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(92,168,124,0.03)" }}>
                                {["Customer", "Phone", "City", "Tier", "Orders", "Total Spent", "COD Risk", ""].map(h => (
                                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {customers.length === 0 && !loading && (
                                <tr><td colSpan="8" style={{ padding: 40, textAlign: "center", color: T.textFaint }}>No customers found.</td></tr>
                            )}
                            {customers.map((c, i) => {
                                const tier = (c.totalSpent > 20000) ? 'VIP' : (c.ordersCount > 0 ? 'Regular' : 'New');
                                const risk = c.ordersCount > 10 ? 'low' : 'medium';
                                return (
                                    <tr key={`${c.id}-${i}`} style={{ borderBottom: i < customers.length - 1 ? `1px solid ${T.border}` : "none" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: "50%",
                                                    background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: 10, fontWeight: 800, color: "#fff",
                                                    border: `1px solid ${T.borderMid}`
                                                }}>
                                                    {c.name.split(" ").map(w => w[0]).join("")}
                                                </div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}><span style={{ fontFamily: "monospace", fontSize: 11, color: T.textMuted }}>{c.phone}</span></td>
                                        <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 12, color: T.textMuted }}>{c.city}</span></td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <span style={{ padding: "2px 8px", borderRadius: T.r4, background: tierCfg[tier].bg, color: tierCfg[tier].c, fontSize: 11, fontWeight: 700, border: `1px solid ${tierCfg[tier].c}33` }}>{tier}</span>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.ordersCount}</span></td>
                                        <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 13, fontWeight: 800, color: T.j200 }}>Rs {(c.totalSpent || 0).toLocaleString()}</span></td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", gap: 4,
                                                fontSize: 11, padding: "2px 8px", borderRadius: T.r4, fontWeight: 600,
                                                background: risk === "low" ? T.greenBg : T.yellowBg,
                                                color: risk === "low" ? T.green : T.yellow,
                                            }}>
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: risk === "low" ? T.green : T.yellow }} />
                                                {risk.charAt(0).toUpperCase() + risk.slice(1)}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", gap: 4 }}>
                                                <GradientButton size="xs" variant="ghost" icon="whatsapp" />
                                                <GradientButton size="xs" variant="ghost" icon="eye" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {meta.pagination && (
                    <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 12, color: T.textFaint }}>Page {meta.pagination.page} of {Math.max(1, meta.pagination.lastPage)}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <GradientButton variant="secondary" size="xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</GradientButton>
                            <GradientButton variant="secondary" size="xs" disabled={page >= meta.pagination.lastPage} onClick={() => setPage(page + 1)}>Next</GradientButton>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

