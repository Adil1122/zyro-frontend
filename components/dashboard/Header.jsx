"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "./constants";
import Icon from "./Icon";

export default function Header({ user }) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('zyro_user');
        window.dispatchEvent(new Event('authChange'));
        router.push("/login");
    };

    const getTrialDaysLeft = () => {
        if (!user?.trial_ends_at) return null;
        const diffTime = new Date(user.trial_ends_at) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const daysLeft = getTrialDaysLeft();

    return (
        <header style={{
            height: 60, background: T.bgCard,
            borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 28px",
            flexShrink: 0,
        }}>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 20 }}>
                <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: T.bgElev, border: `1px solid ${T.border}`,
                    borderRadius: 24, padding: "7px 18px", width: "100%", maxWidth: 380,
                    color: T.textMuted, cursor: "text",
                }}>
                    <Icon name="search" size={14} color={T.textFaint} />
                    <span style={{ fontSize: 13, flex: 1 }}>Search anything...</span>
                    <span style={{ fontSize: 10, color: T.textFaint, padding: "2px 6px", background: T.bgHigh, borderRadius: 4, letterSpacing: 0.5 }}>⌘K</span>
                </div>

                {/* Trial Info */}
                {user && !user.plan_id && daysLeft !== null && (
                    <div 
                        onClick={() => router.push("/plans")}
                        style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 14px", background: daysLeft <= 3 ? "rgba(248,113,113,0.1)" : "rgba(92,168,124,0.1)",
                            borderRadius: 12, border: `1px solid ${daysLeft <= 3 ? "rgba(248,113,113,0.2)" : "rgba(92,168,124,0.2)"}`,
                            cursor: "pointer"
                        }}
                    >
                        <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft <= 3 ? T.red : T.green }}>
                            {daysLeft} Days Left in Trial
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: T.textFaint, textDecoration: "underline" }}>Upgrade Now</span>
                    </div>
                )}
                
                {user?.plan_id && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "rgba(59,130,246,0.1)", borderRadius: 12, border: "1px solid rgba(59,130,246,0.2)" }}>
                         <span style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6" }}>
                            {user.plans?.name || 'Active Plan'}
                        </span>
                    </div>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <button 
                    onClick={() => router.push("/plans")}
                    style={{
                        background: "none", border: "none", color: T.j300, fontSize: 13, fontWeight: 600, cursor: "pointer"
                    }}
                >
                    Plans
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: T.j700, borderRadius: 20, border: `1px solid ${T.j500}33` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.j200 }}>Live Sync Status</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {[
                        { id: "help", icon: "headset" },
                        { id: "alerts", icon: "bell", badge: true },
                    ].map(b => (
                        <button key={b.id} style={{
                            width: 34, height: 34, borderRadius: "50%", background: T.bgElev, border: `1px solid ${T.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            position: "relative",
                        }}>
                            <Icon name={b.icon} size={16} color={T.textMuted} />
                            {b.badge && (
                                <div style={{
                                    position: "absolute", top: 8, right: 8, width: 8, height: 8,
                                    background: T.red, borderRadius: "50%", border: `2px solid ${T.bgElev}`,
                                }} />
                            )}
                        </button>
                    ))}
                </div>
                <div
                    onClick={() => router.push("/profile")}
                    title="View Profile"
                    style={{
                        padding: "1px", background: "linear-gradient(135deg, #1A5140 0%, #112E24 100%)",
                        borderRadius: "50%", border: `1px solid ${T.borderMid}`, cursor: "pointer",
                        transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = T.glowGreen}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                     <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.bgElev, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.j200 }}>
                        {user?.name?.substring(0, 1).toUpperCase() || <Icon name="user" size={14} color={T.j200} />}
                    </div>
                </div>
                <div
                    onClick={handleLogout}
                    title="Click to Logout"
                    style={{
                        padding: "1px", background: "linear-gradient(135deg, #421C1C 0%, #2D1414 100%)",
                        borderRadius: "50%", border: `1px solid rgba(248,113,113,0.3)`, cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 0 15px rgba(248,113,113,0.3)"}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.bgElev, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.j200 }}>
                        <Icon name="log-out" size={14} color={T.red} />
                    </div>
                </div>
            </div>
        </header>
    );
}
