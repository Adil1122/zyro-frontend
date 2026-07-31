"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, KPI, PageHeader } from "../Primitives";
import { getCurrentUserId } from "../../../lib/auth";

// ── Add Customer Modal ──────────────────────────────────────────────────────
function AddCustomerModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ name: "", phone: "", city: "", email: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        if (!form.name.trim() || !form.phone.trim()) { setError("Name and phone are required."); return; }
        setSaving(true); setError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ ...form, userId }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to create customer');
            onSaved();
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const inp = { width: "100%", padding: "9px 12px", border: `1px solid ${T.borderMid}`, borderRadius: T.r8, background: T.bgElev, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(4,8,7,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.borderMid}`, borderRadius: T.r14, padding: 28, width: 420, boxShadow: T.shadowLg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Add Customer</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[["Name *", "name", "text", "Full name"], ["Phone *", "phone", "tel", "e.g. 0312-3456789"], ["City", "city", "text", "e.g. Karachi"], ["Email", "email", "email", "customer@email.com"]].map(([label, key, type, ph]) => (
                        <div key={key}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                            <input type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                        </div>
                    ))}
                    {error && <div style={{ fontSize: 12, color: T.red, padding: "8px 12px", background: T.redBg, borderRadius: T.r6 }}>{error}</div>}
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <GradientButton variant="secondary" full onClick={onClose}>Cancel</GradientButton>
                        <GradientButton variant="primary" full onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Customer'}</GradientButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Customer Profile Modal ──────────────────────────────────────────────────
function CustomerProfileModal({ customer, tierCfg, onClose }) {
    if (!customer) return null;
    const tier = customer.totalSpent > 20000 ? 'VIP' : customer.ordersCount >= 3 || customer.totalSpent > 5000 ? 'Regular' : customer.ordersCount > 0 ? 'Watch' : 'New';
    const risk = customer.ordersCount === 0 ? 'high' : customer.ordersCount < 3 && customer.totalSpent < 3000 ? 'medium' : 'low';
    const riskColor = risk === "low" ? T.green : risk === "high" ? T.red : T.yellow;
    const riskBg = risk === "low" ? T.greenBg : risk === "high" ? T.redBg : T.yellowBg;

    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(4,8,7,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.borderMid}`, borderRadius: T.r14, padding: 28, width: 460, boxShadow: T.shadowLg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Customer Profile</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: T.bgElev, borderRadius: T.r10, border: `1px solid ${T.border}`, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                        {customer.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{customer.name}</div>
                        <div style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>{customer.phone}</div>
                        {customer.city && <div style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>{customer.city}</div>}
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[
                        ["Total Orders", customer.ordersCount],
                        ["Total Spent", `Rs ${(customer.totalSpent || 0).toLocaleString()}`],
                        ["Customer Tier", <span style={{ padding: "2px 8px", borderRadius: T.r4, background: tierCfg[tier].bg, color: tierCfg[tier].c, fontSize: 11, fontWeight: 700 }}>{tier}</span>],
                        ["COD Risk", <span style={{ padding: "2px 8px", borderRadius: T.r4, background: riskBg, color: riskColor, fontSize: 11, fontWeight: 700 }}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>],
                    ].map(([k, v]) => (
                        <div key={k} style={{ padding: "12px 14px", background: T.bgElev, borderRadius: T.r8, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{v}</div>
                        </div>
                    ))}
                </div>
                <GradientButton variant="secondary" full onClick={onClose}>Close</GradientButton>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CustomersPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState([]);
    const [meta, setMeta] = useState({ pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [profileCustomer, setProfileCustomer] = useState(null);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const userId = getCurrentUserId();
            let url = `/api/customers?page=${page}&search=${search}`;
            if (userId) url += `&userId=${encodeURIComponent(userId)}`;
            const res = await fetch(url);
            const result = await res.json();
            if (res.ok) {
                setCustomers(result.data || []);
                setMeta(result.meta || { pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
            } else {
                setCustomers([]);
            }
        } catch { setCustomers([]); }
        setLoading(false);
    };

    useEffect(() => { fetchCustomers(); }, [page, search]);

    const handleExport = () => {
        if (!customers.length) return;
        const headers = ['Name', 'Phone', 'City', 'Orders', 'Total Spent (Rs)', 'Tier', 'Risk'];
        const rows = customers.map(c => {
            const tier = c.totalSpent > 20000 ? 'VIP' : c.ordersCount >= 3 || c.totalSpent > 5000 ? 'Regular' : c.ordersCount > 0 ? 'Watch' : 'New';
            const risk = c.ordersCount === 0 ? 'high' : c.ordersCount < 3 && c.totalSpent < 3000 ? 'medium' : 'low';
            return [`"${(c.name || '').replace(/"/g, '""')}"`, c.phone || '', c.city || '', c.ordersCount || 0, c.totalSpent || 0, tier, risk];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleWhatsApp = (c) => {
        // Navigate to WhatsApp page; phone stored in sessionStorage for pre-selection
        sessionStorage.setItem('wa_focus_phone', c.phone || '');
        router.push('/whatsapp');
    };

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
            {showAddModal && (
                <AddCustomerModal onClose={() => setShowAddModal(false)} onSaved={fetchCustomers} />
            )}
            {profileCustomer && (
                <CustomerProfileModal customer={profileCustomer} tierCfg={tierCfg} onClose={() => setProfileCustomer(null)} />
            )}
            <PageHeader
                title="Customers"
                subtitle={`${meta.pagination.total} total customers · Rs ${(totalSpent / 1000000).toFixed(1)}M lifetime value (current view)`}
                actions={<>
                    <GradientButton variant="secondary" size="sm" icon="download" onClick={handleExport}>Export</GradientButton>
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={() => setShowAddModal(true)}>Add Customer</GradientButton>
                </>}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                <KPI label="Total Customers" value={meta.pagination.total.toLocaleString()} sub="All-time" icon="customers" />
                <KPI label="VIP Tier" value={vipCount} sub="Rs 20k+ spent" icon="fire" highlight />
                <KPI label="Avg Spend" value={`Rs ${Math.floor(totalSpent / (customers.length || 1)).toLocaleString()}`} sub="Per customer" icon="dollar" />
                <KPI label="Lifetime Value" value={`Rs ${(totalSpent / 1000).toFixed(0)}k`} sub="Synced selection" icon="sparkle" />
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
                                const tier = c.totalSpent > 20000 ? 'VIP' : c.ordersCount >= 3 || c.totalSpent > 5000 ? 'Regular' : c.ordersCount > 0 ? 'Watch' : 'New';
                                const risk = c.ordersCount === 0 ? 'high' : c.ordersCount < 3 && c.totalSpent < 3000 ? 'medium' : 'low';
                                return (
                                    <tr key={`${c.id}-${i}`} style={{ borderBottom: i < customers.length - 1 ? `1px solid ${T.border}` : "none" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", border: `1px solid ${T.borderMid}` }}>
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
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: T.r4, fontWeight: 600, background: risk === "low" ? T.greenBg : risk === "high" ? T.redBg : T.yellowBg, color: risk === "low" ? T.green : risk === "high" ? T.red : T.yellow }}>
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: risk === "low" ? T.green : risk === "high" ? T.red : T.yellow }} />
                                                {risk.charAt(0).toUpperCase() + risk.slice(1)}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", gap: 4 }}>
                                                <GradientButton size="xs" variant="ghost" icon="whatsapp" title="Open in WhatsApp" onClick={() => handleWhatsApp(c)} />
                                                <GradientButton size="xs" variant="ghost" icon="eye" title="View profile" onClick={() => setProfileCustomer(c)} />
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
