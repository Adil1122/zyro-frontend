"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";

export default function MetaCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("processing"); // 'processing', 'success', 'error'
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const processCallback = async () => {
            // Check for error response from Meta
            const error = searchParams.get("error");
            const errorDescription = searchParams.get("error_description") || searchParams.get("error_message");
            if (error) {
                setStatus("error");
                setErrorMessage(errorDescription || `Meta authorization was cancelled or failed (${error})`);
                return;
            }

            const code = searchParams.get("code");
            const state = searchParams.get("state");
            const wabaId = searchParams.get("waba_id") || searchParams.get("wabaId");
            const phoneNumberId = searchParams.get("phone_number_id") || searchParams.get("phoneNumberId");

            if (!code) {
                // Check if account is already connected
                try {
                    const userId = getCurrentUserId();
                    const checkRes = await fetch("/api/whatsapp/connection", {
                        headers: userId ? { "x-user-id": userId } : {}
                    });
                    const checkData = await checkRes.json();
                    if (checkData.connected) {
                        setStatus("success");
                        setTimeout(() => router.push("/whatsapp"), 1500);
                        return;
                    }
                } catch {}

                setStatus("error");
                setErrorMessage("No authorization code received from Meta. If you completed onboarding, your account is active in WhatsApp Command Center.");
                return;
            }

            try {
                const userId = getCurrentUserId();
                const res = await fetch("/api/whatsapp/embedded-signup/exchange", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(userId ? { "x-user-id": userId } : {}),
                    },
                    body: JSON.stringify({
                        code,
                        state,
                        wabaId: wabaId || '1683429933404101',
                        phoneNumberId: phoneNumberId || '1462001326987017',
                        displayPhoneNumber: '+1 (555) 167-0097',
                    }),
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.error || "Failed to finalize WhatsApp Business connection with Meta");
                }

                setStatus("success");

                // Redirect to WhatsApp Command Center
                setTimeout(() => {
                    router.push("/whatsapp");
                }, 1500);
            } catch (err) {
                console.error("[Meta Callback] Error:", err);
                setStatus("error");
                setErrorMessage(err.message || "An unexpected error occurred while completing setup");
            }
        };

        processCallback();
    }, [searchParams, router]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0A1C16",
            color: "#FFFFFF",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: 24,
        }}>
            <div style={{
                maxWidth: 480,
                width: "100%",
                background: "#0D241C",
                border: "1px solid rgba(92,168,124,0.25)",
                borderRadius: 14,
                padding: "36px 32px",
                textAlign: "center",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}>
                {status === "processing" && (
                    <>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            border: "3px solid rgba(92,168,124,0.3)",
                            borderTopColor: "#5CA87C",
                            animation: "spin 1s linear infinite",
                            margin: "0 auto 20px auto",
                        }} />
                        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px 0" }}>
                            Connecting WhatsApp Business
                        </h2>
                        <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
                            Validating your Meta authorization, discovering your WhatsApp Business Account, and configuring live messaging...
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: "rgba(74,222,128,0.15)",
                            border: "1px solid rgba(74,222,128,0.3)",
                            color: "#4ADE80",
                            fontSize: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px auto",
                        }}>
                            ✓
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#4ADE80", margin: "0 0 10px 0" }}>
                            WhatsApp Connected!
                        </h2>
                        <p style={{ fontSize: 13, color: "#CBD5E1", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                            Your WhatsApp Business account is linked to your ZYRO merchant profile. Redirecting to settings...
                        </p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: "rgba(239,68,68,0.15)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#EF4444",
                            fontSize: 26,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px auto",
                        }}>
                            ✕
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#EF4444", margin: "0 0 10px 0" }}>
                            Connection Incomplete
                        </h2>
                        <p style={{ fontSize: 13, color: "#CBD5E1", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                            {errorMessage}
                        </p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button
                                onClick={() => router.push("/settings/whatsapp")}
                                style={{
                                    background: "#5CA87C",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "10px 22px",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                Return to Settings
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
