"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { T } from "@/components/dashboard/constants";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Call the RPC to register
            const { data, error: rpcError } = await supabase.rpc('register_user', {
                p_name: name,
                p_email: email,
                p_password: password,
                p_phone: phone
            });

            if (rpcError) {
                console.error("RPC Error:", rpcError);
                throw new Error(rpcError.message || 'Signup failed. Please ensure the database function is created.');
            }
            
            if (!data || (Array.isArray(data) && data.length === 0)) {
                throw new Error('Signup failed. No user data returned.');
            }

            const user = Array.isArray(data) ? data[0] : data;

            // Save user to localStorage for custom auth
            localStorage.setItem('zyro_user', JSON.stringify(user));

            // Trigger a custom event so the layout can catch it
            window.dispatchEvent(new Event('authChange'));

            // Redirect to plans page
            router.push("/plans");
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
                width: "100%", maxWidth: 450,
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
                    <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: T.text }}>Create Account</h2>
                    <p style={{ fontSize: 14, color: T.textMuted, marginTop: 5, margin: 0 }}>
                        Get started with Pakistan's First AI Commerce OS
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSignup} style={{ padding: 30, display: "flex", flexDirection: "column", gap: 18 }}>
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
                        <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>Phone Number</label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="03xx xxxxxxx"
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
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
                        {isLoading ? "Creating Account..." : "Sign Up"}
                    </button>

                    <div style={{ textAlign: "center", marginTop: 10 }}>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
                            Already have an account? <span 
                                onClick={() => router.push("/login")}
                                style={{ color: T.j300, cursor: "pointer", fontWeight: 600 }}
                            >
                                Sign In
                            </span>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%", height: 40, padding: "0 12px",
    background: T.bgHigh, border: `1px solid ${T.borderBright}`,
    borderRadius: T.r6, color: T.text, fontSize: 14,
    outline: "none", transition: "all 0.2s"
};

const handleFocus = (e) => {
    e.target.style.borderColor = T.j300;
    e.target.style.boxShadow = T.glowGreen;
};

const handleBlur = (e) => {
    e.target.style.borderColor = T.borderBright;
    e.target.style.boxShadow = "none";
};
