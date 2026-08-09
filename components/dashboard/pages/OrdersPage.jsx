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

// ── Manual Order Modal ───────────────────────────────────────────────────────

const COURIER_REGISTRY = {
    tcs:      { name: 'TCS',          code: 'TCS', color: '#e85955', days: '2 days' },
    leopards: { name: 'Leopards',     code: 'LP',  color: '#4ade80', days: '2 days' },
    postex:   { name: 'PostEx',       code: 'PX',  color: '#60a5fa', days: '3 days' },
    trax:     { name: 'Trax',         code: 'TX',  color: '#fbbf24', days: '3 days' },
    mnp:      { name: 'M&P',          code: 'M&P', color: '#c084fc', days: '3 days' },
    callc:    { name: 'Call Courier', code: 'CC',  color: '#f87171', days: '3 days' },
    rider:    { name: 'Rider',        code: 'RD',  color: '#fcd34d', days: '2 days' },
    swyft:    { name: 'Swyft',        code: 'SW',  color: '#94a3b8', days: '3 days' },
};

const DEFAULT_ZONES = {
    metro: { label: 'Metro',          color: '#60A5FA', base: 'tcs',      risk: 'leopards' },
    urban: { label: 'Urban',          color: '#FBBF24', base: 'leopards', risk: 'tcs'      },
    rural: { label: 'Rural / Remote', color: '#A78BFA', base: 'trax',     risk: 'postex'   },
};

function nameToKey(name) {
    if (!name) return null;
    const n = name.toLowerCase().replace(/[^a-z]/g, '');
    return Object.keys(COURIER_REGISTRY).find(k =>
        COURIER_REGISTRY[k].name.toLowerCase().replace(/[^a-z]/g, '') === n
    ) || null;
}

function detectZone(address) {
    if (!address) return 'rural';
    const a = address.toLowerCase();
    if (/karachi|lahore|islamabad/.test(a)) return 'metro';
    if (/sialkot|multan|peshawar/.test(a)) return 'urban';
    return 'rural';
}

function computeRec(zone, isFirstTime, isCOD, manualPick, couriers, zones) {
    if (manualPick) return { key: manualPick, trace: [`Manual override: ${couriers[manualPick].name}`] };
    const zc = zones[zone];
    let key = zc.base;
    if (!couriers[key]) key = Object.keys(couriers)[0];
    const trace = [`${zc.label} zone → ${couriers[key].name} recommended`];
    if (isCOD && isFirstTime) {
        const risk = couriers[zc.risk] ? zc.risk : key;
        key = risk;
        trace.push(`COD + new customer → switched to ${couriers[key].name} (lower COD risk)`);
    }
    return { key, trace };
}

const BLANK_FORM = { customerName: '', phone: '', address: '', details: '', amount: '' };

export function NewOrderModal({ onClose, onCreated }) {
    const [form, setForm] = useState(BLANK_FORM);
    const [payType, setPayType] = useState('cod');
    const [sendWA, setSendWA] = useState(true);
    const [zone, setZone] = useState('rural');
    const [isReturning, setIsReturning] = useState(null);
    const [phoneLookupLoading, setPhoneLookupLoading] = useState(false);
    const [manualCourier, setManualCourier] = useState(null);
    const [showCourierPicker, setShowCourierPicker] = useState(false);
    const [errors, setErrors] = useState({});
    const [flowState, setFlowState] = useState('form');
    const [createdOrder, setCreatedOrder] = useState(null);
    const [couriers, setCouriers] = useState({ tcs: COURIER_REGISTRY.tcs, leopards: COURIER_REGISTRY.leopards, postex: COURIER_REGISTRY.postex, trax: COURIER_REGISTRY.trax });
    const [zones, setZones] = useState(DEFAULT_ZONES);
    const phoneTimerRef = useRef(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        const userId = getCurrentUserId();
        if (!userId) return;
        Promise.all([
            fetch(`/api/couriers/credentials?userId=${encodeURIComponent(userId)}`).then(r => r.json()).catch(() => null),
            fetch(`/api/couriers/rules?userId=${encodeURIComponent(userId)}`).then(r => r.json()).catch(() => null),
        ]).then(([creds, rules]) => {
            if (creds?.connected?.length > 0) {
                const connected = {};
                creds.connected.forEach(key => { if (COURIER_REGISTRY[key]) connected[key] = COURIER_REGISTRY[key]; });
                if (Object.keys(connected).length > 0) setCouriers(connected);
            }
            if (rules?.zoneRules) {
                setZones(prev => ({
                    metro: { ...prev.metro, base: nameToKey(rules.zoneRules.metro) || prev.metro.base },
                    urban: { ...prev.urban, base: nameToKey(rules.zoneRules.urban) || prev.urban.base },
                    rural: { ...prev.rural, base: nameToKey(rules.zoneRules.rural) || prev.rural.base },
                }));
            }
        });
    }, []);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Zone detection
    useEffect(() => {
        setZone(detectZone(form.address));
        setManualCourier(null);
    }, [form.address]);

    // Phone lookup with debounce
    useEffect(() => {
        if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
        const digits = form.phone.replace(/\D/g, '');
        if (digits.length < 10) { setIsReturning(null); return; }
        setPhoneLookupLoading(true);
        phoneTimerRef.current = setTimeout(async () => {
            try {
                const userId = getCurrentUserId();
                const res = await fetch(`/api/customers?userId=${userId}&search=${encodeURIComponent(form.phone)}&pageSize=1`);
                const json = await res.json();
                setIsReturning((json.customers?.length ?? json.data?.length ?? 0) > 0);
            } catch { setIsReturning(null); }
            finally { setPhoneLookupLoading(false); }
        }, 500);
        return () => clearTimeout(phoneTimerRef.current);
    }, [form.phone]);

    // Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && flowState === 'form') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, flowState]);

    const rec = computeRec(zone, isReturning === false, payType === 'cod', manualCourier, couriers, zones);
    const recCourier = couriers[rec.key] || Object.values(couriers)[0];
    const showRiskNote = payType === 'cod' && isReturning === false && !manualCourier;

    const validate = () => {
        const e = {};
        if (!form.customerName.trim()) e.customerName = 'Name is required';
        if (!form.phone.trim()) e.phone = 'Phone is required';
        else if (!/^03\d{2}-?\d{7}$/.test(form.phone.trim())) e.phone = 'Enter a valid Pakistani number (03xx-xxxxxxx)';
        if (!form.address.trim()) e.address = 'Address is required';
        if (form.address.trim().length <= 4) e.address = 'Enter a full address';
        if (!form.details.trim()) e.details = 'Order details are required';
        if (!form.amount || Number(form.amount) <= 0) e.amount = 'Amount is required';
        return e;
    };

    const resetForm = () => {
        setForm(BLANK_FORM);
        setPayType('cod'); setSendWA(true); setZone('rural');
        setIsReturning(null); setManualCourier(null);
        setShowCourierPicker(false); setCreatedOrder(null);
        setErrors({}); setFlowState('form');
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setErrors({});
        try {
            const userId = getCurrentUserId();
            if (sendWA) {
                setFlowState('sending');
                await new Promise(r => setTimeout(r, 1200));
            }
            setFlowState('booking');
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    customerName: form.customerName,
                    customerPhone: form.phone,
                    city: form.address,
                    amount: parseFloat(form.amount),
                    status: 'pending',
                    notes: form.details || null,
                    paymentType: payType,
                    courierKey: rec.key,
                    courierName: recCourier.name,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to create order');
            await new Promise(r => setTimeout(r, 800));
            setCreatedOrder({ ...json.order, courierKey: rec.key });
            setFlowState('success');
        } catch (err) {
            setFlowState('form');
            setErrors({ submit: err.message });
        }
    };

    const inp = { width: '100%', padding: '9px 12px', fontSize: 13, color: T.text, background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
    const inpErr = { ...inp, borderColor: T.red };
    const Lbl = ({ children }) => <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{children}</div>;

    // ── Spinner overlay ──
    const SpinnerOverlay = ({ title, sub }) => (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <style>{`@keyframes nom-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r14, padding: '40px 52px', textAlign: 'center', boxShadow: T.shadowLg }}>
                <div style={{ width: 48, height: 48, border: `3px solid ${T.bgHigh}`, borderTopColor: T.j300, borderRadius: '50%', animation: 'nom-spin 0.7s linear infinite', margin: '0 auto 18px' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
                <div style={{ fontSize: 12, color: T.textFaint, marginTop: 5 }}>{sub}</div>
            </div>
        </div>
    );

    if (flowState === 'sending') return <SpinnerOverlay title="Sending WhatsApp Confirmation…" sub={`Notifying ${form.customerName || 'customer'}`} />;
    if (flowState === 'booking') return <SpinnerOverlay title="Booking Courier…" sub={`Creating order with ${recCourier.name}`} />;

    // ── Success ──
    if (flowState === 'success') return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r14, width: 460, boxShadow: T.shadowLg }}>
                <div style={{ padding: '32px 28px 24px', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ width: 56, height: 56, background: `${T.green}18`, border: `2px solid ${T.green}40`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <Icon name="check" size={24} color={T.green} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>Order Created!</div>
                    <div style={{ fontSize: 13, color: T.textFaint }}>{createdOrder?.order_id} · {recCourier.name} assigned</div>
                </div>
                {/* WA receipt / audit note */}
                <div style={{ padding: '20px 28px' }}>
                    {sendWA ? (
                        <div style={{ background: '#0a4a3f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: T.r10, padding: '14px 16px', marginBottom: 16 }}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>WhatsApp Receipt Preview</div>
                            <div style={{ fontSize: 13, color: '#e2fce4', lineHeight: 1.65 }}>
                                <div>📦 *New Order Confirmed*</div>
                                <div style={{ marginTop: 5 }}>Customer: *{form.customerName}*</div>
                                <div>Courier: *{recCourier.name}* ({recCourier.days})</div>
                                <div>Amount: *PKR {parseFloat(form.amount || 0).toLocaleString()}* ({payType.toUpperCase()})</div>
                                {createdOrder?.order_id && <div style={{ marginTop: 5, color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Ref: {createdOrder.order_id}</div>}
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: `${T.yellow}10`, border: `1px solid ${T.yellow}30`, borderRadius: T.r10, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Icon name="alert-triangle" size={14} color={T.yellow} style={{ flexShrink: 0, marginTop: 1 }} />
                            <div style={{ fontSize: 12, color: T.yellow, lineHeight: 1.5 }}>
                                Booked without WhatsApp confirmation — marked as manually verified.
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}><GradientButton full variant="secondary" size="sm" onClick={() => onCreated(createdOrder)}>Done</GradientButton></div>
                        <div style={{ flex: 1 }}><GradientButton full variant="primary" size="sm" onClick={resetForm}>New Order</GradientButton></div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Main form ──
    return (
        <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r14, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', boxShadow: T.shadowLg }}>

                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: T.bgCard, zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, background: `${T.j300}20`, borderRadius: T.r8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="plus" size={15} color={T.j300} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Manual Order</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>

                <div style={{ padding: '18px 20px' }}>

                    {/* Customer Name */}
                    <div style={{ marginBottom: 14 }}>
                        <Lbl>Customer Name</Lbl>
                        <input value={form.customerName} onChange={e => setField('customerName', e.target.value)}
                            placeholder="e.g. Ahmed Ali" style={errors.customerName ? inpErr : inp} />
                        {errors.customerName && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>{errors.customerName}</div>}
                    </div>

                    {/* Phone */}
                    <div style={{ marginBottom: 14 }}>
                        <Lbl>Phone</Lbl>
                        <input value={form.phone} onChange={e => setField('phone', e.target.value)}
                            placeholder="03xx-xxxxxxx" type="tel" style={errors.phone ? inpErr : inp} />
                        {errors.phone
                            ? <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>{errors.phone}</div>
                            : form.phone.replace(/\D/g, '').length >= 10 && (
                                <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, color: phoneLookupLoading ? T.textFaint : isReturning ? T.green : T.yellow }}>
                                    {phoneLookupLoading ? 'Checking…'
                                        : isReturning === true ? '✓ Returning customer'
                                            : isReturning === false ? '⚠ New customer — no order history'
                                                : null}
                                </div>
                            )
                        }
                    </div>

                    {/* Delivery Address */}
                    <div style={{ marginBottom: 14 }}>
                        <Lbl>Delivery Address</Lbl>
                        <input value={form.address} onChange={e => setField('address', e.target.value)}
                            placeholder="House #, Street, City" style={errors.address ? inpErr : inp} />
                        {errors.address
                            ? <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>{errors.address}</div>
                            : form.address && (
                                <div style={{ fontSize: 11, marginTop: 4, color: ZONES[zone].color }}>
                                    {ZONES[zone].label} zone detected
                                </div>
                            )
                        }
                    </div>

                    {/* Order Details */}
                    <div style={{ marginBottom: 14 }}>
                        <Lbl>Order Details</Lbl>
                        <textarea value={form.details} onChange={e => setField('details', e.target.value)}
                            placeholder="Product name, quantity, variant…"
                            style={{ ...inp, minHeight: 68, resize: 'vertical' }} />
                    </div>

                    {/* Amount + Payment Type */}
                    <div style={{ marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <Lbl>Amount (PKR)</Lbl>
                            <input value={form.amount} onChange={e => setField('amount', e.target.value)}
                                placeholder="0" type="number" min="0" style={errors.amount ? inpErr : inp} />
                            {errors.amount && <div style={{ color: T.red, fontSize: 11, marginTop: 3 }}>{errors.amount}</div>}
                        </div>
                        <div>
                            <Lbl>Payment</Lbl>
                            <div style={{ display: 'flex', borderRadius: T.r8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                                {[['cod', 'COD'], ['prepaid', 'Prepaid']].map(([v, l]) => (
                                    <button key={v} onClick={() => setPayType(v)} style={{
                                        padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                        border: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
                                        background: payType === v ? T.j300 : T.bgElev,
                                        color: payType === v ? '#fff' : T.textFaint,
                                    }}>{l}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Toggle */}
                    <div style={{ marginBottom: 18, padding: '12px 14px', background: T.bgElev, borderRadius: T.r10, border: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>WhatsApp Confirmation</div>
                                <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>
                                    {sendWA ? 'Customer will receive order details on WhatsApp' : 'Skip WhatsApp confirmation'}
                                </div>
                            </div>
                            <button onClick={() => setSendWA(s => !s)} style={{
                                flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: 'none',
                                cursor: 'pointer', background: sendWA ? T.j300 : T.bgHigh,
                                transition: 'background 0.2s', position: 'relative',
                            }}>
                                <div style={{
                                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                    position: 'absolute', top: 3, transition: 'left 0.2s',
                                    left: sendWA ? 23 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                }} />
                            </button>
                        </div>
                    </div>

                    {/* Courier Recommendation */}
                    <div style={{ marginBottom: 18, background: T.bgElev, borderRadius: T.r10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Courier Recommendation</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: T.r8, background: `${recCourier.color}20`, border: `2px solid ${recCourier.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: 11, fontWeight: 900, color: recCourier.color }}>{recCourier.code}</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{recCourier.name}</div>
                                    <div style={{ fontSize: 11, color: T.textFaint }}>{recCourier.days}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                {rec.trace.map((t, i) => (
                                    <div key={i} style={{ fontSize: 11, color: T.textFaint, display: 'flex', gap: 6, marginTop: i > 0 ? 4 : 0 }}>
                                        <span style={{ color: T.j300, flexShrink: 0 }}>→</span>
                                        <span>{t}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {showRiskNote && (
                            <div style={{ padding: '9px 14px', background: `${T.yellow}10`, borderBottom: `1px solid ${T.yellow}25`, display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Icon name="alert-triangle" size={12} color={T.yellow} />
                                <span style={{ fontSize: 11, color: T.yellow, fontWeight: 600 }}>COD + new customer — higher return risk detected</span>
                            </div>
                        )}

                        <button onClick={() => setShowCourierPicker(s => !s)} style={{
                            width: '100%', padding: '9px 14px', background: 'none', border: 'none',
                            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                            fontSize: 12, color: T.textMuted, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span>Choose a different courier</span>
                            <span style={{ fontSize: 9, opacity: 0.5, display: 'inline-block', transform: showCourierPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                        </button>

                        {showCourierPicker && (
                            <div style={{ borderTop: `1px solid ${T.border}`, padding: '6px 8px' }}>
                                {Object.entries(couriers).map(([key, c]) => {
                                    const active = manualCourier === key || (!manualCourier && rec.key === key);
                                    return (
                                        <button key={key} onClick={() => { setManualCourier(key); setShowCourierPicker(false); }} style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 10px', borderRadius: T.r8, border: 'none',
                                            background: active ? `${c.color}15` : 'none',
                                            cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
                                        }}>
                                            <div style={{ width: 28, height: 28, borderRadius: T.r6, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span style={{ fontSize: 9, fontWeight: 900, color: c.color }}>{c.code}</span>
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'left' }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.name}</div>
                                                <div style={{ fontSize: 10, color: T.textFaint }}>{c.days}</div>
                                            </div>
                                            {active && <Icon name="check" size={14} color={c.color} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {errors.submit && (
                        <div style={{ color: T.red, fontSize: 12, marginBottom: 14, padding: '9px 12px', background: T.redBg, borderRadius: T.r8 }}>
                            {errors.submit}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}><GradientButton full variant="secondary" size="sm" onClick={onClose}>Cancel</GradientButton></div>
                        <div style={{ flex: 1 }}><GradientButton full variant="primary" size="sm" onClick={handleSubmit}>{sendWA ? 'Confirm & Book Courier' : 'Create Order'}</GradientButton></div>
                    </div>

                </div>
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
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
            showToast('Export downloaded');
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setExporting(false);
        }
    };

    // ── Import ─────────────────────────────────────────────────────────────

    const downloadOrderTemplate = () => {
        const rows = [
            ['OrderID', 'Customer', 'Phone', 'City', 'Amount', 'Status'],
            ['ORD-001', 'Customer Name', '03XXXXXXXXXX', 'City', '0000', 'pending'],
            ['ORD-002', 'Customer Name', '03XXXXXXXXXX', 'City', '0000', 'confirmed'],
        ];
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'bulk_orders_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

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

            <div className="page-outer" style={{ flex: 1, padding: "28px 28px", overflow: "auto" }}>
                <PageHeader
                    title="Orders"
                    subtitle={`${counts.all} total · Manage your shop orders`}
                    actions={<>
                        <GradientButton variant="secondary" size="sm" icon="download" onClick={handleExport} disabled={exporting}>
                            {exporting ? 'Exporting...' : 'Export CSV'}
                        </GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="download" onClick={downloadOrderTemplate}>
                            Template
                        </GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="upload" onClick={() => importRef.current?.click()} disabled={importing}>
                            {importing ? 'Importing...' : 'Import CSV'}
                        </GradientButton>
                        <GradientButton variant="primary" size="sm" icon="plus" onClick={() => setShowNewOrder(true)}>New Order</GradientButton>
                    </>}
                />

                {/* Status filter cards */}
                <div className="stat-grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
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
                <div className="filter-bar" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
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
                    <div className="table-scroll">
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
                                        {o.courier_name
                                            ? <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: T.r4, background: T.bgElev, border: `1px solid ${T.border}`, color: T.text }}>{o.courier_name}</span>
                                            : <span style={{ fontSize: 12, color: T.textFaint }}>—</span>}
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
                    </div>
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
                <div className="order-detail-panel" style={{ width: 340, borderLeft: `1px solid ${T.border}`, background: T.bgCard, overflow: "auto", flexShrink: 0 }}>
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
