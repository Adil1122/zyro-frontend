"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { T } from "@/components/dashboard/constants";
import Icon from "@/components/dashboard/Icon";
import { supabase } from "@/lib/supabase";

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

    // Manual Payment States (EasyPaisa/JazzCash)
    const [showManualModal, setShowManualModal] = useState(false);
    const [senderNumber, setSenderNumber] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [screenshotBase64, setScreenshotBase64] = useState("");
    const [screenshotName, setScreenshotName] = useState("");
    const [copiedText, setCopiedText] = useState(false);

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

    // Handle standard payments or open manual verification modal
    const handlePayment = async () => {
        const storedUser = localStorage.getItem('zyro_user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (!user) return router.push("/login");

        if (selectedMethod === "jazzcash" || selectedMethod === "easypaisa") {
            setSenderNumber(mobileNumber);
            setShowManualModal(true);
            return;
        }

        setIsProcessing(true);
        
        try {
            let endpoint = "/api/payments/stripe";
            let body = { 
                planId, 
                userId: user.id, 
                paymentMethodId: "pm_card_visa" // In real app, get from Stripe Elements
            };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                let alertMsg = `Payment successful via Stripe! Your plan is now active.`;
                if (data.refunded > 0) {
                    alertMsg += ` Previous plan cancelled, pro-rated refund of PKR ${parseFloat(data.refunded).toFixed(2)} has been processed.`;
                }
                alert(alertMsg);

                // Fetch updated user from DB to keep localstorage fresh
                const { data: updatedUser, error: fetchErr } = await supabase
                    .from('users')
                    .select('*, plans(*)')
                    .eq('id', user.id)
                    .single();
                if (!fetchErr && updatedUser) {
                    localStorage.setItem('zyro_user', JSON.stringify(updatedUser));
                }

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

    // Handle Manual EasyPaisa / JazzCash Submission
    const handleManualPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!senderNumber || !transactionId || !screenshotBase64) {
            alert("Please provide the sender number, transaction ID, and payment screenshot.");
            return;
        }

        const storedUser = localStorage.getItem('zyro_user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (!user) return router.push("/login");

        setIsProcessing(true);
        try {
            const endpoint = `/api/payments/${selectedMethod}`;
            const body = {
                planId,
                userId: user.id,
                senderNumber,
                transactionId,
                screenshot: screenshotBase64
            };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                alert(data.message || `Manual receipt submitted successfully!`);
                
                // Fetch updated user from DB to keep localstorage fresh
                const { data: updatedUser, error: fetchErr } = await supabase
                    .from('users')
                    .select('*, plans(*)')
                    .eq('id', user.id)
                    .single();
                if (!fetchErr && updatedUser) {
                    localStorage.setItem('zyro_user', JSON.stringify(updatedUser));
                }

                window.dispatchEvent(new Event('authChange'));
                setShowManualModal(false);
                router.push("/profile");
            } else {
                throw new Error(data.error || "Submission failed");
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Convert file upload to base64
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setScreenshotName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshotBase64(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
    };

    if (isLoading) {
        return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: T.bg, color: T.text }}>Loading...</div>;
    }

    const methods = [
        { id: "stripe", name: "Stripe (Credit/Debit Card)", icon: "credit-card", color: "#635BFF" },
        { id: "jazzcash", name: "JazzCash Mobile Wallet", icon: "wallet", color: "#D3122A" },
        { id: "easypaisa", name: "EasyPaisa Mobile Wallet", icon: "wallet", color: "#00A852" },
    ];

    const manualAccountDetails = {
        easypaisa: { number: "0300-1234567", title: "Zyro Tech", logo: "🟢" },
        jazzcash: { number: "0312-3456789", title: "Zyro Tech", logo: "🔴" }
    };

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "100%", minHeight: "100vh", background: T.bg, padding: 20,
            position: "relative"
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
                                    <div style={{ fontSize: 11, color: T.textFaint }}>
                                        {method.id === "stripe" ? "Secure encrypted payment" : "Manual verification via screenshot"}
                                    </div>
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
                                {selectedMethod === "stripe" 
                                    ? `Pay ${plan?.currency} ${parseFloat(plan?.price).toLocaleString()}`
                                    : "Proceed to Payment Details"
                                }
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

            {/* Manual EasyPaisa / JazzCash Popup Modal */}
            {showManualModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 1000, background: "rgba(0, 0, 0, 0.75)",
                    backdropFilter: "blur(8px)", display: "flex",
                    alignItems: "center", justifyContent: "center", padding: 20
                }}>
                    <div style={{
                        width: "100%", maxWidth: 450,
                        background: T.bgCard, borderRadius: T.r16,
                        border: `1px solid ${T.border}`,
                        boxShadow: T.shadowLg,
                        overflow: "hidden",
                        display: "flex", flexDirection: "column"
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: "24px 28px", borderBottom: `1px solid ${T.borderMid}`,
                            background: T.bgElev, display: "flex",
                            justifyContent: "space-between", alignItems: "center"
                        }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>
                                    {selectedMethod === "easypaisa" ? "EasyPaisa" : "JazzCash"} Payment
                                </h3>
                                <span style={{ fontSize: 12, color: T.textMuted }}>Manual verification process</span>
                            </div>
                            <button 
                                onClick={() => setShowManualModal(false)}
                                style={{
                                    background: "none", border: "none", color: T.textMuted,
                                    cursor: "pointer", padding: 4
                                }}
                            >
                                <Icon name="x" size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleManualPaymentSubmit} style={{ padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}>
                            
                            {/* Company Account Box */}
                            <div style={{
                                background: "rgba(255,255,255,0.02)",
                                border: `1px solid ${T.borderBright}`,
                                borderRadius: T.r12, padding: "18px 20px"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, color: T.textFaint, fontWeight: 600, textTransform: "uppercase" }}>Official Recipient Details</span>
                                    <span style={{ fontSize: 20 }}>{manualAccountDetails[selectedMethod]?.logo}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, color: T.textSub }}>Account Title:</span>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{manualAccountDetails[selectedMethod]?.title}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, color: T.textSub }}>Account Number:</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: T.j300 }}>{manualAccountDetails[selectedMethod]?.number}</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleCopy(manualAccountDetails[selectedMethod]?.number)}
                                            style={{
                                                background: "rgba(255,255,255,0.05)", border: "none",
                                                borderRadius: T.r4, padding: "4px 8px", cursor: "pointer",
                                                color: copiedText ? T.green : T.textSub, fontSize: 11, fontWeight: 600,
                                                display: "flex", alignItems: "center", gap: 4
                                            }}
                                        >
                                            <Icon name={copiedText ? "check" : "copy"} size={11} />
                                            {copiedText ? "Copied" : "Copy"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div style={{
                                fontSize: 13, color: T.textSub, lineHeight: 1.5,
                                background: `${selectedMethod === "easypaisa" ? "#00A852" : "#D3122A"}10`,
                                border: `1px solid ${selectedMethod === "easypaisa" ? "#00A852" : "#D3122A"}30`,
                                borderRadius: T.r8, padding: 12
                            }}>
                                💡 Please transfer <strong>PKR {parseFloat(plan?.price).toLocaleString()}</strong> to the mobile account listed above. Once done, upload the transaction receipt screenshot below.
                            </div>

                            {/* Inputs */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: T.textSub }}>Sender Mobile Number</label>
                                    <input 
                                        type="tel"
                                        placeholder="03xxxxxxxxx (the account you sent money from)"
                                        required
                                        value={senderNumber}
                                        onChange={(e) => setSenderNumber(e.target.value)}
                                        style={{
                                            height: 40, padding: "0 12px", background: T.bgHigh,
                                            border: `1px solid ${T.borderBright}`, borderRadius: T.r6,
                                            color: T.text, fontSize: 14, outline: "none"
                                        }}
                                    />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: T.textSub }}>Transaction ID (TID)</label>
                                    <input 
                                        type="text"
                                        placeholder="Enter payment Transaction ID"
                                        required
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        style={{
                                            height: 40, padding: "0 12px", background: T.bgHigh,
                                            border: `1px solid ${T.borderBright}`, borderRadius: T.r6,
                                            color: T.text, fontSize: 14, outline: "none"
                                        }}
                                    />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: T.textSub }}>Upload Payment Screenshot</label>
                                    <div style={{
                                        border: `2px dashed ${screenshotBase64 ? T.green : T.borderBright}`,
                                        borderRadius: T.r8, padding: 15, textAlign: "center",
                                        background: screenshotBase64 ? "rgba(92,168,124,0.05)" : T.bgElev,
                                        position: "relative", cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}>
                                        <input 
                                            type="file"
                                            accept="image/*"
                                            required
                                            onChange={handleFileChange}
                                            style={{
                                                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                                                opacity: 0, cursor: "pointer", width: "100%", height: "100%"
                                            }}
                                        />
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                            <Icon 
                                                name={screenshotBase64 ? "image" : "upload-cloud"} 
                                                size={24} 
                                                color={screenshotBase64 ? T.green : T.textMuted} 
                                            />
                                            <span style={{ fontSize: 12, fontWeight: 600, color: screenshotBase64 ? T.green : T.textSub }}>
                                                {screenshotBase64 ? "Screenshot selected ✓" : "Choose / Drag Screenshot image"}
                                            </span>
                                            {screenshotName && (
                                                <span style={{ fontSize: 10, color: T.textFaint }}>{screenshotName}</span>
                                            )}
                                        </div>
                                    </div>
                                    {screenshotBase64 && (
                                        <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                                            <img 
                                                src={screenshotBase64} 
                                                alt="Receipt preview" 
                                                style={{ maxWidth: "100%", maxHeight: 120, borderRadius: T.r6, objectFit: "contain", border: `1px solid ${T.borderBright}` }} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit & Cancel Buttons */}
                            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                                <button 
                                    type="button"
                                    onClick={() => setShowManualModal(false)}
                                    style={{
                                        flex: 1, height: 44, background: T.bgElev,
                                        border: `1px solid ${T.borderBright}`, borderRadius: T.r8,
                                        color: T.textSub, fontSize: 14, fontWeight: 600,
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isProcessing}
                                    style={{
                                        flex: 2, height: 44, background: T.gradBtn,
                                        border: "none", borderRadius: T.r8,
                                        color: "#fff", fontSize: 14, fontWeight: 700,
                                        cursor: isProcessing ? "not-allowed" : "pointer",
                                        opacity: isProcessing ? 0.7 : 1,
                                        boxShadow: T.glowBtn,
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                                    }}
                                >
                                    {isProcessing ? "Submitting..." : "Submit Receipt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
