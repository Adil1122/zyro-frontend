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

    const isLoginPage = pathname === "/login";
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        setMounted(true);

        const checkAuth = () => {
            const storedUser = localStorage.getItem('zyro_user');
            const currentUser = storedUser ? JSON.parse(storedUser) : null;
            setUser(currentUser);
            setLoadingAuth(false);

            if (!currentUser && !isLoginPage) {
                router.push("/login");
            } else if (currentUser && isLoginPage) {
                router.push("/");
            }
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
    }, [pathname, isLoginPage, router]);

    if (!mounted || loadingAuth) return null;

    if (isLoginPage) {
        return <div style={{ width: "100%", height: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif" }}>{children}</div>;
    }

    if (isMobile && !isLoginPage) {
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
            <Sidebar
                page={page}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
            />

            {/* MAIN CONTENT AREA */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                {/* TOP HEADER */}
                <Header />

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
