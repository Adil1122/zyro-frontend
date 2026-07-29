"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { getCurrentUserId } from "@/lib/supabase";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtRs = (n) => "Rs " + Math.round(n).toLocaleString("en-US");
const fmtNum = (n) => Math.round(n).toLocaleString("en-US");

// ─── style tokens ─────────────────────────────────────────────────────────────
const S = {
  bg: "#070c0a", card: "#0e1713", card2: "#121e18", card3: "#16221c",
  text: "#ffffff", text2: "rgba(255,255,255,0.55)", text3: "rgba(255,255,255,0.4)",
  border: "rgba(255,255,255,0.07)", borderStrong: "rgba(255,255,255,0.13)",
  accent: "#22c55e", accentLight: "#7ef2c0", accentTint: "rgba(34,197,94,0.11)",
  warning: "#f0b429", warningTint: "rgba(240,180,41,0.11)",
  destructive: "#f2726b", destructiveTint: "rgba(242,114,107,0.11)",
  metaBlue: "#3b82f6", metaTint: "rgba(59,130,246,0.10)",
  purple: "#a78bfa", purpleTint: "rgba(167,139,250,0.11)",
  r: "10px", rLg: "14px",
};

// ─── mock campaigns ───────────────────────────────────────────────────────────
const MOCK_CAMPAIGNS = [
  { name: "Eid Sale 2026 — Kurtas", sub: "Broad · Traffic objective", objective: "Traffic", spend: 0, revenue: 0, orders: 0, status: "paused", ctr: null, freq: null, impressions: 0, format: "Single image", placement: "—", dailyBudget: 2000, todaySpend: 0, adSets: [] },
  { name: "Lookalike — Past Purchasers", sub: "1% lookalike · Conversions", objective: "Sales", spend: 8400, revenue: 33600, orders: 14, status: "active", ctr: 2.8, freq: 2.1, impressions: 140000, format: "Video", placement: "Instagram Reels", dailyBudget: 1500, todaySpend: 1420, adSets: [{ name: "1% LAL — Purchasers, last 90d", spend: 5400, revenue: 22400, orders: 9, ctr: 3.1, headline: "Loved it once? You'll love this too.", body: "Handpicked for our repeat customers — new arrivals just for you. Free delivery this week." }, { name: "1% LAL — Purchasers, last 180d", spend: 3000, revenue: 11200, orders: 5, ctr: 2.3, headline: "Still thinking about it?", body: "The pieces you loved are back in stock. Shop before they're gone again." }] },
  { name: "Cart Abandonment Recovery", sub: "Retargeting · Dynamic", objective: "Sales", spend: 3200, revenue: 14400, orders: 6, status: "active", ctr: 3.6, freq: 1.8, impressions: 48000, format: "Single image", placement: "Instagram Feed", dailyBudget: 800, todaySpend: 640, adSets: [{ name: "Cart abandoners — 3 day window", spend: 3200, revenue: 14400, orders: 6, ctr: 3.6, headline: "You left something behind", body: "Your cart's still here — complete your order in 2 minutes. 10% off if you check out today." }] },
  { name: "Summer Collection Retargeting", sub: "Retargeting · 14-day window", objective: "Sales", spend: 6750, revenue: 20250, orders: 8, status: "active", ctr: 2.2, freq: 2.6, impressions: 95000, format: "Carousel", placement: "Instagram Stories", dailyBudget: 1200, todaySpend: 1150, adSets: [{ name: "Website visitors — last 14 days", spend: 4200, revenue: 14700, orders: 6, ctr: 2.6, headline: "Summer's not over yet", body: "Lightweight, breathable, and still 20% off. Shop the summer edit." }, { name: "Instagram engagers — last 30 days", spend: 2550, revenue: 5550, orders: 2, ctr: 1.5, headline: "Seen it, now get it", body: "The pieces you liked on Instagram are waiting in your size." }] },
  { name: "Broad Interest — Women's Fashion", sub: "Interest targeting", objective: "Sales", spend: 12100, revenue: 30250, orders: 9, status: "active", ctr: 1.4, freq: 3.8, impressions: 175000, format: "Carousel", placement: "Facebook Feed", dailyBudget: 2000, todaySpend: 950, adSets: [{ name: "Interest: Women's fashion, 22–38", spend: 7100, revenue: 21300, orders: 6, ctr: 1.7, headline: "Your new everyday edit", body: "Comfortable, versatile, effortlessly styled. Explore the new collection." }, { name: "Interest: Online shopping, 18–45", spend: 5000, revenue: 8950, orders: 3, ctr: 1.0, headline: "Discover something new", body: "Thousands of women shop with us every week — see what they're loving." }] },
  { name: "New Customer Acquisition — Lawn", sub: "Broad · Conversions", objective: "Sales", spend: 15600, revenue: 0, orders: 0, status: "learning", ctr: 0.9, freq: 1.2, impressions: 210000, format: "Video", placement: "Facebook Feed", dailyBudget: 3000, todaySpend: 2100, adSets: [{ name: "Broad — Pakistan, 20–45", spend: 15600, revenue: 0, orders: 0, ctr: 0.9, headline: "Lawn season is here", body: "Premium lawn, unbeatable prices. Free delivery on your first order." }] },
  { name: "Interest — Men's Fashion", sub: "Interest targeting", objective: "Sales", spend: 9800, revenue: 0, orders: 0, status: "active", ctr: 1.1, freq: 4.2, impressions: 140000, format: "Single image", placement: "Facebook Feed", dailyBudget: 1800, todaySpend: 1690, adSets: [{ name: "Interest: Men's fashion, 20–40", spend: 9800, revenue: 0, orders: 0, ctr: 1.1, headline: "Sharp looks, better prices", body: "Upgrade your wardrobe with our new men's line. Limited stock." }] },
  { name: "Video Views — Brand Awareness", sub: "Broad · Awareness objective", objective: "Awareness", spend: 4500, revenue: 4050, orders: 2, status: "active", ctr: 0.8, freq: 2.0, impressions: 70000, format: "Video", placement: "Instagram Reels", dailyBudget: 900, todaySpend: 810, adSets: [{ name: "Broad awareness — video views", spend: 4500, revenue: 4050, orders: 2, ctr: 0.8, headline: "This is who we are", body: "A look behind the brand — our story, our craft, our people." }] },
];

// ─── logic ────────────────────────────────────────────────────────────────────
function recommend(c) {
  if (c.status === "learning") return { label: "Still learning", cls: "learning", icon: "clock" };
  if (c.spend === 0) return { label: "Not started", cls: "none", icon: "dash" };
  if (c.objective === "Awareness") return { label: "Awareness — not ROAS-judged", cls: "learning", icon: "eye" };
  if (c.orders === 0) return { label: "Review targeting", cls: "review", icon: "flag" };
  const roas = c.revenue / c.spend;
  if (roas >= 3.0) return { label: "Scale", cls: "scale", icon: "up" };
  if (roas >= 1.2) return { label: "Monitor", cls: "monitor", icon: "eye" };
  return { label: "Review targeting", cls: "review", icon: "flag" };
}

function pacingBucket(c) {
  if (c.status === "paused" || !c.dailyBudget) return null;
  const pace = c.todaySpend / c.dailyBudget;
  if (pace >= 0.95) return "atcap";
  if (pace >= 0.6) return "onpace";
  return "under";
}

function computeTotals(camps) {
  const spend = camps.reduce((s, c) => s + c.spend, 0);
  const revenue = camps.reduce((s, c) => s + c.revenue, 0);
  const orders = camps.reduce((s, c) => s + c.orders, 0);
  const impressions = camps.reduce((s, c) => s + (c.impressions || 0), 0);
  const clicks = camps.reduce((s, c) => s + (c.clicks || 0), 0);
  const reach = camps.reduce((s, c) => s + (c.reach || 0), 0);
  return {
    spend, revenue, orders,
    roas: spend > 0 ? revenue / spend : 0,
    profit: revenue - spend,
    aov: orders > 0 ? revenue / orders : 0,
    cpa: orders > 0 ? spend / orders : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    avgFreq: reach > 0 ? impressions / reach : 0,
    impressions, clicks, reach,
  };
}

// ─── small icons ──────────────────────────────────────────────────────────────
function RecIcon({ name }) {
  const paths = {
    up:    <path d="M2 8.5l3-3 2 2 3-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
    eye:   <><path d="M1 6s2-3 5-3 5 3 5 3-2 3-5 3-5-3-5-3z" stroke="currentColor" strokeWidth="1.4" /><circle cx="6" cy="6" r="1.3" stroke="currentColor" strokeWidth="1.4" /></>,
    flag:  <path d="M2 1v10M2 1.5h6l-1.5 2L8 5.5H2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />,
    dash:  <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
    clock: <><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4" /><path d="M6 3.2V6l2 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>,
  };
  return <svg viewBox="0 0 12 12" fill="none" style={{ width: 10, height: 10, flexShrink: 0 }}>{paths[name]}</svg>;
}

// ─── sub-components ───────────────────────────────────────────────────────────
function Zone({ tagLabel, tagBg, tagColor, title, subtitle, heading, collapsible, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 12, cursor: collapsible ? "pointer" : "default", userSelect: "none" }}
        onClick={collapsible ? onToggle : undefined}
        role={collapsible ? "button" : undefined}
        aria-expanded={collapsible ? open : undefined}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          {tagLabel && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 5, background: tagBg, color: tagColor, alignSelf: "center" }}>{tagLabel}</span>}
          {heading && <span style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{title}</span>}
          {subtitle && <span style={{ fontSize: 13, color: S.text3 }}>{subtitle}</span>}
        </div>
        {collapsible && (
          <svg style={{ color: S.text3, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {(!collapsible || open) && <div>{children}</div>}
    </div>
  );
}

function MetricGrid({ cols, items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1, background: S.border, border: `1px solid ${S.border}`, borderRadius: S.rLg, overflow: "hidden" }}>
      {items.map(({ label, value, color, note }) => (
        <div key={label} style={{ background: S.card, padding: "16px 18px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: S.text3, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 7 }}>{label}</div>
          <b style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", color: color || S.text }}>{value}</b>
          {note && <span style={{ display: "block", fontSize: 10.5, color: S.text3, marginTop: 4 }}>{note}</span>}
        </div>
      ))}
    </div>
  );
}

function Btn({ primary, onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 36, padding: "0 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", ...(primary ? { background: S.accent, color: "#04231a", border: "none" } : { background: S.card, border: `1px solid ${S.borderStrong}`, color: S.text }) }}>
      {children}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [metaAdsConnected, setMetaAdsConnected] = useState(false);
  const [metaAdsStats, setMetaAdsStats] = useState(null);
  const [syncedMinutesAgo, setSyncedMinutesAgo] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentials, setCredentials] = useState({ meta_app_id: "", meta_app_secret: "" });
  const [accordionCost, setAccordionCost] = useState(false);
  const [accordionEngage, setAccordionEngage] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortKey, setSortKey] = useState("spend");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreInsights, setShowMoreInsights] = useState(false);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  // ── campaigns ──────────────────────────────────────────────────────────────
  const campaigns = useMemo(() => {
    // When Meta is connected the sync route returns campaigns already in our shape
    // (name, sub, objective, status, spend, revenue, orders, impressions, reach,
    //  clicks, ctr, freq, dailyBudget, todaySpend, adSets).
    // Fall back to mock data when not connected.
    const base = metaAdsStats?.campaigns?.length
      ? metaAdsStats.campaigns.map((c, i) => ({ ...c, id: c.id || `camp-${i}` }))
      : MOCK_CAMPAIGNS.map((c, i) => ({ ...c, id: `camp-${i}` }));

    return base.map((c) => ({
      ...c,
      // derive clicks/reach from ctr/freq if not already provided by the API
      clicks: c.clicks ?? (c.ctr != null ? Math.round((c.impressions || 0) * c.ctr / 100) : 0),
      reach:  c.reach  ?? (c.freq != null && c.freq > 0 ? Math.round((c.impressions || 0) / c.freq) : 0),
    }));
  }, [metaAdsStats]);

  const totals = useMemo(() => computeTotals(campaigns), [campaigns]);

  // ── API ────────────────────────────────────────────────────────────────────
  const loadStats = async (userId) => {
    try {
      const res = await fetch("/api/meta-ads/stats", { headers: { "x-user-id": userId } });
      if (!res.ok) return;
      const stats = await res.json();
      if (stats.syncing) {
        // First sync in progress — poll once after 30s
        setTimeout(() => loadStats(userId), 30000);
        return;
      }
      setMetaAdsStats(stats);
      setMetaAdsConnected(true);
      setSyncedMinutesAgo(stats.syncedMinutesAgo ?? null);
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("meta_ads_connected") === "true") window.history.replaceState({}, document.title, window.location.pathname);
    loadStats(userId);
  }, []);

  // ── chart ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    const tooltip = tooltipRef.current;
    if (!svg || !tooltip) return;

    const days = 30;
    const revSeries = [], spendSeries = [];
    let rAcc = 0, sAcc = 0;
    for (let i = 0; i < days; i++) {
      const p = i / (days - 1);
      rAcc += (totals.revenue / days) * (0.5 + p);
      sAcc += (totals.spend / days) * (0.85 + p * 0.3);
      revSeries.push(rAcc);
      spendSeries.push(sAcc);
    }
    const maxVal = Math.max(...revSeries, ...spendSeries) * 1.08 || 1;
    const xAt = (i) => (i / (days - 1)) * 1000;
    const yAt = (v) => 200 - (v / maxVal) * 190;
    const pts = (s) => s.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");

    svg.innerHTML = `
      <polyline points="${pts(spendSeries)}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${pts(revSeries)}" fill="none" stroke="#7ef2c0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <line id="cg" x1="0" y1="0" x2="0" y2="200" stroke="rgba(255,255,255,0.13)" stroke-width="1" style="opacity:0;transition:opacity .1s;pointer-events:none;"/>
      <circle id="ps" r="4" fill="#0e1713" stroke="#3b82f6" stroke-width="2" style="opacity:0;transition:opacity .1s;pointer-events:none;"/>
      <circle id="pr" r="4" fill="#0e1713" stroke="#7ef2c0" stroke-width="2" style="opacity:0;transition:opacity .1s;pointer-events:none;"/>
      <rect id="hz" x="0" y="0" width="1000" height="200" fill="transparent"/>
    `;

    const cg = svg.querySelector("#cg"), ps = svg.querySelector("#ps"), pr = svg.querySelector("#pr"), hz = svg.querySelector("#hz");

    const showAt = (dayIndex) => {
      const i = Math.max(0, Math.min(days - 1, dayIndex));
      const x = xAt(i);
      cg.style.opacity = 1; ps.style.opacity = 1; pr.style.opacity = 1;
      cg.setAttribute("x1", x); cg.setAttribute("x2", x);
      ps.setAttribute("cx", x); ps.setAttribute("cy", yAt(spendSeries[i]));
      pr.setAttribute("cx", x); pr.setAttribute("cy", yAt(revSeries[i]));
      const rect = svg.getBoundingClientRect();
      tooltip.style.left = ((x / 1000) * rect.width) + "px";
      tooltip.style.top = ((yAt(revSeries[i]) / 200) * rect.height) + "px";
      tooltip.style.opacity = 1;
      tooltip.innerHTML = `
        <div style="font-size:10.5px;color:${S.text3};margin-bottom:4px;">Day ${i + 1} of ${days}</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;margin-bottom:2px;"><span style="width:6px;height:6px;border-radius:50%;background:#7ef2c0;display:inline-block;flex-shrink:0;"></span><span style="color:${S.text3};">Revenue</span><span style="color:${S.text};font-weight:700;margin-left:8px;">${fmtRs(revSeries[i])}</span></div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;"><span style="width:6px;height:6px;border-radius:50%;background:#3b82f6;display:inline-block;flex-shrink:0;"></span><span style="color:${S.text3};">Spend</span><span style="color:${S.text};font-weight:700;margin-left:8px;">${fmtRs(spendSeries[i])}</span></div>
      `;
    };
    const hide = () => { cg.style.opacity = 0; ps.style.opacity = 0; pr.style.opacity = 0; tooltip.style.opacity = 0; };

    hz.addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect();
      showAt(Math.round(((e.clientX - r.left) / r.width) * (days - 1)));
    });
    hz.addEventListener("mouseleave", hide);
  }, [totals]);

  // ── insights ───────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const rows = [];
    const scaleCount = campaigns.filter((c) => recommend(c).cls === "scale").length;
    const reviewCamps = campaigns.filter((c) => recommend(c).cls === "review");
    const learningCamps = campaigns.filter((c) => c.status === "learning");
    const awarenessCamps = campaigns.filter((c) => c.objective === "Awareness" && c.spend > 0);
    const fatiguedCamps = campaigns.filter((c) => c.freq != null && c.freq >= 3.5);
    const notStarted = campaigns.filter((c) => c.spend === 0);
    const atCapCamps = campaigns.filter((c) => pacingBucket(c) === "atcap");
    const underCamps = campaigns.filter((c) => pacingBucket(c) === "under");
    const objMismatch = campaigns.filter((c) => c.spend === 0 && c.objective === "Traffic" && /sale/i.test(c.name));

    const row = (cls, icon, content) => ({ cls, icon, content });
    if (scaleCount > 0) rows.push(row("good", "up", <><b>{scaleCount} campaign{scaleCount > 1 ? "s" : ""}</b> <span style={{ color: S.text2 }}>ready to scale — ROAS above 3.0x</span></>));
    atCapCamps.forEach((c) => rows.push(row("good", "up", <><b>{c.name}</b> <span style={{ color: S.text2 }}>is hitting its daily budget cap — there's more demand than budget allows</span></>)));
    reviewCamps.forEach((c) => {
      const reason = c.orders === 0 ? `spent ${fmtRs(c.spend)} with zero orders` : `ROAS is only ${(c.revenue / c.spend).toFixed(2)}x`;
      rows.push(row("bad", "flag", <><b>{c.name}</b> <span style={{ color: S.text2 }}>— {reason}, review targeting</span></>));
    });
    objMismatch.forEach((c) => rows.push(row("warn", "flag", <><b>{c.name}</b> <span style={{ color: S.text2 }}>is set to Traffic objective, not Conversions — switch it before spending</span></>)));
    underCamps.forEach((c) => rows.push(row("warn", "eye", <><b>{c.name}</b> <span style={{ color: S.text2 }}>is only spending {Math.round((c.todaySpend / c.dailyBudget) * 100)}% of its daily budget — audience may be too narrow</span></>)));
    fatiguedCamps.forEach((c) => rows.push(row("warn", "eye", <><b>{c.name}</b> <span style={{ color: S.text2 }}>frequency {c.freq} is high — refresh the creative</span></>)));
    learningCamps.forEach((c) => rows.push(row("warn", "clock", <><b>{c.name}</b> <span style={{ color: S.text2 }}>is still in Meta's learning phase — don't judge or pause it yet</span></>)));
    awarenessCamps.forEach((c) => rows.push(row("warn", "eye", <><b>{c.name}</b> <span style={{ color: S.text2 }}>is an Awareness campaign — judge it by reach and CPM, not ROAS</span></>)));
    if (notStarted.length > 0) rows.push(row("warn", "dash", <><b>{notStarted.length} campaign{notStarted.length > 1 ? "s" : ""}</b> <span style={{ color: S.text2 }}>set up but haven't started spending yet</span></>));

    const order = { bad: 0, warn: 1, good: 2 };
    return rows.sort((a, b) => order[a.cls] - order[b.cls]);
  }, [campaigns]);

  // ── budget health ──────────────────────────────────────────────────────────
  const budgetHealth = useMemo(() => {
    const paced = campaigns.map((c) => pacingBucket(c)).filter(Boolean);
    const total = paced.length;
    const counts = { onpace: paced.filter((b) => b === "onpace").length, under: paced.filter((b) => b === "under").length, atcap: paced.filter((b) => b === "atcap").length };
    return { total, counts };
  }, [campaigns]);

  // ── filtered/sorted campaigns ──────────────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = q ? campaigns.filter((c) => c.name.toLowerCase().includes(q)) : campaigns;
    return [...filtered].sort((a, b) => sortKey === "roas"
      ? (b.spend > 0 ? b.revenue / b.spend : -1) - (a.spend > 0 ? a.revenue / a.spend : -1)
      : b.spend - a.spend);
  }, [campaigns, sortKey, searchQuery]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const toggleRow = (id) => setExpandedRows((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleMetaConnect = async () => {
    const userId = getCurrentUserId();
    if (!userId) { window.location.href = "/login"; return; }
    const res = await fetch("/api/meta-ads/auth", { headers: { "x-user-id": userId } });
    const data = await res.json();
    if (data.authUrl) window.location.href = data.authUrl;
  };

  const handleMetaDisconnect = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    await fetch("/api/meta-ads/disconnect", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": userId } });
    setMetaAdsConnected(false); setMetaAdsStats(null); setSyncedMinutesAgo(null);
  };

  const handleManualSync = async () => {
    const userId = getCurrentUserId();
    if (!userId || isSyncing) return;
    setIsSyncing(true);
    try {
      await fetch("/api/meta-ads/sync", { method: "POST", headers: { "x-user-id": userId } });
      await loadStats(userId);
    } catch { /* non-fatal */ }
    setIsSyncing(false);
  };

  const handleCredentialsSave = async () => {
    const userId = getCurrentUserId();
    if (!userId) { window.location.href = "/login"; return; }
    const res = await fetch("/api/user/credentials", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": userId }, body: JSON.stringify(credentials) });
    if (res.ok) setShowCredentialsModal(false);
  };

  const VISIBLE_CAP = 6;
  const visibleInsights = insights.slice(0, VISIBLE_CAP);
  const hiddenInsights = insights.slice(VISIBLE_CAP);

  const STATUS_META = { active: { dot: "good", label: "Delivering" }, learning: { dot: "learning", label: "Learning phase" }, paused: { dot: "off", label: "Not delivering" } };

  const dotColor = { good: S.accent, learning: "#60a5fa", off: S.text3 };
  const recPillStyle = { scale: { bg: S.accentTint, color: S.accentLight }, monitor: { bg: S.warningTint, color: S.warning }, review: { bg: S.destructiveTint, color: S.destructive }, none: { bg: S.card3, color: S.text3 }, learning: { bg: S.metaTint, color: "#60a5fa" } };
  const pacingColor = { atcap: S.metaBlue, under: S.warning, onpace: S.accent };

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", color: S.text, fontSize: 14, WebkitFontSmoothing: "antialiased", padding: "30px 32px 60px", maxWidth: 1440 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 6 }}>Marketing Intelligence</h1>
          <div style={{ color: S.text2, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
            Meta Ads <span style={{ color: S.text3 }}>·</span>
            {metaAdsConnected
              ? syncedMinutesAgo != null
                ? (syncedMinutesAgo < 1 ? "just synced" : `synced ${syncedMinutesAgo}m ago`)
                : "connecting…"
              : "not connected"
            }
            <span style={{ color: S.text3 }}>·</span>
            <span>{campaigns.filter((c) => c.spend > 0).length} active campaigns</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!metaAdsConnected
            ? <Btn primary onClick={handleMetaConnect}><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6.5 20V12.5H4V9h2.5V6.7C6.5 4.1 8 2.5 10.8 2.5c1.2 0 2.3.1 2.6.1v3h-1.8c-1.4 0-1.6.7-1.6 1.6V9H13l-.4 3.5h-2.3V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>Connect Meta Ads</Btn>
            : <>
                <Btn onClick={handleManualSync}>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ animation: isSyncing ? "spin 1s linear infinite" : "none" }}>
                    <path d="M4 10a6 6 0 0 1 10.93-3.41M4.93 13.41A6 6 0 0 0 16 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 6.5l2.5.5-.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 13.5l-2.5-.5.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isSyncing ? "Syncing…" : "Sync now"}
                </Btn>
                <Btn onClick={handleMetaDisconnect}>Disconnect</Btn>
              </>
          }
          <Btn onClick={() => setShowCredentialsModal(true)}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M10 7v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            API Credentials
          </Btn>
          <Btn>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download Report
          </Btn>
        </div>
      </div>

      {/* ── channel row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 14, marginBottom: 30 }}>
        {/* Meta */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.rLg, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6.5 20V12.5H4V9h2.5V6.7C6.5 4.1 8 2.5 10.8 2.5c1.2 0 2.3.1 2.6.1v3h-1.8c-1.4 0-1.6.7-1.6 1.6V9H13l-.4 3.5h-2.3V20" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Meta Ads</div>
              <div style={{ fontSize: 11.5, color: S.text3 }}>Facebook + Instagram · {metaAdsConnected ? "connected" : "not connected"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            {[["Spend", fmtRs(totals.spend), null], ["Revenue", fmtRs(totals.revenue), null], ["ROAS", totals.roas.toFixed(2) + "x", S.accentLight]].map(([lbl, val, col]) => (
              <div key={lbl}>
                <div style={{ fontSize: 10.5, color: S.text3, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{lbl}</div>
                <b style={{ fontSize: 15, fontWeight: 700, color: col || S.text }}>{val}</b>
              </div>
            ))}
          </div>
        </div>
        {/* Google (soon) */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.rLg, padding: "16px 18px", opacity: 0.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: S.card3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24"><path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.9h5c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.8-4.1 2.8-7.2z" fill="#4285F4"/><path d="M12 21c2.6 0 4.7-.9 6.2-2.4l-3.1-2.4c-.9.6-2 .9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H3.7v2.5C5.3 18.9 8.4 21 12 21z" fill="#34A853"/><path d="M6.9 13.3c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.2H3.7C3 8.6 2.6 10.2 2.6 12s.4 3.4 1.1 4.8l3.2-2.5z" fill="#FBBC05"/><path d="M12 6.4c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.7 3.4 14.6 2.6 12 2.6 8.4 2.6 5.3 4.7 3.7 7.9l3.2 2.5c.7-2.2 2.7-4 5.1-4z" fill="#EA4335"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>Google Ads <span style={{ fontSize: 9.5, fontWeight: 700, color: S.text3, background: S.card3, padding: "2px 7px", borderRadius: 20 }}>Coming soon</span></div>
              <div style={{ fontSize: 11.5, color: S.text3 }}>Search + Shopping</div>
            </div>
          </div>
        </div>
        {/* TikTok (soon) */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.rLg, padding: "16px 18px", opacity: 0.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: S.card3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M16.5 2c.4 2.2 2.1 3.8 4.4 4v3.1c-1.6.1-3-.4-4.4-1.3v6.6c0 3.7-3 6.6-6.6 6.6S3.3 18.1 3.3 14.4c0-3.6 2.9-6.5 6.4-6.6v3.3a3.3 3.3 0 103.3 3.3V2h3.5z" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>TikTok Ads <span style={{ fontSize: 9.5, fontWeight: 700, color: S.text3, background: S.card3, padding: "2px 7px", borderRadius: 20 }}>Coming soon</span></div>
              <div style={{ fontSize: 11.5, color: S.text3 }}>In-feed + Spark ads</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── spend & revenue ── */}
      <Zone tagLabel="Spend & Revenue" tagBg={S.accentTint} tagColor={S.accentLight} subtitle="Where the money went, and what came back">
        <MetricGrid cols={4} items={[
          { label: "Total spend", value: fmtRs(totals.spend) },
          { label: "Revenue", value: fmtRs(totals.revenue) },
          { label: "Profit", value: (totals.profit >= 0 ? "+" : "−") + fmtRs(Math.abs(totals.profit)), color: totals.profit >= 0 ? S.accentLight : S.destructive, note: "Revenue − spend" },
          { label: "ROAS", value: totals.roas.toFixed(2) + "x", color: S.accentLight },
        ]} />
      </Zone>

      {/* ── budget health ── */}
      <Zone tagLabel="Budget Health" tagBg={S.metaTint} tagColor="#60a5fa" subtitle="Spend vs. what you actually set as the daily cap">
        {budgetHealth.total > 0 ? (
          <>
            <div style={{ height: 10, borderRadius: 5, overflow: "hidden", background: S.card3, display: "flex", marginBottom: 12 }}>
              <div style={{ width: `${(budgetHealth.counts.onpace / budgetHealth.total) * 100}%`, background: S.accent }} />
              <div style={{ width: `${(budgetHealth.counts.under / budgetHealth.total) * 100}%`, background: S.warning }} />
              <div style={{ width: `${(budgetHealth.counts.atcap / budgetHealth.total) * 100}%`, background: S.metaBlue }} />
            </div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              {[{ dot: S.accent, count: budgetHealth.counts.onpace, label: "on pace" }, { dot: S.warning, count: budgetHealth.counts.under, label: "underspending" }, { dot: S.metaBlue, count: budgetHealth.counts.atcap, label: "at daily cap" }].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: S.text2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, display: "inline-block", flexShrink: 0 }} />
                  <b style={{ color: S.text, fontWeight: 700 }}>{item.count}</b> {item.label}
                </div>
              ))}
            </div>
          </>
        ) : <div style={{ color: S.text3, fontSize: 13 }}>No active campaigns with daily budgets set.</div>}
      </Zone>

      {/* ── insights ── */}
      <Zone title="What happened this week" heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: S.border, border: `1px solid ${S.border}`, borderRadius: S.rLg, overflow: "hidden" }}>
          {[...visibleInsights, ...(showMoreInsights ? hiddenInsights : [])].map((row, i) => {
            const borderColor = { good: S.accent, bad: S.destructive, warn: S.warning }[row.cls];
            const iconBg = { good: S.accentTint, bad: S.destructiveTint, warn: S.warningTint }[row.cls];
            const iconColor = { good: S.accentLight, bad: S.destructive, warn: S.warning }[row.cls];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px 12px 13px", background: S.card, borderLeft: `3px solid ${borderColor}`, fontSize: 13 }}>
                <span style={{ width: 22, height: 22, minWidth: 22, borderRadius: 6, background: iconBg, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RecIcon name={row.icon} />
                </span>
                <span>{row.content}</span>
              </div>
            );
          })}
          {!showMoreInsights && hiddenInsights.length > 0 && (
            <button onClick={() => setShowMoreInsights(true)} style={{ width: "100%", textAlign: "left", background: S.card, border: "none", padding: "11px 16px", color: S.accentLight, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Show {hiddenInsights.length} more
            </button>
          )}
          {insights.length === 0 && (
            <div style={{ padding: "16px", color: S.text3, fontSize: 13, background: S.card }}>No insights yet — data will appear once campaigns start spending.</div>
          )}
        </div>
      </Zone>

      {/* ── cost efficiency accordion ── */}
      <Zone tagLabel="Cost Efficiency" tagBg={S.metaTint} tagColor="#60a5fa" subtitle="What each result actually cost you" collapsible open={accordionCost} onToggle={() => setAccordionCost(!accordionCost)}>
        <MetricGrid cols={4} items={[
          { label: "Cost per order (CPA)", value: totals.cpa > 0 ? fmtRs(totals.cpa) : "—" },
          { label: "Cost per click (CPC)", value: totals.cpc > 0 ? fmtRs(totals.cpc) : "—" },
          { label: "Cost per 1,000 impressions (CPM)", value: totals.cpm > 0 ? fmtRs(totals.cpm) : "—" },
          { label: "Avg. order value", value: totals.aov > 0 ? fmtRs(totals.aov) : "—" },
        ]} />
      </Zone>

      {/* ── engagement accordion ── */}
      <Zone tagLabel="Engagement" tagBg={S.purpleTint} tagColor={S.purple} subtitle="How people responded before they bought" collapsible open={accordionEngage} onToggle={() => setAccordionEngage(!accordionEngage)}>
        <MetricGrid cols={5} items={[
          { label: "Impressions", value: fmtNum(totals.impressions) },
          { label: "Reach", value: fmtNum(totals.reach), note: "May overlap across campaigns" },
          { label: "Clicks", value: fmtNum(totals.clicks) },
          { label: "Click-through rate", value: totals.ctr.toFixed(2) + "%", note: "Total clicks ÷ impressions" },
          { label: "Avg. frequency", value: totals.avgFreq.toFixed(1), note: "Times each person saw an ad" },
        ]} />
      </Zone>

      {/* ── trend chart ── */}
      <Zone title="Spend vs revenue" subtitle="Last 30 days · hover to inspect a day" heading>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.rLg, padding: "18px 22px" }}>
          <div style={{ display: "flex", gap: 18, marginBottom: 10 }}>
            {[["#7ef2c0", "Revenue"], ["#3b82f6", "Spend"]].map(([col, lbl]) => (
              <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: S.text2 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, display: "inline-block" }} />{lbl}
              </div>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <svg ref={svgRef} width="100%" height="200" viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }} />
            <div ref={tooltipRef} style={{ position: "absolute", top: 0, pointerEvents: "none", opacity: 0, background: S.card3, border: `1px solid ${S.borderStrong}`, borderRadius: 8, padding: "8px 11px", fontSize: 11.5, whiteSpace: "nowrap", transform: "translate(-50%, calc(-100% - 10px))", boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }} />
          </div>
        </div>
      </Zone>

      {/* ── campaigns table ── */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Campaigns</span>
            <div style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>Recommendation is computed, not fixed — click a row for ad sets and copy</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 10, color: S.text3, pointerEvents: "none" }}><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search campaigns…"
                style={{ width: 200, height: 32, background: S.card, border: `1px solid ${S.border}`, borderRadius: 7, padding: "0 10px 0 30px", color: S.text, fontSize: 12.5, fontFamily: "inherit", outline: "none" }} />
            </div>
            {[["spend", "Spend"], ["roas", "ROAS"]].map(([key, lbl]) => (
              <button key={key} onClick={() => setSortKey(key)} style={{ display: "flex", alignItems: "center", gap: 5, background: sortKey === key ? S.accentTint : S.card, border: `1px solid ${sortKey === key ? "rgba(34,197,94,0.3)" : S.border}`, color: sortKey === key ? S.accentLight : S.text2, fontSize: 12, padding: "6px 11px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: S.text3, marginBottom: 10 }}>
          {searchQuery ? `Showing ${filteredCampaigns.length} of ${campaigns.length} campaigns matching "${searchQuery}"` : `Showing all ${campaigns.length} campaigns`}
        </div>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: S.rLg, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr>
                {["Campaign", "Spend", "Revenue", "ROAS", "Orders", "CPA", "Recommendation", ""].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 0 || i === 7 ? "left" : "right", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: S.text3, padding: "14px 14px 11px", borderBottom: `1px solid ${S.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: S.text3 }}>No campaigns match &ldquo;{searchQuery}&rdquo;</td></tr>
              )}
              {filteredCampaigns.map((c) => {
                const rec = recommend(c);
                const roasDisplay = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) + "x" : "—";
                const cpaDisplay = c.orders > 0 ? fmtRs(c.spend / c.orders) : "—";
                const st = STATUS_META[c.status] || STATUS_META.paused;
                const hasDetail = c.spend > 0;
                const isOpen = expandedRows.has(c.id);
                const fatigued = c.freq != null && c.freq >= 3.5;
                const pacingPct = c.dailyBudget > 0 ? Math.min(100, Math.round((c.todaySpend / c.dailyBudget) * 100)) : 0;
                const pb = pacingBucket(c);
                const rp = recPillStyle[rec.cls] || recPillStyle.none;

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      onClick={() => hasDetail && toggleRow(c.id)}
                      style={{ borderBottom: `1px solid ${S.border}`, cursor: hasDetail ? "pointer" : "default", background: isOpen ? S.card2 : "transparent", transition: "background .12s" }}
                    >
                      <td style={{ padding: "13px 14px", textAlign: "left" }}>
                        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", marginRight: 7, verticalAlign: "middle", background: dotColor[st.dot] }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                        <span style={{ display: "block", fontSize: 11, color: S.text3, marginTop: 2 }}>{c.sub} · {st.label}</span>
                      </td>
                      <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 13 }}>{fmtRs(c.spend)}</td>
                      <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 13 }}>{fmtRs(c.revenue)}</td>
                      <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 13 }}>{roasDisplay}</td>
                      <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 13 }}>{c.orders}</td>
                      <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 13 }}>{cpaDisplay}</td>
                      <td style={{ padding: "13px 14px", textAlign: "left" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", background: rp.bg, color: rp.color }}>
                          <RecIcon name={rec.icon} />{rec.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 14px", textAlign: "left" }}>
                        {hasDetail && (
                          <button onClick={(e) => { e.stopPropagation(); toggleRow(c.id); }} style={{ background: "none", border: "none", color: S.text3, padding: 4, borderRadius: 6, cursor: "pointer", display: "flex" }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                    {hasDetail && isOpen && (
                      <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                        <td colSpan={8} style={{ padding: 0, background: S.card2, textAlign: "left" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 18, padding: "15px 18px" }}>
                            {[["Impressions", fmtNum(c.impressions)], ["Reach", fmtNum(c.reach)], ["CTR", c.ctr != null ? c.ctr + "%" : "—"], ["Frequency", c.freq != null ? c.freq + (fatigued ? " ⚠" : "") : "—"], ["Format", c.format || "—"], ["Best placement", c.placement || "—"]].map(([lbl, val]) => (
                              <div key={lbl}>
                                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: S.text3, marginBottom: 5 }}>{lbl}</div>
                                <b style={{ fontSize: 12.5, fontWeight: 700 }}>{val}</b>
                              </div>
                            ))}
                          </div>
                          {c.dailyBudget > 0 && (
                            <div style={{ padding: "0 18px 15px" }}>
                              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: S.text3, marginBottom: 5 }}>Today's budget pacing</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 5, borderRadius: 3, background: S.card3, overflow: "hidden" }}>
                                  <span style={{ display: "block", height: "100%", borderRadius: 3, width: `${pacingPct}%`, background: pacingColor[pb] || S.accent }} />
                                </div>
                                <b style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtRs(c.todaySpend)} of {fmtRs(c.dailyBudget)}</b>
                              </div>
                            </div>
                          )}
                          {c.adSets && c.adSets.length > 0 ? (
                            <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 16, paddingBottom: 16 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: S.text3, marginBottom: 10, padding: "0 18px" }}>
                                {c.adSets.length} ad set{c.adSets.length > 1 ? "s" : ""} in this campaign
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 18px" }}>
                                {c.adSets.map((a, ai) => (
                                  <div key={ai} style={{ background: S.card3, border: `1px solid ${S.border}`, borderRadius: 10, padding: "13px 15px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{a.name}</span>
                                      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                                        {[["Spend", fmtRs(a.spend)], ["ROAS", a.spend > 0 ? (a.revenue / a.spend).toFixed(2) + "x" : "—"], ["CTR", a.ctr + "%"]].map(([lbl, val]) => (
                                          <span key={lbl} style={{ fontSize: 11.5, color: S.text3 }}>{lbl} <b style={{ color: S.text2, fontWeight: 700 }}>{val}</b></span>
                                        ))}
                                      </div>
                                    </div>
                                    <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px" }}>
                                      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: S.text3, marginBottom: 5 }}>Ad copy running now</div>
                                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>{a.headline}</div>
                                      <div style={{ fontSize: 12, color: S.text2, lineHeight: 1.5 }}>{a.body}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: "14px 18px", fontSize: 12.5, color: S.text3, borderTop: `1px solid ${S.border}` }}>No ad sets configured yet.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── credentials modal ── */}
      {showCredentialsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: S.card, border: `1px solid ${S.borderStrong}`, borderRadius: S.rLg, width: "90%", maxWidth: 480, maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>API Credentials</div>
              <button onClick={() => setShowCredentialsModal(false)} style={{ background: "none", border: "none", color: S.text2, cursor: "pointer", fontSize: 20, lineHeight: 1, fontFamily: "inherit" }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Meta App ID", key: "meta_app_id", type: "text", ph: "Enter Meta App ID" }, { label: "Meta App Secret", key: "meta_app_secret", type: "password", ph: "Enter Meta App Secret" }].map(({ label, key, type, ph }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: S.text2, display: "block", marginBottom: 4 }}>{label}</label>
                  <input type={type} value={credentials[key]} onChange={(e) => setCredentials({ ...credentials, [key]: e.target.value })} placeholder={ph}
                    style={{ width: "100%", height: 36, padding: "0 10px", background: S.card3, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                <Btn onClick={() => setShowCredentialsModal(false)}>Cancel</Btn>
                <Btn primary onClick={handleCredentialsSave}>Save Credentials</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
