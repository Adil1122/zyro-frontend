"use client";

import React from "react";
import { T, NAV } from "./constants";
import Icon from "./Icon";
import { ZyroLogo } from "./Primitives";

import Link from "next/link";

export default function Sidebar({ page, collapsed, setCollapsed }) {
    return (
        <div style={{
            width: collapsed ? 62 : 232, background: T.bgCard,
            borderRight: `1px solid ${T.border}`,
            display: "flex", flexDirection: "column",
            transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
            flexShrink: 0, overflow: "hidden",
        }}>
            <div style={{
                height: 60, padding: collapsed ? "0 14px" : "0 16px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex", alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
            }}>
                {!collapsed ? <ZyroLogo size={32} /> : <ZyroLogo size={32} showText={false} />}
                {!collapsed && (
                    <button onClick={() => setCollapsed(true)} style={{
                        background: "none", border: "none", cursor: "pointer", color: T.textFaint,
                        display: "flex", alignItems: "center", padding: 4, borderRadius: T.r4,
                    }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
            </div>
            {collapsed && (
                <button onClick={() => setCollapsed(false)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "8px 0", color: T.textFaint,
                }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}
            <nav style={{ flex: 1, padding: "10px 8px", overflow: "hidden" }}>
                {NAV.map(item => {
                    const active = page === item.id;
                    const href = item.id === "dashboard" ? "/" : `/${item.id}`;
                    return (
                        <Link key={item.id} href={href}
                            title={collapsed ? item.label : undefined}
                            style={{
                                display: "flex", alignItems: "center",
                                gap: collapsed ? 0 : 11, width: "100%",
                                padding: collapsed ? "10px 0" : "9px 12px",
                                justifyContent: collapsed ? "center" : "flex-start",
                                background: active ? T.gradBtn : "transparent",
                                color: active ? "#fff" : T.textMuted,
                                border: "none", cursor: "pointer", borderRadius: T.r8,
                                fontSize: 13, fontWeight: active ? 700 : 500,
                                transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
                                textAlign: "left", fontFamily: "inherit",
                                marginBottom: 2,
                                boxShadow: active ? T.glowBtn : "none",
                                position: "relative", overflow: "hidden",
                                textDecoration: "none",
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bgElev; }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                            {active && (
                                <div style={{
                                    position: "absolute", top: 0, left: 0, right: 0, height: "50%",
                                    background: "linear-gradient(180deg, rgba(255,255,255,0.15), transparent)",
                                    pointerEvents: "none",
                                }} />
                            )}
                            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", position: "relative" }}>
                                <Icon name={item.id} size={15} color={active ? "#fff" : T.textFaint} />
                            </span>
                            {!collapsed && (
                                <>
                                    <span style={{ flex: 1, whiteSpace: "nowrap", position: "relative" }}>{item.label}</span>
                                    {item.badge && (
                                        <span style={{
                                            padding: "1px 7px", borderRadius: T.r20, fontSize: 10, fontWeight: 800,
                                            background: active ? "rgba(255,255,255,0.25)" : item.alert ? T.redBg : item.warn ? T.yellowBg : T.j600,
                                            color: active ? "#fff" : item.alert ? T.red : item.warn ? T.yellow : T.j200,
                                            border: `1px solid ${active ? "rgba(255,255,255,0.3)" : item.alert ? T.red + "44" : item.warn ? T.yellow + "44" : T.borderMid}`,
                                            position: "relative",
                                        }}>{item.badge}</span>
                                    )}
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>
            {!collapsed && (
                <div style={{ padding: "12px 10px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
                        border: `1px solid ${T.borderMid}`,
                    }}>AK</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Ahmad Khan</div>
                        <div style={{ fontSize: 10, color: T.textFaint }}>Owner · Acme Stores</div>
                    </div>
                    <Link href="/settings" style={{
                        background: "none", border: "none", cursor: "pointer", color: T.textFaint,
                        display: "flex", padding: 4, textDecoration: "none"
                    }}>
                        <Icon name="settings" size={14} color={T.textFaint} />
                    </Link>
                </div>
            )}
        </div>
    );
}
