"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/components/dashboard/constants";
import { ZyroLogo } from "@/components/dashboard/Primitives";

// ── Static comparison table data ────────────────────────────────────────────

const COMPARE = [
  { cat: "Orders", rows: [
    { label: "Automatic WhatsApp order confirmation", tip: "Every new order triggers an automatic WhatsApp message to the customer.", s: true, g: true, p: true },
    { label: "Compare rates & book 14 couriers", tip: "Book any of 14 supported couriers without leaving your dashboard.", s: true, g: true, p: true },
    { label: "Order status updates to customers", s: true, g: true, p: true },
  ]},
  { cat: "Inventory", rows: [
    { label: "Connected stores", s: "1", g: "3", p: "10" },
    { label: "Supplier & purchase history tracking", s: true, g: true, p: true },
    { label: "Automatic low-stock alerts", tip: "AI flags products approaching stock-out before they affect sales.", s: false, g: false, p: true },
  ]},
  { cat: "Customers", rows: [
    { label: "Centralized customer database", s: true, g: true, p: true },
    { label: "Team member access with roles", s: true, g: true, p: true },
    { label: "Customer segmentation & churn flags", s: false, g: false, p: true },
  ]},
  { cat: "Marketing", rows: [
    { label: "Meta Ads performance dashboard", s: true, g: true, p: true },
    { label: "Google Ads analytics", s: false, g: true, p: true },
    { label: "TikTok Ads analytics", s: false, g: true, p: true },
  ]},
  { cat: "Automation", rows: [
    { label: "Automatic courier slip generation", s: true, g: true, p: true },
    { label: "Daily courier receipts via WhatsApp", s: true, g: true, p: true },
    { label: "Team can book couriers on your behalf", s: false, g: true, p: true },
  ]},
  { cat: "AI", rows: [
    { label: "Multi-language WhatsApp AI chatbot", s: false, g: true, p: true },
    { label: "AI replies to customer voice notes", s: false, g: false, p: true },
    { label: "Advanced AI revenue optimization", tip: "Restock timing, sales forecasting and upsell recommendations generated automatically.", s: false, g: false, p: true },
  ]},
  { cat: "Security", rows: [
    { label: "Data encrypted in transit & at rest", s: true, g: true, p: true },
    { label: "Automatic daily backups", s: true, g: true, p: true },
    { label: "Secure payment processing", s: true, g: true, p: true },
  ]},
  { cat: "Support", rows: [
    { label: "Standard support", s: true, g: true, p: true },
    { label: "Priority support", s: false, g: true, p: true },
    { label: "Dedicated success manager", s: false, g: false, p: true },
  ]},
  { cat: "Integrations", rows: [
    { label: "WooCommerce, Shopify & Daraz", s: true, g: true, p: true },
  ]},
];

const FAQS = [
  { q: "Can I switch plans later?", a: "Yes. Upgrade or downgrade at any time from your account settings — the change applies from your next billing cycle, and nothing you've already set up is lost." },
  { q: "Do I need a developer to set this up?", a: "No. Connecting WooCommerce, Shopify or Daraz takes a few clicks, and our team can walk you through courier setup on your first call." },
  { q: "Which couriers does Zyro support?", a: "All 14 major couriers used across Pakistan, including Leopards, TCS, M&P, Call Courier, BlueEX, PostEx, Trax, Rider and Swyft, plus international options like FedEx and DHL." },
  { q: "Is there a contract, and what happens if I cancel?", a: "Monthly plans have no lock-in. You can export your orders, inventory and customer data at any point, and we keep a backup for 30 days after cancellation." },
  { q: "Does the WhatsApp AI reply in Urdu?", a: "Yes — the multi-language chatbot on Growth and Professional plans replies in Urdu, English, and several other languages based on how the customer writes in." },
];

// ── Plan visual config ───────────────────────────────────────────────────────

const PLAN_META = [
  {
    featured: false,
    badge: null,
    tagline: "For a single store finding its rhythm.",
    features: [
      "Confirm every order automatically over WhatsApp",
      "Compare rates and book all 14 couriers from one dashboard",
      "Get a WhatsApp receipt the moment a shipment ships",
      "Keep stock, suppliers and customer records in sync",
      "1 connected store",
    ],
    featuresLead: "Everything you need to launch",
  },
  {
    featured: true,
    badge: "Most Popular",
    tagline: "For teams ready to spend on ads and scale past one store.",
    features: [
      "Answer customer questions 24/7, in multiple languages, without hiring support staff",
      "See exactly which Google and TikTok campaigns turn into revenue",
      "Run 3 stores from the same dashboard without duplicating work",
      "Get AI flags on which products and campaigns are worth scaling",
    ],
    featuresLead: "Everything in Starter, plus",
  },
  {
    featured: false,
    badge: null,
    tagline: "For brands and agencies running the full operation.",
    features: [
      "Let AI handle customer voice notes the same way it handles text",
      "Run up to 10 stores from one account, one login for your team",
      "Get a dedicated success manager who knows your account",
      "Know what to restock, promote, and who's about to churn — before it costs you",
    ],
    featuresLead: "Everything in Growth, plus",
  },
];

// ── Cell renderer ─────────────────────────────────────────────────────────────

function CellVal({ v }) {
  if (v === true)  return <span style={{ color: "#22c55e", fontSize: 17, fontWeight: 700 }}>✓</span>;
  if (v === false) return <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 15 }}>—</span>;
  return <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{v}</span>;
}

// ── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "20px 0",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 15, fontWeight: 600, color: "#fff", fontFamily: "inherit", gap: 16,
        }}
      >
        <span>{q}</span>
        <span style={{ fontSize: 20, color: "rgba(255,255,255,0.4)", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 20, fontSize: 14.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 600 }}>{a}</div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPlanId, setUserPlanId] = useState(null);
  const [yearly, setYearly] = useState(false);
  const [featureSearch, setFeatureSearch] = useState("");
  const [faqSearch, setFaqSearch] = useState("");

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("zyro_user") || "{}");
      if (user?.plan_id) setUserPlanId(user.plan_id);
    } catch {}
    fetch("/api/plans")
      .then(r => r.json())
      .then(d => {
        if (d.plans) {
          // Deduplicate by name — keep first occurrence (lowest price wins after ORDER BY price ASC)
          const seen = new Set();
          const unique = d.plans
            .filter(p => !seen.has(p.name) && seen.add(p.name))
            .map(p => ({ ...p, name: p.name === 'Pro' ? 'Professional' : p.name }));
          setPlans(unique);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const fmtPrice = (price) => {
    const p = yearly ? Math.round(parseFloat(price) * 0.8) : parseFloat(price);
    return p.toLocaleString();
  };

  // Filter comparison rows
  const q = featureSearch.trim().toLowerCase();
  const filteredCompare = COMPARE.map(cat => ({
    ...cat,
    rows: cat.rows.filter(r => !q || r.label.toLowerCase().includes(q)),
  })).filter(cat => !q || cat.rows.length > 0);

  const filteredFaqs = FAQS.filter(f => {
    const fq = faqSearch.trim().toLowerCase();
    return !fq || f.q.toLowerCase().includes(fq) || f.a.toLowerCase().includes(fq);
  });

  // ── styles ────────────────────────────────────────────────────────────────

  const BG     = "#070c0a";
  const CARD   = "#0e1713";
  const CARD2  = "#121e18";
  const BORDER = "rgba(255,255,255,0.06)";
  const BORDER2 = "rgba(255,255,255,0.12)";
  const TEXT2  = "rgba(255,255,255,0.55)";
  const TEXT3  = "rgba(255,255,255,0.35)";
  const GREEN  = "#22c55e";
  const GLIGHT = "#7ef2c0";
  const GRAD   = "linear-gradient(135deg, #7ef2c0 0%, #22c55e 55%, #0e9f63 100%)";
  const GRADSOFT = "linear-gradient(160deg, rgba(34,197,94,0.16), rgba(34,197,94,0))";

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: TEXT2, fontSize: 14 }}>
        Loading plans...
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100%", color: "#fff", fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── TOP NAV ──────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 60,
        background: "rgba(7,12,10,0.85)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <ZyroLogo size={32} />
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            height: 36, padding: "0 16px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER2}`,
            color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </button>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="plans-hero" style={{ padding: "72px 40px 56px", textAlign: "center", background: `radial-gradient(700px 300px at 50% -10%, rgba(34,197,94,0.13), transparent 60%), ${BG}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: GREEN, marginBottom: 14 }}>Pricing</div>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.1 }}>
          One platform. Three ways to scale.
        </h1>
        <p style={{ fontSize: 17, color: TEXT2, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Every plan includes the full order-to-delivery workflow. Higher tiers unlock more stores, more AI, and more of your team's time back.
        </p>

        {/* Billing toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <span style={{ fontSize: 14.5, fontWeight: 500, color: yearly ? TEXT2 : "#fff" }}>Monthly</span>
          <button
            onClick={() => setYearly(y => !y)}
            style={{
              position: "relative", width: 52, height: 30, borderRadius: 16, border: "none",
              background: yearly ? GRAD : BORDER2, cursor: "pointer", padding: 0, flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%",
              background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              transition: "transform 0.2s", transform: yearly ? "translateX(22px)" : "none",
              display: "block",
            }} />
          </button>
          <span style={{ fontSize: 14.5, fontWeight: 500, color: yearly ? "#fff" : TEXT2 }}>Yearly</span>
          <span style={{ background: "rgba(34,197,94,0.15)", color: GREEN, fontSize: 12.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Save 20%</span>
        </div>
      </div>

      {/* ── PLAN CARDS ───────────────────────────────────────────────────── */}
      <div className="plans-cards-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "start" }}>
        {(plans.length > 0 ? plans : [{name:"Starter",price:"5999"},{name:"Growth",price:"8999"},{name:"Professional",price:"12999"}]).map((plan, i) => {
          const meta = PLAN_META[i] || PLAN_META[0];
          const isCurrent = userPlanId === plan.id;
          return (
            <div key={plan.id || i} className={meta.featured ? "plan-card-featured" : undefined} style={{
              background: meta.featured ? `${GRADSOFT}, ${CARD}` : CARD,
              border: `1px solid ${meta.featured ? GREEN : BORDER}`,
              borderRadius: 20, padding: "36px 32px",
              boxShadow: meta.featured ? "0 24px 48px -12px rgba(34,197,94,0.28)" : "0 8px 24px rgba(0,0,0,0.35)",
              transform: meta.featured ? "scale(1.03)" : "none",
              transformOrigin: "top center",
              position: "relative", display: "flex", flexDirection: "column",
            }}>
              {meta.badge && (
                <div style={{
                  position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                  background: GRAD, color: "#04231a", fontSize: 12.5, fontWeight: 600,
                  padding: "5px 16px", borderRadius: 20, whiteSpace: "nowrap",
                }}>{meta.badge}</div>
              )}
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontSize: 14.5, color: TEXT2, marginBottom: 24, minHeight: 44, lineHeight: 1.5 }}>{meta.tagline}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: TEXT2 }}>Rs</span>
                <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.02em" }}>{fmtPrice(plan.price)}</span>
                <span style={{ fontSize: 14, color: TEXT2 }}>/ month</span>
              </div>
              <div style={{ fontSize: 13, color: TEXT3, marginBottom: 28 }}>
                {yearly ? `Billed annually · Rs ${Math.round(parseFloat(plan.price) * 0.8 * 12).toLocaleString()}/year` : "Billed monthly"}
              </div>
              <button
                onClick={() => !isCurrent && router.push(`/payment?planId=${plan.id}`)}
                disabled={isCurrent}
                style={{
                  width: "100%", height: 48, borderRadius: 12, border: "none",
                  background: isCurrent ? "rgba(34,197,94,0.12)" : meta.featured ? GRAD : "rgba(255,255,255,0.08)",
                  color: isCurrent ? GREEN : meta.featured ? "#04231a" : "#fff",
                  fontSize: 15, fontWeight: 600, cursor: isCurrent ? "not-allowed" : "pointer",
                  marginBottom: 28, fontFamily: "inherit",
                  border: isCurrent ? `1px solid ${GREEN}` : meta.featured ? "none" : `1px solid ${BORDER2}`,
                  transition: "all 0.15s",
                }}
              >
                {isCurrent ? "Current Plan" : `Choose ${plan.name}`}
              </button>
              <ul style={{ display: "flex", flexDirection: "column", gap: 14, margin: 0, padding: 0, listStyle: "none" }}>
                <li style={{ fontSize: 12.5, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{meta.featuresLead}</li>
                {meta.features.map((f, fi) => (
                  <li key={fi} style={{ display: "flex", gap: 10, fontSize: 14.5, color: "#fff", lineHeight: 1.5 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M3 8.5L6.5 12L13 4.5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── COMPARISON TABLE ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 96px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: GREEN, marginBottom: 12 }}>Compare plans</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 0 }}>Every detail, side by side</h2>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 20, maxWidth: 300 }}>
          <div style={{ position: "relative" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <path d="M11 11L14 14" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={featureSearch} onChange={e => setFeatureSearch(e.target.value)}
              placeholder="Search features…"
              style={{
                width: "100%", height: 44, borderRadius: 12, border: `1px solid ${BORDER}`,
                padding: "0 16px 0 40px", fontSize: 14, background: CARD, color: "#fff",
                outline: "none", fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 20, overflow: "auto", maxHeight: 620, background: CARD }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 680 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: CARD }}>
                {["Feature", "Starter", "Growth", "Professional"].map((h, hi) => (
                  <th key={h} style={{
                    position: "sticky", top: 0, zIndex: hi === 0 ? 3 : 2,
                    background: CARD, padding: "18px 20px",
                    fontSize: 13.5, fontWeight: 600, color: TEXT2,
                    textAlign: hi === 0 ? "left" : "center",
                    borderRight: hi === 0 ? `1px solid ${BORDER}` : "none",
                    ...(hi === 0 ? { left: 0 } : {}),
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCompare.map(cat => (
                <React.Fragment key={cat.cat}>
                  <tr>
                    <td colSpan={4} style={{
                      padding: "12px 20px", background: "#0a1210",
                      fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      position: "sticky", left: 0,
                    }}>{cat.cat}</td>
                  </tr>
                  {cat.rows.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => { e.currentTarget.querySelectorAll("td").forEach(td => td.style.background = "#0a1210"); }}
                      onMouseLeave={e => { e.currentTarget.querySelectorAll("td").forEach(td => td.style.background = ""); }}>
                      <td style={{
                        padding: "15px 20px", fontSize: 14, color: "#fff", fontWeight: 500,
                        position: "sticky", left: 0, background: CARD, borderRight: `1px solid ${BORDER}`,
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        {row.label}
                        {row.tip && (
                          <span title={row.tip} style={{
                            display: "inline-flex", width: 15, height: 15, borderRadius: "50%",
                            background: BORDER2, color: TEXT2, fontSize: 10, fontWeight: 700,
                            alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0,
                          }}>i</span>
                        )}
                      </td>
                      {[row.s, row.g, row.p].map((v, vi) => (
                        <td key={vi} style={{ padding: "15px 20px", textAlign: "center", background: CARD }}><CellVal v={v} /></td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TRUST GRID ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: GREEN, marginBottom: 12 }}>Security & reliability</div>
          <h2 style={{ fontSize: "clamp(22px, 2.8vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em" }}>Built to be trusted with your business</h2>
        </div>
        <div className="plans-trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {[
            { icon: "🔒", title: "Encrypted & backed up", body: "Data encrypted end to end, backed up continuously." },
            { icon: "⏱️", title: "99.98% uptime", body: "Monitored around the clock, every day of the year." },
            { icon: "💳", title: "Secure payments", body: "PCI-compliant processing on every transaction." },
            { icon: "🛡️", title: "GDPR ready", body: "Built to meet international data-privacy standards." },
          ].map(({ icon, title, body }) => (
            <div key={title} style={{
              textAlign: "center", padding: "28px 20px",
              border: `1px solid ${BORDER}`, borderRadius: 14,
              background: `${GRADSOFT}, ${CARD}`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: "rgba(34,197,94,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 20,
              }}>{icon}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: TEXT2 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px 96px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: GREEN, marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(22px, 2.8vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 20 }}>Questions, answered</h2>
          <input
            value={faqSearch} onChange={e => setFaqSearch(e.target.value)}
            placeholder="Search questions…"
            style={{
              width: "100%", height: 48, borderRadius: 12, border: `1px solid ${BORDER}`,
              padding: "0 18px", fontSize: 15, background: CARD, color: "#fff",
              outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
        {filteredFaqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        {filteredFaqs.length === 0 && (
          <p style={{ color: TEXT2, fontSize: 14, textAlign: "center", paddingTop: 20 }}>No results for "{faqSearch}"</p>
        )}
      </div>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: "center", padding: "80px 32px",
        background: CARD2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
      }}>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14 }}>
          Ready to simplify your ecommerce?
        </h2>
        <p style={{ fontSize: 16.5, color: TEXT2, marginBottom: 36 }}>Choose a plan above, or talk to us for a custom setup.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => document.getElementById("plan-cards-top")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              height: 48, padding: "0 24px", borderRadius: 12, border: "none",
              background: GRAD, color: "#04231a", fontSize: 15, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            View plans
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              height: 48, padding: "0 24px", borderRadius: 12,
              background: "transparent", border: `1px solid ${BORDER2}`,
              color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Back to dashboard
          </button>
        </div>
      </div>

    </div>
  );
}
