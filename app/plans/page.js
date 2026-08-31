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

// Plans page hidden for Shopify App Store review.
// Re-enable by restoring the full component from git history.
export default function PlansPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard"); }, [router]);
  return null;
}
