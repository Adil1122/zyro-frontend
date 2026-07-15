"use client";

import React, { useState, useEffect, useCallback } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card } from "../Primitives";
import { getCurrentUserId, supabase } from "@/lib/supabase";

const TM_STATUS = {
    pending:    { label: "Pending",    bg: T.yellowBg, color: T.yellow, dot: T.yellow },
    processing: { label: "In Transit", bg: T.blueBg,   color: T.blue,   dot: T.blue },
    "on-hold":  { label: "Exception",  bg: "rgba(167,139,250,0.15)", color: T.purple, dot: T.purple },
    completed:  { label: "Delivered",  bg: T.greenBg,  color: T.green,  dot: T.green },
    cancelled:  { label: "Undelivered",bg: T.redBg,    color: T.red,    dot: T.red },
    any:        { label: "All",        bg: T.bgElev,   color: T.textMuted, dot: T.textFaint },
};

function StatusBadge({ status }) {
    const s = TM_STATUS[status] || TM_STATUS["pending"];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: T.r20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, border: `1px solid ${s.color}22`, whiteSpace: "nowrap" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />{s.label}
        </span>
    );
}

function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " +
        dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function SkeletonRow() {
    return <tr>{[160, 160, 120, 120, 80].map((w, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
            <div style={{ height: 13, width: w, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
        </td>
    ))}</tr>;
}

const STATUS_FILTERS = [
    { value: "any",        label: "All" },
    { value: "delivered",  label: "Delivered" },
    { value: "in_transit", label: "In Transit" },
    { value: "pending",    label: "Pending" },
];

const PP_GRAD = "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)";

export default function PakistanPostManagePage({ onBack }) {
    const [stats,        setStats]        = useState(null);
    const [trackings,    setTrackings]    = useState([]);
    const [pagination,   setPagination]   = useState({ page: 1, perPage: 20, totalOrders: 0, totalPages: 1 });
    const [loading,      setLoading]      = useState(true);
    const [dataLoading,  setDataLoading]  = useState(false);
    const [error,        setError]        = useState(null);
    const [statusFilter, setStatusFilter] = useState("any");
    const [expandedRow,  setExpandedRow]  = useState(null);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [apiKeyInput,   setApiKeyInput]   = useState("");
    const [isSaving,      setIsSaving]      = useState(false);
    // Add tracking modal
    const [addModal,      setAddModal]      = useState(false);
    const [newTracking,   setNewTracking]   = useState("");
    const [addingTracking, setAddingTracking] = useState(false);

    const fetchConfig = async () => {
        try {
            const userId = getCurrentUserId();
            const { data } = await supabase.from('users').select('trackingmore_api_key').eq('id', userId).single();
            if (data?.trackingmore_api_key) setApiKeyInput(data.trackingmore_api_key);
        } catch (e) { console.error("Failed to fetch TrackingMore config:", e); }
    };

    const fetchStats = async () => {
        try {
            const userId = getCurrentUserId();
            const res  = await fetch("/api/trackingmore/stats", { headers: { 'x-user-id': userId } });
            const data = await res.json();
            setStats(data);
        } catch (e) { console.error("Failed to fetch stats:", e); }
    };

    const fetchTrackings = useCallback(async (page = 1) => {
        setDataLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: page.toString(), perPage: pagination.perPage.toString(), status: statusFilter });
            const userId = getCurrentUserId();
            const res  = await fetch(`/api/trackingmore/trackings?${params}`, { headers: { 'x-user-id': userId } });
            const data = await res.json();
            if (!data.configured) { setError("TrackingMore is not configured. Add your API key below."); return; }
            if (data.error)        { setError(data.error); return; }
            setTrackings(data.trackings || []);
            setPagination(data.pagination || { page: 1, perPage: 20, totalOrders: 0, totalPages: 1 });
        } catch (e) { setError("Failed to fetch trackings: " + e.message); }
        finally { setDataLoading(false); setLoading(false); }
    }, [statusFilter, pagination.perPage]);

    useEffect(() => { fetchConfig(); }, []);
    useEffect(() => { fetchStats(); fetchTrackings(1); }, [statusFilter, fetchTrackings]);

    const goToPage = (p) => { if (p < 1 || p > pagination.totalPages) return; fetchTrackings(p); };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const userId = getCurrentUserId();
            const { error } = await supabase.from('users').update({ trackingmore_api_key: apiKeyInput }).eq('id', userId);
            if (error) throw error;
            setIsConfiguring(false);
            fetchStats(); fetchTrackings(1);
        } catch (e) { alert("Failed to save: " + e.message); }
        finally { setIsSaving(false); }
    };

    const handleAddTracking = async () => {
        if (!newTracking.trim()) return;
        setAddingTracking(true);
        try {
            const userId = getCurrentUserId();
            await fetch("/api/trackingmore/trackings", {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ trackingNumber: newTracking.trim(), courierCode: 'pakistan-post' }),
            });
            setNewTracking(""); setAddModal(false);
            fetchTrackings(1);
        } catch (e) { alert("Failed to add tracking: " + e.message); }
        finally { setAddingTracking(false); }
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
                        <div style={{ width: 32, height: 32, borderRadius: T.r8, background: PP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>📮</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>Pakistan Post Tracking</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>via TrackingMore · {loading ? "Loading..." : `${pagination.totalOrders.toLocaleString()} trackings`}</div>
                        </div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                        <GradientButton variant="secondary" icon="settings" size="sm" onClick={() => setIsConfiguring(!isConfiguring)}>
                            {isConfiguring ? "View Trackings" : "Configuration"}
                        </GradientButton>
                        {!isConfiguring && <GradientButton variant="primary" icon="plus" size="sm" onClick={() => setAddModal(true)}>Add Tracking</GradientButton>}
                    </div>
                </div>

                {stats?.configured && (
                    <div style={{ display: "flex", gap: 24, paddingBottom: 24 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Trackings</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 4 }}>{stats.totalTrackings || 0}</div>
                        </div>
                        <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>In Transit</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.blue, marginTop: 4 }}>{stats.inTransit || 0}</div>
                        </div>
                        <div style={{ width: 1, background: T.border, margin: "4px 0" }} />
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Delivered</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: T.green, marginTop: 4 }}>{stats.delivered || 0}</div>
                        </div>
                    </div>
                )}

                <div style={{ display: "flex", gap: 4, alignItems: "center", paddingBottom: 16, marginLeft: "auto" }}>
                    {STATUS_FILTERS.map(f => (
                        <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{ padding: "6px 12px", borderRadius: T.r8, fontSize: 12, fontWeight: 600, background: statusFilter === f.value ? T.gradBtn : T.bgElev, color: statusFilter === f.value ? "#fff" : T.textMuted, border: `1px solid ${statusFilter === f.value ? "transparent" : T.borderMid}`, cursor: "pointer", fontFamily: "inherit" }}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONFIGURATION VIEW */}
            {isConfiguring ? (
                <div style={{ flex: 1, padding: 40, background: T.bgMain, overflow: "auto" }}>
                    <Card style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>TrackingMore Configuration</h3>
                        <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>Pakistan Post has no merchant API. TrackingMore provides real-time tracking for Pakistan Post shipments.</p>
                        <div style={{ padding: 14, background: T.yellowBg, border: `1px solid ${T.yellow}44`, borderRadius: T.r8, marginBottom: 20 }}>
                            <div style={{ fontSize: 12, color: T.yellow, fontWeight: 700 }}>⚠ Paid Service</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>TrackingMore offers 100 free trackings/month. Paid plans start at $9/month for more volume.</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                            <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>TrackingMore API Key</label>
                            <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Paste your TrackingMore API key here..." style={{ padding: "10px 14px", borderRadius: T.r8, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <GradientButton variant="primary" onClick={handleSaveConfig} disabled={isSaving || !apiKeyInput}>{isSaving ? "Saving..." : "Save API Key"}</GradientButton>
                            <GradientButton variant="secondary" onClick={() => setIsConfiguring(false)}>Cancel</GradientButton>
                        </div>
                        <div style={{ marginTop: 32, padding: 16, background: "rgba(92,168,124,0.05)", borderRadius: T.r10, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.j200, marginBottom: 6 }}>Setup Instructions</div>
                            <ol style={{ fontSize: 12, color: T.textMuted, paddingLeft: 18, lineHeight: 1.6 }}>
                                <li>Sign up at <strong>trackingmore.com</strong></li>
                                <li>Go to <strong>Dashboard → Developer → API Key</strong></li>
                                <li>Copy and paste your API key above</li>
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
                                    <th style={thStyle}>Tracking #</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>Latest Event</th>
                                    <th style={thStyle}>Date Added</th>
                                    <th style={thStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading
                                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                    : trackings.length === 0
                                        ? <tr><td colSpan={5} style={{ padding: "60px 40px", textAlign: "center", color: T.textMuted }}>No trackings found. Click "Add Tracking" to monitor a Pakistan Post shipment.</td></tr>
                                        : trackings.map(t => (
                                            <tr key={t.id} style={{ cursor: "default" }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.bgCard}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                <td style={tdStyle}><span style={{ fontWeight: 700, color: T.j200 }}>{t.number}</span></td>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600 }}>{t.customerName}</div>
                                                    <div style={{ fontSize: 11, color: T.textFaint }}>{t.customerPhone}</div>
                                                </td>
                                                <td style={{ ...tdStyle, fontSize: 12, color: T.textMuted, maxWidth: 280 }}>{t.latestEvent || "—"}</td>
                                                <td style={{ ...tdStyle, fontSize: 12 }}>{formatDate(t.date)}</td>
                                                <td style={tdStyle}><StatusBadge status={t.status} /></td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ADD TRACKING MODAL */}
            {addModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
                    <Card style={{ width: 420, padding: 28 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>Add Pakistan Post Tracking</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                            <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>Tracking Number</label>
                            <input type="text" value={newTracking} onChange={e => setNewTracking(e.target.value)} placeholder="e.g. EM123456789PK" style={{ padding: "10px 14px", borderRadius: T.r8, background: T.bgElev, border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 14, fontFamily: "monospace", outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <GradientButton variant="primary" onClick={handleAddTracking} disabled={addingTracking || !newTracking.trim()}>{addingTracking ? "Adding..." : "Add Tracking"}</GradientButton>
                            <GradientButton variant="secondary" onClick={() => { setAddModal(false); setNewTracking(""); }}>Cancel</GradientButton>
                        </div>
                    </Card>
                </div>
            )}

            {!error && !loading && pagination.totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: `1px solid ${T.border}`, background: T.bgCard, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: T.textMuted }}>
                        Showing {((pagination.page - 1) * pagination.perPage) + 1}–{Math.min(pagination.page * pagination.perPage, pagination.totalOrders)} of <strong>{pagination.totalOrders}</strong> trackings
                    </div>
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
