"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/components/dashboard/constants";

export default function PlansPage() {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch("/api/plans");
                const data = await res.json();
                if (data.plans) setPlans(data.plans);
            } catch (err) {
                console.error("Error fetching plans:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const features = [
        { label: "Auto order confirmation (WhatsApp template)", starter: true, growth: true, pro: true },
        { label: "Courier booking automation", starter: "self-serve", growth: "+ team books on behalf", pro: true },
        { label: "Connected stores", starter: "1", growth: "3", pro: "Unlimited" },
        { label: "Order dashboard", starter: true, growth: true, pro: true },
        { label: "WhatsApp AI Chatbot (free-form replies)", starter: false, growth: true, pro: true },
        { label: "Daily courier receipts via WhatsApp", starter: false, growth: true, pro: true },
        { label: "Inventory management & sync", starter: false, growth: false, pro: true },
        { label: "Sync products across platforms", starter: false, growth: false, pro: true },
        { label: "Meta Ads stats", starter: false, growth: false, pro: true },
        { label: "Google Ads stats", starter: false, growth: false, pro: true },
        { label: "Dedicated account manager", starter: false, growth: false, pro: true },
    ];

    const renderValue = (val) => {
        if (val === true) return <span style={{ color: T.green, fontSize: 18 }}>✓</span>;
        if (val === false) return <span style={{ color: T.red, fontSize: 18 }}>×</span>;
        return <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{val}</span>;
    };

    if (isLoading) {
        return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: T.bg, color: T.text }}>Loading Plans...</div>;
    }

    return (
        <div style={{
            padding: "40px 20px",
            maxWidth: 1000,
            margin: "0 auto",
            minHeight: "100vh",
            background: T.bg
        }}>
            <div style={{ textAlign: "center", marginBottom: 50 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: T.text, marginBottom: 10 }}>
                    What each plan unlocks
                </h1>
                <p style={{ fontSize: 16, color: T.textMuted }}>
                    Choose the perfect tier to scale your ecommerce business
                </p>
            </div>

            <div style={{
                background: T.bgCard,
                borderRadius: T.r16,
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowLg,
                overflow: "hidden"
            }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: T.bgElev }}>
                            <th style={{ ...cellStyle, textAlign: "left", width: "40%", fontSize: 14 }}>Feature</th>
                            {plans.map(plan => (
                                <th key={plan.id} style={{ ...cellStyle, textAlign: "center", width: "20%" }}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: plan.name === 'Enterprise' ? T.green : plan.name === 'Professional' ? T.j300 : T.j400 }}>{plan.name}</div>
                                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>({plan.currency} {parseFloat(plan.price).toLocaleString()})</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {features.map((f, i) => (
                            <tr key={i} style={{ 
                                borderTop: `1px solid ${T.border}`,
                                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"
                            }}>
                                <td style={{ ...cellStyle, textAlign: "left", fontSize: 13, color: T.textSub }}>{f.label}</td>
                                {plans.map(plan => {
                                    const key = plan.name.toLowerCase();
                                    return <td key={plan.id} style={{ ...cellStyle, textAlign: "center" }}>{renderValue(f[key] ?? false)}</td>
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ borderTop: `1px solid ${T.borderMid}`, background: T.bgElev }}>
                            <td style={cellStyle}></td>
                            {plans.map(plan => (
                                <td key={plan.id} style={{ ...cellStyle, textAlign: "center" }}>
                                    <button 
                                        onClick={() => router.push(`/payment?planId=${plan.id}`)}
                                        style={{
                                            padding: "8px 16px",
                                            background: plan.name === "Professional" ? T.gradBtn : T.bgHigh,
                                            border: plan.name === "Professional" ? "none" : `1px solid ${T.borderBright}`,
                                            borderRadius: T.r6,
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                        onMouseOver={(e) => {
                                            if (plan.name === "Professional") e.currentTarget.style.boxShadow = T.glowBtn;
                                            else e.currentTarget.style.background = T.bgActive;
                                        }}
                                        onMouseOut={(e) => {
                                            if (plan.name === "Professional") e.currentTarget.style.boxShadow = "none";
                                            else e.currentTarget.style.background = T.bgHigh;
                                        }}
                                    >
                                        Choose {plan.name}
                                    </button>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div style={{ textAlign: "center", marginTop: 40 }}>
                <p style={{ fontSize: 14, color: T.textFaint }}>
                    Need a custom enterprise solution? <span style={{ color: T.j300, cursor: "pointer", fontWeight: 600 }}>Contact Sales</span>
                </p>
            </div>
        </div>
    );
}

const cellStyle = {
    padding: "20px 24px",
    verticalAlign: "middle"
};
