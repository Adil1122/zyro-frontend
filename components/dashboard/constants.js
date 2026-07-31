// ═══ DESIGN TOKENS ═════════════════════════════════════════════════════════
export const T = {
    bg: "#0A1C16", bgCard: "#122720", bgElev: "#17332A", bgHigh: "#1D4033", bgActive: "#244D3E",
    text: "#F0FDF4", textSub: "#A7F3D0", textMuted: "#6EE7B7", textFaint: "#3F9B7A", textGhost: "#2D6A4F",
    j50: "#E8F5EC", j100: "#B7E5BA", j200: "#8FD4A4", j300: "#5CA87C", j400: "#3D8A5F", j500: "#288760", j600: "#1A5140", j700: "#112E24",
    gradBtn: "linear-gradient(135deg, #5CA87C 0%, #3D8A5F 100%)",
    gradBtnHover: "linear-gradient(135deg, #8FD4A4 0%, #5CA87C 100%)",
    gradBtnActive: "linear-gradient(135deg, #FFFFFF 0%, #E8F5EC 100%)",
    gradCard: "linear-gradient(145deg, #17332A 0%, #122720 100%)",
    gradHero: "linear-gradient(135deg, #5CA87C 0%, #288760 50%, #1A5140 100%)",
    gradLogoTile: "linear-gradient(135deg, #3D8A5F 0%, #1A5140 100%)",
    green: "#4ADE80", greenBg: "rgba(74,222,128,0.12)",
    yellow: "#FBBF24", yellowBg: "rgba(251,191,36,0.12)",
    red: "#F87171", redBg: "rgba(248,113,113,0.12)",
    blue: "#60A5FA", blueBg: "rgba(96,165,250,0.12)",
    purple: "#A78BFA", purpleBg: "rgba(167,139,250,0.12)",
    border: "rgba(92,168,124,0.12)", borderMid: "rgba(92,168,124,0.25)", borderBright: "rgba(92,168,124,0.45)",
    r4: "4px", r6: "6px", r8: "8px", r10: "10px", r12: "12px", r14: "14px", r16: "16px", r20: "20px",
    shadow: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
    shadowMd: "0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)",
    shadowLg: "0 20px 60px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3)",
    glowGreen: "0 0 0 1px rgba(92,168,124,0.3), 0 0 24px rgba(92,168,124,0.20)",
    glowBtn: "0 4px 14px rgba(92,168,124,0.35), 0 1px 2px rgba(0,0,0,0.15)",
    glowBtnHover: "0 6px 20px rgba(92,168,124,0.5), 0 2px 4px rgba(0,0,0,0.2)",
};

export const statusCfg = {
    pending: { label: "Pending", bg: T.yellowBg, color: T.yellow, dot: "#FBBF24" },
    confirmed: { label: "Confirmed", bg: T.blueBg, color: T.blue, dot: "#60A5FA" },
    shipped: { label: "Shipped", bg: "rgba(92,168,124,0.15)", color: T.j200, dot: T.j300 },
    delivered: { label: "Delivered", bg: T.greenBg, color: T.green, dot: "#4ADE80" },
    returned: { label: "Returned", bg: T.redBg, color: T.red, dot: "#F87171" },
};

export const NAV = [
    { id: "dashboard", label: "Dashboard" },
    { id: "orders", label: "Orders", badge: 0 },
    { id: "whatsapp", label: "WhatsApp AI", badge: 0, alert: true },
    { id: "couriers", label: "Couriers" },
    { id: "inventory", label: "Inventory", badge: 0, warn: true },
    { id: "marketing", label: "Marketing" },
    { id: "customers", label: "Customers" },
    { id: "automation", label: "Automation", badge: "SOON", warn: true },
    { id: "analytics", label: "Analytics" },
    { id: "reports", label: "Reports" },
    { id: "plans", label: "Plans" },
    { id: "settings", label: "Settings" },
];
