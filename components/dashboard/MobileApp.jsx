"use client";
import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

// ═══ DESIGN TOKENS ═════════════════════════════════════════════════════════
const T = {
  bg: "#0A1C16", bgCard: "#122720", bgElev: "#17332A", bgHigh: "#1D4033", bgActive: "#244D3E",
  text: "#F0FDF4", textSub: "#A7F3D0", textMuted: "#6EE7B7", textFaint: "#3F9B7A", textGhost: "#2D6A4F",
  j50: "#E8F5EC", j100: "#B7E5BA", j200: "#8FD4A4", j300: "#5CA87C", j400: "#3D8A5F", j500: "#288760", j600: "#1A5140", j700: "#112E24",
  gradBtn: "linear-gradient(135deg, #5CA87C 0%, #3D8A5F 100%)",
  gradBtnActive: "linear-gradient(135deg, #FFFFFF 0%, #E8F5EC 100%)",
  gradCard: "linear-gradient(145deg, #17332A 0%, #122720 100%)",
  gradHero: "linear-gradient(135deg, #5CA87C 0%, #288760 50%, #1A5140 100%)",
  gradSuccess: "linear-gradient(135deg, #4ADE80 0%, #22A55C 100%)",
  gradLogoTile: "linear-gradient(135deg, #3D8A5F 0%, #1A5140 100%)",
  gradMesh: "radial-gradient(circle at 20% 10%, rgba(92,168,124,0.15), transparent 40%), radial-gradient(circle at 80% 80%, rgba(143,212,164,0.1), transparent 40%)",
  green: "#4ADE80", greenBg: "rgba(74,222,128,0.12)",
  yellow: "#FBBF24", yellowBg: "rgba(251,191,36,0.12)",
  red: "#F87171", redBg: "rgba(248,113,113,0.12)",
  blue: "#60A5FA", blueBg: "rgba(96,165,250,0.12)",
  purple: "#A78BFA",
  border: "rgba(92,168,124,0.12)",
  borderMid: "rgba(92,168,124,0.25)",
  borderBright: "rgba(92,168,124,0.45)",
  glowBtn: "0 4px 14px rgba(92,168,124,0.35), 0 1px 2px rgba(0,0,0,0.15)",
  glowBtnHover: "0 8px 28px rgba(92,168,124,0.5), 0 2px 4px rgba(0,0,0,0.2)",
  glowGreen: "0 0 0 1px rgba(92,168,124,0.3), 0 0 32px rgba(92,168,124,0.25)",
  shadow: "0 2px 8px rgba(0,0,0,0.25)",
  shadowMd: "0 8px 24px rgba(0,0,0,0.35)",
  shadowLg: "0 20px 60px rgba(0,0,0,0.6)",
};

// Inject animations once
if (typeof document !== "undefined" && !document.getElementById("zyro-anim")) {
  const s = document.createElement("style");
  s.id = "zyro-anim";
  s.textContent = `
    @keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes scaleIn{from{transform:scale(0.95);opacity:0;}to{transform:scale(1);opacity:1;}}
    @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    @keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}
    @keyframes ringPulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,0.6);}70%{box-shadow:0 0 0 12px rgba(74,222,128,0);}100%{box-shadow:0 0 0 0 rgba(74,222,128,0);}}
    @keyframes checkmark{0%{stroke-dashoffset:30;}100%{stroke-dashoffset:0;}}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    .skeleton{background:linear-gradient(90deg,rgba(92,168,124,0.05) 0%,rgba(92,168,124,0.12) 50%,rgba(92,168,124,0.05) 100%);background-size:200% 100%;animation:shimmer 1.5s infinite;}
    *{-webkit-tap-highlight-color:transparent;}
    input,textarea{-webkit-user-select:text;user-select:text;}
    ::-webkit-scrollbar{width:0;height:0;}
  `;
  document.head.appendChild(s);
}

// Haptic-style feedback helper (visual)
const haptic = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
};

// ═══ PHONE FRAME ════════════════════════════════════════════════════════════
function PhoneFrame({ children }) {
  return (
    <div style={{
      height: "100dvh", width: "100%",
      background: T.bg,
      fontFamily: "'Plus Jakarta Sans', 'Nunito', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      {children}
    </div>
  );
}

// ═══ LOGO ═══════════════════════════════════════════════════════════════════
function ZyroLogo({ size = 28, showText = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.2,
        background: T.gradLogoTile, border: `1px solid ${T.borderMid}`,
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 30% 25%, rgba(143,212,164,0.22), transparent 60%)",
        }} />
        <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 100 100"
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
          <path d="M 22 32 L 58 24" stroke={T.j200} strokeWidth={7} strokeLinecap="round" fill="none" />
          <path d="M 58 28 Q 55 30 50 40 Q 42 54 34 66 Q 30 72 26 76" stroke={T.j200} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 26 76 L 66 70" stroke={T.j200} strokeWidth={7} strokeLinecap="round" fill="none" />
          <circle cx="64" cy="14" r={4.5} fill={T.j200} />
        </svg>
      </div>
      {showText && (
        <span style={{
          fontSize: size * 0.62, fontWeight: 700, color: T.text,
          letterSpacing: "-0.02em", fontFamily: "'Nunito', sans-serif",
        }}>zyro</span>
      )}
    </div>
  );
}

// ═══ ICONS ═════════════════════════════════════════════════════════════════
function Icon({ name, size = 22, color = "currentColor" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    home: <svg {...p}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 002 2h3m6 0h3a2 2 0 002-2V10m-9 12V12" /></svg>,
    orders: <svg {...p}><path d="M6 2h12l3 5v14a2 2 0 01-2 2H5a2 2 0 01-2-2V7l3-5z" /><path d="M3 7h18M8 11h8M8 15h5" /></svg>,
    whatsapp: <svg {...p}><path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.3-4.5A9 9 0 1121 12z" /></svg>,
    marketing: <svg {...p}><path d="M3 13l5-5 4 4 8-8" /><path d="M14 4h7v7" /></svg>,
    more: <svg {...p}><circle cx="6" cy="12" r="1.5" fill={color} /><circle cx="12" cy="12" r="1.5" fill={color} /><circle cx="18" cy="12" r="1.5" fill={color} /></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
    bell: <svg {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>,
    plus: <svg {...p}><path d="M12 5v14M5 12h14" /></svg>,
    arrow: <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
    back: <svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
    close: <svg {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>,
    check: <svg {...p}><path d="M20 6L9 17l-5-5" /></svg>,
    chevron: <svg {...p}><path d="M9 6l6 6-6 6" /></svg>,
    chevronDown: <svg {...p}><path d="M6 9l6 6 6-6" /></svg>,
    filter: <svg {...p}><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" /></svg>,
    sparkle: <svg {...p}><path d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 3z" /></svg>,
    bot: <svg {...p}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></svg>,
    headset: <svg {...p}><path d="M3 18v-6a9 9 0 0118 0v6" /><path d="M21 19a2 2 0 01-2 2h-1v-7h3v5zM3 19a2 2 0 002 2h1v-7H3v5z" /></svg>,
    truck: <svg {...p}><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
    pkg: <svg {...p}><path d="M16.5 9.4L7.5 4.2M21 16V8l-9-5-9 5v8l9 5 9-5zM3.3 7l8.7 5 8.7-5M12 22V12" /></svg>,
    pin: <svg {...p}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    send: <svg {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
    dollar: <svg {...p}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
    cart: <svg {...p}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" /></svg>,
    trending: <svg {...p}><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg>,
    alert: <svg {...p}><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" /></svg>,
    inventory: <svg {...p}><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" /><path d="M12 2v20M21 7l-9 5-9-5" /></svg>,
    customers: <svg {...p}><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a5 5 0 015-5h2a5 5 0 015 5v2" /></svg>,
    settings: <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8L7 17M17 7l2.8-2.8" /></svg>,
    sun: <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></svg>,
    moon: <svg {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>,
    phone: <svg {...p}><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0122 16.9z" /></svg>,
    gift: <svg {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 000-5C13 3 12 8 12 8" /></svg>,
    lightning: <svg {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    info: <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    star: <svg {...p}><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8l-6.2 3.2 1.2-6.8-5-4.9 6.9-1z" /></svg>,
    heart: <svg {...p}><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.8z" /></svg>,
    meta: <svg {...p} viewBox="0 0 24 24"><path d="M6.9 4c-1.97 0-3.68 1.28-4.87 3.11C.7 9.21 0 11.87 0 14.37c0 .57.03 1.14.08 1.7.14 1.42.88 2.59 2.22 3.07 1.38.5 2.87.08 4.13-1.02 1.13-.99 2.2-2.45 3.3-4.34.39-.67.72-1.3 1.06-1.96.09-.18.18-.35.27-.54 1.45-2.82 2.82-4.89 4.44-4.89.92 0 1.74.53 2.44 1.49.69.95 1.2 2.27 1.58 3.77.31 1.22.53 2.58.63 3.99.02.32.04.64.04.96 0 .25-.01.49-.02.73-.04 1.16-.27 2.26-.66 3.18-.41.98-1 1.76-1.71 2.3-.71.53-1.5.8-2.3.8-.9 0-1.8-.34-2.58-.97-.77-.61-1.42-1.45-1.9-2.44l-.04-.09c-.17-.34-.32-.7-.48-1.05-.18-.41-.37-.84-.56-1.3-.23-.53-.46-1.09-.7-1.65l-.07-.16c-.27-.61-.54-1.23-.82-1.87-.36-.82-.73-1.64-1.1-2.44C10.62 8.07 9.86 6.55 9.07 5.21 9.01 5.01 7.99 4 6.9 4z" fill={color} stroke="none" /></svg>,
    google: <svg {...p} viewBox="0 0 24 24"><path d="M22 12.1c0-.7-.1-1.4-.2-2H12v3.8h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z" fill="#4285F4" stroke="none" /><path d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7C4.5 19.9 8 22 12 22z" fill="#34A853" stroke="none" /><path d="M6.2 13.6c-.2-.6-.3-1.3-.3-2 0-.7.1-1.4.3-2V6.9H2.7C2 8.4 1.5 10.1 1.5 12s.5 3.6 1.2 5.1l3.5-2.7z" fill="#FBBC05" stroke="none" /><path d="M12 5.8c1.5 0 2.9.5 4 1.5l3-3C17.2 2.6 14.8 1.5 12 1.5 8 1.5 4.5 3.6 2.7 6.9l3.5 2.7c.8-2.5 3.1-4.3 5.8-4.3z" fill="#EA4335" stroke="none" /></svg>,
  };
  return icons[name] || null;
}

// ═══ PRIMITIVES ═════════════════════════════════════════════════════════════
function TouchButton({ children, onClick, variant = "primary", size = "md", icon, iconRight, full, disabled, loading }) {
  const [active, setActive] = useState(false);
  const sizes = {
    sm: { py: 10, px: 14, fs: 13, gap: 6, ih: 14, minH: 40 },
    md: { py: 13, px: 18, fs: 14, gap: 7, ih: 16, minH: 46 },
    lg: { py: 16, px: 22, fs: 15, gap: 8, ih: 18, minH: 52 },
  }[size];
  const variants = {
    primary: { bg: active ? T.gradBtnActive : T.gradBtn, color: active ? T.bg : "#fff", border: "none", shadow: active ? "none" : T.glowBtn },
    secondary: { bg: active ? T.gradBtnActive : T.bgElev, color: active ? T.bg : T.text, border: `1px solid ${T.borderMid}`, shadow: "none" },
    ghost: { bg: active ? T.bgActive : "transparent", color: T.textSub, border: "none", shadow: "none" },
  }[variant];
  const handle = (fn) => { haptic(); fn && fn(); };
  return (
    <button onClick={() => handle(onClick)} disabled={disabled || loading}
      onTouchStart={() => setActive(true)} onTouchEnd={() => setActive(false)}
      onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)} onMouseLeave={() => setActive(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: sizes.gap, padding: `${sizes.py}px ${sizes.px}px`,
        width: full ? "100%" : "auto", borderRadius: 14,
        background: variants.bg, color: variants.color, border: variants.border,
        boxShadow: variants.shadow, fontSize: sizes.fs, fontWeight: 700,
        cursor: "pointer", opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
        fontFamily: "inherit", minHeight: sizes.minH,
        transform: active ? "scale(0.96)" : "scale(1)",
        position: "relative", overflow: "hidden", letterSpacing: "0.005em",
      }}>
      {variant === "primary" && !active && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.18), transparent)",
          pointerEvents: "none",
        }} />
      )}
      {loading ? (
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          border: `2px solid ${variant === "primary" ? "rgba(255,255,255,0.3)" : T.borderMid}`,
          borderTopColor: variant === "primary" ? "#fff" : T.j300,
          animation: "spin 0.7s linear infinite",
        }} />
      ) : (
        <>
          {icon && <Icon name={icon} size={sizes.ih} />}
          <span style={{ position: "relative" }}>{children}</span>
          {iconRight && <Icon name={iconRight} size={sizes.ih} />}
        </>
      )}
    </button>
  );
}

function Badge({ label, color, bg, icon }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 20,
      background: bg, color, fontSize: 11, fontWeight: 700,
      border: `1px solid ${color}33`,
    }}>
      {icon ? <Icon name={icon} size={10} color={color} /> : (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      )}
      {label}
    </span>
  );
}

const statusBadge = (status) => {
  const cfg = {
    pending: { label: "Pending", bg: T.yellowBg, color: T.yellow },
    confirmed: { label: "Confirmed", bg: T.blueBg, color: T.blue },
    shipped: { label: "Shipped", bg: "rgba(92,168,124,0.15)", color: T.j200 },
    delivered: { label: "Delivered", bg: T.greenBg, color: T.green },
    returned: { label: "Returned", bg: T.redBg, color: T.red },
  }[status] || { label: status, bg: T.bgElev, color: T.textMuted };
  return <Badge {...cfg} />;
};

// Progress ring component
function ProgressRing({ value, size = 80, stroke = 6, color = T.j300, trackColor = T.border, label, sub }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: size * 0.26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: T.textFaint, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Sparkline tiny chart
function Sparkline({ data, color = T.j300, height = 28 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data.map((v, i) => ({ i, v }))}>
        <defs>
          <linearGradient id={`spk-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#spk-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ═══ STATUS BAR ════════════════════════════════════════════════════════════
function StatusBar() {
  return (
    <div style={{
      height: 54, paddingTop: 16,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 28px 0", fontSize: 15, fontWeight: 700, color: T.text,
      flexShrink: 0, letterSpacing: "-0.2px",
    }}>
      <span>9:41</span>
      <div style={{ width: 120 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" fill={T.text} rx="0.5" /><rect x="4.5" y="5" width="3" height="6" fill={T.text} rx="0.5" /><rect x="9" y="2.5" width="3" height="8.5" fill={T.text} rx="0.5" /><rect x="13.5" y="0" width="3" height="11" fill={T.text} rx="0.5" /></svg>
        <svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 10.5l2-2c-.5-.5-1.2-.8-2-.8s-1.5.3-2 .8l2 2z" fill={T.text} /><path d="M8 7c1.1 0 2.1.4 2.9 1.1l1.4-1.4C11 5.7 9.5 5 8 5s-3 .7-4.3 1.7l1.4 1.4c.8-.7 1.8-1.1 2.9-1.1z" fill={T.text} /><path d="M8 4c2 0 3.9.8 5.3 2.1l1.4-1.4C12.9 3 10.5 2 8 2S3.1 3 1.3 4.7l1.4 1.4C4.1 4.8 6 4 8 4z" fill={T.text} /></svg>
        <div style={{
          width: 26, height: 12, border: `1.5px solid ${T.text}`, borderRadius: 3,
          padding: 1, position: "relative",
        }}>
          <div style={{ width: "80%", height: "100%", background: T.text, borderRadius: 1 }} />
          <div style={{ position: "absolute", right: -3, top: 3, width: 2, height: 4, background: T.text, borderRadius: "0 1px 1px 0" }} />
        </div>
      </div>
    </div>
  );
}

// ═══ TOP HEADER ════════════════════════════════════════════════════════════
function TopHeader({ title, subtitle, showBack, onBack, rightAction, showLogo }) {
  return (
    <div style={{
      padding: "10px 20px 14px",
      borderBottom: `1px solid ${T.border}`,
      background: T.bgCard,
      display: "flex", alignItems: "center", gap: 12,
      flexShrink: 0,
    }}>
      {showBack && (
        <button onClick={() => { haptic(); onBack && onBack(); }} style={{
          width: 40, height: 40, borderRadius: 12,
          background: T.bgElev, border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}>
          <Icon name="back" size={18} color={T.text} />
        </button>
      )}
      {showLogo && !showBack && <ZyroLogo size={30} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>{title}</div>}
        {subtitle && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {rightAction}
    </div>
  );
}

// ═══ BOTTOM TAB BAR (FLOATING PILL STYLE) ═══════════════════════════════════
function BottomTabBar({ active, setActive, openMore }) {
  const tabs = [
    { id: "home", label: "Home", icon: "home" },
    { id: "orders", label: "Orders", icon: "orders", badge: 4 },
    { id: "whatsapp", label: "Chat", icon: "whatsapp", badge: 2, alert: true },
    { id: "marketing", label: "Growth", icon: "marketing" },
    { id: "more", label: "More", icon: "more", isMore: true },
  ];
  return (
    <div style={{
      padding: "8px 16px 24px",
      background: "linear-gradient(180deg, transparent 0%, rgba(10,28,22,0.95) 40%)",
      flexShrink: 0,
    }}>
      <div style={{
        background: "rgba(23,51,42,0.85)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderRadius: 22,
        border: `1px solid ${T.border}`,
        padding: 6,
        display: "flex", justifyContent: "space-around",
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
      }}>
        {tabs.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { haptic(); tab.isMore ? openMore() : setActive(tab.id); }}
              style={{
                flex: 1, padding: "10px 6px",
                background: isActive ? T.gradBtn : "none",
                border: "none", borderRadius: 16,
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                position: "relative", boxShadow: isActive ? T.glowBtn : "none",
                minHeight: 52,
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon name={tab.icon} size={22} color={isActive ? "#fff" : T.textFaint} />
                {tab.badge && !isActive && (
                  <span style={{
                    position: "absolute", top: -3, right: -8,
                    minWidth: 16, height: 16, padding: "0 4px",
                    borderRadius: 8, background: tab.alert ? T.red : T.j300,
                    color: "#fff", fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${T.bgCard}`,
                  }}>{tab.badge}</span>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isActive ? "#fff" : T.textFaint,
                letterSpacing: "0.01em",
              }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════
function HomePage({ setActive }) {
  const [greet] = useState(() => {
    const hr = new Date().getHours();
    if (hr < 12) return { text: "Good morning", emoji: "☀️", icon: "sun" };
    if (hr < 17) return { text: "Good afternoon", emoji: "👋", icon: "sun" };
    return { text: "Good evening", emoji: "🌙", icon: "moon" };
  });

  const salesData = [
    { day: "M", value: 42 }, { day: "T", value: 38 }, { day: "W", value: 55 },
    { day: "T", value: 49 }, { day: "F", value: 72 }, { day: "S", value: 88 }, { day: "S", value: 65 },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
      {/* Greeting header */}
      <div style={{ padding: "6px 20px 18px", background: T.bgCard, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <ZyroLogo size={28} />
          <div style={{ display: "flex", gap: 8 }}>
            <button aria-label="Search" style={{
              width: 40, height: 40, borderRadius: 12,
              background: T.bgElev, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}><Icon name="search" size={18} color={T.textMuted} /></button>
            <button aria-label="Notifications" style={{
              width: 40, height: 40, borderRadius: 12,
              background: T.bgElev, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
            }}>
              <Icon name="bell" size={18} color={T.textMuted} />
              <span style={{
                position: "absolute", top: 8, right: 8,
                width: 8, height: 8, borderRadius: "50%",
                background: T.red, border: `2px solid ${T.bgElev}`,
                animation: "ringPulse 2s infinite",
              }} />
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{greet.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: T.textMuted }}>{greet.text}, Ahmad</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>
              Your store's on fire today 🔥
            </div>
          </div>
        </div>
      </div>

      {/* Hero revenue card with target ring */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{
          background: T.gradHero, borderRadius: 22, padding: 20,
          position: "relative", overflow: "hidden",
          boxShadow: T.shadowLg,
        }}>
          <div style={{
            position: "absolute", top: -50, right: -50,
            width: 180, height: 180, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%)",
          }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                padding: "4px 10px", borderRadius: 20,
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(8px)", width: "fit-content",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: "0.1em" }}>LIVE</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                Today's Revenue
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "-0.8px", lineHeight: 1 }}>
                Rs 142,300
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                marginTop: 8, padding: "3px 8px",
                background: "rgba(255,255,255,0.18)", borderRadius: 20,
                backdropFilter: "blur(8px)",
              }}>
                <Icon name="trending" size={11} color="#fff" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>+18.4% vs yesterday</span>
              </div>
            </div>
            {/* Target ring */}
            <div style={{ textAlign: "center" }}>
              <ProgressRing
                value={67} size={76} stroke={5}
                color="#fff" trackColor="rgba(255,255,255,0.2)"
                label="67%" sub={null}
              />
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Daily Goal
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.15)",
            display: "flex", justifyContent: "space-between",
          }}>
            {[
              { label: "Orders", value: "47", icon: "cart" },
              { label: "AOV", value: "Rs 3,027", icon: "dollar" },
              { label: "Visitors", value: "1,842", icon: "customers" },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                <Icon name={s.icon} size={14} color="rgba(255,255,255,0.7)" />
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart suggestion card */}
      <div style={{ padding: "14px 20px 0" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(92,168,124,0.15) 0%, rgba(26,81,64,0.2) 100%)",
          border: `1px solid ${T.borderBright}`,
          borderRadius: 18, padding: 14,
          display: "flex", alignItems: "flex-start", gap: 12,
          boxShadow: T.glowGreen,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: T.gradBtn,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: T.glowBtn, flexShrink: 0,
          }}>
            <Icon name="sparkle" size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: T.j200, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                AI Suggestion
              </span>
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: T.greenBg, color: T.green, fontWeight: 700, border: `1px solid ${T.green}33` }}>
                NEW
              </span>
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontWeight: 500 }}>
              Move <b style={{ color: T.j200 }}>Rs 13k</b> from "Cold Audience" to "Eid Sale" — could earn you <b style={{ color: T.green }}>+Rs 41k</b> today
            </div>
            <button style={{
              marginTop: 10, padding: "6px 12px", borderRadius: 10,
              background: T.gradBtn, border: "none", color: "#fff",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 4,
              boxShadow: T.glowBtn,
            }}>
              Apply now <Icon name="arrow" size={11} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      {/* Alert strip - tap to review */}
      <div style={{ padding: "14px 20px 0" }}>
        <button style={{
          width: "100%",
          background: "linear-gradient(90deg, rgba(251,191,36,0.1) 0%, transparent 100%)",
          border: `1px solid rgba(251,191,36,0.3)`,
          borderRadius: 14, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
          fontFamily: "inherit",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(251,191,36,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name="alert" size={16} color={T.yellow} />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>3 things need you</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Tap to review and act</div>
          </div>
          <Icon name="chevron" size={16} color={T.textFaint} />
        </button>
      </div>

      {/* Mini stat grid with sparklines */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: "-0.2px" }}>
            Today at a glance
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Pending", value: "12", color: T.yellow, sparkline: [3, 5, 8, 12, 10, 9, 12], onClick: () => setActive("orders") },
            { label: "AI Rate", value: "94%", color: T.green, sparkline: [88, 91, 89, 92, 93, 94, 94], onClick: () => setActive("whatsapp") },
            { label: "COD Due", value: "Rs 38k", color: T.blue, sparkline: [20, 25, 28, 32, 35, 37, 38] },
            { label: "ROAS", value: "3.2x", color: T.purple, sparkline: [2.4, 2.6, 2.8, 3.0, 3.1, 3.2, 3.2], onClick: () => setActive("marketing") },
          ].map(k => (
            <button key={k.label} onClick={() => { haptic(); k.onClick && k.onClick(); }} style={{
              background: T.gradCard, border: `1px solid ${T.border}`,
              borderRadius: 16, padding: 14,
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              transition: "transform 0.12s",
            }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginTop: 4, letterSpacing: "-0.4px" }}>{k.value}</div>
                </div>
                <div style={{
                  padding: "2px 6px", borderRadius: 20,
                  background: `${k.color}22`, border: `1px solid ${k.color}33`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: k.color, boxShadow: `0 0 4px ${k.color}` }} />
                </div>
              </div>
              <Sparkline data={k.sparkline} color={k.color} height={24} />
            </button>
          ))}
        </div>
      </div>

      {/* Weekly trend */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{
          background: T.gradCard, border: `1px solid ${T.border}`,
          borderRadius: 18, padding: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>This Week</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Saturday was your best day</div>
            </div>
            <Badge label="+23%" bg={T.greenBg} color={T.green} icon="trending" />
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={salesData}>
              <defs>
                <linearGradient id="hb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.j300} stopOpacity={1} />
                  <stop offset="100%" stopColor={T.j500} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: T.textFaint }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Bar dataKey="value" fill="url(#hb)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions grid */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: "-0.2px", marginBottom: 10 }}>
          Quick actions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "truck", label: "Book Couriers", sub: "12 pending", color: T.j300, onClick: () => setActive("orders") },
            { icon: "check", label: "Confirm", sub: "4 awaiting", color: T.yellow, onClick: () => setActive("orders") },
            { icon: "pkg", label: "Restock", sub: "2 low stock", color: T.green, onClick: () => setActive("inventory") },
            { icon: "whatsapp", label: "Reply Chat", sub: "3 escalated", color: T.red, onClick: () => setActive("whatsapp") },
          ].map(a => (
            <button key={a.label} onClick={() => { haptic(); a.onClick && a.onClick(); }} style={{
              background: T.gradCard, border: `1px solid ${T.border}`,
              borderRadius: 16, padding: 14, textAlign: "left",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", gap: 10,
              transition: "transform 0.12s",
              position: "relative", overflow: "hidden",
            }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{
                position: "absolute", top: -20, right: -20,
                width: 60, height: 60, borderRadius: "50%",
                background: `radial-gradient(circle, ${a.color}22, transparent 70%)`,
              }} />
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: `${a.color}22`, border: `1px solid ${a.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <Icon name={a.icon} size={18} color={a.color} />
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{a.label}</div>
                <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: "-0.2px" }}>
            Recent activity
          </div>
          <button onClick={() => setActive("orders")} style={{
            background: "none", border: "none", color: T.j300,
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 3,
          }}>
            See all <Icon name="arrow" size={12} color={T.j300} />
          </button>
        </div>
        <div style={{
          background: T.gradCard, border: `1px solid ${T.border}`,
          borderRadius: 16, overflow: "hidden",
        }}>
          {[
            { customer: "Ahmed Raza", city: "Karachi", amount: 3490, status: "shipped", time: "2m" },
            { customer: "Sara Khan", city: "Lahore", amount: 1890, status: "pending", time: "14m" },
            { customer: "Ali Hassan", city: "Islamabad", amount: 5200, status: "confirmed", time: "31m" },
          ].map((o, i, arr) => (
            <div key={i} style={{
              padding: "13px 14px",
              borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: T.j100, flexShrink: 0,
                border: `1px solid ${T.borderMid}`,
              }}>{o.customer.split(" ").map(w => w[0]).join("")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{o.customer}</div>
                <div style={{ fontSize: 11, color: T.textFaint }}>{o.city} · {o.time} ago</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Rs {o.amount.toLocaleString()}</div>
                <div style={{ marginTop: 3 }}>{statusBadge(o.status)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Celebration footer */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(92,168,124,0.08) 100%)",
          border: `1px solid rgba(167,139,250,0.2)`,
          borderRadius: 16, padding: 14,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 24 }}>🎉</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>You saved 4 hours today</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Thanks to Zyro AI handling chats & couriers</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDERS PAGE
// ═══════════════════════════════════════════════════════════════════════════
function OrdersPage() {
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState(null);

  const orders = [
    { id: "WC-1042", customer: "Ahmed Raza", city: "Karachi", amount: 3490, status: "shipped", platform: "Woo", time: "2m", items: 3, courier: "TCS", cn: "779416038409" },
    { id: "WC-1041", customer: "Sara Khan", city: "Lahore", amount: 1890, status: "pending", platform: "Woo", time: "14m", items: 1 },
    { id: "DRZ-2891", customer: "Ali Hassan", city: "Islamabad", amount: 5200, status: "confirmed", platform: "Daraz", time: "31m", items: 2 },
    { id: "WC-1040", customer: "Fatima Malik", city: "Faisalabad", amount: 2100, status: "delivered", platform: "Woo", time: "1h", items: 1, courier: "TCS", cn: "779416038401" },
    { id: "WC-1039", customer: "Usman Sheikh", city: "Multan", amount: 4800, status: "returned", platform: "Woo", time: "3h", items: 4 },
    { id: "SH-0832", customer: "Bilal Anwar", city: "Rawalpindi", amount: 7890, status: "shipped", platform: "Shopify", time: "5h", items: 5, courier: "TCS" },
  ];
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const filters = [
    { id: "all", label: "All", count: 47, emoji: "📦" },
    { id: "pending", label: "Pending", count: 4, color: T.yellow, emoji: "⏳" },
    { id: "confirmed", label: "Confirmed", count: 8, color: T.blue, emoji: "✅" },
    { id: "shipped", label: "Shipped", count: 12, color: T.j200, emoji: "🚚" },
    { id: "delivered", label: "Delivered", count: 179, color: T.green, emoji: "🎉" },
    { id: "returned", label: "Returned", count: 6, color: T.red, emoji: "↩️" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopHeader
        title="Orders" subtitle="47 today · Rs 142,300" showLogo
        rightAction={
          <button onClick={haptic} aria-label="New order" style={{
            width: 40, height: 40, borderRadius: 12, background: T.gradBtn,
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: T.glowBtn,
          }}><Icon name="plus" size={18} color="#fff" /></button>
        }
      />

      {/* Search */}
      <div style={{ padding: "12px 20px 0", background: T.bgCard }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: T.bgElev, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: "11px 14px",
        }}>
          <Icon name="search" size={16} color={T.textFaint} />
          <input placeholder="Search orders, customers..." style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 14, color: T.text, fontFamily: "inherit",
          }} />
          <button style={{
            background: T.bgHigh, border: "none", borderRadius: 8,
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <Icon name="filter" size={14} color={T.textMuted} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{
        padding: "14px 0 12px", background: T.bgCard,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          display: "flex", gap: 8, overflowX: "auto",
          padding: "0 20px", scrollbarWidth: "none",
        }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => { haptic(); setFilter(f.id); }}
              style={{
                padding: "9px 14px", borderRadius: 22,
                background: filter === f.id ? T.gradBtn : T.bgElev,
                border: `1px solid ${filter === f.id ? "transparent" : T.border}`,
                color: filter === f.id ? "#fff" : T.textMuted,
                fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 7,
                boxShadow: filter === f.id ? T.glowBtn : "none",
                flexShrink: 0, transition: "all 0.2s",
              }}>
              <span style={{ fontSize: 14 }}>{f.emoji}</span>
              {f.label}
              <span style={{
                padding: "1px 7px", borderRadius: 10,
                background: filter === f.id ? "rgba(255,255,255,0.25)" : T.bgHigh,
                fontSize: 10, fontWeight: 800,
                color: filter === f.id ? "#fff" : T.textFaint,
              }}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 20px" }}>
        {filtered.length === 0 ? (
          <EmptyState icon="pkg" title="No orders here" message="Try another filter above" />
        ) : (
          filtered.map(o => (
            <button key={o.id} onClick={() => { haptic(); setDetail(o); }} style={{
              width: "100%", padding: "14px 20px",
              background: "none", border: "none",
              borderBottom: `1px solid ${T.border}`,
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              display: "flex", alignItems: "center", gap: 12,
              transition: "background 0.15s",
            }}
              onTouchStart={e => e.currentTarget.style.background = "rgba(92,168,124,0.06)"}
              onTouchEnd={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: T.j100, flexShrink: 0,
                border: `1px solid ${T.borderMid}`,
              }}>{o.customer.split(" ").map(w => w[0]).join("")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3 }}>{o.customer}</div>
                <div style={{ fontSize: 11, color: T.textFaint, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: "monospace", color: T.j300, fontWeight: 600 }}>{o.id}</span>
                  <span>·</span><span>{o.city}</span><span>·</span><span>{o.time}</span>
                </div>
                <div style={{ marginTop: 6 }}>{statusBadge(o.status)}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>
                  Rs {o.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: T.textFaint, marginTop: 2 }}>{o.items} items</div>
              </div>
              <Icon name="chevron" size={16} color={T.textFaint} />
            </button>
          ))
        )}
      </div>

      {detail && <OrderDetailSheet order={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function EmptyState({ icon, title, message, cta }) {
  return (
    <div style={{
      padding: "60px 30px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: T.bgElev, border: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        <Icon name={icon} size={30} color={T.textFaint} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>{message}</div>
      {cta}
    </div>
  );
}

function OrderDetailSheet({ order, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirming(true);
    setTimeout(() => { setConfirming(false); setConfirmed(true); }, 1200);
  };

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-end",
      zIndex: 200, animation: "fadeIn 0.25s",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", background: T.bgCard,
        borderRadius: "28px 28px 0 0",
        paddingBottom: 20, maxHeight: "88%", overflowY: "auto",
        boxShadow: T.shadowLg,
        animation: "slideUp 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ padding: "12px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: T.borderMid }} />
        </div>

        <div style={{ padding: "10px 20px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: T.j300 }}>{order.id}</div>
            <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>{order.platform} · {order.time} ago</div>
          </div>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.bgElev, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <Icon name="close" size={16} color={T.textMuted} />
          </button>
        </div>

        {confirmed && (
          <div style={{ padding: "16px 20px 0", animation: "scaleIn 0.4s" }}>
            <div style={{
              background: T.gradSuccess, borderRadius: 16, padding: 16,
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 8px 24px rgba(74,222,128,0.35)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "ringPulse 1.5s infinite",
              }}>
                <Icon name="check" size={22} color={T.green} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Order confirmed! 🎉</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 2 }}>Customer notified on WhatsApp</div>
              </div>
            </div>
          </div>
        )}

        {/* Customer */}
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{
            background: T.bgElev, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 14,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: T.j100,
              border: `1px solid ${T.borderMid}`,
            }}>{order.customer.split(" ").map(w => w[0]).join("")}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{order.customer}</div>
              <div style={{ fontSize: 12, color: T.textFaint, display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                <Icon name="pin" size={11} color={T.textFaint} /> {order.city}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button aria-label="WhatsApp" style={{
                  padding: "6px 10px", borderRadius: 8,
                  background: T.greenBg, border: `1px solid ${T.green}44`,
                  color: T.green, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Icon name="whatsapp" size={11} color={T.green} /> Chat
                </button>
                <button aria-label="Call" style={{
                  padding: "6px 10px", borderRadius: 8,
                  background: T.blueBg, border: `1px solid ${T.blue}44`,
                  color: T.blue, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Icon name="phone" size={11} color={T.blue} /> Call
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Status</div>
          {statusBadge(order.status)}
        </div>

        {/* Details */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Details</div>
          <div style={{ background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: 14 }}>
            {[
              ["Amount", `Rs ${order.amount.toLocaleString()}`, T.text, true],
              ["Items", `${order.items} products`, T.text],
              ["Courier", order.courier || "Not assigned", order.courier ? T.text : T.textFaint],
              ["Tracking", order.cn || "—", order.cn ? T.j200 : T.textFaint, false, true],
            ].map(([k, v, c, bold, mono], i, a) => (
              <div key={k} style={{
                padding: "13px 14px",
                borderBottom: i < a.length - 1 ? `1px solid ${T.border}` : "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, color: T.textMuted }}>{k}</span>
                <span style={{
                  fontSize: bold ? 17 : 13,
                  fontWeight: bold ? 800 : 600,
                  color: c,
                  fontFamily: mono ? "monospace" : "inherit",
                }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {order.status === "pending" && !confirmed && (
            <TouchButton variant="primary" size="lg" full icon={confirming ? null : "check"} loading={confirming} onClick={handleConfirm}>
              {confirming ? "Confirming..." : "Confirm Order"}
            </TouchButton>
          )}
          {order.status === "confirmed" && (
            <TouchButton variant="primary" size="lg" full icon="truck">Book Courier</TouchButton>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <TouchButton variant="secondary" size="md" full icon="whatsapp">Message</TouchButton>
            <TouchButton variant="secondary" size="md" full icon="pin">Address</TouchButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP PAGE
// ═══════════════════════════════════════════════════════════════════════════
function WhatsAppPage() {
  const [tab, setTab] = useState("bot");
  const [openChat, setOpenChat] = useState(null);

  const botChats = [
    {
      name: "Ahmed Raza", phone: "+92 300 1234567", lastMsg: "Thank you!", time: "2m", order: "WC-1042",
      msgs: [
        { from: "customer", text: "Hi, placed order #WC-1042 yesterday", time: "10:42 AM" },
        { from: "ai", text: "Hello Ahmed! 👋 Your order is confirmed and booked with TCS Courier. Tracking: 779416038409", time: "10:42 AM", conf: 97 },
        { from: "customer", text: "When will it arrive?", time: "10:43 AM" },
        { from: "ai", text: "Your parcel is at Lahore sorting hub. Expected delivery tomorrow 10am–6pm. 🚚", time: "10:43 AM", conf: 94 },
        { from: "customer", text: "Thank you!", time: "10:44 AM" },
      ]
    },
    {
      name: "Bilal Anwar", phone: "+92 333 2221111", lastMsg: "Can I get 10% discount?", time: "2h", order: "SH-0832",
      msgs: [
        { from: "customer", text: "Can I get 10% discount?", time: "7:10 AM" },
        { from: "ai", text: "Use code WELCOME10 for 10% off your first order! 🎉", time: "7:10 AM", conf: 98 },
      ]
    },
    {
      name: "Ayesha Iqbal", phone: "+92 345 7778899", lastMsg: "Is this in blue?", time: "3h", order: null,
      msgs: [
        { from: "customer", text: "Hi! Is Cotton Kurta available in blue, size Large?", time: "6:20 AM" },
        { from: "ai", text: "Yes! Cotton Kurta Blue/Large is in stock at Rs 1,890. Want to order? 🛍️", time: "6:20 AM", conf: 96 },
      ]
    },
  ];
  const supportChats = [
    {
      name: "Sara Khan", phone: "+92 321 9876543", lastMsg: "I want to return this", time: "15m", unread: 1, order: "WC-1041", reason: "Return Request",
      msgs: [
        { from: "customer", text: "Order arrived but size is wrong", time: "9:30 AM" },
        { from: "esc", text: "Escalated to support team. Case #ZR-441", time: "9:31 AM" },
        { from: "customer", text: "I want to return this", time: "9:45 AM" },
      ]
    },
    {
      name: "Usman Sheikh", phone: "+92 333 9876543", lastMsg: "Parcel damaged", time: "1h", unread: 2, order: "WC-1039", reason: "Damage Complaint",
      msgs: [
        { from: "customer", text: "Parcel damaged on arrival", time: "8:15 AM" },
        { from: "customer", text: "Here are pictures", time: "8:16 AM" },
        { from: "esc", text: "I'm escalating to our support team. Case #ZR-438", time: "8:16 AM" },
      ]
    },
  ];

  if (openChat) return <ChatView chat={openChat} isBot={tab === "bot"} onBack={() => setOpenChat(null)} />;

  const chats = tab === "bot" ? botChats : supportChats;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "10px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <ZyroLogo size={28} showText={false} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>Chat Center</div>
            <div style={{ fontSize: 11, color: T.textMuted }}>Your AI handles 94% automatically</div>
          </div>
          <span style={{
            padding: "5px 10px", borderRadius: 20,
            background: T.greenBg, color: T.green,
            fontSize: 10, fontWeight: 700, border: `1px solid ${T.green}44`,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
            LIVE
          </span>
        </div>

        {/* Today snapshot */}
        <div style={{
          background: T.bgElev, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 12, marginBottom: 12,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", gap: 12, flex: 1 }}>
            <ProgressRing value={94} size={48} stroke={4} color={T.green} label="94%" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>AI resolved 127 chats today</div>
              <div style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}>Avg reply 1.2s · 3 escalated</div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", background: T.bgElev,
          borderRadius: 14, padding: 4, marginBottom: 12,
        }}>
          {[
            { id: "bot", label: "AI Bot", count: 124, icon: "bot" },
            { id: "support", label: "Support", count: 3, icon: "headset" },
          ].map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => { haptic(); setTab(t.id); }} style={{
                flex: 1, padding: "11px 12px", borderRadius: 11,
                background: isActive ? (t.id === "bot" ? T.gradBtn : "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)") : "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                color: isActive ? "#fff" : T.textMuted, fontSize: 13, fontWeight: 700,
                boxShadow: isActive ? (t.id === "bot" ? T.glowBtn : "0 4px 14px rgba(251,191,36,0.35)") : "none",
                transition: "all 0.2s",
              }}>
                <Icon name={t.icon} size={16} color={isActive ? "#fff" : T.textFaint} />
                {t.label}
                <span style={{
                  padding: "1px 7px", borderRadius: 10,
                  background: isActive ? "rgba(255,255,255,0.25)" : T.bgHigh,
                  fontSize: 10, fontWeight: 800,
                  color: isActive ? "#fff" : T.textFaint,
                }}>{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel info */}
      <div style={{ padding: "10px 20px 4px", background: T.bgCard, borderBottom: `1px solid ${T.border}` }}>
        <div style={{
          padding: "12px 14px",
          background: tab === "bot"
            ? "linear-gradient(135deg, rgba(92,168,124,0.12) 0%, rgba(26,81,64,0.08) 100%)"
            : "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(180,83,9,0.05) 100%)",
          borderRadius: 12,
          border: `1px solid ${tab === "bot" ? T.borderMid : "rgba(251,191,36,0.3)"}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: tab === "bot" ? T.gradBtn : "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: tab === "bot" ? T.glowBtn : "0 4px 14px rgba(251,191,36,0.35)",
            flexShrink: 0,
          }}>
            <Icon name={tab === "bot" ? "bot" : "headset"} size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>
              {tab === "bot" ? "Zyro AI Bot" : "Support Team"}
            </div>
            <div style={{ fontSize: 11, color: tab === "bot" ? T.j200 : T.yellow, fontFamily: "monospace" }}>
              {tab === "bot" ? "+92 311 ZYRO-BOT" : "+92 300 ZYRO-HELP"}
            </div>
          </div>
          <span style={{
            padding: "4px 9px", borderRadius: 20,
            background: tab === "bot" ? T.greenBg : T.yellowBg,
            color: tab === "bot" ? T.green : T.yellow,
            fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
            border: `1px solid ${tab === "bot" ? T.green : T.yellow}44`,
          }}>{tab === "bot" ? "AUTO" : "MANUAL"}</span>
        </div>
      </div>

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        {chats.map((c, i) => (
          <button key={i} onClick={() => { haptic(); setOpenChat(c); }} style={{
            width: "100%", padding: "14px 20px",
            background: "none", border: "none", borderBottom: `1px solid ${T.border}`,
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            display: "flex", alignItems: "center", gap: 12,
            transition: "background 0.15s",
          }}
            onTouchStart={e => e.currentTarget.style.background = "rgba(92,168,124,0.06)"}
            onTouchEnd={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: T.j100,
                border: `1px solid ${T.borderMid}`,
              }}>{c.name.split(" ").map(w => w[0]).join("")}</div>
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 16, height: 16, borderRadius: "50%",
                background: tab === "bot" ? T.j300 : T.yellow,
                border: `2px solid ${T.bg}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={tab === "bot" ? "sparkle" : "alert"} size={8} color="#fff" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.name}</span>
                <span style={{ fontSize: 11, color: T.textFaint }}>{c.time}</span>
              </div>
              <div style={{ fontSize: 12, color: T.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                {tab === "bot" ? (
                  <Badge label="AI Handled" color={T.j300} bg="rgba(92,168,124,0.15)" icon="sparkle" />
                ) : (
                  <Badge label={c.reason} color={T.yellow} bg={T.yellowBg} icon="alert" />
                )}
              </div>
            </div>
            {c.unread > 0 && (
              <div style={{
                minWidth: 22, height: 22, padding: "0 7px",
                borderRadius: 11, background: T.red, color: "#fff",
                fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 10px ${T.red}66`,
              }}>{c.unread}</div>
            )}
          </button>
        ))}
      </div>

      <div style={{
        padding: "10px 20px", borderTop: `1px solid ${T.border}`,
        background: "linear-gradient(90deg, rgba(92,168,124,0.08) 0%, rgba(251,191,36,0.08) 100%)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: T.gradBtn,
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.glowBtn,
        }}>
          <Icon name="sparkle" size={14} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.text, fontWeight: 700 }}>Auto-Shift Active</div>
          <div style={{ fontSize: 10, color: T.textMuted }}>Returns & refunds go to Support automatically</div>
        </div>
      </div>
    </div>
  );
}

function ChatView({ chat, isBot, onBack }) {
  const [input, setInput] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      <TopHeader
        showBack onBack={onBack}
        title={chat.name}
        subtitle={`${chat.phone} · ${chat.order || "No order"}`}
        rightAction={
          <button aria-label="Call" style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.greenBg, border: `1px solid ${T.green}44`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <Icon name="phone" size={16} color={T.green} />
          </button>
        }
      />
      {!isBot && (
        <div style={{
          padding: "10px 14px", background: T.redBg,
          borderBottom: `1px solid ${T.red}33`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Icon name="alert" size={14} color={T.red} />
          <span style={{ fontSize: 12, fontWeight: 600, color: T.red }}>{chat.reason} · You're replying manually</span>
        </div>
      )}
      <div style={{
        flex: 1, overflowY: "auto", padding: 16,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {chat.msgs.map((m, i) => {
          const isCust = m.from === "customer";
          const isEsc = m.from === "esc";
          return (
            <div key={i} style={{ display: "flex", justifyContent: isCust ? "flex-start" : "flex-end", animation: "scaleIn 0.3s" }}>
              <div style={{ maxWidth: "80%" }}>
                {m.from === "ai" && (
                  <div style={{
                    fontSize: 10, color: T.j200, fontWeight: 700,
                    marginBottom: 3, textAlign: "right",
                    display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end",
                  }}>
                    <Icon name="sparkle" size={10} color={T.j200} /> Zyro AI
                    {m.conf && <span style={{ color: T.textFaint, fontWeight: 500 }}>· {m.conf}%</span>}
                  </div>
                )}
                {isEsc && (
                  <div style={{
                    fontSize: 10, color: T.yellow, fontWeight: 700,
                    marginBottom: 3, textAlign: "right",
                    display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end",
                  }}>
                    <Icon name="alert" size={10} color={T.yellow} /> Auto-Escalated
                  </div>
                )}
                <div style={{
                  padding: "11px 14px",
                  borderRadius: isCust ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                  background: isCust ? T.bgElev : isEsc ? "rgba(251,191,36,0.15)" : T.gradBtn,
                  border: isCust ? `1px solid ${T.border}` : isEsc ? `1px solid ${T.yellow}44` : "none",
                  fontSize: 14, color: isCust ? T.text : isEsc ? T.yellow : "#fff",
                  lineHeight: 1.45,
                  boxShadow: !isCust && !isEsc ? T.glowBtn : "none",
                }}>{m.text}</div>
                <div style={{
                  fontSize: 10, color: T.textFaint, marginTop: 3,
                  textAlign: isCust ? "left" : "right",
                }}>{m.time}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick replies for support */}
      {!isBot && (
        <div style={{ padding: "8px 14px", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          {["Issue refund", "Schedule pickup", "10% discount", "Apology"].map(t => (
            <button key={t} onClick={() => setInput(t)} style={{
              padding: "6px 12px", borderRadius: 20,
              background: T.bgElev, border: `1px solid ${T.borderMid}`,
              color: T.j200, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              whiteSpace: "nowrap",
            }}>{t}</button>
          ))}
        </div>
      )}

      <div style={{
        padding: "10px 14px 14px", borderTop: `1px solid ${T.border}`,
        background: T.bgCard,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {isBot ? (
          <div style={{
            flex: 1, padding: "11px 14px", borderRadius: 22,
            background: T.bgElev, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icon name="sparkle" size={14} color={T.j300} />
            <span style={{ fontSize: 13, color: T.textMuted, flex: 1 }}>AI handling automatically</span>
            <button style={{
              fontSize: 11, fontWeight: 700, color: T.j200,
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>Take over</button>
          </div>
        ) : (
          <div style={{
            flex: 1, padding: "11px 14px", borderRadius: 22,
            background: T.bgElev, border: `1px solid ${T.border}`,
          }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your reply..." style={{
              width: "100%", border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: T.text, fontFamily: "inherit",
            }} />
          </div>
        )}
        <button onClick={haptic} aria-label="Send" style={{
          width: 46, height: 46, borderRadius: 23,
          background: T.gradBtn, border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: T.glowBtn, flexShrink: 0,
        }}>
          <Icon name="send" size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKETING PAGE
// ═══════════════════════════════════════════════════════════════════════════
function MarketingPage() {
  const [platform, setPlatform] = useState("meta");
  const metaData = {
    brand: "Meta Ads", accent: "#1877F2", icon: "meta",
    spend: "Rs 48,200", revenue: "Rs 152,000", roas: "3.15x", orders: 121,
    trend: [{ d: "1", s: 1200, r: 4800 }, { d: "5", s: 1800, r: 7200 }, { d: "10", s: 2200, r: 9800 }, { d: "15", s: 1900, r: 8600 }, { d: "20", s: 2400, r: 11800 }, { d: "25", s: 2800, r: 14200 }, { d: "30", s: 3100, r: 15400 }],
    campaigns: [
      { name: "Eid Sale — Kurtas", spend: 12000, rev: 58000, roas: 4.83, status: "scale", emoji: "🔥" },
      { name: "Retargeting Cart", spend: 8200, rev: 34000, roas: 4.15, status: "scale", emoji: "🎯" },
      { name: "Instagram Feed", spend: 15000, rev: 42000, roas: 2.80, status: "monitor", emoji: "👀" },
      { name: "Cold Audience", spend: 13000, rev: 18000, roas: 1.38, status: "pause", emoji: "⏸️" },
    ],
    insight: "Video creatives beat images by 31% CTR. Scale Eid Hero, kill Generic Shot.",
  };
  const googleData = {
    brand: "Google Ads", accent: "#4285F4", icon: "google",
    spend: "Rs 19,600", revenue: "Rs 66,000", roas: "3.37x", orders: 73,
    trend: [{ d: "1", s: 800, r: 2400 }, { d: "5", s: 1100, r: 3900 }, { d: "10", s: 1400, r: 5200 }, { d: "15", s: 1500, r: 5800 }, { d: "20", s: 1700, r: 6900 }, { d: "25", s: 1800, r: 7800 }, { d: "30", s: 2000, r: 9100 }],
    campaigns: [
      { name: "Cotton Kurta Keywords", spend: 6400, rev: 24500, roas: 3.83, status: "winning", emoji: "🏆" },
      { name: "Shalwar Trouser", spend: 4200, rev: 15400, roas: 3.67, status: "winning", emoji: "🏆" },
      { name: "Brand Keywords", spend: 3200, rev: 8900, roas: 2.78, status: "monitor", emoji: "👀" },
      { name: "Shopping Feed", spend: 5800, rev: 17200, roas: 2.97, status: "monitor", emoji: "👀" },
    ],
    insight: "Search ads outperform Shopping by 28%. Pause Generic Fashion Terms.",
  };
  const active = platform === "meta" ? metaData : googleData;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <TopHeader title="Growth" subtitle="AI-powered marketing" showLogo />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {/* Combined hero */}
        <div style={{
          background: T.gradHero, borderRadius: 20, padding: 18,
          position: "relative", overflow: "hidden", marginBottom: 14,
          boxShadow: T.shadowLg,
        }}>
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Today's Ad Profit
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.6px", lineHeight: 1 }}>
                  + Rs 150,200
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
                  Rs 67,800 spent · Rs 218,000 earned
                </div>
              </div>
              <div style={{
                padding: "6px 12px", borderRadius: 20,
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ fontSize: 18 }}>🚀</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>3.21x</span>
              </div>
            </div>
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: "rgba(255,255,255,0.15)", borderRadius: 12,
              backdropFilter: "blur(8px)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>194 orders from ads</div>
                <div style={{ fontSize: 11, color: "#fff", marginTop: 2 }}>32% of today's total revenue</div>
              </div>
              <Icon name="arrow" size={16} color="#fff" />
            </div>
          </div>
        </div>

        {/* Platform toggle */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: "-0.2px" }}>
              Pick a platform
            </div>
            <Badge label="LIVE" color={T.green} bg={T.greenBg} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[metaData, googleData].map((pl, idx) => {
              const isActive = (idx === 0 && platform === "meta") || (idx === 1 && platform === "google");
              return (
                <button key={pl.brand} onClick={() => { haptic(); setPlatform(idx === 0 ? "meta" : "google"); }}
                  style={{
                    padding: 14, borderRadius: 16,
                    background: isActive ? `linear-gradient(135deg, ${pl.accent}22 0%, ${pl.accent}08 100%)` : T.bgCard,
                    border: `1px solid ${isActive ? pl.accent + "88" : T.border}`,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    boxShadow: isActive ? `0 0 0 3px ${pl.accent}22` : "none",
                    position: "relative", overflow: "hidden",
                    transition: "all 0.25s",
                  }}>
                  {isActive && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 3,
                      background: pl.accent, boxShadow: `0 0 12px ${pl.accent}`,
                    }} />
                  )}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isActive ? pl.accent : T.bgElev,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 10,
                    boxShadow: isActive ? `0 4px 14px ${pl.accent}66` : "none",
                  }}>
                    <Icon name={pl.icon} size={22} color="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>{pl.brand}</div>
                  <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 10 }}>{pl.orders} orders</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.green, letterSpacing: "-0.3px" }}>{pl.roas}</div>
                    <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>ROAS</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active platform detail */}
        <div style={{
          background: T.gradCard, border: `1px solid ${active.accent}44`,
          borderRadius: 18, overflow: "hidden", marginBottom: 14,
          animation: "fadeIn 0.3s",
        }}>
          <div style={{
            padding: "12px 14px",
            background: `linear-gradient(90deg, ${active.accent}15 0%, transparent 100%)`,
            borderBottom: `1px solid ${active.accent}33`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: active.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name={active.icon} size={17} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{active.brand}</div>
              <div style={{ fontSize: 10, color: T.textFaint }}>Last 30 days · Live data</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: T.border }}>
            {[
              ["Spend", active.spend, T.text],
              ["Revenue", active.revenue, T.j200],
              ["ROAS", active.roas, T.green],
            ].map(([k, v, c]) => (
              <div key={k} style={{
                padding: "14px 10px", background: T.bgElev, textAlign: "center",
              }}>
                <div style={{ fontSize: 9, color: T.textFaint, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: c, marginTop: 3, letterSpacing: "-0.2px" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 10px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 10, padding: "0 8px", display: "flex", justifyContent: "space-between" }}>
              <span>Spend vs Revenue</span>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: T.j300 }} />
                  <span style={{ fontSize: 10, color: T.textMuted }}>Revenue</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: active.accent }} />
                  <span style={{ fontSize: 10, color: T.textMuted }}>Spend</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={active.trend}>
                <defs>
                  <linearGradient id={`mkr-${platform}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.j300} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={T.j300} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fontSize: 9, fill: T.textFaint }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Area dataKey="r" stroke={T.j300} strokeWidth={2.5} fill={`url(#mkr-${platform})`} dot={false} />
                <Area dataKey="s" stroke={active.accent} strokeWidth={2} fill="transparent" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaigns */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: "-0.2px", marginBottom: 10 }}>
            Top campaigns
          </div>
          <div style={{
            background: T.gradCard, border: `1px solid ${T.border}`,
            borderRadius: 16, overflow: "hidden",
          }}>
            {active.campaigns.map((c, i, a) => {
              const color = c.status === "scale" || c.status === "winning" ? T.green
                : c.status === "monitor" ? T.yellow : T.red;
              return (
                <div key={c.name} style={{
                  padding: "14px 14px",
                  borderBottom: i < a.length - 1 ? `1px solid ${T.border}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{c.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                      </div>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20,
                      background: `${color}22`, color,
                      fontSize: 11, fontWeight: 800,
                      border: `1px solid ${color}44`,
                    }}>{c.roas}x</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: T.textFaint }}>Spend </span>
                      <span style={{ color: T.textMuted, fontWeight: 700 }}>Rs {c.spend.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: T.textFaint }}>Revenue </span>
                      <span style={{ color: T.text, fontWeight: 700 }}>Rs {c.rev.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI insight */}
        <div style={{
          background: "linear-gradient(135deg, rgba(92,168,124,0.15) 0%, rgba(26,81,64,0.2) 100%)",
          border: `1px solid ${T.borderBright}`,
          borderRadius: 16, padding: 14,
          boxShadow: T.glowGreen,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: T.gradBtn,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: T.glowBtn, flexShrink: 0,
            }}>
              <Icon name="sparkle" size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.j200, marginBottom: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Zyro AI Suggestion
              </div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{active.insight}</div>
              <button onClick={haptic} style={{
                marginTop: 12, padding: "10px 16px", borderRadius: 12,
                background: T.gradBtn, border: "none", color: "#fff",
                fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: T.glowBtn, minHeight: 40,
              }}>
                <Icon name="lightning" size={14} color="#fff" /> Apply Recommendations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MORE SHEET
// ═══════════════════════════════════════════════════════════════════════════
function MoreSheet({ onClose, setActive }) {
  const items = [
    { id: "couriers", label: "Couriers", sub: "69 active shipments", icon: "truck", color: T.j300 },
    { id: "inventory", label: "Inventory", sub: "6 products · 3 alerts", icon: "inventory", color: T.yellow },
    { id: "customers", label: "Customers", sub: "1,247 total", icon: "customers", color: T.blue },
    { id: "settings", label: "Settings", sub: "Account & preferences", icon: "settings", color: T.textMuted },
  ];
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-end",
      zIndex: 200, animation: "fadeIn 0.25s",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", background: T.bgCard,
        borderRadius: "28px 28px 0 0",
        paddingBottom: 30, maxHeight: "70%",
        boxShadow: T.shadowLg,
        animation: "slideUp 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ padding: "12px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: T.borderMid }} />
        </div>
        <div style={{ padding: "10px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>More</div>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.bgElev, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <Icon name="close" size={16} color={T.textMuted} />
          </button>
        </div>
        <div style={{ padding: "0 20px" }}>
          {items.map(item => (
            <button key={item.id} onClick={() => { haptic(); setActive(item.id); onClose(); }} style={{
              width: "100%", padding: "16px 16px",
              background: T.bgElev, border: `1px solid ${T.border}`,
              borderRadius: 16, marginBottom: 10,
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              display: "flex", alignItems: "center", gap: 14,
            }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.98)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${item.color}22`, border: `1px solid ${item.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={item.icon} size={20} color={item.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>{item.sub}</div>
              </div>
              <Icon name="chevron" size={16} color={T.textFaint} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OTHER PAGES
// ═══════════════════════════════════════════════════════════════════════════
function CouriersPage() {
  const stats = [
    { name: "TCS", active: 34, rate: 94, cod: 84200, emoji: "🚚" },
    { name: "Leopards", active: 18, rate: 91, cod: 42100, emoji: "📦" },
    { name: "PostEx", active: 12, rate: 85, cod: 31400, emoji: "📫" },
    { name: "Trax", active: 5, rate: 92, cod: 12800, emoji: "🛻" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopHeader title="Couriers" subtitle="69 active · Rs 170,500 COD" showLogo />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>Performance</div>
        {stats.map(c => (
          <div key={c.name} style={{
            background: T.gradCard, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{c.emoji}</span>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text, flex: 1 }}>{c.name}</div>
              <span style={{
                padding: "4px 11px", borderRadius: 20,
                background: c.rate >= 93 ? T.greenBg : c.rate >= 88 ? T.yellowBg : T.redBg,
                color: c.rate >= 93 ? T.green : c.rate >= 88 ? T.yellow : T.red,
                fontSize: 12, fontWeight: 800,
                border: `1px solid ${c.rate >= 93 ? T.green : c.rate >= 88 ? T.yellow : T.red}44`,
              }}>{c.rate}%</span>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              padding: 10, background: T.bgElev, borderRadius: 10,
            }}>
              <div>
                <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>ACTIVE</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 2 }}>{c.active}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>COD DUE</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.j200, marginTop: 2 }}>Rs {c.cod.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryPage() {
  const products = [
    { sku: "KURTA-R-M", name: "Cotton Kurta Red/M", img: "👕", on: 3, price: 1890, st: "low" },
    { sku: "TROUSER-30", name: 'Shalwar Trouser 30"', img: "👖", on: 22, price: 990, st: "ok" },
    { sku: "EID-SET-01", name: "Eid Gift Set Bundle", img: "🎁", on: 0, price: 3490, st: "out" },
    { sku: "DUPATTA-W", name: "Chiffon Dupatta White", img: "🧣", on: 15, price: 690, st: "ok" },
    { sku: "KURTA-B-L", name: "Cotton Kurta Blue/L", img: "👕", on: 4, price: 1890, st: "low" },
  ];
  const stMap = {
    ok: { label: "In Stock", color: T.green, bg: T.greenBg },
    low: { label: "Low", color: T.yellow, bg: T.yellowBg },
    out: { label: "Out", color: T.red, bg: T.redBg },
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopHeader title="Inventory" subtitle="6 products · 3 need attention" showLogo
        rightAction={
          <button onClick={haptic} style={{
            width: 40, height: 40, borderRadius: 12, background: T.gradBtn,
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: T.glowBtn,
          }}><Icon name="plus" size={18} color="#fff" /></button>
        } />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 0 20px" }}>
        {products.map(p => (
          <div key={p.sku} style={{
            padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: T.bgElev,
              border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0,
            }}>{p.img}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{p.name}</div>
              <div style={{ fontSize: 11, color: T.j300, fontFamily: "monospace", marginTop: 2 }}>{p.sku}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{p.on}</span>
                <span style={{ fontSize: 11, color: T.textFaint }}>units</span>
                <span style={{
                  padding: "2px 8px", borderRadius: 20,
                  background: stMap[p.st].bg, color: stMap[p.st].color,
                  fontSize: 10, fontWeight: 700,
                  border: `1px solid ${stMap[p.st].color}44`,
                }}>{stMap[p.st].label}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Rs {p.price.toLocaleString()}</div>
              {p.st !== "ok" && (
                <button onClick={haptic} style={{
                  marginTop: 6, padding: "5px 10px", borderRadius: 8,
                  background: T.gradBtn, border: "none", color: "#fff",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: T.glowBtn,
                }}>Restock</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersPage() {
  const customers = [
    { name: "Ahmed Raza", city: "Karachi", orders: 12, spent: 42300, tier: "VIP" },
    { name: "Ali Hassan", city: "Islamabad", orders: 8, spent: 34290, tier: "VIP" },
    { name: "Usman Sheikh", city: "Multan", orders: 5, spent: 18400, tier: "Watch" },
    { name: "Sara Khan", city: "Lahore", orders: 3, spent: 5670, tier: "Regular" },
    { name: "Fatima Malik", city: "Faisalabad", orders: 2, spent: 3800, tier: "Regular" },
    { name: "Nadia Siddiqui", city: "Peshawar", orders: 1, spent: 1200, tier: "New" },
  ];
  const tiers = {
    VIP: { bg: "rgba(167,139,250,0.15)", c: T.purple, emoji: "👑" },
    Regular: { bg: T.blueBg, c: T.blue, emoji: "⭐" },
    Watch: { bg: T.redBg, c: T.red, emoji: "⚠️" },
    New: { bg: T.greenBg, c: T.green, emoji: "✨" },
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopHeader title="Customers" subtitle="1,247 total · 87 VIPs" showLogo />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 0 20px" }}>
        {customers.map(c => (
          <div key={c.name} style={{
            padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: T.j100,
            }}>{c.name.split(" ").map(w => w[0]).join("")}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.name}</span>
                <span style={{
                  padding: "2px 8px", borderRadius: 20,
                  background: tiers[c.tier].bg, color: tiers[c.tier].c,
                  fontSize: 9, fontWeight: 800, border: `1px solid ${tiers[c.tier].c}33`,
                  display: "inline-flex", alignItems: "center", gap: 3,
                }}>
                  {tiers[c.tier].emoji} {c.tier}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3 }}>
                {c.city} · {c.orders} orders
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.j200 }}>
              Rs {c.spent.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopHeader title="Settings" showLogo />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {/* Profile card */}
        <div style={{
          background: T.gradHero, borderRadius: 20, padding: 18,
          position: "relative", overflow: "hidden", marginBottom: 14,
          boxShadow: T.shadowLg,
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "rgba(255,255,255,0.25)", backdropFilter: "blur(8px)",
              border: "2px solid rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800, color: "#fff",
            }}>AK</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Ahmad Khan</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>Owner · Acme Stores</div>
              <div style={{
                marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 20,
                background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)",
              }}>
                <Icon name="star" size={11} color="#fff" />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Growth Plan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan usage */}
        <div style={{
          background: T.gradCard, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: 14, marginBottom: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Plan Usage</div>
              <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Resets May 1</div>
            </div>
            <button onClick={haptic} style={{
              padding: "6px 11px", borderRadius: 10,
              background: T.gradBtn, border: "none", color: "#fff",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              boxShadow: T.glowBtn, display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              Upgrade <Icon name="arrow" size={11} color="#fff" />
            </button>
          </div>
          {[
            ["Orders", 1247, 1500],
            ["WhatsApp", 847, 2000],
            ["Team seats", 2, 3],
          ].map(([k, v, max]) => {
            const pct = (v / max) * 100;
            const col = pct > 80 ? T.yellow : T.j300;
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{v.toLocaleString()} / {max.toLocaleString()}</span>
                </div>
                <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: `linear-gradient(90deg, ${col}99 0%, ${col} 100%)`,
                    borderRadius: 3, boxShadow: `0 0 6px ${col}66`,
                    transition: "width 0.6s",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sections */}
        {[
          {
            title: "Connected Stores", items: [
              { label: "WooCommerce", sub: "1,247 orders · Live", right: "✓", color: T.green },
              { label: "Daraz", sub: "687 orders · Live", right: "✓", color: T.green },
              { label: "Shopify", sub: "Not connected", right: "Connect", color: T.j300 },
            ]
          },
          {
            title: "WhatsApp Numbers", items: [
              { label: "Bot (+92 311 ZYRO-BOT)", sub: "AI handles automatically", right: "14 templates", color: T.j200 },
              { label: "Support (+92 300 ZYRO-HELP)", sub: "Manual replies only", right: "8 templates", color: T.yellow },
            ]
          },
          {
            title: "Account", items: [
              { label: "Team Members", sub: "2 of 3 seats used" },
              { label: "Notifications", sub: "Push, email, SMS" },
              { label: "Language & Region", sub: "English · Pakistan" },
              { label: "Help & Support", sub: "Get help anytime" },
            ]
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>
              {section.title}
            </div>
            <div style={{
              background: T.gradCard, border: `1px solid ${T.border}`,
              borderRadius: 14, overflow: "hidden",
            }}>
              {section.items.map((item, i, a) => (
                <button key={item.label} onClick={haptic} style={{
                  width: "100%", padding: "14px 14px",
                  background: "none", border: "none",
                  borderBottom: i < a.length - 1 ? `1px solid ${T.border}` : "none",
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                }}
                  onTouchStart={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"}
                  onTouchEnd={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>{item.sub}</div>
                  </div>
                  {item.right && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.color || T.textMuted }}>{item.right}</span>
                  )}
                  <Icon name="chevron" size={14} color={T.textFaint} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <button style={{
          width: "100%", padding: 14, borderRadius: 14,
          background: T.redBg, border: `1px solid ${T.red}44`,
          color: T.red, fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>Sign Out</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function ZyroMobile() {
  const [active, setActive] = useState("home");
  const [showMore, setShowMore] = useState(false);
  const pages = {
    home: <HomePage setActive={setActive} />,
    orders: <OrdersPage />,
    whatsapp: <WhatsAppPage />,
    marketing: <MarketingPage />,
    couriers: <CouriersPage />,
    inventory: <InventoryPage />,
    customers: <CustomersPage />,
    settings: <SettingsPage />,
  };
  return (
    <PhoneFrame>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
        <StatusBar />
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {pages[active] || <HomePage setActive={setActive} />}
        </div>
        <BottomTabBar
          active={["home", "orders", "whatsapp", "marketing"].includes(active) ? active : "more"}
          setActive={setActive}
          openMore={() => setShowMore(true)}
        />
        {showMore && <MoreSheet onClose={() => setShowMore(false)} setActive={setActive} />}
      </div>
    </PhoneFrame>
  );
}
