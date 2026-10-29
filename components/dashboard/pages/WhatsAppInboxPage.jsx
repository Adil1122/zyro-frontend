"use client";

import React, { useState, useEffect, useRef } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { getCurrentUserId } from "../../../lib/auth";

export default function WhatsAppInboxPage() {
    const [conversations, setConversations] = useState([]);
    const [selectedConvId, setSelectedConvId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connectedNumber, setConnectedNumber] = useState(null);
    const [isMetaConfigured, setIsMetaConfigured] = useState(false);

    // Filter & Search
    const [filterTab, setFilterTab] = useState("all"); // "all", "unread", "support"
    const [searchQuery, setSearchQuery] = useState("");

    // UI state
    const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [toast, setToast] = useState(null);

    // New Chat Modal
    const [newChatModalOpen, setNewChatModalOpen] = useState(false);
    const [newChatPhone, setNewChatPhone] = useState("");
    const [newChatName, setNewChatName] = useState("");
    const [newChatMsg, setNewChatMsg] = useState("Assalam-o-Alaikum! Greetings from Zyro.");

    // Quick Replies Dropdown
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const quickReplies = [
        "Assalam-o-Alaikum! Your order has been confirmed and booked for dispatch.",
        "Could you please confirm your complete street address and city for courier booking?",
        "Your parcel is in transit! You can track it via PostEx / Leopards tracking link.",
        "Thank you for contacting Zyro Support. How may we assist you today?",
    ];

    const chatEndRef = useRef(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load active account and real conversations
    const loadWhatsAppChats = async () => {
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/chat", {
                headers: userId ? { "x-user-id": userId } : {},
                cache: "no-store",
            });
            const data = await res.json();

            if (data.success) {
                setConnectedNumber(data.connectedNumber || null);
                setIsMetaConfigured(data.isMetaConfigured || false);

                const convList = data.conversations || [];
                setConversations(convList);

                // Auto-select first conversation if none selected or previous selection no longer exists
                const stillExists = convList.some(c => c.id === selectedConvId);
                if (convList.length > 0 && (!selectedConvId || !stillExists)) {
                    setSelectedConvId(convList[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to load WhatsApp chats:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWhatsAppChats();
        const pollInterval = setInterval(loadWhatsAppChats, 12000); // Live poll for new messages
        return () => clearInterval(pollInterval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [selectedConvId, conversations]);

    const activeConv = conversations.find(c => c.id === selectedConvId) || conversations[0];

    // Handle sending a WhatsApp message
    const handleSendMessage = async (e) => {
        e?.preventDefault();
        const text = replyText.trim();
        if (!text || isSending || !activeConv) return;

        setIsSending(true);

        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            from: "merchant",
            senderType: "merchant",
            text,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: new Date().toISOString(),
            status: "sending",
        };

        // Optimistically update conversation thread
        setConversations(prev =>
            prev.map(c => {
                if (c.id === activeConv.id) {
                    return {
                        ...c,
                        lastMessage: text,
                        messages: [...(c.messages || []), optimisticMsg],
                    };
                }
                return c;
            })
        );
        setReplyText("");

        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {}),
                },
                body: JSON.stringify({
                    phone: activeConv.phoneNumber || connectedNumber,
                    message: text,
                    conversationId: activeConv.dbId || activeConv.id,
                    senderType: "merchant",
                }),
            });

            const data = await res.json();
            if (data.success) {
                showToast("Message sent via WhatsApp ✓");
                // Mark as delivered
                setConversations(prev =>
                    prev.map(c => {
                        if (c.id === activeConv.id) {
                            return {
                                ...c,
                                messages: (c.messages || []).map(m =>
                                    m.id === optimisticMsg.id ? { ...m, status: "delivered" } : m
                                ),
                            };
                        }
                        return c;
                    })
                );
            } else {
                showToast(data.error || "Failed to send message", "error");
            }
        } catch (err) {
            showToast("Network error sending message: " + err.message, "error");
        } finally {
            setIsSending(false);
        }
    };

    // Handle creating a new chat with a customer
    const handleStartNewChat = async (e) => {
        e.preventDefault();
        const phone = newChatPhone.trim().replace(/\D/g, "");
        if (!phone || phone.length < 10) {
            showToast("Please enter a valid phone number (min 10 digits)", "error");
            return;
        }

        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/whatsapp/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {}),
                },
                body: JSON.stringify({
                    recipientPhone: phone,
                    customerName: newChatName.trim() || `Customer (+${phone})`,
                    initialMessage: newChatMsg.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                showToast(`New WhatsApp chat opened for +${phone}!`);
                setNewChatModalOpen(false);
                setNewChatPhone("");
                setNewChatName("");
                await loadWhatsAppChats();
                if (data.conversation?.id) {
                    setSelectedConvId(String(data.conversation.id));
                }
            } else {
                showToast(data.error || "Failed to start chat", "error");
            }
        } catch (err) {
            showToast("Error starting chat: " + err.message, "error");
        }
    };

    // Filter conversations
    const filteredConversations = conversations.filter(c => {
        const matchesSearch =
            (c.contactName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.phoneNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;
        if (filterTab === "unread") return (c.unreadCount || 0) > 0;
        if (filterTab === "support") return c.status === "manual_support";
        return true;
    });

    return (
        <div style={{
            height: "calc(100vh - 70px)",
            minHeight: 600,
            background: T.bg,
            color: T.text,
            display: "flex",
            flexDirection: "column",
            fontFamily: "inherit",
            overflow: "hidden",
        }}>
            {/* TOAST ALERT */}
            {toast && (
                <div style={{
                    position: "fixed",
                    top: 20,
                    right: 28,
                    zIndex: 9999,
                    background: toast.type === "error" ? "#EF4444" : toast.type === "info" ? "#3B82F6" : "#10B981",
                    color: "#FFFFFF",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}>
                    <span>{toast.type === "error" ? "✕" : "✓"}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* TOP BAR: Connected WhatsApp Number Badge & Actions */}
            <div style={{
                background: T.bgCard,
                borderBottom: `1px solid ${T.borderMid}`,
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "rgba(37,211,102,0.15)",
                        border: "1px solid rgba(37,211,102,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#25D366",
                    }}>
                        <Icon name="whatsapp" size={22} color="#25D366" />
                    </div>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h1 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.3px" }}>
                                WhatsApp Conversations
                            </h1>
                            {connectedNumber ? (
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "2px 10px",
                                    borderRadius: 12,
                                    background: "rgba(74,222,128,0.15)",
                                    color: T.green,
                                    border: "1px solid rgba(74,222,128,0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
                                    +{connectedNumber.replace(/\D/g, "")} (Connected)
                                </span>
                            ) : (
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    background: "rgba(251,191,36,0.15)",
                                    color: T.yellow,
                                }}>
                                    No Active Number
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                            {isMetaConfigured
                                ? "Meta WhatsApp Cloud API & Coexistence Active"
                                : "Direct Web Multi-Device Linked Session"}
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                        onClick={() => setNewChatModalOpen(true)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: T.gradBtn,
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: T.glowBtn,
                            transition: "all 0.15s ease",
                        }}
                    >
                        <span>+</span>
                        <span>New Chat</span>
                    </button>

                    <button
                        onClick={loadWhatsAppChats}
                        title="Refresh Conversations"
                        style={{
                            background: T.bgElev,
                            border: `1px solid ${T.borderMid}`,
                            color: T.textSub,
                            borderRadius: 8,
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                        }}
                    >
                        ↻
                    </button>
                </div>
            </div>

            {/* THREE-PANE LAYOUT */}
            <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
                {/* ── LEFT PANE: CONVERSATION LIST (ZYRO THEMED) ── */}
                <div style={{
                    width: 320,
                    minWidth: 280,
                    maxWidth: 360,
                    background: T.bgCard,
                    borderRight: `1px solid ${T.borderMid}`,
                    display: "flex",
                    flexDirection: "column",
                }}>
                    {/* Search Bar */}
                    <div style={{ padding: "14px 16px 10px 16px" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            background: T.bgElev,
                            borderRadius: 8,
                            border: `1px solid ${T.borderMid}`,
                            padding: "0 10px",
                        }}>
                            <span style={{ color: T.textMuted, fontSize: 13 }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    background: "transparent",
                                    border: "none",
                                    color: T.text,
                                    fontSize: 12,
                                    outline: "none",
                                    fontFamily: "inherit",
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 12 }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div style={{
                        display: "flex",
                        padding: "0 16px 10px 16px",
                        gap: 6,
                        borderBottom: `1px solid ${T.border}`,
                    }}>
                        {[
                            { id: "all", label: "All Chats" },
                            { id: "unread", label: "Unread" },
                            { id: "support", label: "Support" },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterTab(tab.id)}
                                style={{
                                    flex: 1,
                                    padding: "6px 8px",
                                    borderRadius: 6,
                                    border: "none",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background: filterTab === tab.id ? T.bgHigh : "transparent",
                                    color: filterTab === tab.id ? T.text : T.textMuted,
                                    transition: "all 0.15s ease",
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Conversation Items List */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                        {loading ? (
                            <div style={{ textAlign: "center", padding: "40px 16px", color: T.textMuted, fontSize: 12 }}>
                                Loading WhatsApp chats...
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 16px", color: T.textMuted, fontSize: 13 }}>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
                                <div>No conversations found</div>
                                <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>
                                    Messages received on +{connectedNumber || "WhatsApp"} will appear here.
                                </div>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const isSelected = conv.id === activeConv?.id;
                                const initials = (conv.contactName || "W")
                                    .split(" ")
                                    .map(p => p[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2);

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedConvId(conv.id)}
                                        style={{
                                            padding: "12px 14px",
                                            borderRadius: 8,
                                            marginBottom: 4,
                                            cursor: "pointer",
                                            background: isSelected ? T.bgElev : "transparent",
                                            border: isSelected ? `1px solid ${T.borderBright}` : "1px solid transparent",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            transition: "background 0.15s ease",
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected) e.currentTarget.style.background = T.bgHigh;
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) e.currentTarget.style.background = "transparent";
                                        }}
                                    >
                                        {/* Avatar */}
                                        <div style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: "50%",
                                            background: isSelected ? T.j400 : T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: T.text,
                                            flexShrink: 0,
                                        }}>
                                            {initials}
                                        </div>

                                        {/* Snippet */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                                <span style={{
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: isSelected ? T.text : T.textSub,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}>
                                                    {conv.contactName}
                                                </span>
                                                <span style={{ fontSize: 10, color: T.textMuted }}>
                                                    {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: 11,
                                                color: isSelected ? T.textMuted : T.textFaint,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>
                                                {conv.lastMessage || "No messages"}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── CENTER PANE: CHAT MESSAGES & COMPOSER ── */}
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    background: T.bg,
                    position: "relative",
                    minWidth: 0,
                }}>
                    {activeConv ? (
                        <>
                            {/* ACTIVE CHAT HEADER */}
                            <div style={{
                                background: T.bgCard,
                                borderBottom: `1px solid ${T.borderMid}`,
                                padding: "12px 20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: "50%",
                                        background: T.j400,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: 14,
                                        color: "#FFFFFF",
                                    }}>
                                        {(activeConv.contactName || "W")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>
                                                {activeConv.contactName}
                                            </span>
                                            <span style={{
                                                fontSize: 10,
                                                padding: "1px 6px",
                                                borderRadius: 10,
                                                background: "rgba(37,211,102,0.15)",
                                                color: "#25D366",
                                                fontWeight: 700,
                                            }}>
                                                WhatsApp
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: T.textMuted }}>
                                            +{activeConv.phoneNumber?.replace(/\D/g, "")} • Active Conversation
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <button
                                        onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
                                        title="Toggle Customer Info"
                                        style={{
                                            background: T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            color: T.textSub,
                                            borderRadius: 8,
                                            padding: "6px 12px",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <span>Customer Info</span>
                                        <span>{rightDrawerOpen ? "›" : "‹"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* MESSAGES SCROLL AREA */}
                            <div style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "20px 24px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                background: "radial-gradient(ellipse at center, rgba(18,39,32,0.4) 0%, rgba(10,28,22,0.95) 100%)",
                            }}>
                                {/* Date Divider */}
                                <div style={{ textAlign: "center", margin: "8px 0" }}>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        background: T.bgElev,
                                        color: T.textMuted,
                                        padding: "4px 12px",
                                        borderRadius: 12,
                                        border: `1px solid ${T.border}`,
                                    }}>
                                        WhatsApp Chat History
                                    </span>
                                </div>

                                {(activeConv.messages || []).map((msg, idx) => {
                                    const isMerchant = msg.from === "merchant";
                                    return (
                                        <div
                                            key={msg.id || idx}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: isMerchant ? "flex-end" : "flex-start",
                                            }}
                                        >
                                            <div style={{
                                                maxWidth: "70%",
                                                padding: "10px 14px",
                                                borderRadius: isMerchant ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                                                background: isMerchant
                                                    ? "linear-gradient(135deg, #1E563B 0%, #153E2A 100%)"
                                                    : T.bgElev,
                                                color: T.text,
                                                border: isMerchant
                                                    ? `1px solid rgba(74,222,128,0.3)`
                                                    : `1px solid ${T.borderMid}`,
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                                                fontSize: 13,
                                                lineHeight: 1.5,
                                                wordBreak: "break-word",
                                            }}>
                                                {msg.text}

                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "flex-end",
                                                    gap: 4,
                                                    marginTop: 4,
                                                    fontSize: 10,
                                                    color: isMerchant ? "rgba(167,243,208,0.7)" : T.textMuted,
                                                }}>
                                                    <span>{msg.time}</span>
                                                    {isMerchant && (
                                                        <span style={{ color: T.green, fontWeight: 700 }}>✓✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* MESSAGE COMPOSER */}
                            <div style={{
                                background: T.bgCard,
                                borderTop: `1px solid ${T.borderMid}`,
                                padding: "14px 20px",
                                position: "relative",
                            }}>
                                {/* Quick Replies Dropdown */}
                                {showQuickReplies && (
                                    <div style={{
                                        position: "absolute",
                                        bottom: "100%",
                                        left: 20,
                                        width: 380,
                                        background: T.bgElev,
                                        border: `1px solid ${T.borderBright}`,
                                        borderRadius: 10,
                                        padding: 10,
                                        boxShadow: "0 -8px 25px rgba(0,0,0,0.45)",
                                        zIndex: 50,
                                        marginBottom: 8,
                                    }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 8, textTransform: "uppercase" }}>
                                            Quick Canned Replies
                                        </div>
                                        {quickReplies.map((qr, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => {
                                                    setReplyText(qr);
                                                    setShowQuickReplies(false);
                                                }}
                                                style={{
                                                    display: "block",
                                                    width: "100%",
                                                    textAlign: "left",
                                                    background: "none",
                                                    border: "none",
                                                    color: T.textSub,
                                                    fontSize: 12,
                                                    padding: "8px 10px",
                                                    borderRadius: 6,
                                                    cursor: "pointer",
                                                    lineHeight: 1.4,
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.bgHigh}
                                                onMouseLeave={e => e.currentTarget.style.background = "none"}
                                            >
                                                {qr}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                                        title="Canned Quick Replies"
                                        style={{
                                            background: T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            color: T.textMuted,
                                            borderRadius: 8,
                                            padding: "9px 12px",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        <span>⚡</span>
                                        <span>Templates</span>
                                    </button>

                                    <input
                                        type="text"
                                        placeholder={`Message +${activeConv.phoneNumber?.replace(/\D/g, "")}...`}
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: "10px 14px",
                                            borderRadius: 8,
                                            background: T.bgElev,
                                            border: `1px solid ${T.borderMid}`,
                                            color: T.text,
                                            fontSize: 13,
                                            outline: "none",
                                            fontFamily: "inherit",
                                        }}
                                    />

                                    <button
                                        type="submit"
                                        disabled={isSending || !replyText.trim()}
                                        style={{
                                            background: T.gradBtn,
                                            color: "#FFFFFF",
                                            border: "none",
                                            borderRadius: 8,
                                            padding: "10px 20px",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: isSending || !replyText.trim() ? "not-allowed" : "pointer",
                                            opacity: isSending || !replyText.trim() ? 0.6 : 1,
                                            boxShadow: T.glowBtn,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <span>Send</span>
                                        <span>➤</span>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: T.textMuted,
                            padding: 24,
                            textAlign: "center",
                        }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 6px 0" }}>
                                No Active WhatsApp Conversation Selected
                            </h3>
                            <p style={{ fontSize: 13, maxWidth: 360, color: T.textMuted }}>
                                Select a conversation from the left or click &quot;New Chat&quot; to initiate a real message.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANE: CUSTOMER 360 PANEL (ZYRO THEMED) ── */}
                {rightDrawerOpen && activeConv && (
                    <div style={{
                        width: 300,
                        background: T.bgCard,
                        borderLeft: `1px solid ${T.borderMid}`,
                        display: "flex",
                        flexDirection: "column",
                        padding: "20px 18px",
                        overflowY: "auto",
                    }}>
                        <div style={{ textAlign: "center", marginBottom: 20 }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                background: T.bgElev,
                                border: `2px solid ${T.borderBright}`,
                                margin: "0 auto 10px auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 20,
                                fontWeight: 800,
                                color: T.green,
                            }}>
                                {(activeConv.contactName || "C")[0].toUpperCase()}
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: 0 }}>
                                {activeConv.contactName}
                            </h3>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                                +{activeConv.phoneNumber?.replace(/\D/g, "")}
                            </div>
                        </div>

                        {/* Customer Stats Cards */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                            marginBottom: 20,
                        }}>
                            <div style={{
                                background: T.bgElev,
                                padding: "10px",
                                borderRadius: 8,
                                border: `1px solid ${T.border}`,
                                textAlign: "center",
                            }}>
                                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700 }}>TOTAL ORDERS</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 4 }}>
                                    {activeConv.customer?.totalOrders || 1}
                                </div>
                            </div>
                            <div style={{
                                background: T.bgElev,
                                padding: "10px",
                                borderRadius: 8,
                                border: `1px solid ${T.border}`,
                                textAlign: "center",
                            }}>
                                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700 }}>SPENT</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginTop: 4 }}>
                                    {activeConv.customer?.totalSpent || "Rs 2,450"}
                                </div>
                            </div>
                        </div>

                        {/* Customer Information List */}
                        <div style={{
                            background: T.bgElev,
                            borderRadius: 8,
                            padding: "14px",
                            border: `1px solid ${T.borderMid}`,
                            fontSize: 12,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}>
                            <div style={{ fontWeight: 700, color: T.textMuted, textTransform: "uppercase", fontSize: 11 }}>
                                Customer Details
                            </div>
                            <div>
                                <span style={{ color: T.textMuted }}>City: </span>
                                <strong style={{ color: T.text }}>{activeConv.customer?.city || "Pakistan"}</strong>
                            </div>
                            <div>
                                <span style={{ color: T.textMuted }}>Channel: </span>
                                <span style={{ color: "#25D366", fontWeight: 700 }}>WhatsApp Business</span>
                            </div>
                            <div>
                                <span style={{ color: T.textMuted }}>Courier: </span>
                                <span style={{ color: T.textSub }}>PostEx / Leopards</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODAL: START NEW WHATSAPP CHAT ── */}
            {newChatModalOpen && (
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
                        background: T.bgCard,
                        border: `1px solid ${T.borderBright}`,
                        color: T.text,
                        borderRadius: 14,
                        width: "100%",
                        maxWidth: 440,
                        padding: "24px 28px",
                        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>
                                Start WhatsApp Conversation
                            </h3>
                            <button
                                onClick={() => setNewChatModalOpen(false)}
                                style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 18 }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleStartNewChat}>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 4 }}>
                                    Recipient WhatsApp Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="03001234567 or 923001234567"
                                    value={newChatPhone}
                                    onChange={e => setNewChatPhone(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: 6,
                                        background: T.bgElev,
                                        border: `1px solid ${T.borderMid}`,
                                        color: T.text,
                                        fontSize: 13,
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 4 }}>
                                    Customer Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Tariq Mehmood"
                                    value={newChatName}
                                    onChange={e => setNewChatName(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: 6,
                                        background: T.bgElev,
                                        border: `1px solid ${T.borderMid}`,
                                        color: T.text,
                                        fontSize: 13,
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 4 }}>
                                    Initial Message
                                </label>
                                <textarea
                                    rows={3}
                                    value={newChatMsg}
                                    onChange={e => setNewChatMsg(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: 6,
                                        background: T.bgElev,
                                        border: `1px solid ${T.borderMid}`,
                                        color: T.text,
                                        fontSize: 13,
                                        outline: "none",
                                        resize: "none",
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setNewChatModalOpen(false)}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: 6,
                                        background: "transparent",
                                        border: `1px solid ${T.borderMid}`,
                                        color: T.textMuted,
                                        fontSize: 13,
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: "8px 18px",
                                        borderRadius: 6,
                                        background: T.gradBtn,
                                        color: "#FFFFFF",
                                        border: "none",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        boxShadow: T.glowBtn,
                                    }}
                                >
                                    Open Chat
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
