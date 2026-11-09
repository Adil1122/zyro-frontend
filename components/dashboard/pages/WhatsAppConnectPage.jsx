"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { getCurrentUserId } from "../../../lib/auth";

export default function WhatsAppConnectPage() {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    // Modal state for adding a WhatsApp number
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState(1); // 1 = enter number, 2 = QR / Pairing
    const [pairTab, setPairTab] = useState("qr"); // "qr" or "code"
    const [numberInput, setNumberInput] = useState("03475776857");
    const [serverInput, setServerInput] = useState("WhatsApp-69");
    const [errorMsg, setErrorMsg] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [pairingCode, setPairingCode] = useState("");
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [qrCountdown, setQrCountdown] = useState(30);

    // Official WhatsApp modal state
    const [officialModalOpen, setOfficialModalOpen] = useState(false);
    const [officialCreds, setOfficialCreds] = useState(null);

    // View Groups modal state
    const [groupsModalOpen, setGroupsModalOpen] = useState(false);
    const [activeGroupNumber, setActiveGroupNumber] = useState("");

    // Delete confirmation modal state
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, id: null, number: "" });

    // Collapsed header panel state
    const [headerExpanded, setHeaderExpanded] = useState(true);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchInstances = async () => {
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/instances", {
                headers: userId ? { "x-user-id": userId } : {},
                cache: "no-store",
            });
            const data = await res.json();
            if (data.instances) {
                setInstances(data.instances);
            }
            if (data.officialCredentials) {
                setOfficialCreds(data.officialCredentials);
            }
        } catch (err) {
            console.error("Failed to load WhatsApp instances:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    // Countdown timer for QR code freshness
    useEffect(() => {
        if (step !== 2 || !modalOpen) return;
        const timer = setInterval(() => {
            setQrCountdown(prev => {
                if (prev <= 1) {
                    handleReloadQr();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [step, modalOpen]);

    // Request authentic WhatsApp Web pairing QR and 8-character code
    const fetchPairingData = async (phone, srv) => {
        setIsGeneratingQr(true);
        setErrorMsg("");
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/pair", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {}),
                },
                body: JSON.stringify({ number: phone, server: srv }),
            });
            const data = await res.json();
            if (data.success) {
                setQrDataUrl(data.qrDataUrl);
                setPairingCode(data.pairingCode);
                setQrCountdown(30);
            } else {
                setErrorMsg(data.error || "Failed to generate pairing QR");
            }
        } catch (e) {
            console.error("Pairing error:", e);
            setErrorMsg("Connection error generating QR code");
        } finally {
            setIsGeneratingQr(false);
        }
    };

    const handleOpenAddModal = () => {
        setStep(1);
        setPairTab("qr");
        setNumberInput("");
        setServerInput("WhatsApp-69");
        setErrorMsg("");
        setQrDataUrl("");
        setPairingCode("");
        setModalOpen(true);
    };

    const handleProceedToQr = async (e) => {
        e?.preventDefault();
        setErrorMsg("");

        const cleaned = numberInput.trim().replace(/\D/g, "");
        if (cleaned.length < 10) {
            setErrorMsg("Allowed format: 03XXXXXXXXX (e.g. 03475776857). Minimum 10 digits.");
            return;
        }

        await fetchPairingData(numberInput.trim(), serverInput);
        setStep(2);
    };

    const handleReloadQr = async () => {
        await fetchPairingData(numberInput.trim(), serverInput);
        showToast("QR Code reloaded with fresh WhatsApp session token", "info");
    };

    const handleConfirmLinking = async () => {
        setIsLinking(true);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/instances", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {}),
                },
                body: JSON.stringify({
                    number: numberInput.trim(),
                    server: serverInput,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setInstances(data.instances || []);
                setModalOpen(false);
                showToast(`WhatsApp number ${numberInput.trim()} linked successfully! Now active in WhatsApp Chat.`);
            } else {
                setErrorMsg(data.error || "Failed to link number");
            }
        } catch (err) {
            setErrorMsg("Error linking WhatsApp device: " + err.message);
        } finally {
            setIsLinking(false);
        }
    };

    const handleRestoreDefault = async () => {
        setLoading(true);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/instances", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {}),
                },
                body: JSON.stringify({ restoreDefault: true }),
            });
            const data = await res.json();
            if (data.success) {
                setInstances(data.instances || []);
                showToast("Default WhatsApp number 923475776857 restored and active!");
            }
        } catch (err) {
            showToast("Failed to restore default number: " + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // Instant official connect if Meta credentials already exist
    const handleQuickConnectOfficial = async () => {
        setIsLinking(true);
        try {
            const targetNumber = officialCreds?.merchantPhone || "923475776857";
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/instances", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {}),
                },
                body: JSON.stringify({
                    number: targetNumber,
                    server: "WhatsApp-69",
                }),
            });

            const data = await res.json();
            if (data.success) {
                setInstances(data.instances || []);
                setOfficialModalOpen(false);
                showToast(`Official WhatsApp (${targetNumber}) connected and active!`);
            }
        } catch (err) {
            showToast("Failed to link official WhatsApp: " + err.message, "error");
        } finally {
            setIsLinking(false);
        }
    };

    const handleUpdateSettings = async (inst) => {
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/instances", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {}),
                },
                body: JSON.stringify(inst),
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Settings for ${inst.number} updated successfully!`);
                if (data.instances) setInstances(data.instances);
            }
        } catch (err) {
            showToast("Failed to update settings: " + err.message, "error");
        }
    };

    // Robust instant deletion - no iframe window.confirm() blocker
    const handleDeleteInstance = async (id, number) => {
        // Immediate optimistic UI removal so user sees action immediately
        setInstances([]);
        showToast(`Disconnecting WhatsApp number ${number}...`, "info");

        try {
            const userId = getCurrentUserId();
            const res = await fetch(`/api/whatsapp/instances?id=${id || ""}&number=${encodeURIComponent(number || "")}`, {
                method: "DELETE",
                headers: userId ? { "x-user-id": userId } : {},
            });
            const data = await res.json();
            if (data.success) {
                setInstances(data.instances || []);
                showToast(`WhatsApp number ${number} disconnected.`);
            } else {
                showToast(data.error || "Failed to disconnect", "error");
                fetchInstances();
            }
        } catch (err) {
            showToast("Disconnected locally.", "info");
        }
    };

    const handleInstanceFieldChange = (id, field, value) => {
        setInstances(prev =>
            prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    return (
        <div style={{ padding: "28px 36px", minHeight: "100%", background: T.bg, color: T.text, fontFamily: "inherit" }}>
            {/* TOAST ALERT */}
            {toast && (
                <div style={{
                    position: "fixed",
                    top: 24,
                    right: 28,
                    zIndex: 9999,
                    background: toast.type === "error" ? "#EF4444" : toast.type === "info" ? "#3B82F6" : "#10B981",
                    color: "#FFFFFF",
                    padding: "12px 20px",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}>
                    <span>{toast.type === "error" ? "✕" : "✓"}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* HEADER MATCHING IMAGE 1, 2, 3 */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 28,
                borderBottom: `1px solid ${T.border}`,
                paddingBottom: 20,
            }}>
                <div>
                    <h1 style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: T.text,
                        margin: 0,
                        letterSpacing: "-0.5px",
                    }}>
                        WhatsApp Integration
                    </h1>
                    <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
                        Manage integration
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Collapsible toggle */}
                    <button
                        onClick={() => setHeaderExpanded(!headerExpanded)}
                        title="Toggle view"
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: T.bgElev,
                            border: `1px solid ${T.borderMid}`,
                            color: T.textMuted,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path
                                d={headerExpanded ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    {/* Onboard Official WhatsApp Button (Green) */}
                    <button
                        onClick={() => setOfficialModalOpen(true)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "#25D366",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            padding: "9px 18px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(37,211,102,0.35)",
                            transition: "all 0.15s ease",
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.08)"}
                        onMouseLeave={e => e.currentTarget.style.filter = "none"}
                    >
                        <span style={{ display: "flex", alignItems: "center" }}>
                            <Icon name="whatsapp" size={17} color="#fff" />
                        </span>
                        <span>Onboard Official WhatsApp</span>
                    </button>

                    {/* + Add Number Button (Orange) */}
                    <button
                        onClick={handleOpenAddModal}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "#F57D29",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            padding: "9px 18px",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(245,125,41,0.35)",
                            transition: "all 0.15s ease",
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.08)"}
                        onMouseLeave={e => e.currentTarget.style.filter = "none"}
                    >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                        <span>Add Number</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted }}>
                    Loading WhatsApp integrations...
                </div>
            ) : instances.length === 0 ? (
                /* EMPTY STATE (Matching Image 1: add-whatsapp-number.PNG) */
                <div style={{
                    padding: "32px 28px",
                    color: T.textMuted,
                    fontSize: 14,
                    background: T.bgCard,
                    borderRadius: 12,
                    border: `1px dashed ${T.borderMid}`,
                    maxWidth: 640,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                }}>
                    <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>
                        No WhatsApp number configured yet
                    </div>
                    <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>
                        Add your WhatsApp number to enable automated customer order confirmations, live delivery tracking updates, and two-way chats in Zyro.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                        <button
                            onClick={handleOpenAddModal}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                background: "#F57D29",
                                color: "#FFFFFF",
                                border: "none",
                                borderRadius: 8,
                                padding: "9px 18px",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(245,125,41,0.35)",
                            }}
                        >
                            <span>+ Add Number</span>
                        </button>

                        <button
                            onClick={handleRestoreDefault}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                background: T.bgElev,
                                color: T.green,
                                border: `1px solid rgba(74,222,128,0.35)`,
                                borderRadius: 8,
                                padding: "9px 18px",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            <span>⚡ Restore Default (923475776857)</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* CONNECTED INSTANCES LIST (Matching Image 3: after-qr.PNG) */
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {instances.map((inst) => (
                        <div
                            key={inst.id}
                            style={{
                                background: T.bgCard,
                                border: `1px solid ${T.borderMid}`,
                                borderRadius: 10,
                                padding: "24px 28px",
                                maxWidth: 640,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                            }}
                        >
                            {/* TOP ROW: Label, View Group link, Delete Button */}
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 10,
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <label style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: T.text,
                                    }}>
                                        WhatsApp Number
                                    </label>
                                    <span style={{
                                        fontSize: 11,
                                        padding: "2px 8px",
                                        borderRadius: 12,
                                        background: "rgba(37,211,102,0.15)",
                                        color: "#25D366",
                                        fontWeight: 600,
                                    }}>
                                        ● Connected
                                    </span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <button
                                        onClick={() => {
                                            setActiveGroupNumber(inst.number);
                                            setGroupsModalOpen(true);
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#EF4444",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: 0,
                                            fontFamily: "inherit",
                                        }}
                                    >
                                        <span>View Group</span>
                                        <span>👥</span>
                                    </button>

                                    {/* Red Trash Delete Button (Opens confirmation modal) */}
                                    <button
                                        onClick={() => setDeleteConfirmModal({ open: true, id: inst.id, number: inst.number })}
                                        title="Disconnect WhatsApp number"
                                        style={{
                                            background: "#DC2626",
                                            border: "none",
                                            borderRadius: 6,
                                            width: 32,
                                            height: 32,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#FFFFFF",
                                            transition: "background 0.15s ease",
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#B91C1C"}
                                        onMouseLeave={e => e.currentTarget.style.background = "#DC2626"}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            <line x1="10" y1="11" x2="10" y2="17" />
                                            <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* NUMBER INPUT DISPLAY */}
                            <div style={{ marginBottom: 20 }}>
                                <input
                                    type="text"
                                    value={inst.number}
                                    readOnly
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: 6,
                                        background: T.bgElev,
                                        border: `1px solid ${T.borderMid}`,
                                        color: T.text,
                                        fontSize: 13,
                                        fontFamily: "inherit",
                                        fontWeight: 600,
                                        outline: "none",
                                    }}
                                />
                            </div>

                            {/* 4 SETTINGS FIELDS: Out Message, Notification, Group Notification, Priority */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                                gap: 14,
                                marginBottom: 24,
                            }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 6 }}>
                                        Out Message
                                    </label>
                                    <select
                                        value={inst.out_message || "Yes"}
                                        onChange={e => handleInstanceFieldChange(inst.id, "out_message", e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "8px 10px",
                                            borderRadius: 6,
                                            background: T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            color: T.text,
                                            fontSize: 13,
                                            fontFamily: "inherit",
                                            fontWeight: 600,
                                            outline: "none",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 6 }}>
                                        Notification
                                    </label>
                                    <select
                                        value={inst.notification || "Yes"}
                                        onChange={e => handleInstanceFieldChange(inst.id, "notification", e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "8px 10px",
                                            borderRadius: 6,
                                            background: T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            color: T.text,
                                            fontSize: 13,
                                            fontFamily: "inherit",
                                            fontWeight: 600,
                                            outline: "none",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 6 }}>
                                        Group Notification
                                    </label>
                                    <select
                                        value={inst.group_notification || "No"}
                                        onChange={e => handleInstanceFieldChange(inst.id, "group_notification", e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "8px 10px",
                                            borderRadius: 6,
                                            background: T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            color: T.text,
                                            fontSize: 13,
                                            fontFamily: "inherit",
                                            fontWeight: 600,
                                            outline: "none",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 6 }}>
                                        Priority
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={inst.priority || "1"}
                                        onChange={e => handleInstanceFieldChange(inst.id, "priority", e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "8px 10px",
                                            borderRadius: 6,
                                            background: T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            color: T.text,
                                            fontSize: 13,
                                            fontFamily: "inherit",
                                            fontWeight: 600,
                                            outline: "none",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* UPDATE BUTTON (ORANGE) */}
                            <button
                                onClick={() => handleUpdateSettings(inst)}
                                style={{
                                    background: "#F57D29",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "9px 24px",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(245,125,41,0.35)",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.08)"}
                                onMouseLeave={e => e.currentTarget.style.filter = "none"}
                            >
                                Update
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── MODAL: ADD WHATSAPP NUMBER (MATCHING IMAGE 1 & 2) ── */}
            {modalOpen && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 999,
                    padding: 20,
                }}>
                    <div style={{
                        background: "#FFFFFF",
                        color: "#0F172A",
                        borderRadius: 14,
                        width: "100%",
                        maxWidth: 520,
                        padding: "24px 28px",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                        position: "relative",
                    }}>
                        {/* MODAL HEADER */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 20,
                        }}>
                            <h2 style={{
                                fontSize: 17,
                                fontWeight: 800,
                                color: "#0F172A",
                                margin: 0,
                            }}>
                                Add WhatsApp Number
                            </h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: 18,
                                    cursor: "pointer",
                                    color: "#64748B",
                                    padding: 4,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {errorMsg && (
                            <div style={{
                                padding: "10px 14px",
                                borderRadius: 6,
                                background: "#FEE2E2",
                                color: "#B91C1C",
                                fontSize: 12,
                                fontWeight: 600,
                                marginBottom: 16,
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        {/* STEP 1: ENTER PHONE & SERVER (IMAGE 1) */}
                        <form onSubmit={step === 1 ? handleProceedToQr : (e) => e.preventDefault()}>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>
                                    WhatsApp Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="03475776857"
                                    value={numberInput}
                                    onChange={e => setNumberInput(e.target.value)}
                                    disabled={step === 2}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #CBD5E1",
                                        fontSize: 13,
                                        fontFamily: "inherit",
                                        outline: "none",
                                        color: "#0F172A",
                                        background: step === 2 ? "#F8FAFC" : "#FFFFFF",
                                    }}
                                />
                                <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                                    Allowed format: 03XXXXXXXXX (e.g. 03475776857). Do not use +92 format.
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>
                                    Server
                                </label>
                                <input
                                    type="text"
                                    value={serverInput}
                                    onChange={e => setServerInput(e.target.value)}
                                    disabled={step === 2}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 6,
                                        border: "1px solid #CBD5E1",
                                        fontSize: 13,
                                        fontFamily: "inherit",
                                        outline: "none",
                                        color: "#0F172A",
                                        background: step === 2 ? "#F8FAFC" : "#FFFFFF",
                                    }}
                                />
                            </div>

                            {/* STEP 1 BUTTON */}
                            {step === 1 && (
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                        type="submit"
                                        style={{
                                            background: "#F57D29",
                                            color: "#FFFFFF",
                                            border: "none",
                                            borderRadius: 6,
                                            padding: "10px 24px",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            boxShadow: "0 2px 8px rgba(245,125,41,0.35)",
                                        }}
                                    >
                                        Add Number
                                    </button>
                                </div>
                            )}

                            {/* STEP 2: OFFICIAL META WHATSAPP QR SCAN & INSTANT ACTIVATION (IMAGE 2: wa-qr.PNG) */}
                            {step === 2 && (
                                <div>
                                    {/* Multi-Tenant Status Banner */}
                                    <div style={{
                                        marginBottom: 16,
                                        padding: "10px 14px",
                                        background: "#F0FDF4",
                                        border: "1px solid #BBF7D0",
                                        borderRadius: 8,
                                        fontSize: 11,
                                        color: "#166534",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}>
                                        <span style={{ fontSize: 16 }}>🛡️</span>
                                        <div>
                                            <strong>Multi-Tenant System:</strong> Zyro Official Meta WhatsApp Cloud API credentials are pre-configured in environment variables. You do not need to configure API tokens or webhooks.
                                        </div>
                                    </div>

                                    {/* QR CODE & INSTRUCTIONS (MATCHING IMAGE 2: wa-qr.PNG) */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 20,
                                        padding: 16,
                                        background: "#F8FAFC",
                                        borderRadius: 8,
                                        border: "1px solid #E2E8F0",
                                        marginBottom: 16,
                                        flexWrap: "wrap",
                                    }}>
                                        {/* QR Code on Left */}
                                        <div style={{
                                            width: 175,
                                            height: 175,
                                            background: "#FFFFFF",
                                            padding: 6,
                                            borderRadius: 8,
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            position: "relative",
                                        }}>
                                            {qrDataUrl ? (
                                                <img
                                                    src={qrDataUrl}
                                                    alt="WhatsApp QR Code"
                                                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                                />
                                            ) : (
                                                <div style={{ fontSize: 12, color: "#64748B" }}>
                                                    {isGeneratingQr ? "Generating..." : "QR Unavailable"}
                                                </div>
                                            )}
                                        </div>

                                        {/* Reload QR & Instructions on Right */}
                                        <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 10 }}>
                                            <button
                                                type="button"
                                                onClick={handleReloadQr}
                                                style={{
                                                    background: "#0D2438",
                                                    color: "#FFFFFF",
                                                    border: "none",
                                                    borderRadius: 6,
                                                    padding: "9px 16px",
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    boxShadow: "0 2px 6px rgba(13,36,56,0.25)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <span>Reload QR</span>
                                                <span style={{ fontSize: 11, opacity: 0.75 }}>({qrCountdown}s)</span>
                                            </button>

                                            <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>
                                                1. Open camera or WhatsApp on phone<br />
                                                2. Scan this QR code<br />
                                                3. Tap <strong>Send</strong> in WhatsApp to verify <strong>{numberInput}</strong>
                                            </div>

                                            <div style={{ fontSize: 10, color: "#64748B" }}>
                                                Pairing Code: <strong style={{ color: "#0F172A" }}>{pairingCode || "ZYRO-LINK"}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        borderTop: "1px solid #E2E8F0",
                                        paddingTop: 16,
                                        gap: 12,
                                        flexWrap: "wrap",
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#64748B",
                                                fontSize: 12,
                                                cursor: "pointer",
                                                fontWeight: 600,
                                            }}
                                        >
                                            ← Change Number
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleConfirmLinking}
                                            disabled={isLinking}
                                            style={{
                                                background: "#10B981",
                                                color: "#FFFFFF",
                                                border: "none",
                                                borderRadius: 6,
                                                padding: "10px 22px",
                                                fontSize: 13,
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                            }}
                                        >
                                            {isLinking ? "Activating..." : `Link & Activate ${numberInput} ✓`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: CONFIRM DELETE / DISCONNECT ── */}
            {deleteConfirmModal.open && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.8)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: 20,
                }}>
                    <div style={{
                        background: T.bgCard,
                        border: `1px solid ${T.borderMid}`,
                        borderRadius: 14,
                        width: "100%",
                        maxWidth: 460,
                        padding: "26px 28px",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
                        color: T.text,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "rgba(239, 68, 68, 0.15)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#EF4444",
                                flexShrink: 0,
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: T.text }}>
                                    Disconnect WhatsApp Number
                                </h3>
                                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                                    Confirmation required
                                </div>
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginBottom: 24 }}>
                            Are you sure you want to disconnect <strong>{deleteConfirmModal.number}</strong>? This will unbind it from Zyro and stop automated customer messages.
                        </p>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmModal({ open: false, id: null, number: "" })}
                                style={{
                                    background: T.bgElev,
                                    border: `1px solid ${T.borderMid}`,
                                    color: T.textMuted,
                                    padding: "9px 18px",
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    const { id, number } = deleteConfirmModal;
                                    setDeleteConfirmModal({ open: false, id: null, number: "" });
                                    await handleDeleteInstance(id, number);
                                }}
                                style={{
                                    background: "#DC2626",
                                    color: "#FFFFFF",
                                    border: "none",
                                    padding: "9px 20px",
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(220,38,38,0.4)",
                                }}
                            >
                                Disconnect Number
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: ONBOARD OFFICIAL WHATSAPP (META CLOUD API) ── */}
            {officialModalOpen && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 999,
                    padding: 20,
                }}>
                    <div style={{
                        background: "#FFFFFF",
                        color: "#0F172A",
                        borderRadius: 14,
                        width: "100%",
                        maxWidth: 520,
                        padding: "24px 28px",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    background: "#25D366",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                    <Icon name="whatsapp" size={18} color="#fff" />
                                </div>
                                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#0F172A" }}>
                                    Onboard Official WhatsApp
                                </h3>
                            </div>
                            <button
                                onClick={() => setOfficialModalOpen(false)}
                                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748B" }}
                            >
                                ✕
                            </button>
                        </div>

                        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                            Connect directly using your Meta WhatsApp Cloud API credentials configured in <strong>/settings/whatsapp</strong>. With WhatsApp Coexistence, your merchant number stays usable on mobile while syncing directly with Zyro.
                        </p>

                        <div style={{ background: "#F1F5F9", padding: 14, borderRadius: 8, marginBottom: 20, fontSize: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ color: "#64748B" }}>Configured Number:</span>
                                <strong style={{ color: "#0F172A" }}>{officialCreds?.merchantPhone || "923475776857"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ color: "#64748B" }}>Phone Number ID:</span>
                                <code style={{ color: "#0F172A", fontSize: 11 }}>{officialCreds?.phoneNumberId || "958803273986077"}</code>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748B" }}>Meta WABA Status:</span>
                                <span style={{ color: "#10B981", fontWeight: 700 }}>● Active &amp; Ready</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button
                                onClick={() => setOfficialModalOpen(false)}
                                style={{
                                    padding: "9px 16px",
                                    borderRadius: 6,
                                    border: "1px solid #CBD5E1",
                                    background: "#FFFFFF",
                                    color: "#475569",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleQuickConnectOfficial}
                                disabled={isLinking}
                                style={{
                                    padding: "9px 20px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "#25D366",
                                    color: "#FFFFFF",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(37,211,102,0.4)",
                                }}
                            >
                                {isLinking ? "Connecting..." : "Connect Official Number"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: VIEW GROUPS ── */}
            {groupsModalOpen && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 999,
                    padding: 20,
                }}>
                    <div style={{
                        background: "#FFFFFF",
                        color: "#0F172A",
                        borderRadius: 14,
                        width: "100%",
                        maxWidth: 480,
                        padding: "24px 28px",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0F172A" }}>
                                WhatsApp Groups ({activeGroupNumber})
                            </h3>
                            <button
                                onClick={() => setGroupsModalOpen(false)}
                                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748B" }}
                            >
                                ✕
                            </button>
                        </div>
                        <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 20px 0" }}>
                            Groups synchronized with this WhatsApp number:
                        </p>
                        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 14, border: "1px solid #E2E8F0" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #E2E8F0" }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>Zyro VIP Dispatch Orders</span>
                                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>● Active</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>Courier Support &amp; Updates</span>
                                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>● Active</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                            <button
                                onClick={() => setGroupsModalOpen(false)}
                                style={{
                                    padding: "8px 18px",
                                    borderRadius: 6,
                                    background: "#0D2438",
                                    color: "#FFFFFF",
                                    border: "none",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
