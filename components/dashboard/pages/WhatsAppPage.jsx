"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton } from "../Primitives";
import { getCurrentUserId } from "../../../lib/auth";

export default function WhatsAppPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [botActive, setBotActive] = useState(0);
    const [supportActive, setSupportActive] = useState(0);

    // ─── Test Panel State ───────────────────────────────
    const [testOpen, setTestOpen] = useState(false);
    const [testForm, setTestForm] = useState({
        customerName: '', customerPhone: '', orderRef: '',
        totalAmount: '', deliveryAddress: '', cityName: '', orderDetail: '',
    });
    const [testPending, setTestPending] = useState([]);
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // ─── Support Chat Compose ────────────────────────────────────────────────────
    const [replyText, setReplyText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState(null);

    const QUICK_REPLIES = [
        { label: "Issue refund",    text: "We're processing your refund. Please allow 3-5 business days for the amount to reflect in your account." },
        { label: "Send new item",   text: "We're sending you a replacement item. You'll receive a tracking number shortly." },
        { label: "Schedule pickup", text: "We've scheduled a pickup for your return. Our courier will contact you within 24 hours." },
        { label: "Offer discount",  text: "As a goodwill gesture, here's a 15% discount on your next order — use code: SORRY15" },
    ];

    const handleSendReply = async (textOverride, conv) => {
        const msg = (textOverride !== undefined ? textOverride : replyText).trim();
        if (!msg || !conv) return;
        setIsSending(true);
        setSendError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ phone: conv.phone, message: msg, conversationId: conv.id }),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Send failed');
            setReplyText("");
        } catch (err) {
            setSendError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    // ─── Automation Test Panels ─────────────────────────────────
    const [statusOpen, setStatusOpen] = useState(false);
    const [merchantOpen, setMerchantOpen] = useState(false);
    const [stockOpen, setStockOpen] = useState(false);

    const [statusForm, setStatusForm] = useState({ customerPhone: '', customerName: '', orderNumber: '', status: 'processing', total: '' });
    const [merchantForm, setMerchantForm] = useState({ orderNumber: '', customerName: '', total: '' });
    const [stockForm, setStockForm] = useState({ productName: '', stock: '3' });

    const [statusResult, setStatusResult] = useState(null);
    const [merchantResult, setMerchantResult] = useState(null);
    const [stockResult, setStockResult] = useState(null);
    const [autoLoading, setAutoLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/whatsapp');
                const json = await res.json();
                setData(json);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch whatsapp data:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div style={{ padding: 40, textAlign: "center", color: T.text }}>
            <Icon name="refresh" size={24} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ marginTop: 12, fontWeight: 600 }}>Syncing Command Center...</div>
        </div>
    );

    if (!data) return <div style={{ padding: 40, color: T.red }}>Failed to connect to WhatsApp AI Service.</div>;

    // Safety check: Ensure the response structure is correct
    if (!data.botChats || !data.supportChats) {
        return <div style={{ padding: 40, color: T.red }}>
            Command Center disconnected: Backend returned an invalid data structure.
        </div>;
    }

    const { botChats, supportChats, kpis } = data;
    const botConv = botChats.length > 0 ? botChats[botActive] : null;
    const supportConv = supportChats.length > 0 ? supportChats[supportActive] : null;

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
            {/* Top header */}
            <div style={{ padding: "20px 28px 16px", borderBottom: `1px solid ${T.border}`, background: T.bgCard }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.5px" }}>WhatsApp Command Center</h1>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "5px 0 0" }}>Dual-number system · Bot handles automation, Support team handles complaints & returns</p>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                        {[[kpis.today, "Today", T.text], [kpis.aiRate, "AI rate", T.green], [kpis.avgReply, "Avg reply", T.j200], [kpis.escalated, "Escalated", T.yellow]].map(([v, l, c]) => (
                            <div key={l} style={{ textAlign: "center", padding: "6px 14px", background: T.bgElev, borderRadius: T.r8, border: `1px solid ${T.border}`, minWidth: 68 }}>
                                <div style={{ fontSize: 17, fontWeight: 800, color: c }}>{v}</div>
                                <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>{l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dual frame */}
            <div style={{ flex: "0 0 600px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: T.border, overflow: "hidden" }}>

                {/* LEFT: BOT */}
                <div style={{ background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{
                        padding: "14px 20px",
                        background: "linear-gradient(135deg, rgba(92,168,124,0.12) 0%, rgba(26,81,64,0.08) 100%)",
                        borderBottom: `1px solid ${T.borderMid}`,
                        display: "flex", alignItems: "center", gap: 12,
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: T.r10, background: T.gradBtn,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: T.glowBtn, flexShrink: 0,
                        }}>
                            <Icon name="bot" size={20} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Zyro AI Bot</span>
                                <span style={{
                                    fontSize: 9, padding: "2px 7px", borderRadius: T.r20, fontWeight: 700,
                                    background: T.greenBg, color: T.green, border: `1px solid ${T.green}44`,
                                    display: "flex", alignItems: "center", gap: 3,
                                }}>
                                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, boxShadow: `0 0 4px ${T.green}` }} />
                                    AUTO
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: T.j200, marginTop: 2, fontFamily: "monospace" }}>+92 311 ZYRO-BOT</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Handling</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginTop: 2 }}>{botChats.length} chats</div>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        <div style={{ width: 210, borderRight: `1px solid ${T.border}`, overflowY: "auto", flexShrink: 0 }}>
                            {botChats.map((c, i) => (
                                <div key={i} onClick={() => setBotActive(i)} style={{
                                    padding: "12px 14px", borderBottom: `1px solid ${T.border}`, cursor: "pointer",
                                    background: botActive === i ? "rgba(92,168,124,0.08)" : "transparent",
                                    borderLeft: `3px solid ${botActive === i ? T.j300 : "transparent"}`,
                                    transition: "all 0.1s",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</span>
                                        <span style={{ fontSize: 10, color: T.textFaint }}>{c.time}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: T.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                        <Icon name="sparkle" size={9} color={T.j300} />
                                        <span style={{ fontSize: 9, color: T.j300, fontWeight: 600 }}>AI Handled</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            {botConv ? (
                                <>
                                    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, background: T.bgCard }}>
                                        <div style={{
                                            width: 30, height: 30, borderRadius: "50%",
                                            background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 10, fontWeight: 800, color: T.j100
                                        }}>
                                            {botConv.name.split(" ").map(w => w[0]).join("")}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{botConv.name}</div>
                                            <div style={{ fontSize: 10, color: T.textFaint }}>{botConv.phone} · Order #{botConv.order || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: T.bg }}>
                                        {botConv.msgs.map((m, i) => {
                                            const isCust = m.from === "customer";
                                            return (
                                                <div key={i} style={{ display: "flex", justifyContent: isCust ? "flex-start" : "flex-end" }}>
                                                    <div style={{ maxWidth: "82%" }}>
                                                        {m.from === "ai" && (
                                                            <div style={{ fontSize: 9, color: T.j200, fontWeight: 700, marginBottom: 3, textAlign: "right", display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                                                                <Icon name="sparkle" size={9} color={T.j200} /> Zyro AI
                                                                {m.conf && <span style={{ color: T.textFaint, fontWeight: 500 }}>· {m.conf}%</span>}
                                                            </div>
                                                        )}
                                                        <div style={{
                                                            padding: "8px 12px",
                                                            borderRadius: isCust ? "12px 12px 12px 3px" : "12px 12px 3px 12px",
                                                            background: isCust ? T.bgElev : T.gradBtn,
                                                            border: isCust ? `1px solid ${T.border}` : "none",
                                                            fontSize: 12, color: isCust ? T.text : "#fff", lineHeight: 1.45,
                                                            boxShadow: !isCust ? T.glowBtn : "none",
                                                        }}>{m.text}</div>
                                                        <div style={{ fontSize: 9, color: T.textFaint, marginTop: 3, textAlign: isCust ? "left" : "right" }}>{m.time}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, background: T.bgCard }}>
                                        <div style={{
                                            padding: "8px 12px", borderRadius: T.r8, background: T.bgElev,
                                            border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8,
                                        }}>
                                            <Icon name="sparkle" size={12} color={T.j300} />
                                            <span style={{ fontSize: 11, color: T.textMuted, flex: 1 }}>AI is handling this automatically</span>
                                            <GradientButton size="xs" variant="secondary">Take over</GradientButton>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 12 }}>Select a bot conversation</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: SUPPORT */}
                <div style={{ background: T.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{
                        padding: "14px 20px",
                        background: "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(180,83,9,0.05) 100%)",
                        borderBottom: `1px solid rgba(251,191,36,0.3)`,
                        display: "flex", alignItems: "center", gap: 12,
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: T.r10,
                            background: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(251,191,36,0.35)", flexShrink: 0,
                        }}>
                            <Icon name="headset" size={20} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Support Team</span>
                                <span style={{
                                    fontSize: 9, padding: "2px 7px", borderRadius: T.r20, fontWeight: 700,
                                    background: T.yellowBg, color: T.yellow, border: `1px solid ${T.yellow}44`,
                                    display: "flex", alignItems: "center", gap: 3,
                                }}>
                                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.yellow, boxShadow: `0 0 4px ${T.yellow}` }} />
                                    MANUAL
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: T.yellow, marginTop: 2, fontFamily: "monospace" }}>+92 300 ZYRO-HELP</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Handling</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginTop: 2 }}>{supportChats.length} active</div>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        <div style={{ width: 210, borderRight: `1px solid ${T.border}`, overflowY: "auto", flexShrink: 0 }}>
                            {supportChats.map((c, i) => (
                                <div key={i} onClick={() => setSupportActive(i)} style={{
                                    padding: "12px 14px", borderBottom: `1px solid ${T.border}`, cursor: "pointer",
                                    background: supportActive === i ? "rgba(251,191,36,0.08)" : "transparent",
                                    borderLeft: `3px solid ${supportActive === i ? T.yellow : "transparent"}`,
                                    transition: "all 0.1s",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            {c.unread > 0 && <div style={{ minWidth: 14, height: 14, padding: "0 4px", borderRadius: 7, background: T.red, color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</div>}
                                            <span style={{ fontSize: 10, color: T.textFaint }}>{c.time}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: T.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                                        <Icon name="alert" size={9} color={T.yellow} />
                                        <span style={{ fontSize: 9, color: T.yellow, fontWeight: 600 }}>{c.reason}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            {supportConv ? (
                                <>
                                    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, background: T.bgCard }}>
                                        <div style={{
                                            width: 30, height: 30, borderRadius: "50%",
                                            background: `linear-gradient(135deg, ${T.j400} 0%, ${T.j600} 100%)`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 10, fontWeight: 800, color: T.j100
                                        }}>
                                            {supportConv.name.split(" ").map(w => w[0]).join("")}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{supportConv.name}</div>
                                            <div style={{ fontSize: 10, color: T.textFaint }}>{supportConv.phone} · Order #{supportConv.order || 'N/A'}</div>
                                        </div>
                                        <span style={{
                                            fontSize: 9, padding: "2px 7px", borderRadius: T.r4, fontWeight: 700,
                                            background: T.redBg, color: T.red, border: `1px solid ${T.red}44`,
                                        }}>{supportConv.reason}</span>
                                    </div>

                                    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: T.bg }}>
                                        {supportConv.msgs.map((m, i) => {
                                            const isCust = m.from === "customer";
                                            const isEsc = m.from === "ai-escalated";
                                            return (
                                                <div key={i} style={{ display: "flex", justifyContent: isCust ? "flex-start" : "flex-end" }}>
                                                    <div style={{ maxWidth: "82%" }}>
                                                        {isEsc && (
                                                            <div style={{ fontSize: 9, color: T.yellow, fontWeight: 700, marginBottom: 3, textAlign: "right", display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                                                                <Icon name="alert" size={9} color={T.yellow} /> Auto-Escalated
                                                            </div>
                                                        )}
                                                        <div style={{
                                                            padding: "8px 12px",
                                                            borderRadius: isCust ? "12px 12px 12px 3px" : "12px 12px 3px 12px",
                                                            background: isCust ? T.bgElev : isEsc ? "rgba(251,191,36,0.15)" : T.gradBtn,
                                                            border: isCust ? `1px solid ${T.border}` : isEsc ? `1px solid ${T.yellow}44` : "none",
                                                            fontSize: 12, color: isCust ? T.text : isEsc ? T.yellow : "#fff", lineHeight: 1.45,
                                                        }}>{m.text}</div>
                                                        <div style={{ fontSize: 9, color: T.textFaint, marginTop: 3, textAlign: isCust ? "left" : "right" }}>{m.time}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, background: T.bgCard }}>
                                        <div style={{
                                            padding: "6px 10px 6px 14px", borderRadius: T.r8, background: T.bgElev,
                                            border: `1px solid ${sendError ? T.red : T.border}`,
                                            display: "flex", alignItems: "center", gap: 6,
                                        }}>
                                            <input
                                                placeholder="Type your reply..."
                                                value={replyText}
                                                onChange={e => { setReplyText(e.target.value); setSendError(null); }}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(undefined, supportConv); } }}
                                                disabled={isSending}
                                                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.text, fontFamily: "inherit" }}
                                            />
                                            <GradientButton
                                                size="xs"
                                                variant="primary"
                                                icon={isSending ? "refresh" : "send"}
                                                onClick={() => handleSendReply(undefined, supportConv)}
                                                disabled={isSending || !replyText.trim()}
                                            >
                                                {isSending ? "Sending…" : "Send"}
                                            </GradientButton>
                                        </div>
                                        {sendError && (
                                            <div style={{ fontSize: 10, color: T.red, marginTop: 4, fontWeight: 600 }}>
                                                {sendError}
                                            </div>
                                        )}
                                        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                                            {QUICK_REPLIES.map(qr => (
                                                <button
                                                    key={qr.label}
                                                    disabled={isSending}
                                                    onClick={() => handleSendReply(qr.text, supportConv)}
                                                    style={{
                                                        padding: "3px 9px", borderRadius: T.r20, fontSize: 10, fontWeight: 600,
                                                        background: "rgba(92,168,124,0.1)", border: `1px solid ${T.borderMid}`,
                                                        color: T.j200, cursor: isSending ? "not-allowed" : "pointer",
                                                        fontFamily: "inherit", opacity: isSending ? 0.5 : 1,
                                                    }}
                                                >
                                                    {qr.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, fontSize: 12 }}>Select a support conversation</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Auto-Shift bar */}
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
                        When a customer asks for <b style={{ color: T.yellow }}>returns, complaints, or refunds</b>, Zyro automatically shifts them from the Bot to your Support team.
                    </span>
                </div>
                <GradientButton variant="ghost" size="sm" icon="settings">Configure Rules</GradientButton>
            </div>

            {/* ═══ TEST PANEL: Order Status Update ═══ */}
            <div style={{ borderTop: `1px solid ${T.border}` }}>
                <button onClick={() => setStatusOpen(!statusOpen)} style={{
                    width: '100%', padding: '12px 28px', background: 'linear-gradient(90deg, rgba(59,130,246,0.06) 0%, rgba(16,185,129,0.06) 100%)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                }}>
                    <div style={{ width: 26, height: 26, borderRadius: T.r6, background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="refresh" size={13} color="#fff" />
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#3B82F6' }}>🔄 Test: Order Status Update → Customer WhatsApp</span>
                    <span style={{ fontSize: 18, color: T.textFaint, transform: statusOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>
                {statusOpen && (
                    <div style={{ padding: '20px 28px', background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
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
                                    {['processing', 'shipped', 'completed', 'cancelled', 'refunded', 'on-hold'].map(s => <option key={s} value={s}>{s}</option>)}
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
                                <div style={{ fontSize: 13, fontWeight: 700, color: statusResult.success ? T.green : T.red, marginBottom: 6 }}>{statusResult.success ? '✅' : '❌'} {statusResult.message || statusResult.error}</div>
                                {statusResult.result && (
                                    <pre style={{ fontSize: 10, color: T.textMuted, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(statusResult.result, null, 2)}</pre>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ TEST PANEL: Merchant New Order Alert ═══ */}
            <div style={{ borderTop: `1px solid ${T.border}` }}>
                <button onClick={() => setMerchantOpen(!merchantOpen)} style={{
                    width: '100%', padding: '12px 28px', background: 'linear-gradient(90deg, rgba(16,185,129,0.06) 0%, rgba(92,168,124,0.06) 100%)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                }}>
                    <div style={{ width: 26, height: 26, borderRadius: T.r6, background: 'linear-gradient(135deg, #10B981 0%, #5CA87C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="bell" size={13} color="#fff" />
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: T.green }}>🛒 Test: New Order Alert → Merchant WhatsApp</span>
                    <span style={{ fontSize: 18, color: T.textFaint, transform: merchantOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>
                {merchantOpen && (
                    <div style={{ padding: '20px 28px', background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
                        <p style={{ margin: '0 0 14px', fontSize: 12, color: T.textMuted }}>Sends a new order alert to your personal WhatsApp (<code style={{ color: T.green }}>wa_merchant_phone</code> in Supabase users table).</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
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
                        }}>📩 Send Merchant Alert</GradientButton>
                        {merchantResult && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: T.r8, background: merchantResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${merchantResult.success ? T.green + '33' : T.red + '33'}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: merchantResult.success ? T.green : T.red }}>{merchantResult.success ? '✅' : '❌'} {merchantResult.message || merchantResult.error}</div>
                                {merchantResult.merchantPhone && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Merchant phone: {merchantResult.merchantPhone}</div>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ TEST PANEL: Low Stock Alert ═══ */}
            <div style={{ borderTop: `1px solid ${T.border}` }}>
                <button onClick={() => setStockOpen(!stockOpen)} style={{
                    width: '100%', padding: '12px 28px', background: 'linear-gradient(90deg, rgba(245,158,11,0.06) 0%, rgba(239,68,68,0.06) 100%)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                }}>
                    <div style={{ width: 26, height: 26, borderRadius: T.r6, background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="alert" size={13} color="#fff" />
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: T.yellow }}>⚠️ Test: Low Stock Alert → Merchant WhatsApp</span>
                    <span style={{ fontSize: 18, color: T.textFaint, transform: stockOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>
                {stockOpen && (
                    <div style={{ padding: '20px 28px', background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
                        <p style={{ margin: '0 0 14px', fontSize: 12, color: T.textMuted }}>Sends a low stock alert to your personal WhatsApp when a product is running low.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            {[['productName', 'Product Name', 'Blue Shirt (Size M)'], ['stock', 'Current Stock', '3']].map(([key, label, ph]) => (
                                <div key={key}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>{label}</label>
                                    <input placeholder={ph} value={stockForm[key]} onChange={e => setStockForm(f => ({ ...f, [key]: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: T.r6, border: `1px solid ${T.borderMid}`, background: T.bg, color: T.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            ))}
                        </div>
                        <GradientButton variant="primary" size="sm" disabled={autoLoading} onClick={async () => {
                            setAutoLoading(true); setStockResult(null);
                            try {
                                const userId = getCurrentUserId();
                                const res = await fetch('/api/whatsapp/test-automations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ action: 'send_low_stock_alert', ...stockForm }) });
                                setStockResult(await res.json());
                            } catch (err) { setStockResult({ error: err.message }); }
                            setAutoLoading(false);
                        }}>⚠️ Send Low Stock Alert</GradientButton>
                        {stockResult && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: T.r8, background: stockResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${stockResult.success ? T.green + '33' : T.red + '33'}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: stockResult.success ? T.green : T.red }}>{stockResult.success ? '✅' : '❌'} {stockResult.message || stockResult.error}</div>
                                {stockResult.merchantPhone && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Merchant phone: {stockResult.merchantPhone}</div>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ TEST PANEL: Order Confirmation Flow ═══ */}
            <div style={{ borderTop: `1px solid ${T.border}` }}>
                <button
                    onClick={() => setTestOpen(!testOpen)}
                    style={{
                        width: '100%', padding: '12px 28px', background: 'linear-gradient(90deg, rgba(251,191,36,0.06) 0%, rgba(248,113,113,0.06) 100%)',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit',
                    }}
                >
                    <div style={{
                        width: 26, height: 26, borderRadius: T.r6,
                        background: 'linear-gradient(135deg, #FBBF24 0%, #F87171 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(251,191,36,0.35)', flexShrink: 0,
                    }}>
                        <Icon name="tool" size={13} color="#fff" />
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: T.yellow }}>
                        🧪 Test: Order Confirmation Flow (Template not approved yet)
                    </span>
                    <span style={{ fontSize: 18, color: T.textFaint, transition: 'transform 0.2s', transform: testOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>

                {testOpen && (
                    <div style={{ padding: '20px 28px', background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                            {/* LEFT: Create Pending Order */}
                            <div style={{ background: T.bgElev, borderRadius: T.r12, padding: 20, border: `1px solid ${T.border}` }}>
                                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>📝</span> Step 1: Create Pending Order
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                        ['customerName', 'Customer Name', 'Ahmed Raza'],
                                        ['customerPhone', 'Phone (03xx)', '03001234567'],
                                        ['orderRef', 'Order Ref #', 'WA-1001'],
                                        ['totalAmount', 'Total (Rs)', '3500'],
                                        ['deliveryAddress', 'Delivery Address', 'House 5, Street 10'],
                                        ['cityName', 'City', 'Karachi'],
                                    ].map(([key, label, ph]) => (
                                        <div key={key}>
                                            <label style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>{label}</label>
                                            <input
                                                placeholder={ph}
                                                value={testForm[key]}
                                                onChange={(e) => setTestForm(f => ({ ...f, [key]: e.target.value }))}
                                                style={{
                                                    width: '100%', padding: '8px 10px', borderRadius: T.r6, border: `1px solid ${T.borderMid}`,
                                                    background: T.bg, color: T.text, fontSize: 12, fontFamily: 'inherit', outline: 'none',
                                                    boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ fontSize: 10, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>Order Detail (optional)</label>
                                        <input
                                            placeholder="2x Blue Shirt, 1x Cap"
                                            value={testForm.orderDetail}
                                            onChange={(e) => setTestForm(f => ({ ...f, orderDetail: e.target.value }))}
                                            style={{
                                                width: '100%', padding: '8px 10px', borderRadius: T.r6, border: `1px solid ${T.borderMid}`,
                                                background: T.bg, color: T.text, fontSize: 12, fontFamily: 'inherit', outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                    <GradientButton
                                        variant="primary"
                                        size="sm"
                                        disabled={testLoading}
                                        onClick={async () => {
                                            setTestLoading(true);
                                            setTestResult(null);
                                            try {
                                                const userId = getCurrentUserId();
                                                const res = await fetch('/api/whatsapp/test-confirmation', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                    body: JSON.stringify({ action: 'create_pending', ...testForm, sendWhatsApp: false }),
                                                });
                                                const data = await res.json();
                                                setTestResult({ type: 'create', ...data });
                                                // Refresh pending list
                                                const listRes = await fetch('/api/whatsapp/test-confirmation', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                    body: JSON.stringify({ action: 'list_pending' }),
                                                });
                                                const listData = await listRes.json();
                                                setTestPending(listData.pendingOrders || []);
                                            } catch (err) {
                                                setTestResult({ type: 'error', error: err.message });
                                            }
                                            setTestLoading(false);
                                        }}
                                    >
                                        {testLoading ? 'Saving...' : '💾 Save Pending Order'}
                                    </GradientButton>
                                    <GradientButton
                                        variant="secondary"
                                        size="sm"
                                        disabled={testLoading}
                                        onClick={async () => {
                                            setTestLoading(true);
                                            setTestResult(null);
                                            try {
                                                const userId = getCurrentUserId();
                                                const res = await fetch('/api/whatsapp/test-confirmation', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                    body: JSON.stringify({ action: 'create_pending', ...testForm, sendWhatsApp: true }),
                                                });
                                                const data = await res.json();
                                                setTestResult({ type: 'create_wa', ...data });
                                                // Refresh pending list
                                                const listRes = await fetch('/api/whatsapp/test-confirmation', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                    body: JSON.stringify({ action: 'list_pending' }),
                                                });
                                                const listData = await listRes.json();
                                                setTestPending(listData.pendingOrders || []);
                                            } catch (err) {
                                                setTestResult({ type: 'error', error: err.message });
                                            }
                                            setTestLoading(false);
                                        }}
                                    >
                                        {testLoading ? 'Sending...' : '📤 Save & Send WhatsApp'}
                                    </GradientButton>
                                </div>
                            </div>

                            {/* RIGHT: Pending Orders + Actions */}
                            <div style={{ background: T.bgElev, borderRadius: T.r12, padding: 20, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16 }}>📋</span> Step 2: Simulate Response
                                    </h3>
                                    <GradientButton
                                        variant="ghost"
                                        size="xs"
                                        onClick={async () => {
                                            const userId = getCurrentUserId();
                                            const res = await fetch('/api/whatsapp/test-confirmation', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                body: JSON.stringify({ action: 'list_pending' }),
                                            });
                                            const data = await res.json();
                                            setTestPending(data.pendingOrders || []);
                                        }}
                                    >
                                        🔄 Refresh
                                    </GradientButton>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200 }}>
                                    {testPending.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 30, color: T.textFaint, fontSize: 12 }}>
                                            No pending orders yet. Create one in Step 1.
                                        </div>
                                    ) : (
                                        testPending.map((po) => (
                                            <div key={po.id} style={{
                                                padding: '10px 12px', borderRadius: T.r8, border: `1px solid ${T.border}`,
                                                marginBottom: 8, background: T.bg,
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <div>
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{po.customer_name}</span>
                                                        <span style={{ fontSize: 10, color: T.textFaint, marginLeft: 8 }}>{po.phone}</span>
                                                    </div>
                                                    <span style={{
                                                        fontSize: 9, padding: '2px 7px', borderRadius: T.r20, fontWeight: 700,
                                                        background: po.status === 'pending_confirmation' ? T.yellowBg : po.status === 'confirmed' ? T.greenBg : T.redBg,
                                                        color: po.status === 'pending_confirmation' ? T.yellow : po.status === 'confirmed' ? T.green : T.red,
                                                    }}>
                                                        {po.status}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>
                                                    Ref: <b>{po.order_ref}</b> · Rs {po.total_amount} · {po.city_name || 'N/A'}
                                                    {po.postex_tracking_number && <span style={{ color: T.green }}> · 📦 {po.postex_tracking_number}</span>}
                                                </div>
                                                {po.status === 'pending_confirmation' && (
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            disabled={testLoading}
                                                            onClick={async () => {
                                                                setTestLoading(true);
                                                                setTestResult(null);
                                                                try {
                                                                    const userId = getCurrentUserId();
                                                                    const res = await fetch('/api/whatsapp/test-confirmation', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                                        body: JSON.stringify({ action: 'simulate_yes', pendingOrderId: po.id }),
                                                                    });
                                                                    const data = await res.json();
                                                                    setTestResult({ type: 'yes', ...data });
                                                                    // Refresh list
                                                                    const listRes = await fetch('/api/whatsapp/test-confirmation', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                                        body: JSON.stringify({ action: 'list_pending' }),
                                                                    });
                                                                    const listData = await listRes.json();
                                                                    setTestPending(listData.pendingOrders || []);
                                                                } catch (err) {
                                                                    setTestResult({ type: 'error', error: err.message });
                                                                }
                                                                setTestLoading(false);
                                                            }}
                                                            style={{
                                                                padding: '5px 14px', borderRadius: T.r6, fontSize: 11, fontWeight: 700,
                                                                background: T.greenBg, border: `1px solid ${T.green}44`, color: T.green,
                                                                cursor: 'pointer', fontFamily: 'inherit',
                                                            }}
                                                        >
                                                            ✅ Simulate YES
                                                        </button>
                                                        <button
                                                            disabled={testLoading}
                                                            onClick={async () => {
                                                                setTestLoading(true);
                                                                setTestResult(null);
                                                                try {
                                                                    const userId = getCurrentUserId();
                                                                    const res = await fetch('/api/whatsapp/test-confirmation', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                                        body: JSON.stringify({ action: 'simulate_no', pendingOrderId: po.id }),
                                                                    });
                                                                    const data = await res.json();
                                                                    setTestResult({ type: 'no', ...data });
                                                                    // Refresh list
                                                                    const listRes = await fetch('/api/whatsapp/test-confirmation', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                                        body: JSON.stringify({ action: 'list_pending' }),
                                                                    });
                                                                    const listData = await listRes.json();
                                                                    setTestPending(listData.pendingOrders || []);
                                                                } catch (err) {
                                                                    setTestResult({ type: 'error', error: err.message });
                                                                }
                                                                setTestLoading(false);
                                                            }}
                                                            style={{
                                                                padding: '5px 14px', borderRadius: T.r6, fontSize: 11, fontWeight: 700,
                                                                background: T.redBg, border: `1px solid ${T.red}44`, color: T.red,
                                                                cursor: 'pointer', fontFamily: 'inherit',
                                                            }}
                                                        >
                                                            ❌ Simulate NO
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Result Panel */}
                        {testResult && (
                            <div style={{
                                marginTop: 16, padding: 16, borderRadius: T.r10,
                                background: testResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                                border: `1px solid ${testResult.success ? T.green + '33' : T.red + '33'}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 16 }}>{testResult.success ? '✅' : '❌'}</span>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: testResult.success ? T.green : T.red }}>
                                        {testResult.message || testResult.error || 'Unknown result'}
                                    </span>
                                </div>
                                {testResult.trackingNumber && (
                                    <div style={{ fontSize: 12, color: T.text, marginBottom: 4 }}>
                                        📦 <b>PostEx Tracking:</b> {testResult.trackingNumber}
                                    </div>
                                )}
                                {testResult.dbOrderId && (
                                    <div style={{ fontSize: 12, color: T.text, marginBottom: 4 }}>
                                        🗄️ <b>DB Order ID:</b> <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{testResult.dbOrderId}</span>
                                    </div>
                                )}
                                {testResult.customerId && (
                                    <div style={{ fontSize: 12, color: T.text, marginBottom: 4 }}>
                                        👤 <b>Customer ID:</b> <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{testResult.customerId}</span>
                                    </div>
                                )}
                                {testResult.postexResult && (
                                    <details style={{ marginTop: 8 }}>
                                        <summary style={{ fontSize: 11, color: T.textFaint, cursor: 'pointer', fontWeight: 600 }}>PostEx API Response (raw)</summary>
                                        <pre style={{ fontSize: 10, color: T.textMuted, background: T.bg, padding: 10, borderRadius: T.r6, overflow: 'auto', maxHeight: 150, marginTop: 6 }}>
                                            {JSON.stringify(testResult.postexResult, null, 2)}
                                        </pre>
                                    </details>
                                )}
                                {testResult.whatsappResult && (
                                    <details style={{ marginTop: 8 }}>
                                        <summary style={{ fontSize: 11, color: T.textFaint, cursor: 'pointer', fontWeight: 600 }}>WhatsApp API Response</summary>
                                        <pre style={{ fontSize: 10, color: T.textMuted, background: T.bg, padding: 10, borderRadius: T.r6, overflow: 'auto', maxHeight: 150, marginTop: 6 }}>
                                            {JSON.stringify(testResult.whatsappResult, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Flow diagram */}
                        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: T.r8, background: T.bg, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>How it works</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {[
                                    ['📝', 'Create Pending Order'],
                                    ['→', ''],
                                    ['📲', 'WhatsApp Template Sent'],
                                    ['→', ''],
                                    ['👤', 'Customer presses YES/NO'],
                                    ['→', ''],
                                    ['📦', 'PostEx Order Created'],
                                    ['→', ''],
                                    ['🗄️', 'Saved to DB'],
                                    ['→', ''],
                                    ['✅', 'Tracking # sent back'],
                                ].map(([icon, label], i) => (
                                    label ? (
                                        <span key={i} style={{
                                            fontSize: 10, padding: '4px 8px', borderRadius: T.r4, fontWeight: 600,
                                            background: T.bgElev, color: T.textMuted, border: `1px solid ${T.border}`,
                                            display: 'flex', alignItems: 'center', gap: 4,
                                        }}>
                                            {icon} {label}
                                        </span>
                                    ) : (
                                        <span key={i} style={{ color: T.textFaint, fontSize: 12 }}>{icon}</span>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
