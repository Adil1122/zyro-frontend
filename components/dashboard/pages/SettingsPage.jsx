"use client";

import React, { useState } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card } from "../Primitives";

export default function SettingsPage() {
    const [tab, setTab] = useState("stores");
    const tabs = [
        { id: "stores", label: "Connected Stores", icon: "globe" },
        { id: "whatsapp", label: "WhatsApp Setup", icon: "whatsapp" },
        { id: "couriers", label: "Couriers", icon: "truck" },
        { id: "team", label: "Team", icon: "users" },
        { id: "billing", label: "Plan & Billing", icon: "dollar" },
        { id: "notifications", label: "Notifications", icon: "bell" },
    ];
    return (
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
            <div style={{ width: 220, borderRight: `1px solid ${T.border}`, padding: "24px 0", background: T.bgCard }}>
                <div style={{ padding: "0 18px 14px", fontSize: 11, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>Settings</div>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", textAlign: "left",
                        padding: "10px 18px", fontSize: 13, fontWeight: 500,
                        background: tab === t.id ? "rgba(92,168,124,0.1)" : "transparent",
                        color: tab === t.id ? T.j200 : T.textMuted,
                        border: "none", cursor: "pointer",
                        borderLeft: `3px solid ${tab === t.id ? T.j300 : "transparent"}`,
                        fontFamily: "inherit", transition: "all 0.12s",
                    }}>
                        <Icon name={t.icon} size={14} color={tab === t.id ? T.j200 : T.textFaint} />
                        {t.label}
                    </button>
                ))}
            </div>
            <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>
                {tab === "stores" && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>Connected Stores</h2>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>Connect your sales channels. Orders and inventory sync automatically.</p>
                        {[
                            { name: "WooCommerce", icon: "🛒", desc: "acmestores.pk · 47 orders today", status: "connected", color: T.green, orders: "1,247", rev: "Rs 4.2M" },
                            { name: "Daraz", icon: "🏪", desc: "seller.daraz.pk/acme · 23 orders today", status: "connected", color: T.green, orders: "687", rev: "Rs 1.8M" },
                            { name: "Shopify", icon: "🏬", desc: "Not connected yet", status: "disconnected", color: T.textFaint },
                            { name: "Instagram Shop", icon: "📸", desc: "Connect to sync products", status: "disconnected", color: T.textFaint },
                        ].map(s => (
                            <Card key={s.name} style={{ marginBottom: 10, padding: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{ fontSize: 28 }}>{s.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{s.name}</div>
                                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{s.desc}</div>
                                    </div>
                                    {s.status === "connected" && (
                                        <div style={{ display: "flex", gap: 16, marginRight: 16 }}>
                                            <div>
                                                <div style={{ fontSize: 10, color: T.textFaint }}>Orders</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{s.orders}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, color: T.textFaint }}>Revenue</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: T.j200 }}>{s.rev}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, boxShadow: s.status === "connected" ? `0 0 6px ${s.color}` : "none" }} />
                                        <span style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.status}</span>
                                    </div>
                                    {s.status === "connected" ? <GradientButton variant="secondary" size="sm" icon="settings">Manage</GradientButton>
                                        : <GradientButton variant="primary" size="sm" icon="plus">Connect</GradientButton>}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
                {tab === "whatsapp" && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>WhatsApp Setup</h2>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>Dual-number system: AI Bot line + Human Support line.</p>
                        {[
                            { type: "Bot Number", number: "+92 311 ZYRO-BOT", quality: "Green", templates: 14, desc: "Handles all automation & AI replies", color: T.j300 },
                            { type: "Support Number", number: "+92 300 ZYRO-HELP", quality: "Green", templates: 8, desc: "Human agents reply from here", color: T.blue },
                        ].map(n => (
                            <Card key={n.type} style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{n.type}</div>
                                        <div style={{ fontSize: 14, color: n.color, fontFamily: "monospace", marginTop: 4, fontWeight: 600 }}>{n.number}</div>
                                        <div style={{ fontSize: 12, color: T.textFaint, marginTop: 4 }}>{n.desc}</div>
                                    </div>
                                    <GradientButton variant="secondary" size="sm" icon="settings">Configure</GradientButton>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                    <div style={{ padding: 10, background: T.bgElev, borderRadius: T.r6, border: `1px solid ${T.border}` }}>
                                        <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Quality Rating</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.green, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}` }} />
                                            {n.quality}
                                        </div>
                                    </div>
                                    <div style={{ padding: 10, background: T.bgElev, borderRadius: T.r6, border: `1px solid ${T.border}` }}>
                                        <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Templates</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 3 }}>{n.templates} approved</div>
                                    </div>
                                    <div style={{ padding: 10, background: T.bgElev, borderRadius: T.r6, border: `1px solid ${T.border}` }}>
                                        <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Daily Limit</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 3 }}>Unlimited</div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
                {tab === "billing" && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>Plan & Billing</h2>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>Current subscription and usage.</p>
                        <div style={{
                            background: T.gradHero, borderRadius: T.r14, padding: "24px 28px", marginBottom: 20,
                            position: "relative", overflow: "hidden", boxShadow: T.shadowLg,
                        }}>
                            <div style={{
                                position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)"
                            }} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.8)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Current Plan</div>
                                    <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginTop: 4, letterSpacing: "-0.8px" }}>Growth</div>
                                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Rs 8,999 / month · Billed monthly</div>
                                </div>
                                <button style={{
                                    padding: "8px 16px", borderRadius: T.r8, background: "#fff", color: T.j600,
                                    border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13,
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                }}>
                                    <Icon name="trending" size={14} color={T.j600} /> Upgrade to Pro
                                </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 22, position: "relative" }}>
                                {[["Orders Used", "1,247 / 1,500", 83], ["Team", "2 / 3", 67], ["WhatsApp", "847 / 2,000", 42]].map(([k, v, pct]) => (
                                    <div key={k}>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 5 }}>{k}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{v}</div>
                                        <div style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, marginTop: 6 }}>
                                            <div style={{ height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 2 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {(tab !== "stores" && tab !== "whatsapp" && tab !== "billing") && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>{tabs.find(t => t.id === tab)?.label}</h2>
                        <div style={{ padding: "60px 40px", textAlign: "center", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r12, marginTop: 20 }}>
                            <div style={{ fontSize: 13, color: T.textMuted }}>Configure {tabs.find(t => t.id === tab)?.label.toLowerCase()} settings here</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
