"use client";

import React from "react";
import { T } from "@/components/dashboard/constants";
import Icon from "@/components/dashboard/Icon";

const features = [
    { icon: "whatsapp", label: "WhatsApp Flow Builder", desc: "Visual drag-and-drop builder for multi-step customer journeys triggered by order events." },
    { icon: "orders", label: "Order Lifecycle Rules", desc: "Auto-trigger actions — notifications, tags, courier bookings — based on status changes." },
    { icon: "analytics", label: "Smart Retry Logic", desc: "Automatically retry failed deliveries, resend WhatsApp messages, and escalate unread alerts." },
    { icon: "customers", label: "Customer Segmentation Triggers", desc: "Run automations based on customer spend, order frequency, or last activity." },
];

export default function AutomationPage() {
    return (
        <div style={{ padding: "40px 24px", maxWidth: 720, margin: "0 auto" }}>
            {/* Coming Soon badge */}
            <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
                <span style={{
                    padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800,
                    background: T.yellowBg, color: T.yellow,
                    border: `1px solid ${T.yellow}44`, letterSpacing: "0.8px",
                    textTransform: "uppercase",
                }}>Coming Soon</span>

                <h1 style={{ fontSize: 32, fontWeight: 800, color: T.text, margin: 0, lineHeight: 1.2 }}>
                    Automation
                </h1>
                <p style={{ fontSize: 15, color: T.textMuted, margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
                    Build powerful no-code workflows that run your store on autopilot — triggered by orders, couriers, customers, and more.
                </p>
            </div>

            {/* Feature preview cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {features.map((f) => (
                    <div key={f.label} style={{
                        background: T.bgCard, borderRadius: T.r12,
                        border: `1px solid ${T.border}`,
                        padding: "20px 20px",
                        display: "flex", flexDirection: "column", gap: 10,
                        opacity: 0.75,
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: T.r8,
                            background: T.bgElev, border: `1px solid ${T.borderMid}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Icon name={f.icon} size={16} color={T.j300} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{f.label}</div>
                            <div style={{ fontSize: 12, color: T.textFaint, lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Notify CTA */}
            <div style={{
                marginTop: 32, background: T.bgCard, borderRadius: T.r12,
                border: `1px solid ${T.borderMid}`,
                padding: "24px 28px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
            }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Be the first to know</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
                        We'll notify you on WhatsApp as soon as Automation goes live.
                    </div>
                </div>
                <div style={{
                    padding: "8px 18px", borderRadius: T.r8,
                    background: T.gradBtn, color: "#fff",
                    fontSize: 13, fontWeight: 700,
                    boxShadow: T.glowBtn, cursor: "default",
                    opacity: 0.6,
                    whiteSpace: "nowrap",
                }}>
                    Notify Me
                </div>
            </div>
        </div>
    );
}
