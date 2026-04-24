"use client";

import React, { useState } from "react";
import Icon from "./Icon";
import { T, statusCfg } from "./constants";

export function ZyroLogo({ size = 34, showText = true }) {
    const tile = size;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
            <div style={{
                width: tile, height: tile, borderRadius: tile * 0.2,
                background: T.gradLogoTile, border: `1px solid ${T.borderMid}`,
                position: "relative", overflow: "hidden", flexShrink: 0,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.4)",
            }}>
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    background: "radial-gradient(circle at 30% 25%, rgba(143,212,164,0.22), transparent 60%)",
                    pointerEvents: "none",
                }} />
                <svg width={tile * 0.72} height={tile * 0.72} viewBox="0 0 100 100"
                    style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                    <path d="M 22 32 L 58 24" stroke={T.j200} strokeWidth={7} strokeLinecap="round" fill="none" />
                    <path d="M 58 28 Q 55 30 50 40 Q 42 54 34 66 Q 30 72 26 76" stroke={T.j200} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M 26 76 L 66 70" stroke={T.j200} strokeWidth={7} strokeLinecap="round" fill="none" />
                    <circle cx="64" cy="14" r={4.5} fill={T.j200} />
                </svg>
            </div>
            {showText && (
                <span style={{
                    fontSize: size * 0.66, fontWeight: 700, color: T.text,
                    letterSpacing: "-0.02em",
                    fontFamily: "'Nunito', 'Plus Jakarta Sans', sans-serif",
                    lineHeight: 1,
                }}>zyro</span>
            )}
        </div>
    );
}

export function GradientButton({ children, onClick, variant = "primary", size = "md", icon, iconRight, full, disabled }) {
    const [hover, setHover] = useState(false);
    const [active, setActive] = useState(false);
    const sizes = {
        xs: { px: 8, py: 4, fs: 11, gap: 4, ih: 11 },
        sm: { px: 11, py: 6, fs: 12, gap: 5, ih: 13 },
        md: { px: 14, py: 8, fs: 13, gap: 6, ih: 14 },
        lg: { px: 18, py: 11, fs: 14, gap: 7, ih: 16 },
    }[size];
    const variants = {
        primary: { bg: active ? T.gradBtnActive : hover ? T.gradBtnHover : T.gradBtn, color: active ? T.bg : "#fff", border: "none", shadow: active ? "none" : hover ? T.glowBtnHover : T.glowBtn },
        secondary: { bg: active ? T.gradBtnActive : hover ? T.bgHigh : T.bgElev, color: active ? T.bg : T.text, border: `1px solid ${hover ? T.borderBright : T.borderMid}`, shadow: "none" },
        ghost: { bg: active ? T.bgActive : hover ? T.bgElev : "transparent", color: hover ? T.text : T.textSub, border: "none", shadow: "none" },
        danger: { bg: active ? "#FCA5A5" : hover ? "#991B1B" : "rgba(248,113,113,0.15)", color: active ? T.bg : T.red, border: `1px solid ${T.red}44`, shadow: "none" },
    }[variant];
    return (
        <button onClick={onClick} disabled={disabled}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => { setHover(false); setActive(false); }}
            onMouseDown={() => setActive(true)}
            onMouseUp={() => setActive(false)}
            style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: sizes.gap, padding: `${sizes.py}px ${sizes.px}px`,
                width: full ? "100%" : "auto", borderRadius: T.r8,
                background: variants.bg, color: variants.color,
                border: variants.border, boxShadow: variants.shadow,
                fontSize: sizes.fs, fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
                whiteSpace: "nowrap", fontFamily: "inherit",
                transform: active ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)",
                letterSpacing: "0.005em", position: "relative", overflow: "hidden",
            }}>
            {variant === "primary" && !active && (
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "50%",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.15), transparent)",
                    pointerEvents: "none"
                }} />
            )}
            {icon && <Icon name={icon} size={sizes.ih} />}
            <span style={{ position: "relative" }}>{children}</span>
            {iconRight && <Icon name={iconRight} size={sizes.ih} />}
        </button>
    );
}

export function Badge({ status }) {
    const s = statusCfg[status] || statusCfg.pending;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: T.r20,
            background: s.bg, color: s.color, fontSize: 11, fontWeight: 600,
            border: `1px solid ${s.color}22`,
        }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
            {s.label}
        </span>
    );
}

export function PlatformBadge({ platform }) {
    const cfg = {
        woo: { label: "WooCommerce", c: T.j300, bg: "rgba(92,168,124,0.15)" },
        daraz: { label: "Daraz", c: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
        shopify: { label: "Shopify", c: "#10B981", bg: "rgba(16,185,129,0.12)" },
    }[platform];
    return (
        <span style={{
            padding: "2px 8px", borderRadius: T.r4,
            background: cfg.bg, color: cfg.c,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
            textTransform: "uppercase", border: `1px solid ${cfg.c}22`,
        }}>{cfg.label}</span>
    );
}

export function Card({ children, style, pad = 20, glow }) {
    return (
        <div style={{
            background: T.gradCard, border: `1px solid ${T.border}`,
            borderRadius: T.r12, padding: pad,
            boxShadow: glow ? T.glowGreen : T.shadow,
            position: "relative", overflow: "hidden",
            ...style,
        }}>{children}</div>
    );
}

export function KPI({ label, value, sub, delta, deltaUp, icon, highlight }) {
    return (
        <div style={{
            background: T.gradCard,
            border: `1px solid ${highlight ? T.borderBright : T.border}`,
            borderRadius: T.r12, padding: "18px 20px",
            position: "relative", overflow: "hidden",
            transition: "all 0.2s", cursor: "default",
            boxShadow: highlight ? T.glowGreen : T.shadow,
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderBright; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = highlight ? T.borderBright : T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{
                position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(92,168,124,0.15), transparent 70%)", pointerEvents: "none"
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.textFaint, fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</div>
                    {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>{sub}</div>}
                </div>
                {icon && (
                    <div style={{
                        width: 38, height: 38, borderRadius: T.r10, background: T.gradBtn,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, boxShadow: T.glowBtn
                    }}>
                        <Icon name={icon} size={17} color="#fff" />
                    </div>
                )}
            </div>
            {delta && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: T.r4,
                        fontSize: 11, fontWeight: 700, background: deltaUp ? T.greenBg : T.redBg, color: deltaUp ? T.green : T.red
                    }}>
                        {deltaUp ? "↑" : "↓"} {delta}
                    </span>
                    <span style={{ fontSize: 11, color: T.textFaint }}>vs last period</span>
                </div>
            )}
        </div>
    );
}

export function ChartTip({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: T.bgElev, border: `1px solid ${T.borderBright}`,
            borderRadius: T.r10, padding: "10px 14px", boxShadow: T.shadowLg
        }}>
            <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 7, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
            {payload.map((pp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: pp.color }} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>{pp.name}:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                        {formatter ? formatter(pp.value) : pp.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function PageHeader({ title, subtitle, actions }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.6px", lineHeight: 1.1 }}>{title}</h1>
                {subtitle && <p style={{ fontSize: 13, color: T.textMuted, margin: "6px 0 0" }}>{subtitle}</p>}
            </div>
            {actions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>}
        </div>
    );
}
