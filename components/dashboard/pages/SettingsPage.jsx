"use client";

import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card } from "../Primitives";
import WooCommerceManagePage from "./WooCommerceManagePage";
import DarazManagePage from "./DarazManagePage";
import ShopifyManagePage from "./ShopifyManagePage";
import PostExManagePage from "./PostExManagePage";
import TCSManagePage from "./TCSManagePage";
import LeopardsManagePage from "./LeopardsManagePage";
import InstaWorldManagePage from "./InstaWorldManagePage";
import MPManagePage from "./MPManagePage";
import PakistanPostManagePage from "./PakistanPostManagePage";
import DHLManagePage from "./DHLManagePage";

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
            // Only check if WooCommerce is configured, don't fetch live stats automatically
            const { data: user } = await supabase
                .from('users')
                .select('wc_store_url, wc_consumer_key, wc_consumer_secret')
                .eq('id', userId)
                .single();
            
            const configured = !!(user?.wc_store_url && user?.wc_consumer_key && user?.wc_consumer_secret);
            setStats({ configured });
        } catch (e) {
            setError(e.message);
            setStats({ configured: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check if WooCommerce is configured on mount (no live stats fetching)
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
            // Check DB credentials only (no live Shopify call on the card)
            const { data: user } = await supabase
                .from('users')
                .select('shopify_store_domain, shopify_access_token')
                .eq('id', userId)
                .single();

            const configured = !!(user?.shopify_store_domain && user?.shopify_access_token);
            setStats({ configured });
        } catch (e) {
            setError(e.message);
            setStats({ configured: false });
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

// ─── TCS Live Stats Hook ─────────────────────────────────────────────────────
function useTCSStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const res = await fetch("/api/tcs/stats", {
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

// ─── Leopards Live Stats Hook ─────────────────────────────────────────────────
function useLeopardsStats() {
    const [stats, setStats]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = getCurrentUserId();
            const res  = await fetch("/api/leopards/stats", { headers: { 'x-user-id': userId } });
            const data = await res.json();
            if (!data.configured)  setStats({ configured: false });
            else if (data.error) { setError(data.error); setStats({ configured: true }); }
            else                   setStats({ configured: true, ...data });
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

// ─── M&P Live Stats Hook ──────────────────────────────────────────────────────
function useMPStats() {
    const [stats, setStats]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    const fetchStats = async () => {
        setLoading(true); setError(null);
        try {
            const userId = getCurrentUserId();
            const res  = await fetch("/api/mp/stats", { headers: { 'x-user-id': userId } });
            const data = await res.json();
            if (!data.configured)  setStats({ configured: false });
            else if (data.error) { setError(data.error); setStats({ configured: true }); }
            else                   setStats({ configured: true, ...data });
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStats(); }, []);
    return { stats, loading, error, refetch: fetchStats };
}

// ─── Pakistan Post / TrackingMore Live Stats Hook ────────────────────────────
function usePakistanPostStats() {
    const [stats, setStats]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    const fetchStats = async () => {
        setLoading(true); setError(null);
        try {
            const userId = getCurrentUserId();
            const res  = await fetch("/api/trackingmore/stats", { headers: { 'x-user-id': userId } });
            const data = await res.json();
            if (!data.configured)  setStats({ configured: false });
            else if (data.error) { setError(data.error); setStats({ configured: true }); }
            else                   setStats({ configured: true, ...data });
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStats(); }, []);
    return { stats, loading, error, refetch: fetchStats };
}

// ─── DHL Live Stats Hook ──────────────────────────────────────────────────────
function useDHLStats() {
    const [stats, setStats]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);

    const fetchStats = async () => {
        setLoading(true); setError(null);
        try {
            const userId = getCurrentUserId();
            const res  = await fetch("/api/dhl/stats", { headers: { 'x-user-id': userId } });
            const data = await res.json();
            if (!data.configured)  setStats({ configured: false });
            else if (data.error) { setError(data.error); setStats({ configured: true }); }
            else                   setStats({ configured: true, ...data });
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStats(); }, []);
    return { stats, loading, error, refetch: fetchStats };
}

// ─── WooCommerce Store Card ─────────────────────────────────────────────────
function WooCommerceCard({ onManage }) {
    const { stats, loading, error, refetch } = useWooCommerceStats();
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    const isConnected = stats?.configured && !error;
    const storeUrl = process.env.NEXT_PUBLIC_WC_STORE_URL || null; // only if exposed

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        
        try {
            const userId = getCurrentUserId();
            const response = await fetch('/api/woocommerce/sync', {
                method: 'POST',
                headers: { 
                    'x-user-id': userId,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSyncResult({
                    success: true,
                    message: 'Sync completed successfully',
                    results: data.results
                });
                // Refresh stats after sync
                refetch();
            } else {
                setSyncResult({
                    success: false,
                    message: data.error || 'Sync failed'
                });
            }
        } catch (error) {
            setSyncResult({
                success: false,
                message: 'Sync failed: ' + error.message
            });
        } finally {
            setSyncing(false);
        }
    };

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

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {isConnected && !loading && (
                        <GradientButton 
                            variant="primary" 
                            size="sm" 
                            icon="refresh" 
                            onClick={handleSync}
                            disabled={syncing}
                        >
                            {syncing ? "Syncing..." : "Sync"}
                        </GradientButton>
                    )}
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
            </div>
            
            {/* Sync Result Notification */}
            {syncResult && (
            <div style={{
                marginTop: 8,
                padding: 12,
                borderRadius: T.r8,
                background: syncResult.success ? T.greenBg : T.redBg,
                border: `1px solid ${syncResult.success ? T.green : T.red}`,
                fontSize: 12,
                color: syncResult.success ? T.green : T.red,
            }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {syncResult.success ? "✓ Sync Complete" : "✗ Sync Failed"}
                </div>
                <div>{syncResult.message}</div>
                {syncResult.results && (
                    <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>
                        <div>Customers: {syncResult.results.customers.inserted} inserted, {syncResult.results.customers.updated} updated</div>
                        <div>Products: {syncResult.results.products.inserted} inserted, {syncResult.results.products.updated} updated</div>
                        <div>Orders: {syncResult.results.orders.inserted} inserted, {syncResult.results.orders.updated} updated</div>
                    </div>
                )}
            </div>
            )}
        </Card>
    );
}

// ─── Daraz Live Card ─────────────────────────────────────────────────────────
function DarazCard({ onManage, onSync, isSyncing, syncResult }) {
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

                {/* Action buttons */}
                {isConnected && !loading ? (
                    <div style={{ display: "flex", gap: 8 }}>
                        <GradientButton variant="primary" size="sm" icon="refresh" onClick={onSync} disabled={isSyncing}>{isSyncing ? "Syncing..." : "Sync"}</GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    </div>
                ) : !loading ? (
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={onManage}>Connect Store</GradientButton>
                ) : null}
                {syncResult && (
                    <div style={{ marginTop: 8, padding: 12, borderRadius: T.r8, background: syncResult.success ? T.greenBg : T.redBg, border: `1px solid ${syncResult.success ? T.green : T.red}`, fontSize: 12, color: syncResult.success ? T.green : T.red }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{syncResult.success ? "✓ Sync Complete" : "✗ Sync Failed"}</div>
                        <div>{syncResult.message}</div>
                    </div>
                )}
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
function PostExCard({ onManage, onSync, isSyncing, syncResult }) {
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

                {/* Action buttons */}
                {isConnected && !loading ? (
                    <div style={{ display: "flex", gap: 8 }}>
                        <GradientButton variant="primary" size="sm" icon="refresh" onClick={onSync} disabled={isSyncing}>
                            {isSyncing ? "Syncing..." : "Sync"}
                        </GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    </div>
                ) : !loading ? (
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={onManage}>
                        Connect Courier
                    </GradientButton>
                ) : null}
            
            {/* Sync Result Notification */}
            {syncResult && (
                <div style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: T.r8,
                    background: syncResult.success ? T.greenBg : T.redBg,
                    border: `1px solid ${syncResult.success ? T.green : T.red}`,
                    fontSize: 12,
                    color: syncResult.success ? T.green : T.red,
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {syncResult.success ? "✓ Sync Complete" : "✗ Sync Failed"}
                    </div>
                    <div>{syncResult.message}</div>
                    {syncResult.results && (
                        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>
                            <div>Customers: {syncResult.results.customers.inserted} inserted, {syncResult.results.customers.updated} updated</div>
                            <div>Products: {syncResult.results.products.inserted} inserted, {syncResult.results.products.updated} updated</div>
                            <div>Orders: {syncResult.results.orders.inserted} inserted, {syncResult.results.orders.updated} updated</div>
                        </div>
                    )}
                </div>
            )}
            </div>
        </Card>
    );
}

// ─── TCS Courier Card ───────────────────────────────────────────────────────
function TCSCard({ onManage, onSync, isSyncing, syncResult }) {
    const { stats, loading, error } = useTCSStats();
    const isConnected = stats?.configured && !error;
    const TCS_GRAD = "linear-gradient(135deg, #C8102E 0%, #E63946 100%)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{
                    width: 44, height: 44, borderRadius: T.r10, flexShrink: 0,
                    background: TCS_GRAD,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 4px 12px rgba(200,16,46,0.35)",
                }}>🚚</div>

                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>TCS Courier</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading
                            ? "Connecting to TCS…"
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
                    <span style={{ fontSize: 12, fontWeight: 600, color: loading ? T.textFaint : isConnected ? T.green : T.red }}>
                        {loading ? "checking…" : isConnected ? "connected" : "disconnected"}
                    </span>
                </div>

                {isConnected && !loading ? (
                    <div style={{ display: "flex", gap: 8 }}>
                        <GradientButton variant="primary" size="sm" icon="refresh" onClick={onSync} disabled={isSyncing}>
                            {isSyncing ? "Syncing..." : "Sync"}
                        </GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    </div>
                ) : !loading ? (
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={onManage}>
                        Connect Courier
                    </GradientButton>
                ) : null}

                {syncResult && (
                    <div style={{
                        marginTop: 8, padding: 12, borderRadius: T.r8,
                        background: syncResult.success ? T.greenBg : T.redBg,
                        border: `1px solid ${syncResult.success ? T.green : T.red}`,
                        fontSize: 12, color: syncResult.success ? T.green : T.red,
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            {syncResult.success ? "✓ Sync Complete" : "✗ Sync Failed"}
                        </div>
                        <div>{syncResult.message}</div>
                    </div>
                )}
            </div>
        </Card>
    );
}

// ─── Leopards Courier Card ──────────────────────────────────────────────────
function LeopardsCard({ onManage, onSync, isSyncing, syncResult }) {
    const { stats, loading, error } = useLeopardsStats();
    const isConnected = stats?.configured && !error;
    const LEOPARDS_GRAD = "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{
                    width: 44, height: 44, borderRadius: T.r10, flexShrink: 0,
                    background: LEOPARDS_GRAD,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 4px 12px rgba(26,71,42,0.4)",
                }}>🐆</div>

                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Leopards Courier</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading
                            ? "Connecting to Leopards…"
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

                {isConnected && !loading && stats?.totalShipments !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>COD Pending</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>{formatRevenue(stats.codPending)}</div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>{stats.todayShipments || 0} today</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Total Recovered</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.j200, marginTop: 2 }}>{formatRevenue(stats.codRecovered)}</div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>{stats.totalShipments || 0} lifetime</div>
                        </div>
                    </div>
                )}

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

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading
                        ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} />
                        : <div style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected ? T.green : T.red, boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}` }} />
                    }
                    <span style={{ fontSize: 12, fontWeight: 600, color: loading ? T.textFaint : isConnected ? T.green : T.red }}>
                        {loading ? "checking…" : isConnected ? "connected" : "disconnected"}
                    </span>
                </div>

                {isConnected && !loading ? (
                    <div style={{ display: "flex", gap: 8 }}>
                        <GradientButton variant="primary" size="sm" icon="refresh" onClick={onSync} disabled={isSyncing}>
                            {isSyncing ? "Syncing..." : "Sync"}
                        </GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    </div>
                ) : !loading ? (
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={onManage}>Connect Courier</GradientButton>
                ) : null}

                {syncResult && (
                    <div style={{
                        marginTop: 8, padding: 12, borderRadius: T.r8,
                        background: syncResult.success ? T.greenBg : T.redBg,
                        border: `1px solid ${syncResult.success ? T.green : T.red}`,
                        fontSize: 12, color: syncResult.success ? T.green : T.red,
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{syncResult.success ? "✓ Sync Complete" : "✗ Sync Failed"}</div>
                        <div>{syncResult.message}</div>
                    </div>
                )}
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

// ─── M&P Courier Card ───────────────────────────────────────────────────────
function MPCard({ onManage, onSync, isSyncing, syncResult }) {
    const { stats, loading, error } = useMPStats();
    const isConnected = stats?.configured && !error;
    const MP_GRAD = "linear-gradient(135deg, #7B2D8B 0%, #9C27B0 100%)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, borderRadius: T.r10, flexShrink: 0, background: MP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(123,45,139,0.35)" }}>🚐</div>
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>M&P Courier</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading ? "Connecting to M&P…" : stats?.configured === false ? "Credentials not configured" : error ? `Error: ${error}` : stats?.todayShipments !== undefined ? `${stats.todayShipments} shipments today` : "No data yet"}
                    </div>
                </div>
                {isConnected && !loading && stats?.totalShipments !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>COD Pending</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginTop: 2 }}>{formatRevenue(stats.codPending)}</div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>{stats.todayShipments || 0} today</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Total Recovered</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.j200, marginTop: 2 }}>{formatRevenue(stats.codRecovered)}</div>
                            <div style={{ fontSize: 10, color: T.textFaint, marginTop: 1 }}>{stats.totalShipments || 0} lifetime</div>
                        </div>
                    </div>
                )}
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
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected ? T.green : T.red, boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}` }} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: loading ? T.textFaint : isConnected ? T.green : T.red }}>{loading ? "checking…" : isConnected ? "connected" : "disconnected"}</span>
                </div>
                {isConnected && !loading ? (
                    <div style={{ display: "flex", gap: 8 }}>
                        <GradientButton variant="primary" size="sm" icon="refresh" onClick={onSync} disabled={isSyncing}>{isSyncing ? "Syncing..." : "Sync"}</GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    </div>
                ) : !loading ? (
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={onManage}>Connect Courier</GradientButton>
                ) : null}
                {syncResult && (
                    <div style={{ marginTop: 8, padding: 12, borderRadius: T.r8, background: syncResult.success ? T.greenBg : T.redBg, border: `1px solid ${syncResult.success ? T.green : T.red}`, fontSize: 12, color: syncResult.success ? T.green : T.red }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{syncResult.success ? "✓ Sync Complete" : "✗ Sync Failed"}</div>
                        <div>{syncResult.message}</div>
                    </div>
                )}
            </div>
        </Card>
    );
}

// ─── Pakistan Post Card ──────────────────────────────────────────────────────
function PakistanPostCard({ onManage }) {
    const { stats, loading, error } = usePakistanPostStats();
    const isConnected = stats?.configured && !error;
    const PP_GRAD = "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, borderRadius: T.r10, flexShrink: 0, background: PP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(27,94,32,0.35)" }}>📮</div>
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Pakistan Post</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading ? "Connecting to TrackingMore…" : stats?.configured === false ? "TrackingMore API key not configured" : error ? `Error: ${error}` : stats?.totalTrackings !== undefined ? `${stats.totalTrackings} trackings monitored` : "No data yet"}
                    </div>
                </div>
                {isConnected && !loading && stats?.totalTrackings !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>In Transit</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.blue, marginTop: 2 }}>{stats.inTransit || 0}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Delivered</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.green, marginTop: 2 }}>{stats.delivered || 0}</div>
                        </div>
                    </div>
                )}
                {loading && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        {[60, 60].map((w, i) => (
                            <div key={i}>
                                <div style={{ height: 10, width: 50, borderRadius: T.r4, background: T.bgHigh, marginBottom: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
                                <div style={{ height: 18, width: w, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected ? T.green : T.red, boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}` }} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: loading ? T.textFaint : isConnected ? T.green : T.red }}>{loading ? "checking…" : isConnected ? "connected" : "disconnected"}</span>
                </div>
                {isConnected && !loading
                    ? <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    : !loading ? <GradientButton variant="primary" size="sm" icon="plus" onClick={onManage}>Connect Courier</GradientButton>
                    : null}
            </div>
        </Card>
    );
}

// ─── DHL Express Card ────────────────────────────────────────────────────────
function DHLCard({ onManage, onSync, isSyncing, syncResult }) {
    const { stats, loading, error } = useDHLStats();
    const isConnected = stats?.configured && !error;
    const DHL_GRAD = "linear-gradient(135deg, #D40511 0%, #FFCC00 100%)";

    return (
        <Card style={{ marginBottom: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, borderRadius: T.r10, flexShrink: 0, background: DHL_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(212,5,17,0.35)" }}>✈️</div>
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>DHL Express</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {loading ? "Connecting to DHL…" : stats?.configured === false ? "Credentials not configured" : error ? `Error: ${error}` : stats?.todayShipments !== undefined ? `${stats.todayShipments} shipments today` : "No data yet"}
                    </div>
                </div>
                {isConnected && !loading && stats?.totalShipments !== undefined && (
                    <div style={{ display: "flex", gap: 20, marginRight: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 600 }}>Total Shipments</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.j200, marginTop: 2 }}>{stats.totalShipments || 0}</div>
                        </div>
                    </div>
                )}
                {loading && (
                    <div style={{ marginRight: 12 }}>
                        <div style={{ height: 10, width: 60, borderRadius: T.r4, background: T.bgHigh, marginBottom: 6, animation: "pulse 1.4s ease-in-out infinite" }} />
                        <div style={{ height: 18, width: 80, borderRadius: T.r4, background: T.bgHigh, animation: "pulse 1.4s ease-in-out infinite" }} />
                    </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 12 }}>
                    {loading ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.textFaint, animation: "pulse 1s ease-in-out infinite" }} /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected ? T.green : T.red, boxShadow: isConnected ? `0 0 6px ${T.green}` : `0 0 6px ${T.red}` }} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: loading ? T.textFaint : isConnected ? T.green : T.red }}>{loading ? "checking…" : isConnected ? "connected" : "disconnected"}</span>
                </div>
                {isConnected && !loading ? (
                    <div style={{ display: "flex", gap: 8 }}>
                        <GradientButton variant="primary" size="sm" icon="refresh" onClick={onSync} disabled={isSyncing}>{isSyncing ? "Syncing..." : "Sync"}</GradientButton>
                        <GradientButton variant="secondary" size="sm" icon="settings" onClick={onManage}>Manage</GradientButton>
                    </div>
                ) : !loading ? (
                    <GradientButton variant="primary" size="sm" icon="plus" onClick={onManage}>Connect Courier</GradientButton>
                ) : null}
                {syncResult && (
                    <div style={{ marginTop: 8, padding: 12, borderRadius: T.r8, background: syncResult.success ? T.greenBg : T.redBg, border: `1px solid ${syncResult.success ? T.green : T.red}`, fontSize: 12, color: syncResult.success ? T.green : T.red }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{syncResult.success ? "✓ Sync Complete" : "✗ Sync Failed"}</div>
                        <div>{syncResult.message}</div>
                    </div>
                )}
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

    // ─── WhatsApp Integration State ───
    const [waConfig, setWaConfig] = useState({
        phoneNumberId: "",
        wabaId: "",
        accessToken: "",
        templateName: "order_created",
        isActive: false,
        tplCancelled: "order_canceled",
        tplPayment: "payment_received",
        tplShipped: "order_shipped",
        tplStatus: "order_status_update",
        merchantPhone: "",
        tplMerchant: "new_order_merchant",
        tplLowStock: "low_stock_alert",
    });
    const [waLoading, setWaLoading] = useState(false);
    const [waSaving, setWaSaving] = useState(false);
    const [waMessage, setWaMessage] = useState(null);

    // ─── Daraz Sync State ───
    const [isDarazSyncing, setIsDarazSyncing] = useState(false);
    const [darazSyncResult, setDarazSyncResult] = useState(null);

    // ─── PostEx Sync State ───
    const [isPostExSyncing, setIsPostExSyncing] = useState(false);
    const [postExSyncResult, setPostExSyncResult] = useState(null);

    // ─── TCS Sync State ───
    const [isTCSSyncing, setIsTCSSyncing] = useState(false);
    const [tcsSyncResult, setTCSSyncResult] = useState(null);

    // ─── Leopards Sync State ───
    const [isLeopardsSyncing, setIsLeopardsSyncing] = useState(false);
    const [leopardsSyncResult, setLeopardsSyncResult] = useState(null);

    // ─── M&P Sync State ───
    const [isMPSyncing, setIsMPSyncing] = useState(false);
    const [mpSyncResult, setMPSyncResult] = useState(null);

    // ─── DHL Sync State ───
    const [isDHLSyncing, setIsDHLSyncing] = useState(false);
    const [dhlSyncResult, setDHLSyncResult] = useState(null);

    const handlePostExSync = async () => {
        setIsPostExSyncing(true);
        setPostExSyncResult(null);
        
        try {
            const userId = getCurrentUserId();
            const response = await fetch("/api/postex/sync", {
                method: "POST",
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': userId 
                }
            });
            
            const result = await response.json();
            
            if (result.error) {
                setPostExSyncResult({
                    success: false,
                    message: result.error || 'PostEx sync failed'
                });
            } else {
                setPostExSyncResult({
                    success: true,
                    message: `PostEx sync completed successfully! ${result.syncedOrders || 0} orders synced.`,
                    results: {
                        orders: { inserted: result.syncedOrders || 0, updated: 0 },
                        customers: { inserted: result.syncedCustomers || 0, updated: 0 },
                        products: { inserted: result.syncedProducts || 0, updated: 0 }
                    }
                });
            }
        } catch (e) {
            setPostExSyncResult({
                success: false,
                message: 'PostEx sync failed: ' + e.message
            });
        } finally {
            setIsPostExSyncing(false);
        }
    };

    const handleTCSSync = async () => {
        setIsTCSSyncing(true);
        setTCSSyncResult(null);
        try {
            const userId = getCurrentUserId();
            const response = await fetch("/api/tcs/sync", {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            });
            const result = await response.json();
            if (result.error) {
                setTCSSyncResult({ success: false, message: result.error });
            } else {
                setTCSSyncResult({ success: true, message: result.message || `TCS sync complete. ${result.syncedOrders || 0} orders in database.` });
            }
        } catch (e) {
            setTCSSyncResult({ success: false, message: 'TCS sync failed: ' + e.message });
        } finally {
            setIsTCSSyncing(false);
        }
    };

    const handleLeopardsSync = async () => {
        setIsLeopardsSyncing(true);
        setLeopardsSyncResult(null);
        try {
            const userId = getCurrentUserId();
            const response = await fetch("/api/leopards/sync", {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            });
            const result = await response.json();
            if (result.error) {
                setLeopardsSyncResult({ success: false, message: result.error });
            } else {
                setLeopardsSyncResult({ success: true, message: result.message || `Leopards sync complete. ${result.syncedOrders || 0} orders in database.` });
            }
        } catch (e) {
            setLeopardsSyncResult({ success: false, message: 'Leopards sync failed: ' + e.message });
        } finally {
            setIsLeopardsSyncing(false);
        }
    };

    const handleDarazSync = async () => {
        setIsDarazSyncing(true);
        setDarazSyncResult(null);
        try {
            const userId = getCurrentUserId();
            const response = await fetch("/api/daraz/sync", { method: "POST", headers: { 'Content-Type': 'application/json', 'x-user-id': userId } });
            const result = await response.json();
            if (result.error) { setDarazSyncResult({ success: false, message: result.error }); }
            else { setDarazSyncResult({ success: true, message: result.message || `Daraz sync complete. ${result.syncedOrders || 0} orders in database.` }); }
        } catch (e) { setDarazSyncResult({ success: false, message: 'Daraz sync failed: ' + e.message }); }
        finally { setIsDarazSyncing(false); }
    };

    const handleMPSync = async () => {
        setIsMPSyncing(true);
        setMPSyncResult(null);
        try {
            const userId = getCurrentUserId();
            const response = await fetch("/api/mp/sync", { method: "POST", headers: { 'Content-Type': 'application/json', 'x-user-id': userId } });
            const result = await response.json();
            if (result.error) { setMPSyncResult({ success: false, message: result.error }); }
            else { setMPSyncResult({ success: true, message: result.message || `M&P sync complete. ${result.syncedOrders || 0} orders in database.` }); }
        } catch (e) { setMPSyncResult({ success: false, message: 'M&P sync failed: ' + e.message }); }
        finally { setIsMPSyncing(false); }
    };

    const handleDHLSync = async () => {
        setIsDHLSyncing(true);
        setDHLSyncResult(null);
        try {
            const userId = getCurrentUserId();
            const response = await fetch("/api/dhl/sync", { method: "POST", headers: { 'Content-Type': 'application/json', 'x-user-id': userId } });
            const result = await response.json();
            if (result.error) { setDHLSyncResult({ success: false, message: result.error }); }
            else { setDHLSyncResult({ success: true, message: result.message || `DHL sync complete. ${result.syncedOrders || 0} shipments in database.` }); }
        } catch (e) { setDHLSyncResult({ success: false, message: 'DHL sync failed: ' + e.message }); }
        finally { setIsDHLSyncing(false); }
    };

    const fetchWhatsAppConfig = async () => {
        setWaLoading(true);
        try {
            const userId = getCurrentUserId();
            const { data, error } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_waba_id, wa_access_token, wa_template_name, wa_is_active, wa_template_cancelled, wa_template_payment, wa_template_shipped, wa_template_status, wa_template_merchant, wa_template_low_stock, wa_merchant_phone')
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (data) {
                setWaConfig({
                    phoneNumberId: data.wa_phone_number_id || "",
                    wabaId: data.wa_waba_id || "",
                    accessToken: data.wa_access_token || "",
                    templateName: data.wa_template_name || "order_created",
                    isActive: !!data.wa_is_active,
                    tplCancelled: data.wa_template_cancelled || "order_canceled",
                    tplPayment: data.wa_template_payment || "payment_received",
                    tplShipped: data.wa_template_shipped || "order_shipped",
                    tplStatus: data.wa_template_status || "order_status_update",
                    merchantPhone: data.wa_merchant_phone || "",
                    tplMerchant: data.wa_template_merchant || "new_order_merchant",
                    tplLowStock: data.wa_template_low_stock || "low_stock_alert",
                });
            }
        } catch (e) {
            console.error("Failed to load WhatsApp configurations:", e.message);
        } finally {
            setWaLoading(false);
        }
    };

    const handleSaveWhatsAppConfig = async (e) => {
        if (e) e.preventDefault();
        setWaSaving(true);
        setWaMessage(null);
        try {
            const userId = getCurrentUserId();
            const { error } = await supabase
                .from('users')
                .update({
                    wa_phone_number_id: waConfig.phoneNumberId,
                    wa_waba_id: waConfig.wabaId,
                    wa_access_token: waConfig.accessToken,
                    wa_template_name: waConfig.templateName,
                    wa_is_active: waConfig.isActive,
                    wa_template_cancelled: waConfig.tplCancelled,
                    wa_template_payment: waConfig.tplPayment,
                    wa_template_shipped: waConfig.tplShipped,
                    wa_template_status: waConfig.tplStatus,
                    wa_merchant_phone: waConfig.merchantPhone,
                    wa_template_merchant: waConfig.tplMerchant,
                    wa_template_low_stock: waConfig.tplLowStock,
                })
                .eq('id', userId);

            if (error) throw error;
            setWaMessage({ success: true, text: "✓ WhatsApp credentials updated successfully!" });
        } catch (e) {
            setWaMessage({ success: false, text: "✗ Failed to update settings: " + e.message });
        } finally {
            setWaSaving(false);
        }
    };

    useEffect(() => {
        if (tab === "whatsapp") {
            fetchWhatsAppConfig();
        }
    }, [tab]);

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

    // Handle Shopify OAuth callback redirect (?shopify=connected or ?shopify=error)
    useEffect(() => {
        const shopifyStatus = searchParams.get("shopify");
        if (shopifyStatus === "connected") {
            const shop = searchParams.get("shop");
            setManagingStore("shopify");
            setTab("stores");
            // Clean URL
            router.replace("/settings/stores");
        } else if (shopifyStatus === "error") {
            const reason = searchParams.get("reason");
            console.error("[Shopify OAuth] Error:", reason);
            router.replace("/settings/stores");
        }
    }, []);

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
    if (managingStore === "tcs") {
        return <TCSManagePage onBack={handleBack} />;
    }
    if (managingStore === "leopards") {
        return <LeopardsManagePage onBack={handleBack} />;
    }
    if (managingStore === "instaworld") {
        return <InstaWorldManagePage onBack={handleBack} />;
    }
    if (managingStore === "mp") {
        return <MPManagePage onBack={handleBack} />;
    }
    if (managingStore === "pakistanpost") {
        return <PakistanPostManagePage onBack={handleBack} />;
    }
    if (managingStore === "dhl") {
        return <DHLManagePage onBack={handleBack} />;
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
                        <DarazCard onManage={() => handleManage("daraz")} onSync={handleDarazSync} isSyncing={isDarazSyncing} syncResult={darazSyncResult} />
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
                        <PostExCard onManage={() => handleManage("postex")} onSync={handlePostExSync} isSyncing={isPostExSyncing} syncResult={postExSyncResult} />

                        {/* TCS – live integration */}
                        <TCSCard onManage={() => handleManage("tcs")} onSync={handleTCSSync} isSyncing={isTCSSyncing} syncResult={tcsSyncResult} />

                        {/* Leopards – live integration */}
                        <LeopardsCard onManage={() => handleManage("leopards")} onSync={handleLeopardsSync} isSyncing={isLeopardsSyncing} syncResult={leopardsSyncResult} />

                        {/* Insta World – live integration */}
                        <InstaWorldCard onManage={() => handleManage("instaworld")} />

                        {/* M&P Courier – live integration */}
                        <MPCard onManage={() => handleManage("mp")} onSync={handleMPSync} isSyncing={isMPSyncing} syncResult={mpSyncResult} />

                        {/* Pakistan Post via TrackingMore – tracking only */}
                        <PakistanPostCard onManage={() => handleManage("pakistanpost")} />

                        {/* DHL Express – live integration */}
                        <DHLCard onManage={() => handleManage("dhl")} onSync={handleDHLSync} isSyncing={isDHLSyncing} syncResult={dhlSyncResult} />

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
                        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>Configure your Meta WhatsApp Cloud API credentials to automate transactional customer notifications.</p>
                        
                        <Card style={{ padding: 24 }}>
                            {waLoading ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: T.textMuted, fontSize: 14 }}>
                                    Loading configurations...
                                </div>
                            ) : (
                                <form onSubmit={handleSaveWhatsAppConfig}>
                                    {waMessage && (
                                        <div style={{
                                            padding: "12px 16px",
                                            borderRadius: T.r8,
                                            background: waMessage.success ? "rgba(92,168,124,0.15)" : "rgba(224,86,86,0.15)",
                                            color: waMessage.success ? T.green : T.red,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            marginBottom: 20,
                                            border: `1px solid ${waMessage.success ? T.green : T.red}33`
                                        }}>
                                            {waMessage.text}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "12px 16px", background: T.bgElev, borderRadius: T.r8, border: `1px solid ${T.border}` }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Notification Automation</div>
                                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Instantly notify customers via WhatsApp for every new order.</div>
                                        </div>
                                        <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
                                            <input 
                                                type="checkbox" 
                                                checked={waConfig.isActive} 
                                                onChange={e => setWaConfig({ ...waConfig, isActive: e.target.checked })}
                                                style={{ opacity: 0, width: 0, height: 0 }} 
                                            />
                                            <span style={{
                                                position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                                                backgroundColor: waConfig.isActive ? T.green : T.textFaint,
                                                borderRadius: 24, transition: "0.2s",
                                            }}>
                                                <span style={{
                                                    position: "absolute", content: '""', height: 18, width: 18, left: waConfig.isActive ? 22 : 3, bottom: 3,
                                                    backgroundColor: "#fff", borderRadius: "50%", transition: "0.2s"
                                                }} />
                                            </span>
                                        </label>
                                    </div>

                                    <div style={{ marginBottom: 18 }}>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>Phone Number ID</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 109283748293847"
                                            value={waConfig.phoneNumberId} 
                                            onChange={e => setWaConfig({ ...waConfig, phoneNumberId: e.target.value })} 
                                            required={waConfig.isActive}
                                            style={{
                                                width: "100%", padding: "10px 14px", background: T.bgElev,
                                                color: T.text, border: `1px solid ${T.border}`, borderRadius: T.r8,
                                                fontSize: 13, fontFamily: "inherit", marginTop: 6, outline: "none",
                                            }} 
                                        />
                                    </div>

                                    <div style={{ marginBottom: 18 }}>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>WhatsApp Business Account (WABA) ID</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 293847293847293"
                                            value={waConfig.wabaId} 
                                            onChange={e => setWaConfig({ ...waConfig, wabaId: e.target.value })} 
                                            required={waConfig.isActive}
                                            style={{
                                                width: "100%", padding: "10px 14px", background: T.bgElev,
                                                color: T.text, border: `1px solid ${T.border}`, borderRadius: T.r8,
                                                fontSize: 13, fontFamily: "inherit", marginTop: 6, outline: "none",
                                            }} 
                                        />
                                    </div>

                                    <div style={{ marginBottom: 18 }}>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>Permanent System User Access Token</label>
                                        <input 
                                            type="password" 
                                            placeholder="EAAGz..."
                                            value={waConfig.accessToken} 
                                            onChange={e => setWaConfig({ ...waConfig, accessToken: e.target.value })} 
                                            required={waConfig.isActive}
                                            style={{
                                                width: "100%", padding: "10px 14px", background: T.bgElev,
                                                color: T.text, border: `1px solid ${T.border}`, borderRadius: T.r8,
                                                fontSize: 13, fontFamily: "inherit", marginTop: 6, outline: "none",
                                            }} 
                                        />
                                    </div>

                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>📱 Merchant WhatsApp Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 923001234567"
                                            value={waConfig.merchantPhone}
                                            onChange={e => setWaConfig({ ...waConfig, merchantPhone: e.target.value })}
                                            style={{
                                                width: "100%", padding: "10px 14px", background: T.bgElev,
                                                color: T.text, border: `1px solid ${T.border}`, borderRadius: T.r8,
                                                fontSize: 13, fontFamily: "inherit", marginTop: 6, outline: "none",
                                            }}
                                        />
                                        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>Your personal WhatsApp number for new order alerts and low stock alerts. Format: 923001234567 (no + or spaces).</div>
                                    </div>

                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>Approved Template Names</div>
                                        <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 14 }}>Each name must exactly match a pre-approved template in your Meta Business Manager.</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                            {[
                                                ["templateName",  "🛍️ New Order (order_created)",        "order_created",         "3 params: name, order#, total"],
                                                ["tplPayment",    "💳 Payment Received",                  "payment_received",      "3 params: name, order#, total"],
                                                ["tplCancelled",  "❌ Order Cancelled",                   "order_canceled",        "3 params: name, order#, total"],
                                                ["tplShipped",    "🚚 Order Shipped / Completed",         "order_shipped",         "2 params: name, order#"],
                                                ["tplStatus",     "🔄 Generic Status Update",             "order_status_update",   "3 params: name, order#, status"],
                                                ["tplMerchant",   "🛒 New Order Alert (Merchant)",        "new_order_merchant",    "3 params: order#, customer, total"],
                                                ["tplLowStock",   "⚠️ Low Stock Alert (Merchant)",        "low_stock_alert",       "2 params: product, stock"],
                                            ].map(([key, label, placeholder, hint]) => (
                                                <div key={key}>
                                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.textMuted }}>{label}</label>
                                                    <input
                                                        type="text"
                                                        placeholder={placeholder}
                                                        value={waConfig[key]}
                                                        onChange={e => setWaConfig({ ...waConfig, [key]: e.target.value })}
                                                        style={{
                                                            width: "100%", padding: "8px 12px", background: T.bgElev,
                                                            color: T.text, border: `1px solid ${T.border}`, borderRadius: T.r8,
                                                            fontSize: 12, fontFamily: "inherit", marginTop: 4, outline: "none",
                                                        }}
                                                    />
                                                    <div style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}>{hint}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                                        <GradientButton 
                                            type="submit" 
                                            variant="primary" 
                                            disabled={waSaving}
                                            icon={waSaving ? "trending" : "check"}
                                        >
                                            {waSaving ? "Saving Settings..." : "Save Configuration"}
                                        </GradientButton>
                                    </div>
                                </form>
                            )}
                        </Card>
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
