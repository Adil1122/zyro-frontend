"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/components/dashboard/constants";
import Icon from "@/components/dashboard/Icon";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        timezone: "Asia/Karachi",
        currency: "PKR",
        stripe_publishable_key: "",
        stripe_secret_key: "",
        jazzcash_merchant_id: "",
        jazzcash_password: "",
        jazzcash_integrity_salt: "",
        easypaisa_merchant_id: "",
        easypaisa_store_id: "",
        easypaisa_hash_key: ""
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('zyro_user');
        if (!storedUser) {
            router.push("/login");
            return;
        }

        const userData = JSON.parse(storedUser);
        setUser(userData);
        setFormData({
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            timezone: userData.timezone || "Asia/Karachi",
            currency: userData.currency || "PKR",
            stripe_publishable_key: userData.stripe_publishable_key || "",
            stripe_secret_key: userData.stripe_secret_key || "",
            jazzcash_merchant_id: userData.jazzcash_merchant_id || "",
            jazzcash_password: userData.jazzcash_password || "",
            jazzcash_integrity_salt: userData.jazzcash_integrity_salt || "",
            easypaisa_merchant_id: userData.easypaisa_merchant_id || "",
            easypaisa_store_id: userData.easypaisa_store_id || "",
            easypaisa_hash_key: userData.easypaisa_hash_key || ""
        });
        setIsLoading(false);
    }, [router]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const { data, error } = await supabase
                .from('users')
                .update({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    timezone: formData.timezone,
                    currency: formData.currency,
                    stripe_publishable_key: formData.stripe_publishable_key,
                    stripe_secret_key: formData.stripe_secret_key,
                    jazzcash_merchant_id: formData.jazzcash_merchant_id,
                    jazzcash_password: formData.jazzcash_password,
                    jazzcash_integrity_salt: formData.jazzcash_integrity_salt,
                    easypaisa_merchant_id: formData.easypaisa_merchant_id,
                    easypaisa_store_id: formData.easypaisa_store_id,
                    easypaisa_hash_key: formData.easypaisa_hash_key
                })
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            localStorage.setItem('zyro_user', JSON.stringify(data));
            window.dispatchEvent(new Event('authChange'));
            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (err) {
            console.error("Error updating profile:", err);
            setMessage({ type: "error", text: err.message || "Failed to update profile" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return null;

    const timezones = [
        "Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "America/New_York", "Asia/Singapore"
    ];

    const currencies = [
        "PKR", "USD", "AED", "SAR", "GBP", "EUR"
    ];

    return (
        <div style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto" }}>
            <div style={{ marginBottom: 30 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: 0 }}>Account Settings</h1>
                <p style={{ fontSize: 14, color: T.textMuted, marginTop: 5 }}>Manage your profile and preferences</p>
            </div>

            <div style={{ 
                background: T.bgCard, borderRadius: T.r12, border: `1px solid ${T.border}`,
                overflow: "hidden", boxShadow: T.shadowMd
            }}>
                <form onSubmit={handleSave} style={{ padding: 30, display: "flex", flexDirection: "column", gap: 20 }}>
                    {message.text && (
                        <div style={{
                            padding: 12, borderRadius: T.r6,
                            background: message.type === "success" ? "rgba(92,168,124,0.1)" : "rgba(248,113,113,0.1)",
                            border: `1px solid ${message.type === "success" ? T.green : T.red}`,
                            color: message.type === "success" ? T.green : T.red,
                            fontSize: 13, fontWeight: 600
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Full Name</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Email Address</label>
                            <input
                                type="email"
                                style={inputStyle}
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Phone Number</label>
                            <input
                                type="tel"
                                style={inputStyle}
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Timezone</label>
                            <select
                                style={inputStyle}
                                value={formData.timezone}
                                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                            >
                                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Default Currency</label>
                            <select
                                style={inputStyle}
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            >
                                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: 30, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Stripe Configuration</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Stripe Publishable Key</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.stripe_publishable_key || ""}
                                onChange={e => setFormData({ ...formData, stripe_publishable_key: e.target.value })}
                                placeholder="pk_test_..."
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Stripe Secret Key</label>
                            <input
                                type="password"
                                style={inputStyle}
                                value={formData.stripe_secret_key || ""}
                                onChange={e => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                                placeholder="sk_test_..."
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 30, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>JazzCash Configuration</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Merchant ID</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.jazzcash_merchant_id || ""}
                                onChange={e => setFormData({ ...formData, jazzcash_merchant_id: e.target.value })}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Password</label>
                            <input
                                type="password"
                                style={inputStyle}
                                value={formData.jazzcash_password || ""}
                                onChange={e => setFormData({ ...formData, jazzcash_password: e.target.value })}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Integrity Salt</label>
                            <input
                                type="password"
                                style={inputStyle}
                                value={formData.jazzcash_integrity_salt || ""}
                                onChange={e => setFormData({ ...formData, jazzcash_integrity_salt: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 30, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>EasyPaisa Configuration</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Merchant ID</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.easypaisa_merchant_id || ""}
                                onChange={e => setFormData({ ...formData, easypaisa_merchant_id: e.target.value })}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Store ID</label>
                            <input
                                type="text"
                                style={inputStyle}
                                value={formData.easypaisa_store_id || ""}
                                onChange={e => setFormData({ ...formData, easypaisa_store_id: e.target.value })}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Hash Key</label>
                            <input
                                type="password"
                                style={inputStyle}
                                value={formData.easypaisa_hash_key || ""}
                                onChange={e => setFormData({ ...formData, easypaisa_hash_key: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                padding: "10px 24px",
                                background: T.gradBtn, color: "#fff",
                                border: "none", borderRadius: T.r6,
                                fontSize: 14, fontWeight: 600,
                                cursor: isSaving ? "not-allowed" : "pointer",
                                opacity: isSaving ? 0.7 : 1,
                                boxShadow: T.glowBtn,
                                transition: "all 0.2s"
                            }}
                        >
                            {isSaving ? "Saving Changes..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Subscription Management */}
            {user?.plan_id && (
                <div style={{ 
                    marginTop: 40, background: T.bgCard, borderRadius: T.r12, border: `1px solid ${T.border}`,
                    overflow: "hidden", boxShadow: T.shadowMd
                }}>
                    <div style={{ padding: 25, borderBottom: `1px solid ${T.border}`, background: T.bgElev }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Subscription Management</h2>
                    </div>
                    <div style={{ padding: 30 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Current Plan: {user.plans?.name || 'Active Plan'}</div>
                                <div style={{ fontSize: 12, color: T.textMuted }}>Period Ends: {new Date(user.current_period_end).toLocaleDateString()}</div>
                                <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>Status: {user.subscription_status}</div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm("Are you sure you want to cancel? You will receive a pro-rated refund for the remaining time.")) {
                                        try {
                                            const res = await fetch("/api/payments/stripe", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ userId: user.id, action: "cancel" })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                alert(`Subscription cancelled. Refunded: PKR ${data.refunded.toFixed(2)}`);
                                                window.location.reload();
                                            } else {
                                                throw new Error(data.error);
                                            }
                                        } catch (err) {
                                            alert(err.message);
                                        }
                                    }
                                }}
                                style={{
                                    padding: "8px 16px", background: "rgba(248,113,113,0.1)", color: T.red,
                                    border: `1px solid ${T.red}44`, borderRadius: T.r6, fontSize: 13,
                                    fontWeight: 600, cursor: "pointer"
                                }}
                            >
                                Cancel Subscription
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputGroupStyle = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle = { fontSize: 13, fontWeight: 600, color: T.textSub };
const inputStyle = {
    width: "100%", height: 40, padding: "0 12px",
    background: T.bgHigh, border: `1px solid ${T.borderBright}`,
    borderRadius: T.r6, color: T.text, fontSize: 14,
    outline: "none"
};
