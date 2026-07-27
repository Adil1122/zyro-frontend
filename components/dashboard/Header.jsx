"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "./constants";
import Icon from "./Icon";

export default function Header({ user }) {
    const router = useRouter();
    const [showDropdown, setShowDropdown] = useState(false);

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
                    <button
                        onClick={() => router.push("/plans")}
                        style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 14px", background: "rgba(59,130,246,0.1)",
                            borderRadius: 12, border: "1px solid rgba(59,130,246,0.2)",
                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.18)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.45)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)"; }}
                    >
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6" }}>
                            {user.plans?.name || 'Active Plan'}
                        </span>
                        <span style={{ fontSize: 10, color: "#3B82F6", opacity: 0.65 }}>↗ Upgrade</span>
                    </button>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
                <div style={{ position: "relative" }}>
                    <div
                        onClick={() => setShowDropdown(!showDropdown)}
                        title="User Menu"
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

                    {showDropdown && (
                        <div style={{
                            position: "absolute",
                            top: 45,
                            right: 0,
                            width: 190,
                            background: T.bgCard,
                            borderRadius: T.r8,
                            border: `1px solid ${T.border}`,
                            boxShadow: T.shadowLg,
                            zIndex: 1000,
                            padding: "6px 0",
                            overflow: "hidden"
                        }}>
                            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "User Profile"}</div>
                                <div style={{ fontSize: 10, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowDropdown(false);
                                    router.push("/profile");
                                }}
                                style={{
                                    width: "100%", padding: "10px 16px", background: "none", border: "none",
                                    color: T.textSub, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = T.bgHigh;
                                    e.currentTarget.style.color = T.text;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "none";
                                    e.currentTarget.style.color = T.textSub;
                                }}
                            >
                                <Icon name="user" size={14} color={T.textFaint} />
                                My Profile
                            </button>
                            <button 
                                onClick={() => {
                                    setShowDropdown(false);
                                    router.push("/plans");
                                }}
                                style={{
                                    width: "100%", padding: "10px 16px", background: "none", border: "none",
                                    color: T.textSub, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = T.bgHigh;
                                    e.currentTarget.style.color = T.text;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "none";
                                    e.currentTarget.style.color = T.textSub;
                                }}
                            >
                                <Icon name="credit-card" size={14} color={T.textFaint} />
                                Pricing Plans
                            </button>
                            <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                            <button 
                                onClick={() => {
                                    setShowDropdown(false);
                                    handleLogout();
                                }}
                                style={{
                                    width: "100%", padding: "10px 16px", background: "none", border: "none",
                                    color: T.red, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            >
                                <Icon name="log-out" size={14} color={T.red} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
