"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { T } from "./constants";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Map pathname to page id
    const getPageFromPath = (path) => {
        if (path === "/") return "dashboard";
        return path.replace("/", "");
    };

    const page = getPageFromPath(pathname);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

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
