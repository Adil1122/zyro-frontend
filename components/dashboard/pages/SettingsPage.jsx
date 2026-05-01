"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card } from "../Primitives";
import WooCommerceManagePage from "./WooCommerceManagePage";
import DarazManagePage from "./DarazManagePage";
import ShopifyManagePage from "./ShopifyManagePage";
import PostExManagePage from "./PostExManagePage";
import InstaWorldManagePage from "./InstaWorldManagePage";

// Add these to navigation
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCurrentUserId, supabase } from "@/lib/supabase";

// ─── Sub-view router state ──────────────────────────────────────────────────
// managingStore: null | "woocommerce" | "daraz" | "shopify" | "instagram"

function formatRevenue(amount) {
    if (!amount) return "—";
    if (amount >= 1_000_000) return `Rs ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `Rs ${(amount / 1_000).toFixed(1)}K`;
    return `Rs ${Number(amount).toLocaleString()}`;
}

// ─── WooCommerce Live Stats Hook ────────────────────────────────────────────
function useWooCommerceStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/woocommerce/stats", {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            if (!data.configured) {
                setStats({ configured: false });
            } else if (data.error) {
                setError(data.error);
                setStats({ configured: true });
            } else {
                setStats({ configured: true, ...data });
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return { stats, loading, error, refetch: fetchStats };
}

// ─── Daraz Live Stats Hook ───────────────────────────────────────────────────
function useDarazStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/daraz/stats", {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            if (!data.configured) {
                setStats({ configured: false });
            } else if (data.error) {
                setError(data.error);
                setStats({ configured: true });
            } else {
                setStats({ configured: true, ...data });
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);
    return { stats, loading, error, refetch: fetchStats };
}

// ─── Shopify Live Stats Hook ────────────────────────────────────────────────
function useShopifyStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/shopify/stats", {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            if (!data.configured) {
                setStats({ configured: false });
            } else if (data.error) {
                setError(data.error);
                setStats({ configured: true });
            } else {
                setStats({ configured: true, ...data });
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);
    return { stats, loading, error, refetch: fetchStats };
}

// ─── PostEx Live Stats Hook ──────────────────────────────────────────────────
function usePostExStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/postex/stats", {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            if (!data.configured) {
                setStats({ configured: false });
            } else if (data.error) {
                setError(data.error);
                setStats({ configured: true });
            } else {
                setStats({ configured: true, ...data });
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);
    return { stats, loading, error, refetch: fetchStats };
}

// ─── Insta World Live Stats Hook ─────────────────────────────────────────────
function useInstaWorldStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/instaworld/stats", {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            if (!data.configured) {
                setStats({ configured: false });
            } else if (data.error) {
                setError(data.error);
                setStats({ configured: true });
            } else {
                setStats({ configured: true, ...data });
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);
    return { stats, loading, error, refetch: fetchStats };
}

// ─── WooCommerce Store Card ─────────────────────────────────────────────────
function WooCommerceCard({ onManage }) {
    const { stats, loading, error } = useWooCommerceStats();

    const isConnected = stats?.configured && !error;
    const storeUrl = process.env.NEXT_PUBLIC_WC_STORE_URL || null; // only if exposed

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {/* Platform icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: T.r10, flexShrink: 0,
                    background: "linear-gradient(135deg, #7F54B3 0%, #9B6DB5 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 4px 12px rgba(127,84,179,0.35)",
                }}>🛒</div>

                {/* Name & description */}
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>WooCommerce</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading
                            ? "Connecting to store…"
                            : stats?.configured === false
                                ? "Credentials not configured"
                                : error
                                    ? `Error: ${error}`
                                    : stats?.todayOrders !== undefined
                                        ? `${stats.todayOrders} orders today`
                                        : "No data yet"
                        }
                    </div>
                </div>

                {/* Live stats */}
                {isConnected && !loading && stats?.totalOrders !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Total Orders</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>
                                {(stats.totalOrders || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                +{stats.todayOrders || 0} today
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Revenue</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.j200, marginTop: 2 }}>
                                {formatRevenue(stats.totalRevenue)}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                +{formatRevenue(stats.todayRevenue)} today
                            </div>
                        </div>
                    </div>
                )}

                {/* Skeleton when loading */}
                {loading && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        {[80, 80].map((w, i) => (
                            <div key={i}>
                                <div style={{ height: 10, width: 60, borderRadius: T.r4, background: T.bgHigh, marginBottom: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
                                <div style={{ height: 18, width: w, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Status indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} />
                    ) : (
                        <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: isConnected ? T.green : T.red,
                            boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}`,
                        }} />
                    )}
                    <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: loading ? T.textFaint : isConnected ? T.green : T.red,
                    }}>
                        {loading ? "checking…" : isConnected ? "connected" : "disconnected"}
                    </span>
                </div>

                {/* Action button */}
                {isConnected && !loading
                    ? <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    : !loading
                        ? <GradientButton variant="primary" size="sm" icon="plus"
                            onClick={onManage}>
                            Connect Store
                        </GradientButton>
                        : null
                }
            </div>
        </Card>
    );
}

// ─── Daraz Live Card ─────────────────────────────────────────────────────────
function DarazCard({ onManage }) {
    const { stats, loading, error } = useDarazStats();
    const isConnected = stats?.configured && !error;
    const DARAZ_ORANGE = "#F57D29";
    const DARAZ_GRAD = "linear-gradient(135deg,#F57D29,#E85D04)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {/* Platform icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: T.r10, flexShrink: 0,
                    background: DARAZ_GRAD,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 4px 12px rgba(245,125,41,0.4)",
                }}>🏪</div>

                {/* Name & desc */}
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Daraz</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading
                            ? "Connecting to Daraz…"
                            : stats?.configured === false
                                ? "Credentials not configured"
                                : error
                                    ? `Error: ${error}`
                                    : stats?.todayOrders !== undefined
                                        ? `${stats.todayOrders} orders today · last 90-day view`
                                        : "No data yet"
                        }
                    </div>
                </div>

                {/* Live stats */}
                {isConnected && !loading && stats?.totalOrders !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Orders (90d)</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>
                                {(stats.totalOrders || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                +{stats.todayOrders || 0} today
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Revenue</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: DARAZ_ORANGE, marginTop: 2 }}>
                                {formatRevenue(stats.totalRevenue)}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                +{formatRevenue(stats.todayRevenue)} today
                            </div>
                        </div>
                    </div>
                )}

                {/* Skeleton */}
                {loading && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        {[80, 80].map((w, i) => (
                            <div key={i}>
                                <div style={{ height: 10, width: 60, borderRadius: T.r4, background: T.bgHigh, marginBottom: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
                                <div style={{ height: 18, width: w, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Status indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} />
                    ) : (
                        <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: isConnected ? T.green : T.red,
                            boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}`,
                        }} />
                    )}
                    <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: loading ? T.textFaint : isConnected ? T.green : T.red,
                    }}>
                        {loading ? "checking…" : isConnected ? "connected" : "disconnected"}
                    </span>
                </div>

                {/* Action button */}
                {isConnected && !loading
                    ? (
                        <button onClick={onManage} style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", borderRadius: T.r8,
                            background: DARAZ_GRAD, color: "#fff",
                            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            fontFamily: "inherit", boxShadow: "0 2px 8px rgba(245,125,41,0.35)",
                            transition: "all 0.15s",
                        }}>
                            <Icon name="settings" size={13} color="#fff" />
                            Manage
                        </button>
                    )
                    : !loading
                        ? <GradientButton variant="primary" size="sm" icon="plus"
                            onClick={onManage}>
                            Connect Store
                        </GradientButton>
                        : null
                }
            </div>
        </Card>
    );
}

// ─── Shopify Live Card ───────────────────────────────────────────────────────
const SHOPIFY_GREEN = "#96BF48";
const SHOPIFY_GRAD = "linear-gradient(135deg, #96BF48 0%, #5E8E3E 100%)";

function ShopifyCard({ onManage }) {
    const { stats, loading, error } = useShopifyStats();
    const isConnected = stats?.configured && !error;

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {/* Platform icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: T.r10, flexShrink: 0,
                    background: SHOPIFY_GRAD,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 4px 12px rgba(150,191,72,0.4)",
                }}>🏬</div>

                {/* Name & desc */}
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Shopify</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading
                            ? "Connecting to Shopify…"
                            : stats?.configured === false
                                ? "Credentials not configured"
                                : error
                                    ? `Error: ${error}`
                                    : stats?.todayOrders !== undefined
                                        ? `${stats.todayOrders} orders today`
                                        : "No data yet"
                        }
                    </div>
                </div>

                {/* Live stats */}
                {isConnected && !loading && stats?.totalOrders !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Total Orders</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>
                                {(stats.totalOrders || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                +{stats.todayOrders || 0} today
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Revenue</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: SHOPIFY_GREEN, marginTop: 2 }}>
                                {formatRevenue(stats.totalRevenue)}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                +{formatRevenue(stats.todayRevenue)} today
                            </div>
                        </div>
                    </div>
                )}

                {/* Skeleton */}
                {loading && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        {[80, 80].map((w, i) => (
                            <div key={i}>
                                <div style={{ height: 10, width: 60, borderRadius: T.r4, background: T.bgHigh, marginBottom: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
                                <div style={{ height: 18, width: w, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Status indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} />
                    ) : (
                        <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: isConnected ? T.green : T.red,
                            boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}`,
                        }} />
                    )}
                    <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: loading ? T.textFaint : isConnected ? T.green : T.red,
                    }}>
                        {loading ? "checking…" : isConnected ? "connected" : "disconnected"}
                    </span>
                </div>

                {/* Action button */}
                {isConnected && !loading
                    ? (
                        <button onClick={onManage} style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "6px 12px", borderRadius: T.r8,
                            background: SHOPIFY_GRAD, color: "#fff",
                            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            fontFamily: "inherit", boxShadow: "0 2px 8px rgba(150,191,72,0.35)",
                            transition: "all 0.15s",
                        }}>
                            <Icon name="settings" size={13} color="#fff" />
                            Manage
                        </button>
                    )
                    : !loading
                        ? <GradientButton variant="primary" size="sm" icon="plus"
                            onClick={onManage}>
                            Connect Store
                        </GradientButton>
                        : null
                }
            </div>
        </Card>
    );
}

// ─── PostEx Courier Card ────────────────────────────────────────────────────
function PostExCard({ onManage }) {
    const { stats, loading, error } = usePostExStats();
    const isConnected = stats?.configured && !error;
    const POSTEX_GRAD = "linear-gradient(135deg, #002B49 0%, #004A7C 100%)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {/* Platform icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: T.r10, flexShrink: 0,
                    background: POSTEX_GRAD,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 4px 12px rgba(0,43,73,0.35)",
                }}>📫</div>

                {/* Name & description */}
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>PostEx</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading
                            ? "Connecting to PostEx…"
                            : stats?.configured === false
                                ? "Credentials not configured"
                                : error
                                    ? `Error: ${error}`
                                    : stats?.todayShipments !== undefined
                                        ? `${stats.todayShipments} shipments today`
                                        : "No data yet"
                        }
                    </div>
                </div>

                {/* Live stats */}
                {isConnected && !loading && stats?.totalShipments !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>COD Pending</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>
                                {formatRevenue(stats.codPending)}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                {stats.todayShipments || 0} today
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Total Recovered</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.j200, marginTop: 2 }}>
                                {formatRevenue(stats.codRecovered)}
                            </div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                                {stats.totalShipments || 0} lifetime
                            </div>
                        </div>
                    </div>
                )}

                {/* Skeleton */}
                {loading && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        {[80, 80].map((w, i) => (
                            <div key={i}>
                                <div style={{ height: 10, width: 60, borderRadius: T.r4, background: T.bgHigh, marginBottom: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
                                <div style={{ height: 18, width: w, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Status indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} />
                    ) : (
                        <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: isConnected ? T.green : T.red,
                            boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}`,
                        }} />
                    )}
                    <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: loading ? T.textFaint : isConnected ? T.green : T.red,
                    }}>
                        {loading ? "checking…" : isConnected ? "connected" : "disconnected"}
                    </span>
                </div>

                {/* Action button */}
                {isConnected && !loading
                    ? <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    : !loading
                        ? <GradientButton variant="primary" size="sm" icon="plus"
                            onClick={onManage}>
                            Connect Courier
                        </GradientButton>
                        : null
                }
            </div>
        </Card>
    );
}

// ─── Insta World Courier Card ───────────────────────────────────────────────
function InstaWorldCard({ onManage }) {
    const { stats, loading, error } = useInstaWorldStats();
    const isConnected = stats?.configured && !error;
    const INSTA_GRAD = "linear-gradient(135deg, #00AEEF 0%, #0072BC 100%)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {/* Platform icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: T.r10, flexShrink: 0,
                    background: INSTA_GRAD,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 4px 12px rgba(0,174,239,0.35)",
                }}>🌐</div>

                {/* Name & desc */}
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Insta World</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading
                            ? "Connecting to Insta World…"
                            : stats?.configured === false
                                ? "Credentials not configured"
                                : error
                                    ? `Error: ${error}`
                                    : stats?.todayShipments !== undefined
                                        ? `${stats.todayShipments} shipments today`
                                        : "Next-gen delivery network with real-time tracking"
                        }
                    </div>
                </div>

                {/* Live stats */}
                {isConnected && !loading && stats?.totalShipments !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>COD Pending</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>
                                {formatRevenue(stats.codPending)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Recovered</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.j200, marginTop: 2 }}>
                                {formatRevenue(stats.codRecovered)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} />
                    ) : (
                        <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: isConnected ? T.green : T.red,
                            boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}`,
                        }} />
                    )}
                    <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: loading ? T.textFaint : isConnected ? T.green : T.red,
                    }}>
                        {loading ? "checking…" : isConnected ? "connected" : "disconnected"}
                    </span>
                </div>

                {/* Action button */}
                {isConnected && !loading
                    ? <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    : !loading
                        ? <GradientButton variant="primary" size="sm" icon="plus"
                            onClick={onManage}>
                            Connect Courier
                        </GradientButton>
                        : null
                }
            </div>
        </Card>
    );
}

// ─── Other placeholder store cards ──────────────────────────────────────────
function OtherStoreCard({ name, icon, desc, soon }) {
    return (
        <Card style={{ marginBottom: 10, padding: 16, opacity: soon ? 0.65 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 28, width: 44, textAlign: "center" }}>{icon}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{name}</div>
                        {soon && (
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 7px",
                                background: T.yellowBg, color: T.yellow, borderRadius: T.r4,
                                border: `1px solid ${T.yellow}22`, letterSpacing: "0.05em",
                            }}>COMING SOON</span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint }} />
                    <span style={{ fontSize: 12, color: T.textFaint, fontWeight: 600 }}>disconnected</span>
                </div>
                <GradientButton variant="primary" size="sm" icon="plus" disabled={soon}>Connect</GradientButton>
            </div>
        </Card>
    );
}

// ─── Main Settings Page ──────────────────────────────────────────────────────
export default function SettingsPage({ tabParam }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Sync internal state with URL params
    const initialTab = tabParam || "stores";
    const [tab, setTab] = useState(initialTab);
    
    const initialManaging = searchParams.get("manage");
    const [managingStore, setManagingStore] = useState(initialManaging);

    useEffect(() => {
        if (tabParam && tabParam !== tab) {
            setTab(tabParam);
        }
    }, [tabParam]);

    useEffect(() => {
        const m = searchParams.get("manage");
        if (m !== managingStore) {
            setManagingStore(m);
        }
    }, [searchParams]);

    const handleTabChange = (newTab) => {
        setTab(newTab);
        setManagingStore(null);
        router.push(`/settings/${newTab}`);
    };

    const handleManage = (store) => {
        setManagingStore(store);
        router.push(`/settings/${tab}?manage=${store}`);
    };

    const handleBack = () => {
        setManagingStore(null);
        router.push(`/settings/${tab}`);
    };

    const tabs = [
        { id: "stores", label: "Connected Stores", icon: "globe" },
        { id: "whatsapp", label: "WhatsApp Setup", icon: "whatsapp" },
        { id: "couriers", label: "Couriers", icon: "truck" },
        { id: "team", label: "Team", icon: "users" },
        { id: "billing", label: "Plan & Billing", icon: "dollar" },
        { id: "notifications", label: "Notifications", icon: "bell" },
    ];

    // ── render manage sub-views ──
    if (managingStore === "woocommerce") {
        return <WooCommerceManagePage onBack={handleBack} />;
    }
    if (managingStore === "daraz") {
        return <DarazManagePage onBack={handleBack} />;
    }
    if (managingStore === "shopify") {
        return <ShopifyManagePage onBack={handleBack} />;
    }
    if (managingStore === "postex") {
        return <PostExManagePage onBack={handleBack} />;
    }
    if (managingStore === "instaworld") {
        return <InstaWorldManagePage onBack={handleBack} />;
    }

    return (
        <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
            {/* LEFT SIDEBAR */}
            <div style={{ width: 220, borderRight: `1px solid ${T.border}`, padding: "24px 0", background: T.bgCard, flexShrink: 0 }}>
                <div style={{ padding: "0 18px 14px", fontSize: 11, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>Settings</div>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", textAlign: "left",
                        padding: "10px 18px", fontSize: 13, fontWeight: 500,
                        background: tab === t.id ? "rgba(92,168,124,0.1)" : "transparent",
                        color: tab === t.id ? T.j200 : T.textMuted,
                        border: "none", cursor: "pointer",
                        borderLeft: `3px solid ${tab === t.id ? T.j300 : "transparent"}`,
                        fontFamily: "inherit", transition: "all 0.12s",
                    }}>
                        <Icon name={t.icon} size={14} color={tab === t.id ? T.j200 : T.textFaint} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>

                {/* ── CONNECTED STORES TAB ── */}
                {tab === "stores" && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>Connected Stores</h2>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>
                            Connect your sales channels. Orders and inventory sync automatically.
                        </p>

                        {/* WooCommerce – live integration */}
                        <WooCommerceCard onManage={() => handleManage("woocommerce")} />
                        {/* Daraz – live integration */}
                        <DarazCard onManage={() => handleManage("daraz")} />
                        {/* Shopify – live integration */}
                        <ShopifyCard onManage={() => handleManage("shopify")} />
                        <OtherStoreCard
                            name="Instagram Shop"
                            icon="📸"
                            desc="Connect Facebook Business to sync your Instagram Shop catalog"
                            soon
                        />
                    </div>
                )}

                {/* ── COURIERS TAB ── */}
                {tab === "couriers" && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>Couriers</h2>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>
                            Connect your shipping partners to automate order fulfillment and tracking.
                        </p>

                        {/* PostEx – live integration */}
                        <PostExCard onManage={() => handleManage("postex")} />

                        {/* Insta World – live integration */}
                        <InstaWorldCard onManage={() => handleManage("instaworld")} />

                        <Card style={{ marginTop: 24, padding: 20, background: T.bgElev, border: `1px dashed ${T.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ fontSize: 24 }}>🚚</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Request a Courier</div>
                                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Don't see your courier? Let us know and we'll add it.</div>
                                </div>
                                <GradientButton variant="secondary" size="sm">Request</GradientButton>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ── WHATSAPP TAB ── */}
                {tab === "whatsapp" && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>WhatsApp Setup</h2>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>Dual-number system: AI Bot line + Human Support line.</p>
                        {[
                            { type: "Bot Number", number: "+92 311 ZYRO-BOT", quality: "Green", templates: 14, desc: "Handles all automation & AI replies", color: T.j300 },
                            { type: "Support Number", number: "+92 300 ZYRO-HELP", quality: "Green", templates: 8, desc: "Human agents reply from here", color: T.blue },
                        ].map(n => (
                            <Card key={n.type} style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{n.type}</div>
                                        <div style={{ fontSize: 14, color: n.color, fontFamily: "monospace", marginTop: 4, fontWeight: 600 }}>{n.number}</div>
                                        <div style={{ fontSize: 12, color: T.textFaint, marginTop: 4 }}>{n.desc}</div>
                                    </div>
                                    <GradientButton variant="secondary" size="sm" icon="settings">Configure</GradientButton>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                    {[["Quality Rating", n.quality, T.green], ["Templates", `${n.templates} approved`, T.text], ["Daily Limit", "Unlimited", T.text]].map(([k, v, c]) => (
                                        <div key={k} style={{ padding: 10, background: T.bgElev, borderRadius: T.r6, border: `1px solid ${T.border}` }}>
                                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>{k}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: c, marginTop: 3 }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* ── BILLING TAB ── */}
                {tab === "billing" && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>Plan & Billing</h2>
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>Current subscription and usage.</p>
                        <div style={{
                            background: T.gradHero, borderRadius: T.r14, padding: "24px 28px", marginBottom: 20,
                            position: "relative", overflow: "hidden", boxShadow: T.shadowLg,
                        }}>
                            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.8)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Current Plan</div>
                                    <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginTop: 4, letterSpacing: "-0.8px" }}>Growth</div>
                                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Rs 8,999 / month · Billed monthly</div>
                                </div>
                                <button style={{ padding: "8px 16px", borderRadius: T.r8, background: "#fff", color: T.j600, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}>
                                    <Icon name="trending" size={14} color={T.j600} /> Upgrade to Pro
                                </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 22, position: "relative" }}>
                                {[["Orders Used", "1,247 / 1,500", 83], ["Team", "2 / 3", 67], ["WhatsApp", "847 / 2,000", 42]].map(([k, v, pct]) => (
                                    <div key={k}>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 5 }}>{k}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{v}</div>
                                        <div style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, marginTop: 6 }}>
                                            <div style={{ height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 2 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── OTHER TABS ── */}
                {(tab !== "stores" && tab !== "whatsapp" && tab !== "billing" && tab !== "couriers") && (
                    <div style={{ maxWidth: 720 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 6px", letterSpacing: "-0.4px" }}>
                            {tabs.find(t => t.id === tab)?.label}
                        </h2>
                        <div style={{ padding: "60px 40px", textAlign: "center", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.r12, marginTop: 20 }}>
                            <div style={{ fontSize: 13, color: T.textMuted }}>
                                Configure {tabs.find(t => t.id === tab)?.label.toLowerCase()} settings here
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}
