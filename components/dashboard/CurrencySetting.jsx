"use client";

import React, { useState, useEffect } from "react";
import { T } from "./constants";
import { getCurrentUserId } from "@/lib/supabase";
import { SUPPORTED_CURRENCIES, currencySymbol } from "@/lib/currency";

export default function CurrencySetting() {
    const [currency, setCurrency] = useState("PKR");
    const [saved, setSaved] = useState("PKR");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/settings/currency", {
                    headers: { "x-user-id": getCurrentUserId() },
                });
                const data = await res.json();
                if (data.baseCurrency) {
                    setCurrency(data.baseCurrency);
                    setSaved(data.baseCurrency);
                }
            } catch {
                /* keep the default */
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const save = async () => {
        setBusy(true);
        setMsg(null);
        const userId = getCurrentUserId();

        try {
            const res = await fetch("/api/settings/currency", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "x-user-id": userId },
                body: JSON.stringify({ baseCurrency: currency }),
            });
            const data = await res.json();
            if (!res.ok) { setMsg({ type: "error", text: data.error || "Could not save" }); return; }

            // Stored conversions are per-currency, so they have to be redone before
            // any total agrees with the new choice.
            setMsg({ type: "info", text: "Recalculating existing orders…" });
            const recalc = await fetch("/api/settings/currency", {
                method: "POST",
                headers: { "x-user-id": userId },
            });
            const recalcData = await recalc.json();

            setSaved(currency);
            setMsg({
                type: "success",
                text: recalcData.unconvertible
                    ? `Saved. ${recalcData.updated} orders converted, ${recalcData.unconvertible} had no available rate.`
                    : `Saved. ${recalcData.updated} orders converted to ${currency}.`,
            });
        } catch (e) {
            setMsg({ type: "error", text: e.message });
        } finally {
            setBusy(false);
        }
    };

    const dirty = currency !== saved;

    return (
        <div style={{
            background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r12,
            padding: "18px 20px", marginBottom: 20,
        }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                Reporting Currency
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Stores selling in another currency are converted to this one, at the rate on each
                order&apos;s date, so your totals add up.
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    disabled={loading || busy}
                    style={{
                        padding: "8px 12px", borderRadius: T.r8, background: T.bgElev,
                        border: `1px solid ${T.borderMid}`, color: T.text, fontSize: 13,
                        fontFamily: "inherit", cursor: loading || busy ? "wait" : "pointer",
                    }}
                >
                    {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c} value={c}>{c} · {currencySymbol(c)}</option>
                    ))}
                </select>

                {dirty && (
                    <button
                        onClick={save}
                        disabled={busy}
                        style={{
                            padding: "8px 18px", borderRadius: T.r8, fontSize: 13, fontWeight: 700,
                            background: busy ? T.bgHigh : T.gradBtn, color: busy ? T.textMuted : "#fff",
                            border: "none", cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
                        }}
                    >
                        {busy ? "Saving…" : "Save & Recalculate"}
                    </button>
                )}

                {msg && (
                    <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: msg.type === "error" ? T.red : msg.type === "success" ? T.green : T.textMuted,
                    }}>{msg.text}</span>
                )}
            </div>
        </div>
    );
}
