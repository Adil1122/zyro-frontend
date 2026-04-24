"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton } from "../Primitives";

export default function WhatsAppPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [botActive, setBotActive] = useState(0);
    const [supportActive, setSupportActive] = useState(0);

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
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: T.border, overflow: "hidden" }}>

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
                                            border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 6,
                                        }}>
                                            <input placeholder="Type your reply..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 12, color: T.text, fontFamily: "inherit" }} />
                                            <GradientButton size="xs" variant="primary" icon="send">Send</GradientButton>
                                        </div>
                                        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                                            {["Issue refund", "Send new item", "Schedule pickup", "Offer discount"].map(t => (
                                                <button key={t} style={{
                                                    padding: "3px 9px", borderRadius: T.r20, fontSize: 10, fontWeight: 600,
                                                    background: "rgba(92,168,124,0.1)", border: `1px solid ${T.borderMid}`,
                                                    color: T.j200, cursor: "pointer", fontFamily: "inherit",
                                                }}>{t}</button>
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
        </div>
    );
}
