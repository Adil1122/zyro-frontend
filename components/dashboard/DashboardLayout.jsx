"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "./constants";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Icon from "./Icon";

const BOTTOM_NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/dashboard", match: (p) => p === "/" || p === "/dashboard" },
    { id: "couriers",  label: "Couriers",  icon: "couriers",  href: "/couriers",  match: (p) => p.startsWith("/couriers") },
    { id: "whatsapp",  label: "WhatsApp",  icon: "whatsapp",  href: "/whatsapp",  match: (p) => p.startsWith("/whatsapp") },
    { id: "marketing", label: "Marketing", icon: "marketing", href: "/marketing", match: (p) => p.startsWith("/marketing") },
    { id: "settings",  label: "Settings",  icon: "settings",  href: "/settings",  match: (p) => p.startsWith("/settings") },
];

export default function DashboardLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [badgeCounts, setBadgeCounts] = useState({});
    const pathname = usePathname();

    // Map pathname to page id
    const getPageFromPath = (path) => {
        if (path === "/") return "dashboard";
        return path.replace("/", "");
    };

    const page = getPageFromPath(pathname);

    const isLoginPage = pathname === "/login" || pathname === "/login-old";
    const isSignupPage = pathname === "/signup" || pathname === "/signup-old";
    const isPlansPage = pathname === "/plans";
    const isOnboardingPage = pathname === "/onboarding";
    const isForgotPasswordPage = pathname === "/forgot-password" || pathname === "/reset-password";
    const isPrivacyPage = pathname === "/privacy";
    const isPublicPage = isLoginPage || isSignupPage || isOnboardingPage || isForgotPasswordPage;

    const router = useRouter();
    
    // Initialize state synchronously from localStorage to prevent mounting lag
    const [user, setUser] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedUser = localStorage.getItem('zyro_user');
                return storedUser ? JSON.parse(storedUser) : null;
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    const [loadingAuth, setLoadingAuth] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedUser = localStorage.getItem('zyro_user');
                return !storedUser; // false if user exists (no loading needed), true if not
            } catch (e) {
                return true;
            }
        }
        return true;
    });

    useEffect(() => {
        setMounted(true);

        const checkAuth = async () => {
            const storedUser = localStorage.getItem('zyro_user');
            const currentUser = storedUser ? JSON.parse(storedUser) : null;
            
            if (!currentUser) {
                if (!isPublicPage && !isPlansPage && !isPrivacyPage) {
                    router.push("/login");
                }
                setLoadingAuth(false);
                return;
            }

            // Set user immediately from localStorage for fast response
            setUser(currentUser);
            setLoadingAuth(false);

            // If logged in and on login page, redirect immediately
            if (currentUser && isLoginPage) {
                router.push("/dashboard");
                return;
            }

            // Defer database check to background to avoid blocking UI
            setTimeout(async () => {
                try {
                    const { data: dbUser, error } = await supabase
                        .from('users')
                        .select('*, plans(*)')
                        .eq('id', currentUser.id)
                        .single();

                    if (dbUser && !error) {
                        setUser(dbUser);
                        localStorage.setItem('zyro_user', JSON.stringify(dbUser));

                        // Onboarding redirect check
                        const isOnboardingCompleted = dbUser.onboarding_completed === true;
                        if (!isOnboardingCompleted && !isOnboardingPage && !isLoginPage && !isSignupPage && !isPlansPage) {
                            router.push("/onboarding");
                            return;
                        }

                        // Trial check (with fallback to created_at + 14 days if trial_ends_at is missing)
                        let trialEndsAt;
                        if (dbUser.trial_ends_at) {
                            trialEndsAt = new Date(dbUser.trial_ends_at);
                        } else if (dbUser.created_at) {
                            trialEndsAt = new Date(dbUser.created_at);
                            trialEndsAt.setDate(trialEndsAt.getDate() + 14);
                        } else {
                            trialEndsAt = new Date();
                            trialEndsAt.setDate(trialEndsAt.getDate() + 14);
                        }
                        
                        const now = new Date();
                        const isTrialExpired = now > trialEndsAt;
                        const hasPlan = !!dbUser.plan_id;

                        if (isTrialExpired && !hasPlan && !isPlansPage && !isPublicPage && pathname !== "/payment" && pathname !== "/profile") {
                            router.push("/plans");
                        }
                    }
                } catch (err) {
                    console.error("Auth sync error:", err);
                }
            }, 100); // Small delay to not block initial render
        };

        checkAuth();

        // Fetch live nav badge counts
        const fetchBadges = async () => {
            try {
                const storedUser = localStorage.getItem('zyro_user');
                const uid = storedUser ? JSON.parse(storedUser)?.id : null;
                if (!uid) return;
                const res = await fetch(`/api/nav-badges?userId=${encodeURIComponent(uid)}`);
                if (res.ok) setBadgeCounts(await res.json());
            } catch { /* non-fatal */ }
        };
        fetchBadges();
        const badgeInterval = setInterval(fetchBadges, 5 * 60 * 1000);

        // Listen for storage changes across tabs or custom authChange event
        window.addEventListener('storage', checkAuth);
        window.addEventListener('authChange', checkAuth);

        return () => {
            clearInterval(badgeInterval);
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('authChange', checkAuth);
        };
    }, [pathname, isLoginPage, isSignupPage, isPlansPage, router]);

    if (isPrivacyPage) return <>{children}</>;

    if (!mounted || loadingAuth) return null;

    let isTrialExpired = false;
    let hasPlan = false;
    if (user) {
        let trialEndsAt;
        if (user.trial_ends_at) {
            trialEndsAt = new Date(user.trial_ends_at);
        } else if (user.created_at) {
            trialEndsAt = new Date(user.created_at);
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        } else {
            trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        }
        isTrialExpired = new Date() > trialEndsAt;
        hasPlan = !!user.plan_id;
    }
    const isRestricted = isTrialExpired && !hasPlan;
    const showSidebar = !isPlansPage && !isRestricted;

    if (isLoginPage || isSignupPage || isOnboardingPage || isForgotPasswordPage) {
        return <div style={{ 
            width: "100%", 
            minHeight: "100vh", 
            background: T.bg, 
            color: T.text, 
            fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
            overflow: "auto"
        }}>{children}</div>;
    }

    return (
        <div className="zyro-app" style={{
            width: "100%", height: "100dvh", background: T.bg,
            display: "flex", color: T.text, fontSize: 13,
            fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
            overflow: "hidden",
        }}>
            {/* MOBILE DRAWER BACKDROP */}
            {drawerOpen && (
                <div className="zyro-sidebar-backdrop" onClick={() => setDrawerOpen(false)} />
            )}

            {/* LEFT SIDEBAR */}
            {showSidebar && (
                <Sidebar
                    page={page}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    badgeCounts={badgeCounts}
                    drawerOpen={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                />
            )}

            {/* MAIN CONTENT AREA */}
            <div className="zyro-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                {/* TOP HEADER */}
                <Header user={user} onMenuToggle={() => setDrawerOpen(o => !o)} />

                {/* PAGE CONTENT */}
                <div className="zyro-page-content" style={{ flex: 1, overflow: "auto", background: T.bg }}>
                    {children}
                </div>

                {/* BOTTOM STATUS BAR (Global) */}
                <div className="zyro-statusbar" style={{
                    height: 28, background: T.bgElev, borderTop: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 14px", fontSize: 10, fontWeight: 600, color: T.textFaint,
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", gap: 14 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: T.green }} />
                            Zyro Core Engine v3.8.2
                        </span>
                        <span>·</span>
                        <span>2 APIs Active</span>
                        <span>·</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: T.j300 }} />
                            Live Sync: 100%
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 14 }}>
                        <span>Last sync: Just now</span>
                        <span>Karachi, PK</span>
                    </div>
                </div>
            </div>

            {/* MOBILE BOTTOM NAV */}
            {showSidebar && (
                <nav className="zyro-bottom-nav" style={{
                    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
                    height: 60, background: T.bgCard,
                    borderTop: `1px solid ${T.border}`,
                    display: "none",
                    alignItems: "stretch",
                    paddingBottom: "env(safe-area-inset-bottom)",
                }}>
                    {BOTTOM_NAV_ITEMS.map(item => {
                        const active = item.match(pathname);
                        return (
                            <button key={item.id} onClick={() => router.push(item.href)} style={{
                                flex: 1, display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center", gap: 3,
                                background: "none", border: "none", cursor: "pointer",
                                color: active ? T.j200 : T.textFaint,
                                fontSize: 9, fontWeight: active ? 700 : 500,
                                fontFamily: "inherit", padding: "6px 2px",
                                position: "relative", transition: "color 0.15s",
                            }}>
                                {active && (
                                    <span style={{
                                        position: "absolute", top: 0, left: "25%", right: "25%",
                                        height: 2, borderRadius: "0 0 3px 3px",
                                        background: T.j200,
                                    }} />
                                )}
                                <Icon name={item.icon} size={20} color={active ? T.j200 : T.textFaint} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Nunito:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.bgHigh}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.bgActive}; }
      `}} />
        </div>
    );
}
