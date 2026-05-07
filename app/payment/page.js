"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { T } from "@/components/dashboard/constants";
import Icon from "@/components/dashboard/Icon";

export default function PaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get("planId");
    
    const [selectedMethod, setSelectedMethod] = useState("stripe");
    const [plan, setPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const [mobileNumber, setMobileNumber] = useState("");
    const [cardDetails, setCardDetails] = useState({ number: "", exp: "", cvc: "" });

    useEffect(() => {
        if (!planId) {
            router.push("/plans");
            return;
        }

        const fetchPlan = async () => {
            try {
                const res = await fetch("/api/plans");
                const data = await res.json();
                const found = data.plans?.find(p => p.id === planId);
                if (found) setPlan(found);
                else router.push("/plans");
            } catch (err) {
                console.error("Error fetching plan:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlan();
    }, [planId, router]);

    const handlePayment = async () => {
        const storedUser = localStorage.getItem('zyro_user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (!user) return router.push("/login");

        setIsProcessing(true);
        
        try {
            let endpoint = "";
            let body = { planId, userId: user.id };

            if (selectedMethod === "stripe") {
                endpoint = "/api/payments/stripe";
                body.paymentMethodId = "pm_card_visa"; // In real app, get from Stripe Elements
            } else if (selectedMethod === "jazzcash") {
                endpoint = "/api/payments/jazzcash";
                body.mobileNumber = mobileNumber;
            } else if (selectedMethod === "easypaisa") {
                endpoint = "/api/payments/easypaisa";
                body.mobileNumber = mobileNumber;
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                alert(`Payment successful via ${selectedMethod}! Your plan is now active.`);
                window.dispatchEvent(new Event('authChange'));
                router.push("/");
            } else {
                throw new Error(data.error || "Payment failed");
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: T.bg, color: T.text }}>Loading...</div>;
    }

    const methods = [
        { id: "stripe", name: "Stripe (Credit/Debit Card)", icon: "credit-card", color: "#635BFF" },
        { id: "jazzcash", name: "JazzCash Mobile Wallet", icon: "wallet", color: "#D3122A" },
        { id: "easypaisa", name: "EasyPaisa Mobile Wallet", icon: "wallet", color: "#00A852" },
    ];

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", minHeight: "100vh", background: T.bg, padding: 20,
        }}>
            <div style={{
                width: "100%", maxWidth: 500,
                background: T.bgCard, borderRadius: T.r12,
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowLg,
                overflow: "hidden"
            }}>
                <div style={{ padding: "35px 30px 25px", borderBottom: `1px solid ${T.borderMid}`, background: T.bgElev }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: T.text, letterSpacing: "-0.5px" }}>Checkout</h2>
                    <p style={{ fontSize: 14, color: T.textMuted, marginTop: 6, margin: 0 }}>
                        Activate your <span style={{ color: T.j300, fontWeight: 700 }}>{plan?.name}</span> subscription
                    </p>
                </div>

                <div style={{ padding: 30 }}>
                    <div style={{ 
                        background: T.bgHigh, padding: "20px 24px", borderRadius: T.r12, 
                        marginBottom: 28, border: `1px solid ${T.borderBright}`,
                        display: "flex", flexDirection: "column", gap: 10
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.5px" }}>Plan Details</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.j300 }}>{plan?.name}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 14, color: T.textSub }}>Total Amount</span>
                            <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 24, fontWeight: 900, color: T.green }}>{plan?.currency} {parseFloat(plan?.price).toLocaleString()}</span>
                                <div style={{ fontSize: 11, color: T.textFaint }}>per month</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 25 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, color: T.textSub, marginBottom: 4 }}>Select Payment Method</label>
                        {methods.map(method => (
                            <div 
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                style={{
                                    padding: "18px 20px",
                                    borderRadius: T.r12,
                                    background: selectedMethod === method.id ? `${method.color}15` : T.bgElev,
                                    border: `2px solid ${selectedMethod === method.id ? method.color : T.border}`,
                                    display: "flex", alignItems: "center", gap: 18,
                                    cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    transform: selectedMethod === method.id ? "scale(1.02)" : "none",
                                }}
                            >
                                <div style={{
                                    width: 22, height: 22, borderRadius: "50%",
                                    border: `2px solid ${selectedMethod === method.id ? method.color : T.textFaint}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: selectedMethod === method.id ? method.color : "transparent",
                                    transition: "all 0.2s"
                                }}>
                                    {selectedMethod === method.id && <Icon name="check" size={12} color="#fff" />}
                                </div>
                                <div style={{ 
                                    width: 40, height: 40, borderRadius: T.r8, background: T.bgHigh, 
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: `1px solid ${T.border}`
                                }}>
                                    <Icon name={method.icon} size={20} color={selectedMethod === method.id ? method.color : T.textMuted} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: selectedMethod === method.id ? T.text : T.textSub }}>{method.name}</div>
                                    <div style={{ fontSize: 11, color: T.textFaint }}>Secure encrypted payment</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Additional Fields based on method */}
                    {(selectedMethod === "jazzcash" || selectedMethod === "easypaisa") && (
                        <div style={{ marginBottom: 25, display: "flex", flexDirection: "column", gap: 8 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>
                                {selectedMethod === "jazzcash" ? "JazzCash" : "EasyPaisa"} Mobile Number
                            </label>
                            <input
                                type="tel"
                                placeholder="03xxxxxxxxx"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                style={{
                                    width: "100%", height: 44, padding: "0 15px",
                                    background: T.bgElev, border: `1px solid ${T.borderBright}`,
                                    borderRadius: T.r8, color: T.text, fontSize: 15,
                                    outline: "none"
                                }}
                            />
                        </div>
                    )}

                    {selectedMethod === "stripe" && (
                        <div style={{ marginBottom: 25, display: "flex", flexDirection: "column", gap: 12 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub }}>Card Information</label>
                            <div style={{ 
                                padding: "15px", background: T.bgElev, border: `1px solid ${T.borderBright}`,
                                borderRadius: T.r8, display: "flex", flexDirection: "column", gap: 10
                            }}>
                                <input type="text" placeholder="Card Number" style={{ background: "none", border: "none", borderBottom: `1px solid ${T.border}`, color: T.text, outline: "none", padding: "5px 0" }} />
                                <div style={{ display: "flex", gap: 15 }}>
                                    <input type="text" placeholder="MM/YY" style={{ background: "none", border: "none", borderBottom: `1px solid ${T.border}`, color: T.text, outline: "none", padding: "5px 0", width: "100%" }} />
                                    <input type="text" placeholder="CVC" style={{ background: "none", border: "none", borderBottom: `1px solid ${T.border}`, color: T.text, outline: "none", padding: "5px 0", width: "100%" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        style={{
                            width: "100%", height: 54,
                            background: T.gradBtn, color: "#fff",
                            border: "none", borderRadius: T.r12,
                            fontSize: 16, fontWeight: 800,
                            cursor: isProcessing ? "not-allowed" : "pointer",
                            opacity: isProcessing ? 0.7 : 1,
                            boxShadow: T.glowBtn,
                            transition: "all 0.2s",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 10
                        }}
                    >
                        {isProcessing ? (
                            <>
                                <span style={{ animation: "spin 1s linear infinite" }}>◌</span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Icon name="lock" size={16} />
                                Pay {plan?.currency} {parseFloat(plan?.price).toLocaleString()}
                            </>
                        )}
                    </button>

                    <div style={{ textAlign: "center", marginTop: 25 }}>
                        <div style={{ 
                            fontSize: 12, color: T.textFaint, display: "flex", 
                            alignItems: "center", justifyContent: "center", gap: 6,
                            background: "rgba(0,0,0,0.2)", padding: "8px 15px", borderRadius: 20,
                            width: "fit-content", margin: "0 auto"
                        }}>
                            <Icon name="shield-check" size={14} color={T.green} />
                            SSL Secured 256-bit AES Encryption
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
