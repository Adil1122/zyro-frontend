"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, PageHeader } from "../Primitives";

export default function CouriersPage() {
    const [courierStats, setCourierStats] = useState([]);
    const [meta, setMeta] = useState({ pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const [shipments, setShipments] = useState([]);
    const [shipMeta, setShipMeta] = useState({ pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
    const [shipLoading, setShipLoading] = useState(true);
    const [shipPage, setShipPage] = useState(1);

    useEffect(() => {
        const fetchCouriers = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/couriers?page=${page}`);
                const result = await res.json();
                setCourierStats(result.data || []);
                setMeta(result.meta);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch couriers:", err);
                setLoading(false);
            }
        };
        fetchCouriers();
    }, [page]);

    useEffect(() => {
        const fetchShipments = async () => {
            setShipLoading(true);
            try {
                const res = await fetch(`/api/couriers/shipments?page=${shipPage}`);
                const result = await res.json();
                setShipments(result.data || []);
                setShipMeta(result.meta);
                setShipLoading(false);
            } catch (err) {
                console.error("Failed to fetch shipments:", err);
                setShipLoading(false);
            }
        };
        fetchShipments();
    }, [shipPage]);

    const totalInTransit = courierStats.reduce((sum, c) => sum + (c.codInTransit || 0), 0);

    return (
        <div style={{ padding: "28px 32px", maxWidth: 1280 }}>
            <PageHeader
                title="Couriers"
                subtitle={`${meta?.pagination?.total || 0} active couriers · Rs ${totalInTransit.toLocaleString()} COD in transit (current view)`}
                actions={<>
                    <GradientButton variant="secondary" size="sm" icon="refresh">Refresh All</GradientButton>
                    <GradientButton variant="primary" size="sm" icon="plus">Book Shipment</GradientButton>
                </>}
            />
            {loading && <div style={{ padding: 40, textAlign: "center", color: T.text }}>Syncing courier data...</div>}

            {!loading && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                        {courierStats.length === 0 && <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: T.textFaint }}>No couriers configured.</div>}
                        {courierStats.map((c, i) => (
                            <Card key={`${c.name}-${i}`} pad={18} glow={i === 0}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        {c.logo && <img src={c.logo} style={{ width: 24, height: 24, objectFit: "contain" }} />}
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>Courier</div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 3 }}>{c.name}</div>
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: "3px 9px", borderRadius: T.r20,
                                        background: T.greenBg,
                                        color: T.green,
                                        fontSize: 11, fontWeight: 700, border: `1px solid ${T.green}33`,
                                    }}>94%</div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: T.textFaint }}>Pending</div>
                                        <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginTop: 2 }}>{c.pendingBooking}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: T.textFaint }}>Status</div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: T.green, marginTop: 2 }}>{c.status}</div>
                                    </div>
                                </div>
                                <div style={{ paddingTop: 10, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 11, color: T.textFaint }}>COD in transit</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: T.j200 }}>Rs {(c.codInTransit || 0).toLocaleString()}</span>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {meta?.pagination && (
                        <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bgCard, padding: "10px 16px", borderRadius: T.r10, border: `1px solid ${T.border}` }}>
                            <span style={{ fontSize: 12, color: T.textFaint }}>Page {meta.pagination.page} of {Math.max(1, meta.pagination.lastPage)}</span>
                            <div style={{ display: "flex", gap: 6 }}>
                                <GradientButton variant="secondary" size="xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</GradientButton>
                                <GradientButton variant="secondary" size="xs" disabled={page >= meta.pagination.lastPage} onClick={() => setPage(page + 1)}>Next</GradientButton>
                            </div>
                        </div>
                    )}
                </>
            )}

            <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
                            <Icon name="sparkle" size={14} color={T.j300} /> Smart Routing Rules
                        </div>
                        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Zyro auto-picks the best courier for every order</div>
                    </div>
                    <GradientButton variant="secondary" size="sm" icon="edit">Edit Rules</GradientButton>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {[
                        { zone: "Metro Cities", cities: "Karachi, Lahore, Islamabad +10", courier: "TCS", color: T.j300 },
                        { zone: "Urban Areas", cities: "Sialkot, Multan, Peshawar +15", courier: "Leopards", color: T.blue },
                        { zone: "Rural / Remote", cities: "Village & small-town markers", courier: "Trax / PostEx", color: T.purple },
                    ].map(r => (
                        <div key={r.zone} style={{
                            padding: "12px 14px", background: T.bgElev, border: `1px solid ${T.border}`,
                            borderRadius: T.r8, borderLeft: `3px solid ${r.color}`,
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>{r.zone}</div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 8 }}>{r.cities}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Icon name="arrow" size={11} color={r.color} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.courier}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card pad={0}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Live Shipment Tracking</div>
                        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>Auto-synced every 30 minutes</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <GradientButton variant="ghost" size="sm" icon="filter">Filter</GradientButton>
                        <GradientButton variant="ghost" size="sm" icon="download">Export</GradientButton>
                    </div>
                </div>
                <div style={{ position: "relative", minHeight: 200 }}>
                    {shipLoading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <span style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>Updating tracking status...</span>
                        </div>
                    )}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(92,168,124,0.03)" }}>
                                {["Tracking #", "Customer", "City", "Courier", "Status", "Progress", "ETA", "COD", ""].map(h => (
                                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!shipLoading && shipments.length === 0 && (
                                <tr><td colSpan="9" style={{ padding: 40, textAlign: "center", color: T.textFaint }}>No shipments found.</td></tr>
                            )}
                            {shipments.map((s, i) => (
                                <tr key={`${s.cn}-${i}`} style={{ borderBottom: i < shipments.length - 1 ? `1px solid ${T.border}` : "none" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontFamily: "monospace", fontSize: 12, color: T.j200, fontWeight: 600 }}>{s.cn}</span></td>
                                    <td style={{ padding: "12px 16px" }}><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{s.customer}</div></td>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, color: T.textMuted }}>{s.city}</span></td>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{s.courier}</span></td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{
                                            fontSize: 11, padding: "3px 9px", borderRadius: T.r20, fontWeight: 600,
                                            background: s.stage === 5 ? T.greenBg : (s.stage === 0 ? T.redBg : T.blueBg),
                                            color: s.stage === 5 ? T.green : (s.stage === 0 ? T.red : T.blue),
                                            border: `1px solid ${s.stage === 5 ? T.green : (s.stage === 0 ? T.red : T.blue)}22`,
                                        }}>{s.status}</span>
                                    </td>
                                    <td style={{ padding: "12px 16px", width: 140 }}>
                                        <div style={{ display: "flex", gap: 3 }}>
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <div key={n} style={{
                                                    flex: 1, height: 4, borderRadius: 2,
                                                    background: n <= s.stage ? T.j300 : (s.stage === 0 && n === 1 ? T.red : T.border),
                                                    boxShadow: n <= s.stage ? T.glowBtn : "none",
                                                }} />
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, color: T.textMuted }}>{s.eta}</span></td>
                                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 13, fontWeight: 700, color: T.j200 }}>Rs {(s.cod || 0).toLocaleString()}</span></td>
                                    <td style={{ padding: "12px 16px" }}><GradientButton size="xs" variant="secondary">Track</GradientButton></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {shipMeta?.pagination && (
                    <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 12, color: T.textFaint }}>Page {shipMeta.pagination.page} of {Math.max(1, shipMeta.pagination.lastPage)}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <GradientButton variant="secondary" size="xs" disabled={shipPage === 1} onClick={() => setShipPage(shipPage - 1)}>Prev</GradientButton>
                            <GradientButton variant="secondary" size="xs" disabled={shipPage >= shipMeta.pagination.lastPage} onClick={() => setShipPage(shipPage + 1)}>Next</GradientButton>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
