"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "@/components/dashboard/constants";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc('check_user_login', {
                p_email: email,
                p_password: password
            });

            if (error || !data || data.length === 0) {
                throw new Error('Invalid email or password');
            }

            const user = data[0];

            // Save user to localStorage for custom auth
            localStorage.setItem('zyro_user', JSON.stringify(user));

            // Trigger a custom event so the layout can catch it
            window.dispatchEvent(new Event('authChange'));

            router.push("/");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", height: "100%", minHeight: "100vh",
            background: T.bg, padding: 20,
        }}>
            <div style={{
                width: "100%", maxWidth: 400,
                background: T.bgCard, borderRadius: T.r12,
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowLg,
                overflow: "hidden"
            }}>
                {/* Header */}
                <div style={{
                    padding: "30px 30px 20px",
                    borderBottom: `1px solid ${T.borderMid}`,
                    background: T.bgElev,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: T.r6,
                            background: T.gradLogoTile,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: 800, fontSize: 18,
                            boxShadow: "0 2px 10px rgba(92,168,124,0.3)"
                        }}>
                            Z
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: "#fff" }}>
                            Zyro
                        </span>
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: T.text }}>Welcome back</h2>
                    <p style={{ fontSize: 14, color: T.textMuted, marginTop: 5, margin: 0 }}>
                        Log in to your multitenant dashboard
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ padding: 30, display: "flex", flexDirection: "column", gap: 20 }}>
                    {error && (
                        <div style={{
                            padding: 12, borderRadius: T.r6,
                            background: T.redBg, border: `1px solid rgba(248,113,113,0.3)`,
                            color: T.red, fontSize: 13, fontWeight: 500
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            style={{
                                width: "100%", height: 40, padding: "0 12px",
                                background: T.bgHigh, border: `1px solid ${T.borderBright}`,
                                borderRadius: T.r6, color: T.text, fontSize: 14,
                                outline: "none", transition: "all 0.2s"
                            }}
                            onFocus={(e) => { e.target.style.borderColor = T.j300; e.target.style.boxShadow = T.glowGreen; }}
                            onBlur={(e) => { e.target.style.borderColor = T.borderBright; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>Password</label>
                            <span style={{ fontSize: 12, color: T.j300, cursor: "pointer" }}>Forgot?</span>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: "100%", height: 40, padding: "0 12px",
                                background: T.bgHigh, border: `1px solid ${T.borderBright}`,
                                borderRadius: T.r6, color: T.text, fontSize: 14,
                                outline: "none", transition: "all 0.2s"
                            }}
                            onFocus={(e) => { e.target.style.borderColor = T.j300; e.target.style.boxShadow = T.glowGreen; }}
                            onBlur={(e) => { e.target.style.borderColor = T.borderBright; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            height: 44, marginTop: 10,
                            background: T.gradBtn, color: "#fff",
                            border: "none", borderRadius: T.r6,
                            fontSize: 14, fontWeight: 600,
                            cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.7 : 1,
                            boxShadow: T.glowBtn,
                            transition: "all 0.2s",
                        }}
                    >
                        {isLoading ? "Authenticating..." : "Sign In"}
                    </button>

                    <div style={{ textAlign: "center", marginTop: 15 }}>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
                            To setup new tenant, run <code style={{ background: T.bgHigh, padding: "2px 6px", borderRadius: 4, color: T.j200 }}>setup_multitenant.sql</code>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
