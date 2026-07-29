"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "./constants";
import Icon from "./Icon";

const NOTIFICATIONS = [
    {
        id: 1, icon: "shopping-bag", color: "#60A5FA",
        title: "3 new orders received",
        body: "WooCommerce picked up 3 orders in the last hour.",
        time: "2m ago", href: "/",
    },
    {
        id: 2, icon: "alert-triangle", color: "#FBBF24",
        title: "Low stock alert",
        body: "4 products are below 5 units — review inventory.",
        time: "18m ago", href: "/",
    },
    {
        id: 3, icon: "truck", color: "#4ADE80",
        title: "Shipment delivered",
        body: "TCS #779416038409 was delivered to Ahmed Raza.",
        time: "1h ago", href: "/",
    },
    {
        id: 4, icon: "refresh-cw", color: "#A78BFA",
        title: "Meta Ads synced",
        body: "Campaign data updated — 8 active campaigns found.",
        time: "20m ago", href: "/",
    },
];

const SUPPORT_PHONE = "03155567644";
const WA_HREF = `https://wa.me/92${SUPPORT_PHONE.replace(/^0/, "")}`;

export default function Header({ user }) {
    const router = useRouter();
    const [showDropdown, setShowDropdown]       = useState(false);
    const [showSupport, setShowSupport]         = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [hasUnread, setHasUnread]             = useState(true);
    const [phoneCopied, setPhoneCopied]         = useState(false);

    const supportRef = useRef(null);
    const notifRef   = useRef(null);
    const userRef    = useRef(null);

    // Close all popovers on outside click
    useEffect(() => {
        const handler = (e) => {
            if (supportRef.current && !supportRef.current.contains(e.target)) setShowSupport(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifications(false);
            if (userRef.current    && !userRef.current.contains(e.target))     setShowDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("zyro_user");
        window.dispatchEvent(new Event("authChange"));
        router.push("/login");
    };

    const getTrialDaysLeft = () => {
        if (!user?.trial_ends_at) return null;
        const diff = Math.ceil((new Date(user.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    const daysLeft = getTrialDaysLeft();

    const openNotifications = () => {
        setShowNotifications(p => !p);
        setShowSupport(false);
        setHasUnread(false);
    };

    const openSupport = () => {
        setShowSupport(p => !p);
        setShowNotifications(false);
    };

    const copyPhone = () => {
        navigator.clipboard.writeText(SUPPORT_PHONE).catch(() => {});
        setPhoneCopied(true);
        setTimeout(() => setPhoneCopied(false), 1800);
    };

    return (
        <header style={{
            height: 60, background: T.bgCard,
            borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 28px",
            flexShrink: 0,
        }}>
            {/* Left: search + plan badge */}
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

                {user && !user.plan_id && daysLeft !== null && (
                    <div onClick={() => router.push("/plans")} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 14px", borderRadius: 12, cursor: "pointer",
                        background: daysLeft <= 3 ? "rgba(248,113,113,0.1)" : "rgba(92,168,124,0.1)",
                        border: `1px solid ${daysLeft <= 3 ? "rgba(248,113,113,0.2)" : "rgba(92,168,124,0.2)"}`,
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft <= 3 ? T.red : T.green }}>
                            {daysLeft} Days Left in Trial
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: T.textFaint, textDecoration: "underline" }}>Upgrade Now</span>
                    </div>
                )}

                {user?.plan_id && (
                    <button onClick={() => router.push("/plans")} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 14px", background: "rgba(59,130,246,0.1)",
                        borderRadius: 12, border: "1px solid rgba(59,130,246,0.2)",
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.18)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.45)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)"; }}
                    >
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6" }}>{user.plans?.name || "Active Plan"}</span>
                        <span style={{ fontSize: 10, color: "#3B82F6", opacity: 0.65 }}>↗ Upgrade</span>
                    </button>
                )}
            </div>

            {/* Right: live badge + icon buttons + avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: T.j700, borderRadius: 20, border: `1px solid ${T.j500}33` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.j200 }}>Live Sync Status</span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    {/* ── Support button ── */}
                    <div ref={supportRef} style={{ position: "relative" }}>
                        <button
                            onClick={openSupport}
                            title="Help & Support"
                            style={{
                                width: 34, height: 34, borderRadius: "50%",
                                background: showSupport ? T.bgHigh : T.bgElev,
                                border: `1px solid ${showSupport ? T.borderMid : T.border}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { if (!showSupport) { e.currentTarget.style.background = T.bgHigh; e.currentTarget.style.borderColor = T.borderMid; } }}
                            onMouseLeave={e => { if (!showSupport) { e.currentTarget.style.background = T.bgElev; e.currentTarget.style.borderColor = T.border; } }}
                        >
                            <Icon name="headset" size={16} color={showSupport ? T.textSub : T.textMuted} />
                        </button>

                        {showSupport && (
                            <div style={{
                                position: "absolute", top: 42, right: 0, width: 240,
                                background: T.bgCard, border: `1px solid ${T.borderMid}`,
                                borderRadius: 12, boxShadow: T.shadowLg, zIndex: 1000, overflow: "hidden",
                            }}>
                                <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${T.border}` }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Help & Support</div>
                                    <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>We typically reply within a few minutes</div>
                                </div>

                                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                                    <a
                                        href={WA_HREF}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                            display: "flex", alignItems: "center", gap: 10,
                                            padding: "10px 14px", borderRadius: 9,
                                            background: "rgba(37,211,102,0.12)",
                                            border: "1px solid rgba(37,211,102,0.25)",
                                            color: "#25D366", fontSize: 13, fontWeight: 700,
                                            textDecoration: "none", transition: "background 0.15s",
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(37,211,102,0.2)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "rgba(37,211,102,0.12)"}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 10c0-3.9 3.1-7 7-7s7 3.1 7 7-3.1 7-7 7c-1.1 0-2.1-.2-3-.7L3 17l1.2-3.8c-.8-1-1.2-2-1.2-3.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                                        Chat on WhatsApp
                                    </a>

                                    <div style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "9px 14px", borderRadius: 9,
                                        background: T.bgElev, border: `1px solid ${T.border}`,
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Icon name="phone" size={14} color={T.textFaint} />
                                            <span style={{ fontSize: 13, fontWeight: 600, color: T.textSub, letterSpacing: "0.02em" }}>
                                                {SUPPORT_PHONE.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3")}
                                            </span>
                                        </div>
                                        <button onClick={copyPhone} style={{
                                            background: "none", border: "none", cursor: "pointer",
                                            color: phoneCopied ? T.green : T.textFaint,
                                            fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                                            transition: "color 0.15s",
                                        }}>
                                            <Icon name={phoneCopied ? "check" : "copy"} size={12} color="currentColor" />
                                            {phoneCopied ? "Copied" : "Copy"}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ padding: "0 16px 14px" }}>
                                    <div style={{ fontSize: 11, color: T.textFaint, lineHeight: 1.5 }}>
                                        Mon–Sat · 9 AM–8 PM PKT
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Notifications button ── */}
                    <div ref={notifRef} style={{ position: "relative" }}>
                        <button
                            onClick={openNotifications}
                            title="Notifications"
                            style={{
                                width: 34, height: 34, borderRadius: "50%",
                                background: showNotifications ? T.bgHigh : T.bgElev,
                                border: `1px solid ${showNotifications ? T.borderMid : T.border}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", position: "relative", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { if (!showNotifications) { e.currentTarget.style.background = T.bgHigh; e.currentTarget.style.borderColor = T.borderMid; } }}
                            onMouseLeave={e => { if (!showNotifications) { e.currentTarget.style.background = T.bgElev; e.currentTarget.style.borderColor = T.border; } }}
                        >
                            <Icon name="bell" size={16} color={showNotifications ? T.textSub : T.textMuted} />
                            {hasUnread && (
                                <div style={{
                                    position: "absolute", top: 7, right: 7, width: 8, height: 8,
                                    background: T.red, borderRadius: "50%", border: `2px solid ${T.bgElev}`,
                                    transition: "opacity 0.2s",
                                }} />
                            )}
                        </button>

                        {showNotifications && (
                            <div style={{
                                position: "absolute", top: 42, right: 0, width: 320,
                                background: T.bgCard, border: `1px solid ${T.borderMid}`,
                                borderRadius: 12, boxShadow: T.shadowLg, zIndex: 1000, overflow: "hidden",
                            }}>
                                <div style={{
                                    padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Notifications</span>
                                    <span style={{ fontSize: 11, color: T.textFaint, background: T.bgHigh, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                                        {NOTIFICATIONS.length} new
                                    </span>
                                </div>

                                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                                    {NOTIFICATIONS.map((n, i) => (
                                        <button
                                            key={n.id}
                                            onClick={() => { setShowNotifications(false); router.push(n.href); }}
                                            style={{
                                                width: "100%", display: "flex", alignItems: "flex-start", gap: 12,
                                                padding: "12px 16px", background: "none", border: "none",
                                                borderBottom: i < NOTIFICATIONS.length - 1 ? `1px solid ${T.border}` : "none",
                                                cursor: "pointer", textAlign: "left", transition: "background 0.12s",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.bgElev}
                                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                                        >
                                            <div style={{
                                                width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 1,
                                                background: `${n.color}18`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                <Icon name={n.icon} size={14} color={n.color} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: 2 }}>{n.title}</div>
                                                <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.45 }}>{n.body}</div>
                                                <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 4 }}>{n.time}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
                                    <button style={{
                                        width: "100%", background: "none", border: "none",
                                        fontSize: 12, fontWeight: 600, color: T.textFaint, cursor: "pointer",
                                        textAlign: "center", transition: "color 0.15s",
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.color = T.textSub}
                                        onMouseLeave={e => e.currentTarget.style.color = T.textFaint}
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Avatar / user menu ── */}
                <div ref={userRef} style={{ position: "relative" }}>
                    <div
                        onClick={() => { setShowDropdown(p => !p); setShowSupport(false); setShowNotifications(false); }}
                        title="User Menu"
                        style={{
                            padding: "1px", background: "linear-gradient(135deg, #1A5140 0%, #112E24 100%)",
                            borderRadius: "50%", border: `1px solid ${T.borderMid}`, cursor: "pointer",
                            transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = T.glowGreen}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                    >
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.bgElev, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.j200 }}>
                            {user?.name?.substring(0, 1).toUpperCase() || <Icon name="user" size={14} color={T.j200} />}
                        </div>
                    </div>

                    {showDropdown && (
                        <div style={{
                            position: "absolute", top: 45, right: 0, width: 190,
                            background: T.bgCard, borderRadius: T.r8,
                            border: `1px solid ${T.border}`, boxShadow: T.shadowLg,
                            zIndex: 1000, padding: "6px 0", overflow: "hidden",
                        }}>
                            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "User Profile"}</div>
                                <div style={{ fontSize: 10, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
                            </div>
                            {[
                                { label: "My Profile", icon: "user", href: "/profile" },
                                { label: "Pricing Plans", icon: "credit-card", href: "/plans" },
                            ].map(item => (
                                <button key={item.href} onClick={() => { setShowDropdown(false); router.push(item.href); }} style={{
                                    width: "100%", padding: "10px 16px", background: "none", border: "none",
                                    color: T.textSub, fontSize: 13, fontWeight: 600, textAlign: "left",
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = T.bgHigh; e.currentTarget.style.color = T.text; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = T.textSub; }}
                                >
                                    <Icon name={item.icon} size={14} color={T.textFaint} />
                                    {item.label}
                                </button>
                            ))}
                            <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                            <button onClick={() => { setShowDropdown(false); handleLogout(); }} style={{
                                width: "100%", padding: "10px 16px", background: "none", border: "none",
                                color: T.red, fontSize: 13, fontWeight: 600, textAlign: "left",
                                cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
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
