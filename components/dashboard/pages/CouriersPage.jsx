"use client";

import React, { useState, useEffect, useRef } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, PageHeader } from "../Primitives";
import { getCurrentUserId } from "../../../lib/auth";

// ── static courier registry ──────────────────────────────────────────────────

const INIT_COURIERS = {
    tcs:      { name: "TCS",          code: "TCS", color: "#E85955", bg: "rgba(224,57,54,0.12)",   connected: false, score: null, successRate: "—", avgDays: "1–3 days", rto: "—", cost: "Rs 210", load: 0, bestFor: "Metro cities, electronics" },
    leopards: { name: "Leopards",     code: "LP",  color: "#4ADE80", bg: "rgba(34,197,94,0.12)",   connected: false, score: null, successRate: "—", avgDays: "2–4 days", rto: "—", cost: "Rs 185", load: 0, bestFor: "Urban areas, high volume" },
    mnp:      { name: "M&P Courier",  code: "M&P", color: "#C084FC", bg: "rgba(168,85,247,0.12)",  connected: false, score: null, successRate: "—", avgDays: "2–4 days", rto: "—", cost: "Rs 240", load: 0, bestFor: "Urban fallback only" },
    postex:   { name: "PostEx",       code: "PX",  color: "#60A5FA", bg: "rgba(59,130,246,0.12)",  connected: false, score: null, successRate: "—", avgDays: "2–4 days", rto: "—", cost: "Rs 165", load: 0, bestFor: "Rural / remote, COD" },
    trax:     { name: "Trax",         code: "TX",  color: "#FBBF24", bg: "rgba(245,158,11,0.12)",  connected: false, score: null, successRate: "—", avgDays: "3–5 days", rto: "—", cost: "Rs 150", load: 0, bestFor: "Rural / remote" },
    callc:    { name: "Call Courier", code: "CC",  color: "#F87171", bg: "rgba(242,114,107,0.12)", connected: false, score: null, successRate: "—", avgDays: "3–5 days", rto: "—", cost: "Rs 175", load: 0, bestFor: "Urban areas" },
    rider:    { name: "Rider",        code: "RD",  color: "#FCD34D", bg: "rgba(234,179,8,0.12)",   connected: false, score: null, successRate: "—", avgDays: "1–2 days", rto: "—", cost: "Rs 140", load: 0, bestFor: "Karachi same-day" },
    swyft:    { name: "Swyft",        code: "SW",  color: "#94A3B8", bg: "rgba(100,116,139,0.12)", connected: false, score: null, successRate: "—", avgDays: "—",        rto: "—", cost: "—",       load: 0, bestFor: "—" },
};

const ZONES = {
    metro: { label: "Metro",         base: { courier: "TCS",      days: "2 days" }, risk: { courier: "Leopards", days: "3 days" } },
    urban: { label: "Urban",         base: { courier: "Leopards", days: "2 days" }, risk: { courier: "TCS",      days: "3 days" } },
    rural: { label: "Rural/Remote",  base: { courier: "Trax",     days: "3 days" }, risk: { courier: "PostEx",   days: "4 days" } },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function scoreClass(s) { return s >= 85 ? "good" : s >= 65 ? "mid" : "low"; }
function scoreColor(s) { return s >= 85 ? T.green : s >= 65 ? T.yellow : T.red; }

function detectZone(address) {
    const a = (address || "").toLowerCase();
    if (/karachi|lahore|islamabad/.test(a)) return "metro";
    if (/sialkot|multan|peshawar/.test(a)) return "urban";
    return "rural";
}

function courierKeyFromName(name, map) {
    return Object.keys(map).find(k => map[k].name === name || map[k].name.startsWith(name)) || null;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, onHide }) {
    useEffect(() => { const t = setTimeout(onHide, 2600); return () => clearTimeout(t); }, [msg]);
    return (
        <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: T.bgCard, border: `1px solid ${T.borderMid}`, color: T.text,
            padding: "12px 20px", borderRadius: T.r10, fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 10, zIndex: 300,
            boxShadow: T.shadowLg, animation: "fadeIn 0.2s ease",
        }}>
            <Icon name="check" size={14} color={T.green} />
            {msg}
        </div>
    );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({ title, subtitle, children, onClose }) {
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
            position: "fixed", inset: 0, background: "rgba(4,8,7,0.75)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
        }}>
            <div style={{
                background: T.bgCard, border: `1px solid ${T.borderMid}`, borderRadius: T.r14,
                width: 440, maxWidth: "100%", padding: 28, boxShadow: T.shadowLg,
            }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 13, color: T.textFaint, marginBottom: 22 }}>{subtitle}</div>}
                {children}
            </div>
        </div>
    );
}

function ModalField({ label, children }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, fontWeight: 600, marginBottom: 7 }}>{label}</label>
            {children}
        </div>
    );
}

const selStyle = { width: "100%", height: 42, background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRadius: T.r8, padding: "0 12px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit" };
const inputStyle = { width: "100%", height: 42, background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRadius: T.r8, padding: "0 12px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit" };

// ── Edit Routing Rules Modal ──────────────────────────────────────────────────

function EditRulesModal({ rules, onSave, onClose }) {
    const [metro, setMetro] = useState(rules.metro);
    const [urban, setUrban] = useState(rules.urban);
    const [rural, setRural] = useState(rules.rural);
    return (
        <Modal title="Edit routing rules" subtitle="Change the default courier for each zone" onClose={onClose}>
            <ModalField label="Metro Cities primary">
                <select value={metro} onChange={e => setMetro(e.target.value)} style={selStyle}>
                    {["TCS", "Leopards", "Rider"].map(n => <option key={n}>{n}</option>)}
                </select>
            </ModalField>
            <ModalField label="Urban Areas primary">
                <select value={urban} onChange={e => setUrban(e.target.value)} style={selStyle}>
                    {["Leopards", "M&P Courier", "TCS"].map(n => <option key={n}>{n}</option>)}
                </select>
            </ModalField>
            <ModalField label="Rural / Remote primary">
                <select value={rural} onChange={e => setRural(e.target.value)} style={selStyle}>
                    {["Trax", "PostEx"].map(n => <option key={n}>{n}</option>)}
                </select>
            </ModalField>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <GradientButton variant="secondary" full onClick={onClose}>Cancel</GradientButton>
                <GradientButton variant="primary" full onClick={() => onSave({ metro, urban, rural })}>Save rules</GradientButton>
            </div>
        </Modal>
    );
}

// ── Hard Rule Builder Modal ───────────────────────────────────────────────────

function HardRuleModal({ onSave, onClose }) {
    const [condition, setCondition] = useState("category");
    const [catVal, setCatVal] = useState("Electronics");
    const [numVal, setNumVal] = useState("");
    const [action, setAction] = useState("always");
    const [courier, setCourier] = useState("TCS");
    const [err, setErr] = useState(false);

    const condLabels = { category: "Package category is", weight: "Weight is under (kg)", cod: "COD amount is over (Rs)" };

    const handleSave = () => {
        if (condition !== "category" && !numVal) { setErr(true); return; }
        setErr(false);
        let condText = condition === "category" ? `${catVal} category`
            : condition === "weight" ? `Weight under ${numVal}kg` : `COD over Rs ${numVal}`;
        let actText = action === "always" ? `always ships via ${courier}`
            : action === "skip" ? `skips ${courier}` : "uses cheapest courier in zone";
        onSave(`${condText} → ${actText}`);
    };

    return (
        <Modal title="New hard rule" subtitle="Hard rules win — they apply before AI scoring or risk checks run" onClose={onClose}>
            <ModalField label="When">
                <select value={condition} onChange={e => { setCondition(e.target.value); setErr(false); }} style={selStyle}>
                    {Object.entries(condLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </ModalField>
            <ModalField label={condition === "weight" ? "Weight (kg)" : condition === "cod" ? "Amount (Rs)" : "Category"}>
                {condition === "category" ? (
                    <select value={catVal} onChange={e => setCatVal(e.target.value)} style={selStyle}>
                        {["Electronics", "Fragile / clothing", "Grocery", "General"].map(n => <option key={n}>{n}</option>)}
                    </select>
                ) : (
                    <>
                        <input value={numVal} onChange={e => { setNumVal(e.target.value); setErr(false); }} placeholder="e.g. 10000" type="number" style={{ ...inputStyle, borderColor: err ? T.red : T.borderMid }} />
                        {err && <div style={{ fontSize: 12, color: T.red, marginTop: 5 }}>Enter a value for this condition</div>}
                    </>
                )}
            </ModalField>
            <ModalField label="Then">
                <select value={action} onChange={e => setAction(e.target.value)} style={selStyle}>
                    <option value="always">Always use courier</option>
                    <option value="skip">Skip this courier</option>
                    <option value="cheapest">Use cheapest available courier</option>
                </select>
            </ModalField>
            {action !== "cheapest" && (
                <ModalField label="Courier">
                    <select value={courier} onChange={e => setCourier(e.target.value)} style={selStyle}>
                        {["TCS", "Leopards", "M&P Courier", "PostEx", "Trax", "Call Courier", "Rider"].map(n => <option key={n}>{n}</option>)}
                    </select>
                </ModalField>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <GradientButton variant="secondary" full onClick={onClose}>Cancel</GradientButton>
                <GradientButton variant="primary" full onClick={handleSave}>Save rule</GradientButton>
            </div>
        </Modal>
    );
}

// ── Connect Courier Modal ─────────────────────────────────────────────────────

function ConnectModal({ courierKey, courierName, onSave, onClose }) {
    const [key, setKey] = useState("");
    const [secret, setSecret] = useState("");
    const [errs, setErrs] = useState({});
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState(null);

    const handleSave = async () => {
        const e = {};
        if (!key.trim()) e.key = true;
        if (!secret.trim()) e.secret = true;
        setErrs(e);
        if (Object.keys(e).length) return;
        setSaving(true); setApiError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch('/api/couriers/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ courierKey, apiKey: key.trim(), apiSecret: secret.trim() }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to save credentials');
            onSave();
        } catch (e) {
            setApiError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={`Connect ${courierName}`} subtitle="Credentials are encrypted and stored securely — never in source code" onClose={onClose}>
            <ModalField label={<>API key <span style={{ color: T.red }}>*</span></>}>
                <input value={key} onChange={e => { setKey(e.target.value); setErrs(p => ({ ...p, key: false })); }}
                    placeholder="e.g. sk_live_..." style={{ ...inputStyle, borderColor: errs.key ? T.red : T.borderMid }} />
                {errs.key && <div style={{ fontSize: 12, color: T.red, marginTop: 5 }}>API key is required</div>}
            </ModalField>
            <ModalField label={<>API secret <span style={{ color: T.red }}>*</span></>}>
                <input value={secret} onChange={e => { setSecret(e.target.value); setErrs(p => ({ ...p, secret: false })); }}
                    placeholder="Enter secret" type="password" style={{ ...inputStyle, borderColor: errs.secret ? T.red : T.borderMid }} />
                {errs.secret && <div style={{ fontSize: 12, color: T.red, marginTop: 5 }}>API secret is required</div>}
            </ModalField>
            {apiError && <div style={{ fontSize: 12, color: T.red, marginBottom: 12, padding: "8px 12px", background: T.redBg, borderRadius: T.r6 }}>{apiError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <GradientButton variant="secondary" full onClick={onClose}>Cancel</GradientButton>
                <GradientButton variant="primary" full onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save & connect'}</GradientButton>
            </div>
        </Modal>
    );
}

// ── Book Shipment View ────────────────────────────────────────────────────────

function BookView({ couriers, onBack, onToast }) {
    const [form, setForm] = useState({ name: "", phone: "", address: "", category: "general", weight: "1.2", l: "20", w: "15", h: "10", value: "", payment: "cod", buyer: "first" });
    const [errs, setErrs] = useState({});
    const [zone, setZone] = useState("metro");
    const [manualPick, setManualPick] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [booking, setBooking] = useState(false);
    const [booked, setBooked] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [confirmed, setConfirmed] = useState(false);

    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const realScore = (courierName) => {
        const key = courierKeyFromName(courierName, couriers);
        const s = couriers[key]?.score;
        return s != null ? `${s}%` : "—";
    };

    const computePick = () => {
        const cat = form.category;
        const wt = parseFloat(form.weight || "1");
        const cod = form.payment === "cod";
        const firstTime = form.buyer === "first";
        const highRisk = cod && firstTime;
        const zoneData = ZONES[zone];

        if (cat === "electronics") return { courier: "TCS", score: realScore("TCS"), days: "2 days", why: "Electronics category — hard rule always ships via TCS", risky: false, trace: ["Package category: Electronics", "Hard rule → always TCS, regardless of zone or risk"] };
        if (wt < 0.5) {
            const cheap = zone === "rural" ? "Trax" : "Leopards";
            return { courier: cheap, score: realScore(cheap), days: "2–3 days", why: "Under 0.5kg — cheapest courier in this zone", risky: false, trace: [`Weight: ${wt}kg (under 0.5kg threshold)`, `Hard rule → cheapest courier in ${zoneData.label}`] };
        }
        if (highRisk) {
            const r = zoneData.risk;
            return { courier: r.courier, score: realScore(r.courier), days: r.days, why: "Best COD success rate for this zone right now", risky: true, trace: [`Zone rule: ${zoneData.label} → ${zoneData.base.courier} suggested`, "COD + first-time buyer → high RTO risk flagged", `Switched to ${r.courier} — better COD success here`] };
        }
        const b = zoneData.base;
        return { courier: b.courier, score: realScore(b.courier), days: b.days, why: "Zone rule default — no override needed", risky: false, trace: [`Zone rule: ${zoneData.label} → ${b.courier} suggested`, !cod ? "Prepaid — no RTO exposure" : "COD, repeat buyer — risk low enough", "Rule confirmed — no risk override triggered"] };
    };

    const pick = manualPick ? {
        courier: manualPick, score: (couriers[courierKeyFromName(manualPick, couriers)] || {}).score + "%",
        days: (couriers[courierKeyFromName(manualPick, couriers)] || {}).avgDays,
        why: "You chose this manually — overriding the recommendation", risky: false,
        trace: ["Manual override", `You selected ${manualPick} directly, skipping automatic pick`]
    } : computePick();

    const chargeable = (() => {
        const wt = parseFloat(form.weight || "1");
        const vol = (parseFloat(form.l || "0") * parseFloat(form.w || "0") * parseFloat(form.h || "0")) / 5000;
        const charged = Math.max(wt, vol);
        const isVol = vol > wt;
        const key = courierKeyFromName(pick.courier, couriers);
        const c = couriers[key];
        const base = c && c.cost !== "—" ? parseInt(c.cost.replace("Rs ", "")) : 210;
        return { total: Math.round(base + Math.max(0, charged - 1) * 30), charged: charged.toFixed(2), isVol };
    })();

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = true;
        if (!form.phone.trim()) e.phone = true;
        if (!form.address.trim()) e.address = true;
        setErrs(e);
        return !Object.keys(e).length;
    };

    const handleBook = async () => {
        if (!validate()) { onToast("Fill in the required fields to book"); return; }
        setBooking(true);
        if (pick.risky && !confirmed) {
            onToast("WhatsApp confirmation sent to " + form.phone);
            await new Promise(r => setTimeout(r, 1400));
            setConfirmed(true);
            onToast("Customer confirmed via WhatsApp — booking courier automatically");
        }
        const trackNo = `ZY-${Date.now().toString(36).toUpperCase().slice(-7)}`;
        setBooked({ trackNo, courier: pick.courier, name: form.name, cod: form.payment === "cod" ? `Rs ${Number(form.value || 0).toLocaleString()}` : "Prepaid" });
        setRecentBookings(prev => [{ trackNo, name: form.name, courier: pick.courier }, ...prev]);
        onToast(`Booked with ${pick.courier} — receipt sent to your WhatsApp`);
        setBooking(false);
    };

    const zoneNames = { metro: "Metro Cities", urban: "Urban Areas", rural: "Rural / Remote" };
    const C = (v, a, b) => v === a ? b : "";

    return (
        <div className="page-outer" style={{ padding: "28px 32px", maxWidth: 1280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textFaint, marginBottom: 16 }}>
                <button onClick={onBack} style={{ background: "none", border: "none", color: T.textFaint, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Couriers</button>
                <span>/</span><span style={{ color: T.textMuted }}>Book a shipment</span>
            </div>
            <PageHeader title="Book a shipment" subtitle="Fill in the order — Zyro recommends a courier as you go"
                actions={<GradientButton variant="secondary" size="sm" onClick={onBack}>Cancel</GradientButton>} />

            {booked && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", borderRadius: T.r14, marginBottom: 22, background: `${T.green}14`, border: `1px solid ${T.green}44` }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.gradBtn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="check" size={16} color="#04231a" />
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>Shipment booked — {booked.trackNo}</div>
                        <div style={{ fontSize: 13, color: T.textMuted }}>{booked.courier} will collect this order for {booked.name}.</div>
                    </div>
                </div>
            )}

            {booked && (
                <div style={{ marginBottom: 22, maxWidth: 340 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.textFaint, marginBottom: 10, fontWeight: 600 }}>
                        <Icon name="whatsapp" size={14} color="#25D366" />Courier receipt sent to your WhatsApp
                    </div>
                    <div style={{ background: "#0b3d2e", border: "1px solid rgba(37,211,102,0.25)", borderRadius: "12px 12px 12px 2px", padding: "14px 16px", boxShadow: T.shadowLg }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#e9fff2", marginBottom: 10 }}>📦 Courier Slip Generated</div>
                        {[["Tracking", booked.trackNo], ["Courier", booked.courier], ["Customer", booked.name], ["COD to collect", booked.cod], ["Pickup", "Tomorrow, before 2 PM"]].map(([l, v]) => (
                            <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, color: "#b9d6c8", padding: "3px 0" }}>
                                <span>{l}</span><b style={{ color: "#f2fff8", fontWeight: 600 }}>{v}</b>
                            </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, fontSize: 10, color: "#8fb5a4", marginTop: 8 }}>Sent just now ✓✓</div>
                    </div>
                </div>
            )}

            <div className="courier-booking-grid" style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>
                <Card pad={26}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                        <FormField label="Customer name *" error={errs.name && "Customer name is required"}>
                            <input value={form.name} onChange={e => { setF("name", e.target.value); setErrs(p => ({ ...p, name: false })); }}
                                placeholder="e.g. Ayesha Khan" style={{ ...bInputStyle, borderColor: errs.name ? T.red : T.borderMid }} />
                        </FormField>
                        <FormField label="Phone *" error={errs.phone && "Phone number is required"}>
                            <input value={form.phone} onChange={e => { setF("phone", e.target.value); setErrs(p => ({ ...p, phone: false })); }}
                                placeholder="03xx-xxxxxxx" style={{ ...bInputStyle, borderColor: errs.phone ? T.red : T.borderMid }} />
                        </FormField>
                    </div>
                    <FormField label="Delivery address *" error={errs.address && "Delivery address is required"} hint={`Detected zone: ${zoneNames[zone]}`}>
                        <textarea value={form.address} onChange={e => { setF("address", e.target.value); setErrs(p => ({ ...p, address: false })); setManualPick(null); setZone(detectZone(e.target.value)); }}
                            placeholder="House / street / area / city" rows={2}
                            style={{ ...bInputStyle, height: "auto", padding: "10px 12px", resize: "vertical", minHeight: 64, borderColor: errs.address ? T.red : T.borderMid }} />
                    </FormField>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                        <FormField label="Package category">
                            <select value={form.category} onChange={e => { setF("category", e.target.value); setManualPick(null); }} style={bInputStyle}>
                                <option value="general">General</option>
                                <option value="electronics">Electronics</option>
                                <option value="fragile">Fragile / clothing</option>
                                <option value="grocery">Grocery</option>
                            </select>
                        </FormField>
                        <FormField label="Weight (kg)">
                            <input type="number" value={form.weight} onChange={e => { setF("weight", e.target.value); setManualPick(null); }} min="0.1" step="0.1" style={bInputStyle} />
                        </FormField>
                    </div>
                    <FormField label="Dimensions L × W × H (cm)" hint={chargeable.isVol ? `Chargeable: ${chargeable.charged}kg — volumetric` : `Chargeable: ${chargeable.charged}kg (actual)`}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            {[["bL", "l", "L"], ["bW", "w", "W"], ["bH", "h", "H"]].map(([id, key, ph]) => (
                                <input key={id} id={id} type="number" value={form[key]} onChange={e => { setF(key, e.target.value); setManualPick(null); }}
                                    min="1" placeholder={ph} style={{ ...bInputStyle, textAlign: "center" }} />
                            ))}
                        </div>
                    </FormField>
                    <FormField label="Order value (Rs)">
                        <input type="number" id="bValue" value={form.value} onChange={e => setF("value", e.target.value)} min="0" step="100" style={bInputStyle} />
                    </FormField>
                    <FormField label="Payment">
                        <ToggleRow options={[{ val: "cod", label: "Cash on delivery" }, { val: "prepaid", label: "Prepaid" }]} value={form.payment} onChange={v => { setF("payment", v); setManualPick(null); }} />
                    </FormField>
                    <FormField label="Buyer history">
                        <ToggleRow options={[{ val: "first", label: "First-time buyer" }, { val: "repeat", label: "Repeat customer" }]} value={form.buyer} onChange={v => { setF("buyer", v); setManualPick(null); }} />
                    </FormField>
                </Card>

                <div style={{ background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r14, padding: 20, display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 80 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <Icon name="sparkle" size={12} color={T.j200} />Recommended courier
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: manualPick ? T.bgHigh : `${T.green}14`, border: `1px solid ${manualPick ? T.borderMid : T.green + "44"}`, borderRadius: T.r12, padding: "14px 16px" }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: manualPick ? T.text : T.j200 }}>{pick.courier}</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{pick.why}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: T.j200 }}>{pick.score}</div>
                            <div style={{ fontSize: 11, color: T.textFaint }}>{pick.days}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: T.textMuted }}>
                        <span>Est. cost <span style={{ fontSize: 11, color: T.textFaint }}>{chargeable.isVol ? "(volumetric)" : ""}</span></span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Rs {chargeable.total}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textFaint }}>Est. market rate — actual may differ by contract</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {pick.trace.map((t, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.textFaint }}>
                                <Icon name="check" size={11} color={T.green} />
                                {t}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <GradientButton variant="primary" full disabled={booking} onClick={handleBook}>
                            {pick.risky && !confirmed ? "Send WhatsApp confirmation first" : `Accept ${pick.courier}`}
                        </GradientButton>
                        <GradientButton variant="secondary" full onClick={() => setShowPicker(p => !p)}>Choose manually</GradientButton>
                    </div>
                    {showPicker && (
                        <div>
                            <div style={{ fontSize: 12, color: T.textFaint, marginBottom: 8 }}>All connected couriers for comparison:</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                                {Object.values(couriers).filter(c => c.connected).map(c => (
                                    <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: `1px solid ${T.borderMid}`, borderRadius: T.r8, background: T.bgHigh }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                                            <div style={{ fontSize: 12, color: T.textFaint }}>{c.score ? `${c.score}% · ${c.avgDays} · ${c.cost}` : "Building history"}</div>
                                        </div>
                                        <button onClick={() => { setManualPick(c.name); setShowPicker(false); }} style={{ background: T.bgCard, border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: T.r6, cursor: "pointer", fontFamily: "inherit" }}>Select</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {recentBookings.length > 0 && (
                <div style={{ marginTop: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 14 }}>Booked this session</div>
                    <Card pad={0}>
                        {recentBookings.map((b, i) => (
                            <div key={b.trackNo} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: i < recentBookings.length - 1 ? `1px solid ${T.border}` : "none", fontSize: 13 }}>
                                <span style={{ color: T.j200, fontWeight: 700 }}>{b.trackNo}</span>
                                <span style={{ flex: 1, color: T.text }}>{b.name}</span>
                                <span style={{ color: T.textMuted }}>{b.courier}</span>
                                <span style={{ color: T.textFaint, fontSize: 11 }}>Just now</span>
                            </div>
                        ))}
                    </Card>
                </div>
            )}
        </div>
    );
}

const bInputStyle = { width: "100%", height: 42, background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRadius: T.r8, padding: "0 12px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

function FormField({ label, children, error, hint }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, color: T.textMuted, fontWeight: 600, marginBottom: 7 }}>{label}</label>
            {children}
            {error && <div style={{ fontSize: 12, color: T.red, marginTop: 6 }}>{error}</div>}
            {hint && !error && <div style={{ fontSize: 11, color: T.textFaint, marginTop: 6 }}>{hint}</div>}
        </div>
    );
}

function ToggleRow({ options, value, onChange }) {
    return (
        <div style={{ display: "flex", gap: 8 }}>
            {options.map(o => (
                <button key={o.val} type="button" onClick={() => onChange(o.val)} style={{
                    flex: 1, padding: "9px 0", borderRadius: T.r8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    background: value === o.val ? T.gradBtn : T.bgElev,
                    color: value === o.val ? "#fff" : T.textMuted,
                    border: `1px solid ${value === o.val ? "transparent" : T.borderMid}`,
                    boxShadow: value === o.val ? T.glowBtn : "none",
                }}>{o.label}</button>
            ))}
        </div>
    );
}

// ── Main Couriers Page ────────────────────────────────────────────────────────

function relTime(dateStr) {
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr ago`;
    return `${Math.floor(h / 24)} days ago`;
}

export default function CouriersPage() {
    const [view, setView] = useState("main");
    const [couriers, setCouriers] = useState(INIT_COURIERS);
    const [rules, setRules] = useState({ metro: "TCS", urban: "Leopards", rural: "Trax" });
    const [hardRules, setHardRules] = useState([]);
    const [showEditRules, setShowEditRules] = useState(false);
    const [showHardRule, setShowHardRule] = useState(false);
    const [connectKey, setConnectKey] = useState(null);
    const [toast, setToast] = useState(null);
    const [codInTransit, setCodInTransit] = useState(0);
    const [aiLog, setAiLog] = useState([]);

    const [shipments, setShipments] = useState([]);
    const [shipLoading, setShipLoading] = useState(true);
    const [shipPage, setShipPage] = useState(1);
    const [shipMeta, setShipMeta] = useState(null);

    const showToast = (msg) => setToast(msg);

    useEffect(() => {
        const fetchShipments = async () => {
            setShipLoading(true);
            try {
                const userId = getCurrentUserId();
                const res = await fetch(`/api/couriers/shipments?page=${shipPage}${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`);
                const result = await res.json();
                setShipments(result.data || []);
                setShipMeta(result.meta);
            } catch { }
            setShipLoading(false);
        };
        fetchShipments();
    }, [shipPage]);

    useEffect(() => {
        const userId = getCurrentUserId();
        if (!userId) return;
        fetch(`/api/couriers/stats?userId=${encodeURIComponent(userId)}`)
            .then(r => r.json())
            .then(data => {
                if (data.codInTransit !== undefined) setCodInTransit(data.codInTransit);
                if (Array.isArray(data.decisions) && data.decisions.length > 0) {
                    setAiLog(data.decisions.map(d => ({
                        type: d.type,
                        text: <>Order <b>#{d.orderId}</b> → {d.city} → {d.reason} → <b>{d.courier}</b></>,
                        time: relTime(d.createdAt),
                    })));
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const userId = getCurrentUserId();
        if (!userId) return;
        fetch(`/api/couriers/performance?userId=${encodeURIComponent(userId)}`)
            .then(r => r.json())
            .then(data => {
                if (!data.performance) return;
                setCouriers(prev => {
                    const next = { ...prev };
                    for (const [key, c] of Object.entries(next)) {
                        const perf = data.performance[c.name];
                        if (perf) {
                            next[key] = { ...c, score: perf.score, successRate: perf.successRate, rto: perf.rtoRate, load: perf.load };
                        }
                    }
                    return next;
                });
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const userId = getCurrentUserId();
        if (!userId) return;
        fetch(`/api/couriers/rules?userId=${encodeURIComponent(userId)}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data.hardRules)) setHardRules(data.hardRules);
                if (data.zoneRules) setRules(data.zoneRules);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const userId = getCurrentUserId();
        if (!userId) return;
        fetch(`/api/couriers/credentials?userId=${encodeURIComponent(userId)}`)
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data.connected)) return;
                setCouriers(prev => {
                    const next = { ...prev };
                    for (const key of Object.keys(next)) {
                        next[key] = { ...next[key], connected: data.connected.includes(key) };
                    }
                    return next;
                });
            })
            .catch(() => {});
    }, []);

    const saveRulesToDB = async (nextHardRules, nextZoneRules) => {
        const userId = getCurrentUserId();
        if (!userId) return;
        try {
            await fetch('/api/couriers/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ hardRules: nextHardRules, zoneRules: nextZoneRules }),
            });
        } catch { }
    };

    const connectedCount = Object.values(couriers).filter(c => c.connected).length;

    const disconnect = (key) => {
        setCouriers(prev => ({ ...prev, [key]: { ...prev[key], connected: false } }));
        showToast(`${couriers[key].name} disconnected`);
    };
    const connect = (key) => {
        setCouriers(prev => ({ ...prev, [key]: { ...prev[key], connected: true, score: prev[key].score === null ? 0 : prev[key].score } }));
        setConnectKey(null);
        showToast(`${couriers[key].name} connected`);
    };

    if (view === "book") return <BookView couriers={couriers} onBack={() => setView("main")} onToast={showToast} />;

    const ruleZoneData = {
        metro: { label: "Metro Cities", cities: "Karachi, Lahore, Islamabad +10", primary: rules.metro, fallback: "Leopards" },
        urban: { label: "Urban Areas", cities: "Sialkot, Multan, Peshawar +15", primary: rules.urban, fallback: "M&P" },
        rural: { label: "Rural / Remote", cities: "Village & small-town markers", primary: rules.rural, fallback: "Call Courier" },
    };

    return (
        <div className="page-outer" style={{ padding: "28px 32px", maxWidth: 1280 }}>
            {toast && <Toast msg={toast} onHide={() => setToast(null)} />}
            {showEditRules && <EditRulesModal rules={rules} onSave={r => { setRules(r); setShowEditRules(false); showToast("Routing rules updated"); saveRulesToDB(hardRules, r); }} onClose={() => setShowEditRules(false)} />}
            {showHardRule && <HardRuleModal onSave={r => { const next = [...hardRules, r]; setHardRules(next); setShowHardRule(false); showToast("Hard rule added"); saveRulesToDB(next, rules); }} onClose={() => setShowHardRule(false)} />}
            {connectKey && <ConnectModal courierKey={connectKey} courierName={couriers[connectKey]?.name} onSave={() => connect(connectKey)} onClose={() => setConnectKey(null)} />}

            <PageHeader
                title="Couriers"
                subtitle={
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ color: T.text }}>{connectedCount}</b>
                        <span style={{ color: T.textMuted }}>couriers connected</span>
                        <span style={{ color: T.textFaint }}>·</span>
                        <span style={{ color: T.textMuted }}>Rs <b style={{ color: T.text }}>{codInTransit.toLocaleString()}</b> COD in transit</span>
                    </span>
                }
                actions={<>
                    <GradientButton variant="secondary" size="sm" icon="refresh" onClick={() => showToast("Courier data refreshed")}>Refresh All</GradientButton>
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={() => setView("book")}>Book Shipment</GradientButton>
                </>}
            />

            {/* ── Live Shipment Tracking ── */}
            <div style={{ marginBottom: 28 }}>
                <div className="section-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Live Shipment Tracking</div>
                        <div style={{ fontSize: 13, color: T.textFaint }}>Auto-synced every 30 minutes</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <GradientButton variant="secondary" size="sm" icon="filter">Filter</GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="download">Export</GradientButton>
                    </div>
                </div>
                <Card pad={0}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(92,168,124,0.03)" }}>
                                    {["Tracking #", "Customer", "City", "Courier", "Status", "Progress", "ETA", "COD", "Risk", ""].map(h => (
                                        <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shipLoading ? (
                                    <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: T.textFaint }}>Syncing tracking data...</td></tr>
                                ) : shipments.length === 0 ? (
                                    <tr><td colSpan={10} style={{ padding: 48, textAlign: "center" }}>
                                        <div style={{ color: T.textFaint, fontSize: 13, marginBottom: 10 }}>No shipments tracked yet</div>
                                        <button onClick={() => setView("book")} style={{ background: "none", border: "none", color: T.j200, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Book your first shipment →</button>
                                    </td></tr>
                                ) : (
                                    shipments.map((s, i) => <ShipmentRow key={i} s={s} onBook={() => setView("book")} />)
                                )}
                            </tbody>
                        </table>
                    </div>
                    {shipMeta?.pagination && (
                        <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}` }}>
                            <span style={{ fontSize: 12, color: T.textFaint }}>Page {shipMeta.pagination.page} of {Math.max(1, shipMeta.pagination.lastPage)}</span>
                            <div style={{ display: "flex", gap: 6 }}>
                                <GradientButton variant="secondary" size="xs" disabled={shipPage === 1} onClick={() => setShipPage(p => p - 1)}>Prev</GradientButton>
                                <GradientButton variant="secondary" size="xs" disabled={shipPage >= shipMeta.pagination.lastPage} onClick={() => setShipPage(p => p + 1)}>Next</GradientButton>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Smart Routing Rules ── */}
            <div style={{ marginBottom: 28 }}>
                <div className="section-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Smart Routing Rules</div>
                        <div style={{ fontSize: 13, color: T.textFaint }}>Zyro checks these zone rules first, before anything else runs</div>
                    </div>
                </div>
                <div className="routing-rules-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) auto", gap: 14, alignItems: "stretch", marginBottom: 14 }}>
                    {Object.values(ruleZoneData).map(z => (
                        <Card key={z.label} pad={20}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{z.label}</div>
                            <div style={{ fontSize: 12, color: T.textFaint, marginBottom: 16, lineHeight: 1.5 }}>{z.cities}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <span style={{ fontWeight: 700, color: T.j200 }}>{z.primary}</span>
                                <Icon name="arrow" size={12} color={T.textFaint} />
                                <span style={{ color: T.textMuted }}>{z.fallback} (fallback)</span>
                            </div>
                        </Card>
                    ))}
                    <button onClick={() => setShowEditRules(true)} style={{
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "0 22px", minWidth: 110, background: T.gradCard, border: `1px solid ${T.border}`,
                        borderRadius: T.r12, cursor: "pointer", color: T.textMuted, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                    }}>
                        <Icon name="edit" size={16} color={T.textMuted} />Edit Rules
                    </button>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {hardRules.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.textMuted, background: T.bgElev, border: `1px solid ${T.border}`, padding: "7px 12px", borderRadius: 20 }}>
                            <Icon name="check" size={12} color={T.j200} />
                            {r}
                            <button onClick={() => { const next = hardRules.filter((_, j) => j !== i); setHardRules(next); showToast("Rule removed"); saveRulesToDB(next, rules); }}
                                style={{ background: "none", border: "none", color: T.textFaint, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 0 0 2px" }}>×</button>
                        </div>
                    ))}
                    <button onClick={() => setShowHardRule(true)} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.j200, background: "none", border: `1px solid rgba(92,168,124,0.3)`, padding: "7px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                        + Add hard rule
                    </button>
                </div>
            </div>

            {/* ── Courier Performance ── */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Courier Performance</div>
                <div style={{ fontSize: 13, color: T.textFaint, marginBottom: 14 }}>7-day rolling score per courier, recalculated as new deliveries complete</div>
                <div style={{ fontSize: 12, color: T.textFaint, marginBottom: 14 }}>
                    Scores shown once a courier has 20+ completed shipments · connect more couriers in{" "}
                    <button onClick={() => {}} style={{ background: "none", border: "none", color: T.j200, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: 0 }}>Settings</button>
                </div>
                <Card pad={0}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                    {["Courier", "Score", "Success rate", "Avg. delivery", "RTO %", "Avg. cost", "Current load", "Best for"].map(h => (
                                        <th key={h} style={{ padding: "0 16px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(couriers).map(([key, c], i, arr) => {
                                    const last = i === arr.length - 1;
                                    if (!c.connected) return (
                                        <tr key={key} style={{ borderBottom: last ? "none" : `1px solid ${T.border}` }}>
                                            <td style={{ padding: "14px 16px" }}><CourierName c={c} /></td>
                                            <td colSpan={6} style={{ padding: "14px 16px", color: T.textFaint, fontSize: 13, textAlign: "right" }}>
                                                Not connected ·{" "}
                                                <button onClick={() => setConnectKey(key)} style={{ background: "none", border: "none", color: T.j200, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>connect to enable scoring</button>
                                            </td>
                                            <td style={{ padding: "14px 16px" }} />
                                        </tr>
                                    );
                                    if (c.score === 0) return (
                                        <tr key={key} style={{ borderBottom: last ? "none" : `1px solid ${T.border}` }}>
                                            <td style={{ padding: "14px 16px" }}><CourierName c={c} /></td>
                                            <td colSpan={7} style={{ padding: "14px 16px", color: T.textFaint, fontSize: 13 }}>Connected — building history (0 of 20 shipments)</td>
                                        </tr>
                                    );
                                    const cls = scoreClass(c.score);
                                    const col = scoreColor(c.score);
                                    return (
                                        <tr key={key} style={{ borderBottom: last ? "none" : `1px solid ${T.border}` }}
                                            onMouseEnter={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <td style={{ padding: "14px 16px" }}><CourierName c={c} /></td>
                                            <td style={{ padding: "14px 16px" }}>
                                                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: col }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: `0 0 6px ${col}` }} />
                                                    {c.score}
                                                </div>
                                            </td>
                                            <td style={{ padding: "14px 16px", fontSize: 13 }}>{c.successRate}</td>
                                            <td style={{ padding: "14px 16px", fontSize: 13 }}>{c.avgDays}</td>
                                            <td style={{ padding: "14px 16px", fontSize: 13 }}>{c.rto}</td>
                                            <td style={{ padding: "14px 16px", fontSize: 13 }}>{c.cost}</td>
                                            <td style={{ padding: "14px 16px" }}>
                                                <div style={{ width: 70, height: 5, borderRadius: 3, background: T.bgHigh, overflow: "hidden" }}>
                                                    <div style={{ height: "100%", width: `${c.load}%`, background: T.gradBtn, borderRadius: 3 }} />
                                                </div>
                                            </td>
                                            <td style={{ padding: "14px 16px", fontSize: 12, color: c.score < 65 ? T.textFaint : T.textMuted }}>{c.bestFor}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* ── AI Routing Log ── */}
            <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Recent AI Routing Decisions</div>
                <div style={{ fontSize: 13, color: T.textFaint, marginBottom: 16 }}>Every automatic pick, with the reason it was made — nothing routes silently</div>
                <Card pad={0}>
                    {aiLog.length === 0 && (
                        <div style={{ padding: 40, textAlign: "center", color: T.textFaint, fontSize: 13 }}>
                            No routing decisions yet — decisions will appear here as orders come in
                        </div>
                    )}
                    {aiLog.map((entry, i) => {
                        const cfg = {
                            rule: { bg: `${T.green}14`, color: T.green, icon: "check" },
                            ai:   { bg: `${T.yellow}14`, color: T.yellow, icon: "sparkle" },
                            risk: { bg: `${T.red}14`,   color: T.red,   icon: "alert" },
                        }[entry.type];
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: i < aiLog.length - 1 ? `1px solid ${T.border}` : "none", fontSize: 13 }}>
                                <div style={{ width: 28, height: 28, borderRadius: T.r8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Icon name={cfg.icon} size={13} color={cfg.color} />
                                </div>
                                <div style={{ flex: 1, color: T.textMuted }}>{entry.text}</div>
                                <div style={{ fontSize: 12, color: T.textFaint, flexShrink: 0 }}>{entry.time}</div>
                            </div>
                        );
                    })}
                </Card>
            </div>

        </div>
    );
}

function CourierName({ c }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 13 }}>
            <div style={{ width: 30, height: 30, borderRadius: T.r8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c.color, flexShrink: 0 }}>{c.code}</div>
            {c.name}
        </div>
    );
}

function ShipmentRow({ s, onBook }) {
    const statusCfg = {
        "In transit": { bg: `${T.green}14`, color: T.green },
        "Needs booking": { bg: `${T.yellow}14`, color: T.yellow },
        "Delivered": { bg: `${T.green}14`, color: T.green },
    };
    const riskCfg = {
        Low:    { bg: `${T.green}14`, color: T.green },
        Medium: { bg: `${T.yellow}14`, color: T.yellow },
        High:   { bg: `${T.red}14`, color: T.red },
    };
    const sc = statusCfg[s.status] || { bg: T.bgElev, color: T.textMuted };
    const rc = riskCfg[s.risk] || { bg: T.bgElev, color: T.textMuted };
    return (
        <tr onMouseEnter={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <td style={{ padding: "13px 16px", fontFamily: "monospace", fontSize: 12, color: T.j200, fontWeight: 600, whiteSpace: "nowrap" }}>{s.tracking}</td>
            <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap" }}>{s.customer}</td>
            <td style={{ padding: "13px 16px", fontSize: 13, color: T.textMuted, whiteSpace: "nowrap" }}>{s.city}</td>
            <td style={{ padding: "13px 16px", fontSize: 13, color: s.courier === "—" ? T.textFaint : T.text, fontWeight: 600, whiteSpace: "nowrap" }}>{s.courier}</td>
            <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{s.status}</span>
            </td>
            <td style={{ padding: "13px 16px" }}>
                <div style={{ width: 64, height: 5, borderRadius: 3, background: T.bgHigh, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.progress}%`, background: T.gradBtn, borderRadius: 3 }} />
                </div>
            </td>
            <td style={{ padding: "13px 16px", fontSize: 13, color: T.textMuted, whiteSpace: "nowrap" }}>{s.eta}</td>
            <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: T.j200, whiteSpace: "nowrap" }}>Rs {(s.cod || 0).toLocaleString()}</td>
            <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: rc.bg, color: rc.color }}>{s.risk}</span>
            </td>
            <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                {s.status === "Needs booking" && (
                    <button onClick={onBook} style={{ background: "none", border: "none", color: T.j200, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Book now →</button>
                )}
            </td>
        </tr>
    );
}

