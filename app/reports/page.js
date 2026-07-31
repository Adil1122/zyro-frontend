"use client";

import React, { useState } from "react";
import { T } from "@/components/dashboard/constants";
import { getCurrentUserId } from "@/lib/auth";

const REPORTS = [
    {
        id: "orders",
        title: "Orders Report",
        desc: "All orders with customer, courier, amount, and status",
        icon: "📦",
        color: T?.j300 || "#5ca87c",
    },
    {
        id: "revenue",
        title: "Revenue Report",
        desc: "Daily revenue breakdown — gross, collected, and COD vs prepaid",
        icon: "💰",
        color: "#60A5FA",
    },
    {
        id: "customers",
        title: "Customers Report",
        desc: "Customer list with order count, total spent, tier, and risk",
        icon: "👥",
        color: "#A78BFA",
    },
    {
        id: "courier",
        title: "Courier Performance",
        desc: "Per-courier order count, success rate, and COD collected",
        icon: "🚚",
        color: "#FBBF24",
    },
    {
        id: "inventory",
        title: "Inventory Snapshot",
        desc: "Current stock levels with reorder status for all SKUs",
        icon: "📋",
        color: "#34D399",
    },
];

const RANGES = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
    { label: "This month", value: "month" },
    { label: "All time", value: "all" },
];

function RangeSelector({ value, onChange }) {
    return (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RANGES.map(r => (
                <button key={r.value} onClick={() => onChange(r.value)} style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${value === r.value ? "#5ca87c" : "#2a3a2e"}`,
                    background: value === r.value ? "rgba(92,168,124,0.15)" : "rgba(255,255,255,0.04)",
                    color: value === r.value ? "#9de0b5" : "#7a9e88",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}>
                    {r.label}
                </button>
            ))}
        </div>
    );
}

export default function ReportsPage() {
    const [range, setRange] = useState("30d");
    const [loading, setLoading] = useState({});
    const [done, setDone] = useState({});

    const downloadReport = async (reportId) => {
        setLoading(l => ({ ...l, [reportId]: true }));
        setDone(d => ({ ...d, [reportId]: false }));
        try {
            const userId = getCurrentUserId();
            const res = await fetch(`/api/reports/${reportId}?range=${range}&userId=${encodeURIComponent(userId || "")}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to generate report");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `zyro-${reportId}-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDone(d => ({ ...d, [reportId]: true }));
            setTimeout(() => setDone(d => ({ ...d, [reportId]: false })), 3000);
        } catch (e) {
            alert(e.message);
        } finally {
            setLoading(l => ({ ...l, [reportId]: false }));
        }
    };

    return (
        <div style={{ padding: "32px 28px", maxWidth: 900 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e8f4ee", margin: "0 0 6px", letterSpacing: "-0.5px" }}>Reports</h1>
                <p style={{ fontSize: 13, color: "#7a9e88", margin: 0 }}>Download CSV reports for any time range — right from your live data.</p>
            </div>

            <div style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid #1e3028", borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#5a7a68", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Date Range</div>
                <RangeSelector value={range} onChange={setRange} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
                {REPORTS.map(r => (
                    <div key={r.id} style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid #1e3028",
                        borderRadius: 12, padding: "20px 22px",
                        display: "flex", alignItems: "flex-start", gap: 16,
                        transition: "border-color 0.15s",
                    }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#2e4a3a"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#1e3028"}>
                        <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{r.icon}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f4ee", marginBottom: 4 }}>{r.title}</div>
                            <div style={{ fontSize: 12, color: "#7a9e88", lineHeight: 1.5, marginBottom: 14 }}>{r.desc}</div>
                            <button
                                onClick={() => downloadReport(r.id)}
                                disabled={loading[r.id]}
                                style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    padding: "7px 14px", fontSize: 12, fontWeight: 700,
                                    borderRadius: 8, border: `1px solid ${r.color}40`,
                                    background: `${r.color}18`, color: r.color,
                                    cursor: loading[r.id] ? "wait" : "pointer",
                                    fontFamily: "inherit", transition: "all 0.15s",
                                    opacity: loading[r.id] ? 0.7 : 1,
                                }}>
                                <span style={{ fontSize: 13 }}>
                                    {loading[r.id] ? "⏳" : done[r.id] ? "✓" : "↓"}
                                </span>
                                {loading[r.id] ? "Generating..." : done[r.id] ? "Downloaded!" : "Download CSV"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 32, padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid #1a2a22", borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#4a6a58", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Note</div>
                <div style={{ fontSize: 12, color: "#5a7a68", lineHeight: 1.6 }}>
                    Reports are generated in real time from your live data. Large date ranges may take a few seconds.
                    CSVs open in Excel, Google Sheets, or any spreadsheet app.
                </div>
            </div>
        </div>
    );
}
