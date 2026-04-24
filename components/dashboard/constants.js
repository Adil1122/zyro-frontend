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

export const salesData = [
    { day: "Mon", woo: 42, daraz: 18, shopify: 8 },
    { day: "Tue", woo: 38, daraz: 22, shopify: 11 },
    { day: "Wed", woo: 55, daraz: 30, shopify: 14 },
    { day: "Thu", woo: 49, daraz: 25, shopify: 10 },
    { day: "Fri", woo: 72, daraz: 35, shopify: 18 },
    { day: "Sat", woo: 88, daraz: 48, shopify: 22 },
    { day: "Sun", woo: 65, daraz: 31, shopify: 15 },
];

export const revenueData = [
    { month: "Oct", revenue: 234000, target: 220000 },
    { month: "Nov", revenue: 284000, target: 250000 },
    { month: "Dec", revenue: 412000, target: 350000 },
    { month: "Jan", revenue: 318000, target: 380000 },
    { month: "Feb", revenue: 365000, target: 360000 },
    { month: "Mar", revenue: 448000, target: 400000 },
    { month: "Apr", revenue: 492000, target: 420000 },
];

export const platformData = [
    { name: "WooCommerce", value: 62, color: "#5CA87C" },
    { name: "Daraz", value: 28, color: "#B7E5BA" },
    { name: "Shopify", value: 10, color: "#3F9B7A" },
];

export const orders = [
    { id: "WC-1042", customer: "Ahmed Raza", city: "Karachi", amount: 3490, status: "shipped", platform: "woo", time: "2m", courier: "TCS", cn: "779416038409", items: 3 },
    { id: "WC-1041", customer: "Sara Khan", city: "Lahore", amount: 1890, status: "pending", platform: "woo", time: "14m", courier: null, cn: null, items: 1 },
    { id: "DRZ-2891", customer: "Ali Hassan", city: "Islamabad", amount: 5200, status: "confirmed", platform: "daraz", time: "31m", courier: "Leopards", cn: "LAP123456789", items: 2 },
    { id: "WC-1040", customer: "Fatima Malik", city: "Faisalabad", amount: 2100, status: "delivered", platform: "woo", time: "1h", courier: "TCS", cn: "779416038401", items: 1 },
    { id: "WC-1039", customer: "Usman Sheikh", city: "Multan", amount: 4800, status: "returned", platform: "woo", time: "3h", courier: "PostEx", cn: "PEX887120001", items: 4 },
    { id: "DRZ-2890", customer: "Nadia Siddiqui", city: "Peshawar", amount: 1200, status: "pending", platform: "daraz", time: "4h", courier: null, cn: null, items: 2 },
    { id: "SH-0832", customer: "Bilal Anwar", city: "Rawalpindi", amount: 7890, status: "shipped", platform: "shopify", time: "5h", courier: "TCS", cn: "779416038395", items: 5 },
    { id: "WC-1038", customer: "Ayesha Iqbal", city: "Sialkot", amount: 3290, status: "delivered", platform: "woo", time: "7h", courier: "Leopards", cn: "LAP123456720", items: 2 },
];

export const statusCfg = {
    pending: { label: "Pending", bg: T.yellowBg, color: T.yellow, dot: "#FBBF24" },
    confirmed: { label: "Confirmed", bg: T.blueBg, color: T.blue, dot: "#60A5FA" },
    shipped: { label: "Shipped", bg: "rgba(92,168,124,0.15)", color: T.j200, dot: T.j300 },
    delivered: { label: "Delivered", bg: T.greenBg, color: T.green, dot: "#4ADE80" },
    returned: { label: "Returned", bg: T.redBg, color: T.red, dot: "#F87171" },
};

export const NAV = [
    { id: "dashboard", label: "Dashboard" },
    { id: "orders", label: "Orders", badge: 4 },
    { id: "whatsapp", label: "WhatsApp AI", badge: 2, alert: true },
    { id: "couriers", label: "Couriers" },
    { id: "inventory", label: "Inventory", badge: 3, warn: true },
    { id: "marketing", label: "Marketing" },
    { id: "customers", label: "Customers" },
    { id: "automation", label: "Automation" },
    { id: "analytics", label: "Analytics" },
    { id: "settings", label: "Settings" },
];
