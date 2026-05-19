"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardPage from "@/components/dashboard/pages/DashboardPage";

export default function DashboardRoute() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem('zyro_user');
        return storedUser ? true : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem('zyro_user');
        return !storedUser;
      } catch (e) {
        return true;
      }
    }
    return true;
  });

  useEffect(() => {
    // Fast auth check - only check localStorage first
    const checkAuthFast = () => {
      try {
        const storedUser = localStorage.getItem('zyro_user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        
        if (!user) {
          // Not logged in - redirect immediately
          router.push("/login");
          return;
        }
        
        // User exists - set authenticated and load dashboard
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      }
    };

    // Run fast check immediately
    checkAuthFast();
  }, [router]);

  // Show minimal loading state while checking auth
  if (isLoading || isAuthenticated === null) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A1C16",
        color: "#B7E5BA"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px",
            height: "40px",
            margin: "0 auto 16px",
            border: "3px solid rgba(183, 229, 186, 0.3)",
            borderTop: "3px solid #B7E5BA",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <div style={{ fontSize: "14px", fontWeight: "500" }}>Loading Zyro Dashboard...</div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Only load dashboard if authenticated
  return <DashboardPage />;
}
