"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "./constants";
import Icon from "./Icon";

const SUPPORT_PHONE = "03155567644";
const WA_HREF = `https://wa.me/92${SUPPORT_PHONE.replace(/^0/, "")}`;
const POLL_MS  = 60_000; // re-fetch notifications every 60 seconds

// ── localStorage helpers for "seen" tracking ────────────────────────────────
function getSeenIds() {
    try {
        const raw = localStorage.getItem("zyro_notif_seen");
        return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
}
function saveSeenIds(ids) {
    try { localStorage.setItem("zyro_notif_seen", JSON.stringify([...ids])); } catch {}
}

const SEARCH_PAGES = [
    { id: "dashboard",  label: "Dashboard",   href: "/dashboard",  desc: "Overview & live stats" },
    { id: "orders",     label: "Orders",      href: "/orders",     desc: "Manage all orders" },
    { id: "whatsapp",   label: "WhatsApp AI", href: "/whatsapp",   desc: "AI chatbot & conversations" },
    { id: "couriers",   label: "Couriers",    href: "/couriers",   desc: "Book shipments & routing rules" },
    { id: "inventory",  label: "Inventory",   href: "/inventory",  desc: "Products & stock levels" },
    { id: "marketing",  label: "Marketing",   href: "/marketing",  desc: "Ads & campaigns" },
    { id: "customers",  label: "Customers",   href: "/customers",  desc: "Customer database" },
    { id: "analytics",  label: "Analytics",   href: "/analytics",  desc: "Performance metrics" },
    { id: "reports",    label: "Reports",     href: "/reports",    desc: "Export & download reports" },
    { id: "settings",   label: "Settings",    href: "/settings",   desc: "Account & integrations" },
    { id: "plans",      label: "Plans",       href: "/plans",      desc: "Subscription & billing" },
];

export default function Header({ user, onMenuToggle }) {
    const router = useRouter();

    // Popovers
    const [showDropdown,      setShowDropdown]      = useState(false);
    const [showSupport,       setShowSupport]        = useState(false);
    const [showNotifications, setShowNotifications]  = useState(false);
    const [phoneCopied,       setPhoneCopied]        = useState(false);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [notifLoading,  setNotifLoading]  = useState(true);
    const [unreadCount,   setUnreadCount]   = useState(0);

    // Search
    const [searchOpen,    setSearchOpen]    = useState(false);
    const [searchQuery,   setSearchQuery]   = useState("");
    const [searchResults, setSearchResults] = useState({ pages: SEARCH_PAGES, orders: [], customers: [] });
    const [searchLoading, setSearchLoading] = useState(false);
    const searchInputRef = useRef(null);

    const supportRef = useRef(null);
    const notifRef   = useRef(null);
    const userRef    = useRef(null);
    const pollRef    = useRef(null);

    // ── Fetch real notifications ─────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        const stored = typeof window !== "undefined"
            ? localStorage.getItem("zyro_user") : null;
        const userId = stored ? JSON.parse(stored)?.id : null;
        if (!userId) { setNotifLoading(false); return; }

        try {
            const res  = await fetch(`/api/notifications?userId=${userId}`);
            const data = await res.json();
            if (!data.notifications) return;

            setNotifications(data.notifications);

            // Unread = any notification whose ID is not in the seen set
            const seen = getSeenIds();
            const newCount = data.notifications.filter(n => !seen.has(n.id)).length;
            setUnreadCount(newCount);
        } catch {
            // Non-fatal — keep showing last known state
        } finally {
            setNotifLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        pollRef.current = setInterval(fetchNotifications, POLL_MS);
        window.addEventListener("focus", fetchNotifications);
        return () => {
            clearInterval(pollRef.current);
            window.removeEventListener("focus", fetchNotifications);
        };
    }, [fetchNotifications]);

    // ── Close all popovers on outside click ──────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (supportRef.current && !supportRef.current.contains(e.target)) setShowSupport(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifications(false);
            if (userRef.current    && !userRef.current.contains(e.target))     setShowDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Search logic ─────────────────────────────────────────────────────────
    const openSearch = () => {
        setSearchOpen(true);
        setSearchQuery("");
        setSearchLoading(false);
        setSearchResults({ pages: SEARCH_PAGES, orders: [], customers: [] });
    };
    const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); setSearchLoading(false); };

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openSearch(); }
            if (e.key === "Escape") closeSearch();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    useEffect(() => {
        if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 40);
    }, [searchOpen]);

    useEffect(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) { setSearchResults({ pages: SEARCH_PAGES, orders: [], customers: [] }); return; }

        const pages = SEARCH_PAGES.filter(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
        setSearchResults(r => ({ ...r, pages }));

        if (q.length < 2) return;
        const t = setTimeout(async () => {
            setSearchLoading(true);
            const safetyTimer = setTimeout(() => setSearchLoading(false), 5000);
            try {
                const stored = localStorage.getItem("zyro_user");
                const userId = stored ? JSON.parse(stored)?.id : null;
                if (!userId) return;
                const [{ data: orders }, { data: customers }] = await Promise.all([
                    supabase.from("orders").select("order_id, status, total_amount, customers(name)").eq("user_id", userId).ilike("order_id", `%${q}%`).limit(5),
                    supabase.from("customers").select("id, name, contact, city").eq("user_id", userId).or(`name.ilike.%${q}%,contact.ilike.%${q}%`).limit(5),
                ]);
                setSearchResults(r => ({ ...r, orders: orders || [], customers: customers || [] }));
            } catch { /* non-fatal */ } finally { clearTimeout(safetyTimer); setSearchLoading(false); }
        }, 280);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const handleLogout = () => {
        localStorage.removeItem("zyro_user");
        localStorage.removeItem("zyro_notif_seen");
        window.dispatchEvent(new Event("authChange"));
        router.push("/login");
    };

    const getTrialDaysLeft = () => {
        if (!user?.trial_ends_at) return null;
        const diff = Math.ceil((new Date(user.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };
    const daysLeft = getTrialDaysLeft();

    // ── Open / close popovers ────────────────────────────────────────────────
    const openSupport = () => {
        setShowSupport(p => !p);
        setShowNotifications(false);
        setShowDropdown(false);
    };

    const openNotifications = () => {
        const opening = !showNotifications;
        setShowNotifications(opening);
        setShowSupport(false);
        setShowDropdown(false);
        if (opening) {
            // Mark all current notifications as seen
            const ids = new Set(notifications.map(n => n.id));
            saveSeenIds(ids);
            setUnreadCount(0);
        }
    };

    const markAllRead = () => {
        const ids = new Set(notifications.map(n => n.id));
        saveSeenIds(ids);
        setUnreadCount(0);
    };

    const copyPhone = () => {
        navigator.clipboard.writeText(SUPPORT_PHONE).catch(() => {});
        setPhoneCopied(true);
        setTimeout(() => setPhoneCopied(false), 1800);
    };

    return (
        <header className="zyro-header" style={{
            height: 60, background: T.bgCard,
            borderBottom: `1px solid ${T.border}`,
            display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 28px",
            flexShrink: 0,
        }}>
            {/* ── Hamburger (mobile only) ── */}
            <button
                className="zyro-hamburger"
                onClick={onMenuToggle}
                style={{
                    display: "none", alignItems: "center", justifyContent: "center",
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: "none", border: `1px solid ${T.border}`,
                    cursor: "pointer", color: T.textMuted,
                }}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
            </button>

            {/* ── Left: search + plan badge ── */}
            <div className="zyro-header-left" style={{ flex: 1, display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 20 }}>
                <button onClick={openSearch} className="zyro-search" style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: T.bgElev, border: `1px solid ${T.border}`,
                    borderRadius: 24, padding: "7px 18px", width: "100%", maxWidth: 380,
                    color: T.textMuted, cursor: "text", fontFamily: "inherit",
                }}>
                    <Icon name="search" size={14} color={T.textFaint} />
                    <span style={{ fontSize: 13, flex: 1, textAlign: "left" }}>Search anything...</span>
                    <span style={{ fontSize: 10, color: T.textFaint, padding: "2px 6px", background: T.bgHigh, borderRadius: 4, letterSpacing: 0.5 }}>⌘K</span>
                </button>

                {/* ── Search Modal ── */}
                {searchOpen && (
                    <div onClick={closeSearch} style={{
                        position: "fixed", inset: 0, background: "rgba(4,8,7,0.72)", backdropFilter: "blur(4px)",
                        zIndex: 600, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80,
                    }}>
                        <div onClick={e => e.stopPropagation()} style={{
                            width: "100%", maxWidth: 580, margin: "0 16px",
                            background: T.bgCard, border: `1px solid ${T.borderMid}`,
                            borderRadius: T.r14, boxShadow: "0 24px 64px rgba(0,0,0,0.6)", overflow: "hidden",
                        }}>
                            {/* Input row */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
                                <Icon name="search" size={16} color={T.j200} />
                                <input
                                    ref={searchInputRef}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search pages, orders, customers…"
                                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text, fontSize: 15, fontFamily: "inherit" }}
                                />
                                {searchLoading && <span style={{ fontSize: 11, color: T.textFaint, flexShrink: 0 }}>searching…</span>}
                                <kbd style={{ fontSize: 10, color: T.textFaint, padding: "2px 6px", background: T.bgHigh, borderRadius: 4, flexShrink: 0 }}>ESC</kbd>
                            </div>

                            {/* Results */}
                            <div style={{ maxHeight: 420, overflowY: "auto" }}>
                                {/* Pages */}
                                {searchResults.pages.length > 0 && (
                                    <div>
                                        <div style={{ padding: "10px 18px 4px", fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Pages</div>
                                        {searchResults.pages.map(p => (
                                            <button key={p.id} onClick={() => { router.push(p.href); closeSearch(); }}
                                                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.bgElev}
                                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                                            >
                                                <span style={{ width: 28, height: 28, borderRadius: T.r6, background: `${T.j300}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <Icon name="arrow-right" size={12} color={T.j200} />
                                                </span>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{p.label}</div>
                                                    <div style={{ fontSize: 11, color: T.textFaint }}>{p.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Orders */}
                                {searchResults.orders.length > 0 && (
                                    <div>
                                        <div style={{ padding: "10px 18px 4px", fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Orders</div>
                                        {searchResults.orders.map(o => (
                                            <button key={o.order_id} onClick={() => { router.push("/orders"); closeSearch(); }}
                                                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.bgElev}
                                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                                            >
                                                <span style={{ width: 28, height: 28, borderRadius: T.r6, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12 }}>📦</span>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>#{o.order_id}</div>
                                                    <div style={{ fontSize: 11, color: T.textFaint }}>{o.customers?.name || "Unknown customer"} · {o.status} · Rs {Number(o.total_amount || 0).toLocaleString()}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Customers */}
                                {searchResults.customers.length > 0 && (
                                    <div>
                                        <div style={{ padding: "10px 18px 4px", fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.07em" }}>Customers</div>
                                        {searchResults.customers.map(c => (
                                            <button key={c.id} onClick={() => { router.push("/customers"); closeSearch(); }}
                                                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.bgElev}
                                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                                            >
                                                <span style={{ width: 28, height: 28, borderRadius: "50%", background: T.bgHigh, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: T.j200 }}>
                                                    {(c.name || "?")[0].toUpperCase()}
                                                </span>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                                                    <div style={{ fontSize: 11, color: T.textFaint }}>{c.contact}{c.city ? ` · ${c.city}` : ""}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Empty state */}
                                {searchQuery.trim() && !searchLoading && searchResults.pages.length === 0 && searchResults.orders.length === 0 && searchResults.customers.length === 0 && (
                                    <div style={{ padding: "36px 18px", textAlign: "center", color: T.textFaint, fontSize: 13 }}>
                                        No results for "<span style={{ color: T.text }}>{searchQuery}</span>"
                                    </div>
                                )}

                                {/* Footer hint */}
                                <div style={{ padding: "8px 18px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 16, fontSize: 11, color: T.textFaint }}>
                                    <span>↵ to select</span>
                                    <span>↑↓ to navigate</span>
                                    <span>ESC to close</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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

            {/* ── Right: live badge + icons + avatar ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className="zyro-live-badge" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: T.j700, borderRadius: 20, border: `1px solid ${T.j500}33` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.j200 }}>Live Sync Status</span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>

                    {/* ── Support button ── */}
                    <div ref={supportRef} style={{ position: "relative" }}>
                        <IconBtn
                            icon="headset"
                            active={showSupport}
                            title="Help & Support"
                            onClick={openSupport}
                        />

                        {showSupport && (
                            <Popover width={240}>
                                <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${T.border}` }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Help & Support</div>
                                    <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>
                                        We typically reply within a few minutes
                                    </div>
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
                                            fontSize: 11, fontWeight: 600,
                                            display: "flex", alignItems: "center", gap: 4,
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
                            </Popover>
                        )}
                    </div>

                    {/* ── Notifications button ── */}
                    <div ref={notifRef} style={{ position: "relative" }}>
                        <IconBtn
                            icon="bell"
                            active={showNotifications}
                            title="Notifications"
                            onClick={openNotifications}
                            badge={unreadCount > 0 ? unreadCount : null}
                        />

                        {showNotifications && (
                            <Popover width={320}>
                                {/* Header */}
                                <div style={{
                                    padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Notifications</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {!notifLoading && notifications.length > 0 && (
                                            <span style={{ fontSize: 11, color: T.textFaint, background: T.bgHigh, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                                                {notifications.length}
                                            </span>
                                        )}
                                        <button
                                            onClick={fetchNotifications}
                                            title="Refresh"
                                            style={{ background: "none", border: "none", cursor: "pointer", color: T.textFaint, display: "flex", padding: 2, borderRadius: 4 }}
                                            onMouseEnter={e => e.currentTarget.style.color = T.textSub}
                                            onMouseLeave={e => e.currentTarget.style.color = T.textFaint}
                                        >
                                            <Icon name="refresh-cw" size={13} color="currentColor" />
                                        </button>
                                    </div>
                                </div>

                                {/* List */}
                                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                                    {notifLoading ? (
                                        // Skeleton
                                        [0, 1, 2].map(i => (
                                            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bgHigh, flexShrink: 0 }} />
                                                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                                    <div style={{ height: 11, background: T.bgHigh, borderRadius: 4, width: "60%" }} />
                                                    <div style={{ height: 9, background: T.bgElev, borderRadius: 4, width: "90%" }} />
                                                </div>
                                            </div>
                                        ))
                                    ) : notifications.length === 0 ? (
                                        <div style={{ padding: "32px 16px", textAlign: "center" }}>
                                            <div style={{ fontSize: 28, marginBottom: 10 }}>🎉</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>All caught up</div>
                                            <div style={{ fontSize: 12, color: T.textFaint, lineHeight: 1.5 }}>
                                                No pending orders, stock issues, or alerts right now.
                                            </div>
                                        </div>
                                    ) : (
                                        notifications.map((n, i) => (
                                            <button
                                                key={n.id}
                                                onClick={() => { setShowNotifications(false); router.push(n.href); }}
                                                style={{
                                                    width: "100%", display: "flex", alignItems: "flex-start", gap: 12,
                                                    padding: "12px 16px", background: "none", border: "none",
                                                    borderBottom: i < notifications.length - 1 ? `1px solid ${T.border}` : "none",
                                                    cursor: "pointer", textAlign: "left", transition: "background 0.12s",
                                                    fontFamily: "inherit",
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
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                {!notifLoading && notifications.length > 0 && (
                                    <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
                                        <button
                                            onClick={markAllRead}
                                            style={{
                                                width: "100%", background: "none", border: "none",
                                                fontSize: 12, fontWeight: 600, color: T.textFaint,
                                                cursor: "pointer", textAlign: "center",
                                                transition: "color 0.15s", fontFamily: "inherit",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = T.textSub}
                                            onMouseLeave={e => e.currentTarget.style.color = T.textFaint}
                                        >
                                            Mark all as read
                                        </button>
                                    </div>
                                )}
                            </Popover>
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
                        <Popover width={190} style={{ padding: "6px 0" }}>
                            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "User Profile"}</div>
                                <div style={{ fontSize: 10, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
                            </div>
                            {[
                                { label: "My Profile",    icon: "user",        href: "/profile" },
                                { label: "Pricing Plans", icon: "credit-card", href: "/plans" },
                            ].map(item => (
                                <button key={item.href} onClick={() => { setShowDropdown(false); router.push(item.href); }} style={{
                                    width: "100%", padding: "10px 16px", background: "none", border: "none",
                                    color: T.textSub, fontSize: 13, fontWeight: 600, textAlign: "left",
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                                    transition: "all 0.2s", fontFamily: "inherit",
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
                                cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                                transition: "all 0.2s", fontFamily: "inherit",
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                            >
                                <Icon name="log-out" size={14} color={T.red} />
                                Sign Out
                            </button>
                        </Popover>
                    )}
                </div>
            </div>
        </header>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconBtn({ icon, active, title, onClick, badge }) {
    const [hovered, setHovered] = useState(false);
    const lit = active || hovered;
    return (
        <button
            onClick={onClick}
            title={title}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 34, height: 34, borderRadius: "50%", position: "relative",
                background: lit ? T.bgHigh : T.bgElev,
                border: `1px solid ${lit ? T.borderMid : T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.15s",
            }}
        >
            <Icon name={icon} size={16} color={lit ? T.textSub : T.textMuted} />
            {badge != null && (
                <div style={{
                    position: "absolute", top: badge > 9 ? 4 : 6, right: badge > 9 ? 3 : 6,
                    minWidth: badge > 9 ? 16 : 8, height: badge > 9 ? 16 : 8,
                    background: T.red, borderRadius: badge > 9 ? 8 : "50%",
                    border: `2px solid ${T.bgElev}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#fff",
                    padding: badge > 9 ? "0 3px" : 0,
                }}>
                    {badge > 9 ? "9+" : null}
                </div>
            )}
        </button>
    );
}

function Popover({ children, width, style }) {
    return (
        <div style={{
            position: "absolute", top: 42, right: 0, width,
            background: T.bgCard, border: `1px solid ${T.borderMid}`,
            borderRadius: 12, boxShadow: T.shadowLg, zIndex: 1000, overflow: "hidden",
            ...style,
        }}>
            {children}
        </div>
    );
}
