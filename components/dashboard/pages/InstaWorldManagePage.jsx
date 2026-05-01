"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card } from "../Primitives";
import { getCurrentUserId, supabase } from "@/lib/supabase";

const IW_STATUS = {
    pending: { label: "Pending", bg: T.yellowBg, color: T.yellow, dot: T.yellow },
    processing: { label: "In Transit", bg: T.blueBg, color: T.blue, dot: T.blue },
    completed: { label: "Delivered", bg: T.greenBg, color: T.green, dot: T.green },
    cancelled: { label: "Returned", bg: T.redBg, color: T.red, dot: T.red },
    any: { label: "All", bg: T.bgElev, color: T.textMuted, dot: T.textFaint },
};

function StatusBadge({ status }) {
    const s = IW_STATUS[status] || IW_STATUS["pending"];
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
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InstaWorldManagePage({ onBack }) {
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
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const fetchStats = async () => {
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/instaworld/stats", {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            setStats(data);
        } catch (e) { console.error(e); }
    };

    const fetchOrders = useCallback(async (page = 1) => {
        setOrdersLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                perPage: pagination.perPage.toString(),
                status: statusFilter,
                ...(search ? { search } : {}),
            });
            const userId = getCurrentUserId();
            const res = await fetch(`/api/instaworld/orders?${params}`, {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            if (data.error) { setError(data.error); return; }
            setOrders(data.orders || []);
            setPagination(data.pagination || { page: 1, perPage: 10, totalOrders: 0, totalPages: 1 });
        } catch (e) { setError(e.message); } finally { setOrdersLoading(false); setLoading(false); }
    }, [search, statusFilter, pagination.perPage]);

    useEffect(() => {
        fetchStats();
        fetchOrders(1);
    }, [search, statusFilter, pagination.perPage]);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const userId = getCurrentUserId();
            const { error } = await supabase
                .from('users')
                .update({ instaworld_api_key: apiKeyInput })
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

    const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput.trim()); };
    const goToPage = (p) => { if (p >= 1 && p <= pagination.totalPages) fetchOrders(p); };

    const thStyle = { padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}`, background: T.bgElev };
    const tdStyle = { padding: "14px 16px", fontSize: 13, color: T.text, borderBottom: `1px solid ${T.border}`, verticalAlign: "middle" };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "24px 32px 0", borderBottom: `1px solid ${T.border}`, background: T.bgCard, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.textMuted, fontSize: 12, fontWeight: 600, borderRadius: T.r8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                        <Icon name="arrow-left" size={13} /> Back
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: T.r8, background: "linear-gradient(135deg, #00AEEF, #0072BC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🌐</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Insta World Management</div>
                            <div style={{ fontSize: 12, color: T.textMuted }}>{loading ? "Loading..." : `${pagination.totalOrders} shipments`}</div>
                        </div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                        <GradientButton variant="secondary" icon="settings" size="sm" onClick={() => setIsConfiguring(!isConfiguring)}>
                            {isConfiguring ? "View Shipments" : "Configuration"}
                        </GradientButton>
                    </div>
                </div>

                {stats?.configured && (
                    <div style={{ display: "flex", gap: 24, paddingBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase" }}>Pending COD</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.yellow, marginTop: 4 }}>{formatCurrency(stats.codPending)}</div>
                        </div>
                        <div style={{ width: 1, background: T.border }} />
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase" }}>Total Recovered</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.green, marginTop: 4 }}>{formatCurrency(stats.codRecovered)}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── CONFIGURATION VIEW ── */}
            {isConfiguring ? (
                <div style={{ flex: 1, padding: 40, background: T.bgMain, overflow: "auto" }}>
                    <Card style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>Insta World Configuration</h3>
                        <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>
                            Enter your API key from the Insta World Merchant Portal to enable real-time shipping management.
                        </p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                            <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>API Key / Secret Key</label>
                            <input 
                                type="password" 
                                value={apiKeyInput} 
                                onChange={e => setApiKeyInput(e.target.value)}
                                placeholder="Paste your Insta World API Key here..."
                                style={{
                                    padding: "10px 14px", borderRadius: T.r8, background: T.bgElev,
                                    border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14,
                                    fontFamily: "monospace", outline: "none"
                                }}
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                            <GradientButton variant="primary" onClick={handleSaveConfig} disabled={isSaving || !apiKeyInput}>
                                {isSaving ? "Saving..." : "Save Configuration"}
                            </GradientButton>
                            <GradientButton variant="secondary" onClick={() => setIsConfiguring(false)}>
                                Cancel
                            </GradientButton>
                        </div>

                        <div style={{ marginTop: 32, padding: 16, background: "rgba(0,174,239,0.05)", borderRadius: T.r10, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.blue, marginBottom: 6 }}>Where to find your API Key?</div>
                            <ol style={{ fontSize: 12, color: T.textMuted, paddingLeft: 18, lineHeight: 1.6 }}>
                                <li>Log in to your <strong>Insta World Merchant Portal</strong>.</li>
                                <li>Go to <strong>Settings</strong> or <strong>API Management</strong> in the sidebar.</li>
                                <li>Copy the <strong>Secret Key</strong> or <strong>API Key</strong>.</li>
                            </ol>
                        </div>
                    </Card>
                </div>
            ) : (
                /* ── TABLE BODY ── */
                <div style={{ flex: 1, overflow: "auto", background: T.bgMain }}>
                    {error ? <div style={{ padding: 40, color: T.red }}>{error}</div> : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Tracking</th>
                                <th style={thStyle}>Customer</th>
                                <th style={thStyle}>City</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Amount</th>
                                <th style={thStyle}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersLoading ? Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={6} style={{ padding: 20, textAlign: "center" }}>Loading...</td></tr>) : (
                                orders.map(o => (
                                    <React.Fragment key={o.id}>
                                        <tr onClick={() => setExpandedRow(expandedRow === o.id ? null : o.id)} style={{ cursor: "pointer", background: expandedRow === o.id ? T.bgElev : "transparent" }}>
                                            <td style={tdStyle}><span style={{ fontWeight: 700, color: T.j200 }}>{o.number}</span></td>
                                            <td style={tdStyle}>{o.customerName}</td>
                                            <td style={tdStyle}>{o.city}</td>
                                            <td style={tdStyle}>{formatDate(o.date)}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700 }}>{formatCurrency(o.total)}</td>
                                            <td style={tdStyle}><StatusBadge status={o.status} /></td>
                                        </tr>
                                        {expandedRow === o.id && (
                                            <tr>
                                                <td colSpan={6} style={{ padding: "0 16px 16px", background: T.bgElev }}>
                                                    <Card style={{ padding: 20, background: T.bgCard }}>
                                                        <div style={{ fontSize: 12, color: T.text }}>{o.address.shipping.address1}, {o.city}</div>
                                                        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                                                            <GradientButton size="xs" variant="secondary" icon="truck">Track</GradientButton>
                                                            <GradientButton size="xs" variant="secondary" icon="whatsapp">WhatsApp</GradientButton>
                                                        </div>
                                                    </Card>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
                </div>
            )}
        </div>
    );
}
