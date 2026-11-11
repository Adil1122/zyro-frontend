"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton } from "../Primitives";
import { getCurrentUserId } from "../../../lib/auth";

export default function WhatsAppPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [supportActive, setSupportActive] = useState(0);

    // ─── Zyro AI Bot (Left Section) State ──────────────────────────────
    const [aiMessages, setAiMessages] = useState([
        {
            id: "welcome-ai",
            from: "ai",
            text: "👋 **Hello! I'm your Zyro AI Copilot.**\n\nAsk me anything about configuring your stores (**WooCommerce, Shopify, Daraz**), automated couriers (**PostEx, TCS, Leopards**), WhatsApp Meta Cloud API settings, or daily PnL calculations.",
            time: "Just now",
            source: "Zyro Platform Engine",
        }
    ]);
    const [aiInput, setAiInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const aiChatEndRef = useRef(null);

    const AI_PROMPT_SUGGESTIONS = [
        "How to connect WooCommerce?",
        "How does PostEx auto-confirmation work?",
        "How to configure WhatsApp in Settings?",
        "How to track Daily PnL?",
        "How to manage Inventory & POs?",
    ];

    const handleSendAiMessage = async (customPrompt) => {
        const textToSend = (customPrompt || aiInput).trim();
        if (!textToSend || aiLoading) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            from: "user",
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const updatedHistory = [...aiMessages, userMsg];
        setAiMessages(updatedHistory);
        setAiInput("");
        setAiLoading(true);

        try {
            const res = await fetch("/api/whatsapp/ai-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: textToSend,
                    history: updatedHistory.map(m => ({ from: m.from, text: m.text })),
                }),
            });

            const result = await res.json();
            const aiReply = {
                id: `ai-${Date.now()}`,
                from: "ai",
                text: result.reply || "I am currently unable to process your request. Please try again.",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                source: result.source || "gemini-3.8-flash",
            };

            setAiMessages(prev => [...prev, aiReply]);
        } catch (err) {
            setAiMessages(prev => [
                ...prev,
                {
                    id: `ai-err-${Date.now()}`,
                    from: "ai",
                    text: `⚠️ Error connecting to AI Bot: ${err.message}`,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    source: "System",
                }
            ]);
        } finally {
            setAiLoading(false);
        }
    };

    const handleClearAiChat = () => {
        setAiMessages([
            {
                id: "welcome-ai-reset",
                from: "ai",
                text: "✨ Chat cleared! Ask me anything about your Zyro platform configuration, connected sales channels, courier integrations, or WhatsApp setup.",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                source: "Zyro Platform Engine",
            }
        ]);
    };

    // Auto-scroll AI Chat to bottom
    useEffect(() => {
        aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [aiMessages, aiLoading]);

    // ─── Support Team (Right Section) State ────────────────────────────
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState(null);
    const [sendSuccessNotice, setSendSuccessNotice] = useState(null);
    const [quickReplies, setQuickReplies] = useState([
        { label: "Check Order", text: "Hello! Could you please share your order number so I can check its current status?" },
        { label: "Courier Issue", text: "We have contacted the courier team regarding your delivery delay. You will receive an update shortly." },
        { label: "Payment Confirmed", text: "We have verified your payment receipt. Your order is now being processed for dispatch!" },
    ]);
    const supportChatEndRef = useRef(null);

    // ─── Test Panels State ─────────────────────────────────────────────
    const [rulesOpen, setRulesOpen] = useState(false);
    const [keywords, setKeywords] = useState([]);
    const [newKeyword, setNewKeyword] = useState("");
    const [rulesLoading, setRulesLoading] = useState(false);
    const [rulesSaving, setRulesSaving] = useState(false);
    const [rulesSaved, setRulesSaved] = useState(false);

    const [statusOpen, setStatusOpen] = useState(false);
    const [merchantOpen, setMerchantOpen] = useState(false);
    const [statusForm, setStatusForm] = useState({ customerPhone: '', customerName: '', orderNumber: '', status: 'processing', total: '' });
    const [merchantForm, setMerchantForm] = useState({ orderNumber: '', customerName: '', total: '' });
    const [statusResult, setStatusResult] = useState(null);
    const [merchantResult, setMerchantResult] = useState(null);
    const [autoLoading, setAutoLoading] = useState(false);

    // Refresh WhatsApp Command Center Data
    const refreshData = async () => {
        try {
            const userId = getCurrentUserId();
            const headers = userId ? { 'x-user-id': userId } : {};
            const res = await fetch('/api/whatsapp', { headers, cache: 'no-store' });
            const json = await res.json();
            
            setData(prev => {
                if (!prev) return json;
                // Merge to preserve optimistic local messages while server confirms
                const mergedSupportChats = (json.supportChats || []).map(sc => {
                    const localChat = prev.supportChats?.find(lc => String(lc.id) === String(sc.id));
                    if (!localChat || !localChat.msgs) return sc;
                    
                    const serverTexts = new Set((sc.msgs || []).map(m => m.text));
                    const pendingLocals = localChat.msgs.filter(m => !serverTexts.has(m.text));
                    return {
                        ...sc,
                        msgs: [...(sc.msgs || []), ...pendingLocals]
                    };
                });
                return {
                    ...json,
                    supportChats: mergedSupportChats.length > 0 ? mergedSupportChats : (json.supportChats || [])
                };
            });
        } catch { /* non-fatal */ }
    };

    // Initial Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = getCurrentUserId();
                const headers = userId ? { 'x-user-id': userId } : {};
                const [waRes, qrRes] = await Promise.all([
                    fetch('/api/whatsapp', { headers, cache: 'no-store' }),
                    userId ? fetch(`/api/whatsapp/quick-replies?userId=${encodeURIComponent(userId)}`) : null,
                ]);
                const json = await waRes.json();
                setData(json);
                if (qrRes) {
                    const qrData = await qrRes.json();
                    if (Array.isArray(qrData?.replies) && qrData.replies.length > 0) {
                        setQuickReplies(qrData.replies);
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch whatsapp data:", err);
                setLoading(false);
            }
        };
        fetchData();

        // Polling every 10 seconds for incoming WhatsApp messages
        const pollInterval = setInterval(() => {
            refreshData();
        }, 10000);

        return () => clearInterval(pollInterval);
    }, []);

    // Scroll Support Chat to bottom when conversation or message changes
    useEffect(() => {
        supportChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [data?.supportChats, supportActive, isSending]);

    const handleSendReply = async (textOverride, conv) => {
        const msg = (textOverride !== undefined ? textOverride : replyText).trim();
        if (!msg) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const localMsg = {
            id: `local-${Date.now()}`,
            from: "merchant",
            text: msg,
            time: timeStr,
            status: "delivered",
        };

        // 1. Instantly update UI optimistically so message is immediately visible
        setData(prev => {
            if (!prev || !prev.supportChats) return prev;
            const updated = prev.supportChats.map((c, idx) => {
                if (idx === supportActive) {
                    return {
                        ...c,
                        lastMsg: msg,
                        time: "Just now",
                        msgs: [...(c.msgs || []), localMsg],
                    };
                }
                return c;
            });
            return { ...prev, supportChats: updated };
        });

        setReplyText("");
        setIsSending(true);
        setSendError(null);
        setSendSuccessNotice(null);

        try {
            const userId = getCurrentUserId();
            const activePhone = conv?.phone || data?.merchantPhone || 'Support';

            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
                body: JSON.stringify({
                    phone: activePhone,
                    message: msg,
                    conversationId: conv?.id,
                    senderType: 'merchant',
                }),
            });

            const result = await res.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to dispatch message');
            }

            if (result.liveSent) {
                setSendSuccessNotice("✅ Dispatched live via WhatsApp Meta Cloud API");
            } else if (result.warning) {
                setSendSuccessNotice(result.warning);
            } else {
                setSendSuccessNotice("✓ Message saved to conversation history");
            }

            setTimeout(() => setSendSuccessNotice(null), result.warning ? 9000 : 4000);

        } catch (err) {
            setSendError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSimulateIncomingReply = async (conv) => {
        const activeConv = conv || (data?.supportChats && data.supportChats[supportActive]);
        if (!activeConv) return;

        const sampleReplies = [
            "Yes, thank you for the update! Please dispatch my order.",
            "Understood! When can I expect the delivery tracking number?",
            "Hello, could you please confirm if this includes courier charges?",
            "Thanks for the prompt response! Much appreciated.",
            "Can I change the delivery address to PECHS Karachi?"
        ];
        const incomingText = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const incomingMsg = {
            id: `sim-${Date.now()}`,
            from: "customer",
            text: incomingText,
            time: timeStr,
        };

        // Optimistically add incoming message to active conversation
        setData(prev => {
            if (!prev || !prev.supportChats) return prev;
            const updated = prev.supportChats.map((c, idx) => {
                if (idx === supportActive) {
                    return {
                        ...c,
                        lastMsg: incomingText,
                        time: "Just now",
                        msgs: [...(c.msgs || []), incomingMsg],
                    };
                }
                return c;
            });
            return { ...prev, supportChats: updated };
        });

        // Persist to wa_messages database table
        try {
            const userId = getCurrentUserId();
            await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
                body: JSON.stringify({
                    phone: activeConv.phone,
                    message: incomingText,
                    conversationId: activeConv.id,
                    senderType: 'customer',
                }),
            });
        } catch { /* non-fatal */ }
    };

    const openRules = async () => {
        setRulesOpen(true);
        setRulesLoading(true);
        setRulesSaved(false);
        try {
            const userId = getCurrentUserId();
            const res = await fetch('/api/whatsapp/rules', { headers: { 'x-user-id': userId } });
            const rulesData = await res.json();
            setKeywords(rulesData.keywords || []);
        } catch (e) {
            console.error('Failed to load rules:', e);
        } finally {
            setRulesLoading(false);
        }
    };

    const saveRules = async () => {
        setRulesSaving(true);
        try {
            const userId = getCurrentUserId();
            await fetch('/api/whatsapp/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ keywords }),
            });
            setRulesSaved(true);
            setTimeout(() => setRulesSaved(false), 2500);
        } catch (e) {
            console.error('Failed to save rules:', e);
        } finally {
            setRulesSaving(false);
        }
    };

    const addKeyword = () => {
        const kw = newKeyword.trim().toLowerCase();
        if (!kw || keywords.includes(kw)) return;
        setKeywords(prev => [...prev, kw]);
        setNewKeyword("");
        setRulesSaved(false);
    };

    const removeKeyword = (kw) => {
        setKeywords(prev => prev.filter(k => k !== kw));
        setRulesSaved(false);
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: "center", color: T.text }}>
                <Icon name="refresh" size={24} style={{ animation: "spin 1s linear infinite" }} />
                <div style={{ marginTop: 12, fontWeight: 600 }}>Syncing WhatsApp Command Center...</div>
            </div>
        );
    }

    const supportChats = data?.supportChats || [];
    const supportConv = supportChats.length > 0 ? supportChats[supportActive] || supportChats[0] : null;
    const isMetaConfigured = Boolean(data?.waConfigured);
    const merchantPhone = data?.merchantPhone || null;
    const cleanMerchantPhone = merchantPhone ? merchantPhone.replace(/\D/g, '') : null;

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: T.bg }}>
            {/* ═══ TOP HEADER ═══ */}
            <div style={{ padding: "18px 28px", borderBottom: `1px solid ${T.border}`, background: T.bgCard }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.5px" }}>
                                WhatsApp Command Center
                            </h1>
                            <span style={{
                                fontSize: 10, padding: "3px 8px", borderRadius: 12, fontWeight: 700,
                                background: isMetaConfigured ? "rgba(74,222,128,0.12)" : "rgba(251,191,36,0.12)",
                                color: isMetaConfigured ? T.green : T.yellow,
                                border: `1px solid ${isMetaConfigured ? T.green : T.yellow}44`,
                                display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isMetaConfigured ? T.green : T.yellow }} />
                                {isMetaConfigured ? "Meta Cloud API Connected" : "API Setup Incomplete"}
                            </span>
                        </div>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "5px 0 0" }}>
                            Dual Command Hub: <b>Zyro AI Bot</b> for platform guidance & <b>Support Team</b> for direct WhatsApp conversations
                        </p>
                    </div>

                    {/* Quick navigation to WhatsApp settings */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Link href="/settings/whatsapp" style={{ textDecoration: "none" }}>
                            <GradientButton variant="secondary" size="sm" icon="settings">
                                WhatsApp Settings
                            </GradientButton>
                        </Link>
                        {cleanMerchantPhone && (
                            <a
                                href={`https://wa.me/${cleanMerchantPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: "none" }}
                            >
                                <GradientButton variant="primary" size="sm" icon="external">
                                    Open WhatsApp Web
                                </GradientButton>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ DUAL FRAME: LEFT (ZYRO AI BOT) & RIGHT (SUPPORT TEAM) ═══ */}
            <div className="wa-dual-frame" style={{
                flex: "1 1 auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                background: T.border,
                minHeight: "640px",
                overflow: "hidden",
            }}>

                {/* ─── LEFT PANEL: ZYRO AI BOT ─── */}
                <div style={{ background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{
                        padding: "14px 20px",
                        background: "linear-gradient(135deg, rgba(92,168,124,0.15) 0%, rgba(26,81,64,0.1) 100%)",
                        borderBottom: `1px solid ${T.borderMid}`,
                        display: "flex", alignItems: "center", gap: 12,
                    }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: T.r10, background: T.gradBtn,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: T.glowBtn, flexShrink: 0,
                        }}>
                            <Icon name="bot" size={20} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Zyro AI Bot</span>
                                <span style={{
                                    fontSize: 9, padding: "2px 7px", borderRadius: T.r20, fontWeight: 700,
                                    background: T.greenBg, color: T.green, border: `1px solid ${T.green}44`,
                                    display: "flex", alignItems: "center", gap: 3,
                                }}>
                                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, boxShadow: `0 0 4px ${T.green}` }} />
                                    PLATFORM COPILOT
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: T.j200, marginTop: 2 }}>
                                Ask questions about stores, couriers, WhatsApp & daily PnL
                            </div>
                        </div>
                        <button
                            onClick={handleClearAiChat}
                            title="Clear conversation"
                            style={{
                                background: T.bgElev, border: `1px solid ${T.borderMid}`, borderRadius: 6,
                                padding: "4px 8px", fontSize: 11, color: T.textMuted, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit",
                            }}
                        >
                            <Icon name="refresh" size={11} color={T.textMuted} /> Clear
                        </button>
                    </div>

                    {/* Quick Suggestion Chips */}
                    <div style={{
                        padding: "8px 14px",
                        background: T.bgCard,
                        borderBottom: `1px solid ${T.border}`,
                        display: "flex",
                        gap: 6,
                        overflowX: "auto",
                        whiteSpace: "nowrap",
                    }}>
                        {AI_PROMPT_SUGGESTIONS.map((promptText, i) => (
                            <button
                                key={i}
                                onClick={() => handleSendAiMessage(promptText)}
                                disabled={aiLoading}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: 14,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: "rgba(92,168,124,0.08)",
                                    border: `1px solid ${T.borderMid}`,
                                    color: T.j200,
                                    cursor: aiLoading ? "not-allowed" : "pointer",
                                    fontFamily: "inherit",
                                    flexShrink: 0,
                                    transition: "all 0.15s ease",
                                }}
                            >
                                💡 {promptText}
                            </button>
                        ))}
                    </div>

                    {/* AI Chat Messages Container */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        background: T.bg,
                    }}>
                        {aiMessages.map((msg) => {
                            const isUser = msg.from === "user";
                            return (
                                <div key={msg.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                                    <div style={{ maxWidth: "88%", minWidth: "220px" }}>
                                        {!isUser && (
                                            <div style={{
                                                fontSize: 10, color: T.j300, fontWeight: 700, marginBottom: 4,
                                                display: "flex", alignItems: "center", gap: 4,
                                            }}>
                                                <Icon name="sparkle" size={10} color={T.j300} />
                                                <span>Zyro AI Assistant</span>
                                                {msg.source && (
                                                    <span style={{ fontSize: 9, color: T.textFaint, fontWeight: 500 }}>
                                                        · {msg.source}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div style={{
                                            padding: "10px 14px",
                                            borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                                            background: isUser ? T.gradBtn : T.bgElev,
                                            border: isUser ? "none" : `1px solid ${T.borderMid}`,
                                            fontSize: 12,
                                            color: isUser ? "#fff" : T.text,
                                            lineHeight: 1.5,
                                            boxShadow: isUser ? T.glowBtn : "0 2px 6px rgba(0,0,0,0.2)",
                                        }}>
                                            {isUser ? (
                                                <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                                            ) : (
                                                <div className="zyro-markdown-body" style={{ fontSize: 12 }}>
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: 9, color: T.textFaint, marginTop: 4,
                                            textAlign: isUser ? "right" : "left",
                                        }}>
                                            {msg.time}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Thinking State */}
                        {aiLoading && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                <div style={{
                                    padding: "10px 16px", borderRadius: "14px 14px 14px 3px",
                                    background: T.bgElev, border: `1px solid ${T.borderMid}`,
                                    display: "flex", alignItems: "center", gap: 8,
                                }}>
                                    <Icon name="sparkle" size={14} color={T.j300} style={{ animation: "spin 1.5s linear infinite" }} />
                                    <span style={{ fontSize: 12, color: T.j200, fontWeight: 600 }}>Zyro AI is thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={aiChatEndRef} />
                    </div>

                    {/* AI Message Input & Send Bar */}
                    <div style={{
                        padding: "12px 16px",
                        borderTop: `1px solid ${T.border}`,
                        background: T.bgCard,
                    }}>
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSendAiMessage(); }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background: T.bgElev,
                                border: `1px solid ${T.borderMid}`,
                                borderRadius: T.r10,
                                padding: "4px 8px 4px 12px",
                            }}
                        >
                            <Icon name="sparkle" size={16} color={T.j300} />
                            <input
                                type="text"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="Ask Zyro AI about stores, couriers, WhatsApp, settings..."
                                disabled={aiLoading}
                                style={{
                                    flex: 1,
                                    border: "none",
                                    background: "transparent",
                                    color: T.text,
                                    fontSize: 13,
                                    outline: "none",
                                    fontFamily: "inherit",
                                }}
                            />
                            <GradientButton
                                type="submit"
                                size="sm"
                                variant="primary"
                                icon={aiLoading ? "refresh" : "send"}
                                disabled={aiLoading || !aiInput.trim()}
                            >
                                {aiLoading ? "Thinking..." : "Send"}
                            </GradientButton>
                        </form>
                    </div>
                </div>

                {/* ─── RIGHT PANEL: SUPPORT TEAM (REAL WHATSAPP) ─── */}
                <div style={{ background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{
                        padding: "14px 20px",
                        background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(180,83,9,0.06) 100%)",
                        borderBottom: `1px solid rgba(251,191,36,0.25)`,
                        display: "flex", alignItems: "center", gap: 12,
                    }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: T.r10,
                            background: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(251,191,36,0.35)", flexShrink: 0,
                        }}>
                            <Icon name="headset" size={20} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Support Team</span>
                                <span style={{
                                    fontSize: 9, padding: "2px 7px", borderRadius: T.r20, fontWeight: 700,
                                    background: T.yellowBg, color: T.yellow, border: `1px solid ${T.yellow}44`,
                                    display: "flex", alignItems: "center", gap: 3,
                                }}>
                                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.yellow, boxShadow: `0 0 4px ${T.yellow}` }} />
                                    REAL WHATSAPP
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: T.yellow, marginTop: 2, fontFamily: "monospace" }}>
                                {merchantPhone ? `📱 Connected: ${merchantPhone.startsWith('+') ? merchantPhone : `+${merchantPhone}`} (Phone ID: 1462001326987017 • Dayemens Business)` : "Merchant phone not set in Settings"}
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <Link href="/settings/whatsapp" style={{ textDecoration: "none" }}>
                                <span style={{
                                    fontSize: 10, color: T.yellow, fontWeight: 700,
                                    padding: "4px 8px", borderRadius: 6, background: "rgba(251,191,36,0.12)",
                                    border: "1px solid rgba(251,191,36,0.3)", display: "inline-block",
                                }}>
                                    Configure Credentials ⚙️
                                </span>
                            </Link>
                        </div>
                    </div>

                    {/* Support Conversation Split View */}
                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        {/* Conversations list sidebar */}
                        <div style={{ width: 190, borderRight: `1px solid ${T.border}`, overflowY: "auto", flexShrink: 0, background: T.bgCard }}>
                            {supportChats.map((c, i) => (
                                <div
                                    key={c.id || i}
                                    onClick={() => setSupportActive(i)}
                                    style={{
                                        padding: "12px 14px",
                                        borderBottom: `1px solid ${T.border}`,
                                        cursor: "pointer",
                                        background: supportActive === i ? "rgba(251,191,36,0.08)" : "transparent",
                                        borderLeft: `3px solid ${supportActive === i ? T.yellow : "transparent"}`,
                                        transition: "all 0.1s",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {c.name || "Zyro Support"}
                                        </span>
                                        <span style={{ fontSize: 9, color: T.textFaint }}>{c.time}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: T.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {c.lastMsg || "Tap to chat..."}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                        <Icon name="headset" size={9} color={T.yellow} />
                                        <span style={{ fontSize: 9, color: T.yellow, fontWeight: 600 }}>{c.reason || "Support"}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Active Chat Conversation View */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            {supportConv ? (
                                <>
                                    {/* Active Chat Subheader */}
                                    <div style={{
                                        padding: "10px 16px", borderBottom: `1px solid ${T.border}`,
                                        display: "flex", alignItems: "center", gap: 10, background: T.bgCard,
                                    }}>
                                        <div style={{
                                            width: 30, height: 30, borderRadius: "50%",
                                            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 11, fontWeight: 800, color: "#fff",
                                        }}>
                                            {(supportConv.name || "ZS").split(" ").map(w => w[0]).join("")}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                                                {supportConv.name || "Zyro Official Support"}
                                            </div>
                                            <div style={{ fontSize: 10, color: T.textFaint }}>
                                                {supportConv.phone} · Direct WhatsApp Channel
                                            </div>
                                        </div>
                                        {isMetaConfigured ? (
                                            <span style={{
                                                fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                                                background: T.greenBg, color: T.green, border: `1px solid ${T.green}44`,
                                            }}>
                                                Meta API Active
                                            </span>
                                        ) : (
                                            <Link href="/settings/whatsapp" style={{ textDecoration: "none" }}>
                                                <span style={{
                                                    fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                                                    background: T.yellowBg, color: T.yellow, border: `1px solid ${T.yellow}44`,
                                                }}>
                                                    Setup Credentials
                                                </span>
                                            </Link>
                                        )}
                                    </div>

                                    {/* Messages list */}
                                    <div style={{
                                        flex: 1, overflowY: "auto", padding: 14,
                                        display: "flex", flexDirection: "column", gap: 10, background: T.bg,
                                    }}>
                                        {!isMetaConfigured && (
                                            <div style={{
                                                padding: "10px 14px", borderRadius: 8,
                                                background: "rgba(251,191,36,0.08)", border: `1px solid rgba(251,191,36,0.25)`,
                                                fontSize: 11, color: T.yellow, display: "flex", alignItems: "flex-start", gap: 8,
                                            }}>
                                                <span style={{ fontSize: 14 }}>ℹ️</span>
                                                <div style={{ flex: 1 }}>
                                                    <b>Real WhatsApp Setup:</b> To send live messages over Meta Cloud API, configure your <b>Phone Number ID</b> and <b>Permanent Access Token</b> in <Link href="/settings/whatsapp" style={{ color: "#fff", textDecoration: "underline" }}>Settings → WhatsApp</Link>.
                                                </div>
                                            </div>
                                        )}

                                        {(!supportConv.msgs || supportConv.msgs.length === 0) && (
                                            <div style={{
                                                padding: "24px 20px", textAlign: "center", color: T.textFaint, fontSize: 12,
                                                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                                            }}>
                                                <div style={{ fontSize: 24 }}>💬</div>
                                                <div style={{ fontWeight: 700, color: T.textMuted }}>Direct WhatsApp Channel Active</div>
                                                <div style={{ maxWidth: 300, lineHeight: 1.4 }}>
                                                    Send a message below to start communicating with this contact via WhatsApp.
                                                </div>
                                            </div>
                                        )}

                                        {supportConv.msgs?.map((m, i) => {
                                            const isMerchant = m.from === "merchant" || m.from === "agent" || m.from === "user";
                                            const senderTitle = isMerchant ? "You (Merchant)" : (supportConv.name || "Customer / Support");

                                            return (
                                                <div key={m.id || i} style={{ display: "flex", justifyContent: isMerchant ? "flex-end" : "flex-start", marginBottom: 6 }}>
                                                    <div style={{ maxWidth: "84%", minWidth: "160px" }}>
                                                        <div style={{
                                                            fontSize: 10, color: isMerchant ? T.j200 : T.yellow,
                                                            fontWeight: 700, marginBottom: 3, textAlign: isMerchant ? "right" : "left",
                                                            display: "flex", alignItems: "center", gap: 4, justifyContent: isMerchant ? "flex-end" : "flex-start"
                                                        }}>
                                                            {!isMerchant && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.yellow }} />}
                                                            {senderTitle}
                                                            {isMerchant && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />}
                                                        </div>
                                                        <div style={{
                                                            padding: "10px 14px",
                                                            borderRadius: isMerchant ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                                                            background: isMerchant ? T.gradBtn : T.bgElev,
                                                            border: isMerchant ? "none" : `1px solid ${T.borderMid}`,
                                                            fontSize: 12, color: isMerchant ? "#fff" : T.text, lineHeight: 1.5,
                                                            boxShadow: isMerchant ? T.glowBtn : "0 2px 6px rgba(0,0,0,0.25)",
                                                            whiteSpace: "pre-wrap",
                                                        }}>
                                                            {m.text}
                                                        </div>
                                                        <div style={{
                                                            fontSize: 9, color: T.textFaint, marginTop: 3,
                                                            textAlign: isMerchant ? "right" : "left",
                                                            display: "flex", alignItems: "center", gap: 4, justifyContent: isMerchant ? "flex-end" : "flex-start"
                                                        }}>
                                                            <span>{m.time}</span>
                                                            {isMerchant && <span style={{ color: T.j200, fontWeight: 700 }}>✓✓</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={supportChatEndRef} />
                                    </div>

                                    {/* Support Message Input & Send Bar */}
                                    <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, background: T.bgCard }}>
                                        {sendSuccessNotice && (
                                            <div style={{
                                                fontSize: 11,
                                                color: (sendSuccessNotice.includes("Note:") || sendSuccessNotice.includes("#131030") || sendSuccessNotice.includes("Sandbox")) ? "#FBBF24" : T.green,
                                                background: (sendSuccessNotice.includes("Note:") || sendSuccessNotice.includes("#131030") || sendSuccessNotice.includes("Sandbox")) ? "rgba(251,191,36,0.12)" : "rgba(74,222,128,0.12)",
                                                border: `1px solid ${(sendSuccessNotice.includes("Note:") || sendSuccessNotice.includes("#131030") || sendSuccessNotice.includes("Sandbox")) ? "rgba(251,191,36,0.35)" : "rgba(74,222,128,0.3)"}`,
                                                borderRadius: 6,
                                                padding: "8px 12px",
                                                marginBottom: 8,
                                                fontWeight: 600,
                                                lineHeight: 1.4,
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: 8,
                                            }}>
                                                <span>{sendSuccessNotice}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSendSuccessNotice(null)}
                                                    style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: 13, padding: 0 }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                        {sendError && (
                                            <div style={{ fontSize: 11, color: T.red, marginBottom: 6, fontWeight: 600 }}>
                                                ⚠️ {sendError}
                                            </div>
                                        )}

                                        <form
                                            onSubmit={(e) => { e.preventDefault(); handleSendReply(undefined, supportConv); }}
                                            style={{
                                                padding: "6px 10px 6px 14px", borderRadius: T.r8, background: T.bgElev,
                                                border: `1px solid ${sendError ? T.red : T.borderMid}`,
                                                display: "flex", alignItems: "center", gap: 8,
                                            }}
                                        >
                                            <Icon name="chat" size={15} color={T.yellow} />
                                            <input
                                                type="text"
                                                placeholder="Type message to send via WhatsApp..."
                                                value={replyText}
                                                onChange={e => { setReplyText(e.target.value); setSendError(null); }}
                                                disabled={isSending}
                                                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.text, fontFamily: "inherit" }}
                                            />
                                            <GradientButton
                                                type="submit"
                                                size="xs"
                                                variant="primary"
                                                icon={isSending ? "refresh" : "send"}
                                                disabled={isSending || !replyText.trim()}
                                            >
                                                {isSending ? "Sending…" : "Send"}
                                            </GradientButton>
                                        </form>

                                        {/* Presets and Simulation Actions */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                                                <span style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Presets:</span>
                                                {quickReplies.map((qr, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        disabled={isSending}
                                                        onClick={() => handleSendReply(qr.text, supportConv)}
                                                        style={{
                                                            padding: "3px 8px", borderRadius: T.r20, fontSize: 10, fontWeight: 600,
                                                            background: "rgba(251,191,36,0.1)", border: `1px solid rgba(251,191,36,0.25)`,
                                                            color: T.yellow, cursor: isSending ? "not-allowed" : "pointer",
                                                            fontFamily: "inherit", opacity: isSending ? 0.5 : 1,
                                                        }}
                                                    >
                                                        {qr.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Simulate Incoming Reply button for two-way testing */}
                                            <button
                                                type="button"
                                                onClick={() => handleSimulateIncomingReply(supportConv)}
                                                title="Simulate an incoming WhatsApp reply to test two-way chat"
                                                style={{
                                                    padding: "3px 9px", borderRadius: T.r20, fontSize: 10, fontWeight: 700,
                                                    background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)",
                                                    color: "#60A5FA", cursor: "pointer", fontFamily: "inherit",
                                                    display: "inline-flex", alignItems: "center", gap: 4,
                                                }}
                                            >
                                                <span>📲</span> Simulate Incoming Reply
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 12 }}>
                                    Select a support conversation or start a new one
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ AUTO-SHIFT RULES BAR ═══ */}
            <div style={{
                padding: "10px 28px", borderTop: `1px solid ${T.border}`,
                background: "linear-gradient(90deg, rgba(92,168,124,0.08) 0%, rgba(251,191,36,0.08) 100%)",
                display: "flex", alignItems: "center", gap: 12,
            }}>
                <div style={{ width: 26, height: 26, borderRadius: T.r6, background: T.gradBtn, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.glowBtn }}>
                    <Icon name="sparkle" size={13} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>Auto-Shift Active · </span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>
                        When a customer asks for <b style={{ color: T.yellow }}>returns, complaints, or refunds</b>, Zyro automatically routes them to your Support Team.
                    </span>
                </div>
                <GradientButton variant="ghost" size="sm" icon="settings" onClick={openRules}>
                    Configure Escalation Rules
                </GradientButton>
            </div>

            {/* ═══ CONFIGURE RULES MODAL ═══ */}
            {rulesOpen && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
                }} onClick={e => { if (e.target === e.currentTarget) setRulesOpen(false); }}>
                    <div style={{
                        width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column",
                        background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`,
                        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
                    }}>
                        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, background: T.gradBtn,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                                <Icon name="settings" size={17} color="#fff" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Auto-Shift Rules</div>
                                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                                    Messages containing these keywords automatically escalate from Bot → Support Team
                                </div>
                            </div>
                            <button onClick={() => setRulesOpen(false)} style={{
                                width: 28, height: 28, borderRadius: 8, background: T.bgElev,
                                border: `1px solid ${T.borderMid}`, color: T.textMuted,
                                cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                            }}>×</button>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                            {rulesLoading ? (
                                <div style={{ textAlign: "center", padding: 40, color: T.textMuted, fontSize: 13 }}>Loading rules…</div>
                            ) : (
                                <>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                                        {keywords.map(kw => (
                                            <span key={kw} style={{
                                                display: "inline-flex", alignItems: "center", gap: 5,
                                                padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                background: "rgba(92,168,124,0.1)", border: `1px solid ${T.borderMid}`,
                                                color: T.j200,
                                            }}>
                                                {kw}
                                                <button onClick={() => removeKeyword(kw)} style={{
                                                    background: "none", border: "none", cursor: "pointer",
                                                    color: T.textFaint, fontSize: 14, lineHeight: 1,
                                                    padding: 0, display: "flex", alignItems: "center",
                                                }}>×</button>
                                            </span>
                                        ))}
                                    </div>

                                    <div style={{ display: "flex", gap: 8 }}>
                                        <input
                                            value={newKeyword}
                                            onChange={e => setNewKeyword(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addKeyword()}
                                            placeholder="Add a keyword (e.g. broken, wrong color)"
                                            style={{
                                                flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13,
                                                background: T.bgElev, border: `1px solid ${T.borderMid}`,
                                                color: T.text, outline: "none", fontFamily: "inherit",
                                            }}
                                        />
                                        <button onClick={addKeyword} style={{
                                            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            background: T.gradBtn, color: "#fff", border: "none", cursor: "pointer",
                                            fontFamily: "inherit",
                                        }}>Add</button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                            <GradientButton
                                variant="primary"
                                onClick={saveRules}
                                disabled={rulesSaving || rulesLoading}
                            >
                                {rulesSaving ? "Saving…" : rulesSaved ? "✓ Saved" : "Save Rules"}
                            </GradientButton>
                            <GradientButton variant="secondary" onClick={() => setRulesOpen(false)}>
                                Close
                            </GradientButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ TEST PANEL: ORDER STATUS UPDATE ═══ */}
            <div style={{ borderTop: `1px solid ${T.border}` }}>
                <button onClick={() => setStatusOpen(!statusOpen)} style={{
                    width: '100%', padding: '12px 28px', background: 'linear-gradient(90deg, rgba(59,130,246,0.06) 0%, rgba(16,185,129,0.06) 100%)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                }}>
                    <div style={{ width: 26, height: 26, borderRadius: T.r6, background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="refresh" size={13} color="#fff" />
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#3B82F6' }}>
                        🔄 Test: Order Status Notification → Customer WhatsApp
                    </span>
                    <span style={{ fontSize: 18, color: T.textFaint, transform: statusOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>
                {statusOpen && (
                    <div style={{ padding: '20px 28px', background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                            {[
                                ['customerPhone', 'Customer Phone', '03001234567'],
                                ['customerName', 'Customer Name', 'Ahmed Raza'],
                                ['orderNumber', 'Order Number', 'WC-1001'],
                                ['total', 'Total Amount (Rs)', '3500'],
                            ].map(([key, label, ph]) => (
                                <div key={key}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>{label}</label>
                                    <input placeholder={ph} value={statusForm[key]} onChange={e => setStatusForm(f => ({ ...f, [key]: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: T.r6, border: `1px solid ${T.borderMid}`, background: T.bg, color: T.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Status</label>
                                <select value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: T.r6, border: `1px solid ${T.borderMid}`, background: T.bg, color: T.text, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
                                    {['processing', 'shipped', 'completed', 'cancelled', 'refunded'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <GradientButton variant="primary" size="sm" disabled={autoLoading} onClick={async () => {
                            setAutoLoading(true); setStatusResult(null);
                            try {
                                const userId = getCurrentUserId();
                                const res = await fetch('/api/whatsapp/test-automations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ action: 'send_status_update', ...statusForm }) });
                                setStatusResult(await res.json());
                            } catch (err) { setStatusResult({ error: err.message }); }
                            setAutoLoading(false);
                        }}>📲 Send Status Update</GradientButton>
                        {statusResult && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: T.r8, background: statusResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${statusResult.success ? T.green + '33' : T.red + '33'}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: statusResult.success ? T.green : T.red }}>
                                    {statusResult.success ? '✅ Sent successfully' : '❌ Failed'} — {statusResult.message || statusResult.error}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ TEST PANEL: MERCHANT NEW ORDER ALERT ═══ */}
            <div style={{ borderTop: `1px solid ${T.border}` }}>
                <button onClick={() => setMerchantOpen(!merchantOpen)} style={{
                    width: '100%', padding: '12px 28px', background: 'linear-gradient(90deg, rgba(16,185,129,0.06) 0%, rgba(92,168,124,0.06) 100%)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                }}>
                    <div style={{ width: 26, height: 26, borderRadius: T.r6, background: 'linear-gradient(135deg, #10B981 0%, #5CA87C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="bell" size={13} color="#fff" />
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: T.green }}>
                        🛒 Test: New Order Alert → Merchant WhatsApp
                    </span>
                    <span style={{ fontSize: 18, color: T.textFaint, transform: merchantOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>
                {merchantOpen && (
                    <div style={{ padding: '20px 28px', background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
                        <p style={{ margin: '0 0 14px', fontSize: 12, color: T.textMuted }}>
                            Sends an alert to your configured Merchant WhatsApp ({merchantPhone || 'not configured in Settings'}).
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                            {[['orderNumber', 'Order Number', 'WC-2001'], ['customerName', 'Customer Name', 'Sara Khan'], ['total', 'Total Amount (Rs)', '7500']].map(([key, label, ph]) => (
                                <div key={key}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>{label}</label>
                                    <input placeholder={ph} value={merchantForm[key]} onChange={e => setMerchantForm(f => ({ ...f, [key]: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: T.r6, border: `1px solid ${T.borderMid}`, background: T.bg, color: T.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            ))}
                        </div>
                        <GradientButton variant="primary" size="sm" disabled={autoLoading} onClick={async () => {
                            setAutoLoading(true); setMerchantResult(null);
                            try {
                                const userId = getCurrentUserId();
                                const res = await fetch('/api/whatsapp/test-automations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ action: 'send_merchant_alert', ...merchantForm }) });
                                setMerchantResult(await res.json());
                            } catch (err) { setMerchantResult({ error: err.message }); }
                            setAutoLoading(false);
                        }}>🔔 Dispatch Merchant Alert</GradientButton>
                        {merchantResult && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: T.r8, background: merchantResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${merchantResult.success ? T.green + '33' : T.red + '33'}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: merchantResult.success ? T.green : T.red }}>
                                    {merchantResult.success ? '✅ Alert Sent' : '❌ Failed'} — {merchantResult.message || merchantResult.error}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
