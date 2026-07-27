"use client";

import React, { useState, useEffect, useRef } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Badge, PlatformBadge, Card, PageHeader } from "../Primitives";
import { getCurrentUserId } from "../../../lib/auth";

// ── helpers ─────────────────────────────────────────────────────────────────

function dateRangeToParams(value) {
    const now = new Date();
    const iso = (d) => d.toISOString();
    const startOfDay = (d) => { d.setHours(0, 0, 0, 0); return d; };
    if (value === 'today') return { dateFrom: iso(startOfDay(new Date())), dateTo: iso(now) };
    if (value === '7days') { const d = new Date(); d.setDate(d.getDate() - 7); return { dateFrom: iso(startOfDay(d)), dateTo: iso(now) }; }
    if (value === '30days') { const d = new Date(); d.setDate(d.getDate() - 30); return { dateFrom: iso(startOfDay(d)), dateTo: iso(now) }; }
    if (value === '90days') { const d = new Date(); d.setDate(d.getDate() - 90); return { dateFrom: iso(startOfDay(d)), dateTo: iso(now) }; }
    return { dateFrom: null, dateTo: null };
}

function FilterDropdown({ label, options, value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    const selected = options.find(o => o.value === value);
    const isActive = value !== 'all' && value !== '';
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', borderRadius: T.r8, transition: 'all 0.12s',
                background: isActive ? `${T.j400}18` : T.bgElev,
                border: `1px solid ${isActive ? T.j400 + '80' : T.border}`,
                color: isActive ? T.j300 : T.text,
            }}>
                {selected?.label || label}
                <span style={{ fontSize: 9, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                    background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r10,
                    minWidth: 170, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', padding: '5px 0',
                }}>
                    {options.map(opt => (
                        <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                            fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                            background: value === opt.value ? T.bgElev : 'none',
                            color: value === opt.value ? T.j300 : T.text, fontWeight: value === opt.value ? 700 : 400,
                        }}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
        return obj;
    });
}

// ── New Order Modal ──────────────────────────────────────────────────────────

function NewOrderModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ customerName: '', customerPhone: '', city: '', amount: '', status: 'pending' });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.customerName.trim()) { setErr('Customer name is required'); return; }
        setSaving(true); setErr('');
        try {
            const userId = getCurrentUserId();
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, customerName: form.customerName, customerPhone: form.customerPhone, city: form.city, amount: parseFloat(form.amount) || 0, status: form.status }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to create order');
            onCreated(json.order);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    const field = (label, key, type = 'text', opts = {}) => (
        <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
            {opts.select ? (
                <select value={form[key]} onChange={e => set(key, e.target.value)} style={inputStyle}>
                    {opts.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            ) : (
                <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                    placeholder={opts.placeholder || ''} style={inputStyle} />
            )}
        </div>
    );

    const inputStyle = { width: '100%', padding: '9px 12px', fontSize: 13, color: T.text, background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r14, width: 440, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
                <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>New Order</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, fontSize: 20, lineHeight: 1 }}>×</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: 22 }}>
                    {field('Customer Name', 'customerName', 'text', { placeholder: 'e.g. Ahmed Ali' })}
                    {field('Phone', 'customerPhone', 'tel', { placeholder: '03xx-xxxxxxx' })}
                    {field('City', 'city', 'text', { placeholder: 'Lahore' })}
                    {field('Amount (PKR)', 'amount', 'number', { placeholder: '0' })}
                    {field('Status', 'status', 'text', { select: true, options: [['pending','Pending'],['confirmed','Confirmed'],['delivered','Delivered'],['returned','Returned']] })}
                    {err && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{err}</div>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <GradientButton type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</GradientButton>
                        <GradientButton type="submit" variant="primary" size="sm" disabled={saving}>{saving ? 'Creating...' : 'Create Order'}</GradientButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Edit Address Modal ───────────────────────────────────────────────────────

function EditAddressModal({ order, onClose, onSaved }) {
    const [form, setForm] = useState({ name: order.customer || '', city: order.city || '' });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setErr('');
        try {
            const userId = getCurrentUserId();
            const res = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: 'address', address: form }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed');
            onSaved(form);
        } catch (e) { setErr(e.message); } finally { setSaving(false); }
    };

    const inputStyle = { width: '100%', padding: '9px 12px', fontSize: 13, color: T.text, background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r14, width: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
                <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Edit Customer Info</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, fontSize: 20, lineHeight: 1 }}>×</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: 22 }}>
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Customer Name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>City</label>
                        <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} />
                    </div>
                    {err && <div style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{err}</div>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <GradientButton type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</GradientButton>
                        <GradientButton type="submit" variant="primary" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</GradientButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
    const [ordersData, setOrdersData] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sf, setSf] = useState("all");
    const [sel, setSel] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterDate, setFilterDate] = useState('all');

    const [showNewOrder, setShowNewOrder] = useState(false);
    const [editAddrOrder, setEditAddrOrder] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // orderId + action
    const [toast, setToast] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const importRef = useRef(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const userId = getCurrentUserId();
            let url = `/api/orders?page=${page}&pageSize=${pageSize}`;
            if (sf !== "all") url += `&status=${sf}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (userId) url += `&userId=${encodeURIComponent(userId)}`;
            if (filterPlatform !== 'all') url += `&platform=${filterPlatform}`;
            const { dateFrom, dateTo } = dateRangeToParams(filterDate);
            if (dateFrom) url += `&dateFrom=${encodeURIComponent(dateFrom)}`;
            if (dateTo) url += `&dateTo=${encodeURIComponent(dateTo)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (res.ok) {
                setOrdersData(json.data || []);
                setMeta(json.meta);
            } else {
                console.error("Failed to fetch orders:", json.error);
                setOrdersData([]);
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            setOrdersData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchOrders, 300);
        return () => clearTimeout(timer);
    }, [page, sf, search, filterPlatform, filterDate]);

    // ── Order actions ──────────────────────────────────────────────────────

    const updateOrderStatus = async (order, newStatus) => {
        const key = order.id + newStatus;
        setActionLoading(key);
        try {
            const userId = getCurrentUserId();
            const res = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: 'status', status: newStatus }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed');
            setOrdersData(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
            if (sel === order.id) setSel(order.id); // keep panel open, it'll re-derive from updated data
            showToast(`Order ${order.order_id} → ${newStatus}`);
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const cancelOrder = async (order) => {
        if (!window.confirm(`Cancel order ${order.order_id}?`)) return;
        const key = order.id + 'cancel';
        setActionLoading(key);
        try {
            const userId = getCurrentUserId();
            const res = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: 'cancel' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed');
            setOrdersData(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
            showToast(`Order ${order.order_id} cancelled`);
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const sendWhatsApp = async (order) => {
        const key = order.id + 'wa';
        setActionLoading(key);
        try {
            const userId = getCurrentUserId();
            const res = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action: 'whatsapp' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed');
            showToast('WhatsApp sent');
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Export ─────────────────────────────────────────────────────────────

    const handleExport = async () => {
        setExporting(true);
        try {
            const userId = getCurrentUserId();
            let url = `/api/orders/export?userId=${encodeURIComponent(userId)}`;
            if (sf !== 'all') url += `&status=${sf}`;
            if (filterPlatform !== 'all') url += `&platform=${filterPlatform}`;
            const { dateFrom: dFrom, dateTo: dTo } = dateRangeToParams(filterDate);
            if (dFrom) url += `&dateFrom=${encodeURIComponent(dFrom)}`;
            if (dTo) url += `&dateTo=${encodeURIComponent(dTo)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('Export downloaded');
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setExporting(false);
        }
    };

    // ── Import ─────────────────────────────────────────────────────────────

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setImporting(true);
        try {
            const text = await file.text();
            const rows = parseCSV(text);
            if (rows.length === 0) throw new Error('No rows found in CSV');
            const userId = getCurrentUserId();
            const res = await fetch('/api/orders/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, data: rows }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Import failed');
            showToast(`Imported ${json.imported} orders (${json.skipped} skipped)`);
            fetchOrders();
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setImporting(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────

    const filtered = ordersData || [];
    const counts = meta?.counts || { all: 0, pending: 0, confirmed: 0, delivered: 0, returned: 0 };
    const selOrder = sel ? ordersData.find(x => x.id === sel) : null;

    return (
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
                    background: toast.type === 'error' ? T.red : T.j400,
                    color: '#fff', padding: '12px 20px', borderRadius: T.r10,
                    fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* New Order Modal */}
            {showNewOrder && (
                <NewOrderModal
                    onClose={() => setShowNewOrder(false)}
                    onCreated={(order) => {
                        setShowNewOrder(false);
                        showToast(`Order ${order.order_id} created`);
                        fetchOrders();
                    }}
                />
            )}

            {/* Edit Address Modal */}
            {editAddrOrder && (
                <EditAddressModal
                    order={editAddrOrder}
                    onClose={() => setEditAddrOrder(null)}
                    onSaved={({ name, city }) => {
                        setOrdersData(prev => prev.map(o => o.id === editAddrOrder.id ? { ...o, customer: name, city } : o));
                        setEditAddrOrder(null);
                        showToast('Customer info updated');
                    }}
                />
            )}

            {/* Hidden file input for import */}
            <input ref={importRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />

            <div style={{ flex: 1, padding: "28px 28px", overflow: "auto" }}>
                <PageHeader
                    title="Orders"
                    subtitle={`${counts.all} total · Manage your shop orders`}
                    actions={<>
                        <GradientButton variant="secondary" size="sm" icon="download" onClick={handleExport} disabled={exporting}>
                            {exporting ? 'Exporting...' : 'Export CSV'}
                        </GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="upload" onClick={() => importRef.current?.click()} disabled={importing}>
                            {importing ? 'Importing...' : 'Import CSV'}
                        </GradientButton>
                        <GradientButton variant="primary" size="sm" icon="plus" onClick={() => setShowNewOrder(true)}>New Order</GradientButton>
                    </>}
                />

                {/* Status filter cards */}
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

                {/* Search bar */}
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, padding: "8px 13px" }}>
                        <Icon name="search" size={13} color={T.textFaint} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search orders, customers, tracking numbers..."
                            style={{ border: "none", outline: "none", fontSize: 13, color: T.text, flex: 1, background: "transparent", fontFamily: "inherit" }} />
                    </div>
                    <FilterDropdown
                        label="Platform"
                        value={filterPlatform}
                        onChange={(v) => { setFilterPlatform(v); setPage(1); }}
                        options={[
                            { value: 'all', label: 'All Platforms' },
                            { value: 'woocommerce', label: 'WooCommerce' },
                            { value: 'shopify', label: 'Shopify' },
                            { value: 'daraz', label: 'Daraz' },
                            { value: 'manual', label: 'Manual' },
                        ]}
                    />
                    <FilterDropdown
                        label="Date Range"
                        value={filterDate}
                        onChange={(v) => { setFilterDate(v); setPage(1); }}
                        options={[
                            { value: 'all', label: 'All Time' },
                            { value: 'today', label: 'Today' },
                            { value: '7days', label: 'Last 7 Days' },
                            { value: '30days', label: 'Last 30 Days' },
                            { value: '90days', label: 'Last 90 Days' },
                        ]}
                    />
                    {(filterPlatform !== 'all' || filterDate !== 'all') && (
                        <button onClick={() => { setFilterPlatform('all'); setFilterDate('all'); setPage(1); }} style={{
                            padding: '7px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            borderRadius: T.r8, border: `1px solid ${T.border}`, background: T.bgElev,
                            color: T.textFaint, fontFamily: 'inherit',
                        }}>Clear ×</button>
                    )}
                </div>

                {/* Orders table */}
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
                                    <td style={{ padding: "12px 16px" }}><PlatformBadge platform={o.platform || "manual"} /></td>
                                    <td style={{ padding: "12px 16px" }}><Badge status={o.status.toLowerCase()} /></td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>—</div>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Rs {(o.amount ?? 0).toLocaleString()}</span>
                                        <div style={{ fontSize: 10, color: T.textFaint }}>{(o.items || []).length > 0 ? `${o.items.length} item${o.items.length > 1 ? 's' : ''}` : '1 item'}</div>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, color: T.textFaint }}>{new Date(o.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                                    <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: "flex", gap: 5 }}>
                                            {o.status.toLowerCase() === "pending" && (
                                                <GradientButton size="xs" variant="primary"
                                                    disabled={actionLoading === o.id + 'confirmed'}
                                                    onClick={() => updateOrderStatus(o, 'confirmed')}>
                                                    {actionLoading === o.id + 'confirmed' ? '...' : 'Confirm'}
                                                </GradientButton>
                                            )}
                                            {o.status.toLowerCase() === "confirmed" && (
                                                <GradientButton size="xs" variant="primary"
                                                    disabled={actionLoading === o.id + 'shipped'}
                                                    onClick={() => updateOrderStatus(o, 'shipped')}>
                                                    {actionLoading === o.id + 'shipped' ? '...' : 'Book'}
                                                </GradientButton>
                                            )}
                                            <GradientButton size="xs" variant="ghost"
                                                onClick={() => setSel(sel === o.id ? null : o.id)}>⋯</GradientButton>
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
                                Showing {Math.min(((page - 1) * pageSize) + 1, meta.pagination.total)} to {Math.min(page * pageSize, meta.pagination.total)} of {meta.pagination.total} orders
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <GradientButton variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</GradientButton>
                                <GradientButton variant="secondary" size="sm" disabled={page === meta.pagination.lastPage} onClick={() => setPage(page + 1)}>Next</GradientButton>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Side panel */}
            {selOrder && (
                <div style={{ width: 340, borderLeft: `1px solid ${T.border}`, background: T.bgCard, overflow: "auto", flexShrink: 0 }}>
                    <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: "monospace" }}>{selOrder.order_id}</span>
                        <button onClick={() => setSel(null)} style={{
                            background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r6,
                            width: 28, height: 28, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}><Icon name="close" size={14} color={T.textMuted} /></button>
                    </div>
                    <div style={{ padding: 20 }}>
                        <Badge status={selOrder.status.toLowerCase()} />

                        {/* Customer card */}
                        <div style={{ marginTop: 18, padding: 16, background: T.bgElev, borderRadius: T.r10, marginBottom: 16, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Customer</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 14, fontWeight: 800, color: "#fff"
                                }}>
                                    {(selOrder.customer || "C").split(" ").map(w => w[0]).join("").slice(0, 2)}
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{selOrder.customer}</div>
                                    <div style={{ fontSize: 11, color: T.textFaint }}>{selOrder.city || '—'}</div>
                                </div>
                            </div>
                            {selOrder.address?.shipping && (
                                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 9, color: T.textFaint }}>SHIPPING ADDRESS</div>
                                    {selOrder.address.shipping.address1}<br />
                                    {selOrder.address.shipping.city}, {selOrder.address.shipping.state} {selOrder.address.shipping.postcode}
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        {(selOrder.items || []).length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Items</div>
                                {selOrder.items.map((item, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                                        <span style={{ color: T.text }}><span style={{ fontWeight: 700 }}>{item.quantity}×</span> {item.name}</span>
                                        <span style={{ color: T.textFaint }}>Rs {(item.subtotal ?? 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Order details */}
                        {[["Amount", `Rs ${(selOrder.amount ?? 0).toLocaleString()}`],
                          ["Platform", selOrder.platform === 'woocommerce' ? "WooCommerce" : selOrder.platform === 'daraz' ? "Daraz" : (selOrder.platform || "Manual")],
                          ["Placed", `${new Date(selOrder.time).toLocaleDateString()}`],
                        ].map(([k, v]) => (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                                <span style={{ fontSize: 12, color: T.textFaint }}>{k}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{v}</span>
                            </div>
                        ))}

                        {/* Action buttons */}
                        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                            {selOrder.status.toLowerCase() === "pending" && (
                                <GradientButton variant="primary" full icon="check"
                                    disabled={actionLoading === selOrder.id + 'confirmed'}
                                    onClick={() => updateOrderStatus(selOrder, 'confirmed')}>
                                    {actionLoading === selOrder.id + 'confirmed' ? 'Confirming...' : 'Confirm Order'}
                                </GradientButton>
                            )}
                            {selOrder.status.toLowerCase() === "confirmed" && (
                                <GradientButton variant="primary" full icon="truck"
                                    disabled={actionLoading === selOrder.id + 'shipped'}
                                    onClick={() => updateOrderStatus(selOrder, 'shipped')}>
                                    {actionLoading === selOrder.id + 'shipped' ? 'Booking...' : 'Book Courier'}
                                </GradientButton>
                            )}
                            {selOrder.status.toLowerCase() === "shipped" && (
                                <GradientButton variant="primary" full icon="check"
                                    disabled={actionLoading === selOrder.id + 'delivered'}
                                    onClick={() => updateOrderStatus(selOrder, 'delivered')}>
                                    {actionLoading === selOrder.id + 'delivered' ? 'Updating...' : 'Mark Delivered'}
                                </GradientButton>
                            )}
                            <GradientButton variant="secondary" full icon="whatsapp"
                                disabled={actionLoading === selOrder.id + 'wa'}
                                onClick={() => sendWhatsApp(selOrder)}>
                                {actionLoading === selOrder.id + 'wa' ? 'Sending...' : 'Send WhatsApp'}
                            </GradientButton>
                            <GradientButton variant="secondary" full icon="edit"
                                onClick={() => setEditAddrOrder(selOrder)}>
                                Edit Customer Info
                            </GradientButton>
                            {!['cancelled', 'delivered'].includes(selOrder.status.toLowerCase()) && (
                                <GradientButton variant="danger" full icon="close"
                                    disabled={actionLoading === selOrder.id + 'cancel'}
                                    onClick={() => cancelOrder(selOrder)}>
                                    {actionLoading === selOrder.id + 'cancel' ? 'Cancelling...' : 'Cancel Order'}
                                </GradientButton>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
