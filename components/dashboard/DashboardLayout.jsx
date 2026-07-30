"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "./constants";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ZyroMobile from "./MobileApp";

export default function DashboardLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
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
                if (!isPublicPage && !isPlansPage) {
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

        // Listen for storage changes across tabs or custom authChange event
        window.addEventListener('storage', checkAuth);
        window.addEventListener('authChange', checkAuth);

        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('authChange', checkAuth);
            window.removeEventListener('resize', handleResize);
        };
    }, [pathname, isLoginPage, isSignupPage, isPlansPage, router]);

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

    if (isMobile && !isPublicPage) {
        return <ZyroMobile />;
    }

    return (
        <div style={{
            width: "100%", height: "100vh", background: T.bg,
            display: "flex", color: T.text, fontSize: 13,
            fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
            overflow: "hidden",
        }}>
            {/* LEFT SIDEBAR */}
            {showSidebar && (
                <Sidebar
                    page={page}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                />
            )}

            {/* MAIN CONTENT AREA */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                {/* TOP HEADER */}
                <Header user={user} />

                {/* PAGE CONTENT */}
                <div style={{ flex: 1, overflow: "auto", background: T.bg }}>
                    {children}
                </div>

                {/* BOTTOM STATUS BAR (Global) */}
                <div style={{
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
