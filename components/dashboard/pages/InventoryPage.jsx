import React, { useState, useEffect } from "react";
import { T } from "../constants";
import Icon from "../Icon";
import { GradientButton, Card, KPI, PageHeader } from "../Primitives";

export default function InventoryPage() {
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState({ pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchInventory = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/inventory?page=${page}&search=${search}`);
                const result = await res.json();

                if (res.ok) {
                    setProducts(result.data || []);
                    setMeta(result.meta || { pagination: { total: 0, page: 1, pageSize: 10, lastPage: 1 } });
                } else {
                    console.error("Failed to fetch inventory:", result.error);
                    setProducts([]);
                }
            } catch (err) {
                console.error("Failed to fetch inventory:", err);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, [page, search]);

    const stMap = {
        'In Stock': { label: "In Stock", bg: T.greenBg, color: T.green, dot: "#4ADE80", st: 'ok' },
        'Low Stock': { label: "Low Stock", bg: T.yellowBg, color: T.yellow, dot: "#FBBF24", st: 'low' },
        'Out of Stock': { label: "Out of Stock", bg: T.redBg, color: T.red, dot: "#F87171", st: 'out' },
    };

    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

    return (
        <div style={{ padding: "28px 32px", maxWidth: 1280 }}>
            <PageHeader
                title="Inventory"
                subtitle={`${meta.pagination.total} products · ${outOfStock + lowStock} alerts · Rs ${totalValue.toLocaleString()} total stock value`}
                actions={<>
                    <GradientButton variant="secondary" size="sm" icon="filter">Filter</GradientButton>
                    <GradientButton variant="secondary" size="sm" icon="download">Export</GradientButton>
                    <GradientButton variant="primary" size="sm" icon="plus">Add Product</GradientButton>
                </>}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
                <KPI label="Total Products" value={meta.pagination.total} sub="Across all platforms" icon="pkg" />
                <KPI label="Out of Stock" value={outOfStock} sub="Items needing attention" icon="alert" />
                <KPI label="Low Stock" value={lowStock} sub="Need reorder soon" icon="trending" />
                <KPI label="Stock Value" value={`Rs ${totalValue.toLocaleString()}`} sub="Current selection" icon="dollar" highlight />
            </div>
            <Card pad={0}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: T.bgElev, border: `1px solid ${T.border}`, borderRadius: T.r8, padding: "7px 12px", maxWidth: 360 }}>
                        <Icon name="search" size={13} color={T.textFaint} />
                        <input
                            placeholder="Search SKU or product name..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            style={{ border: "none", outline: "none", fontSize: 13, color: T.text, flex: 1, background: "transparent", fontFamily: "inherit" }}
                        />
                    </div>
                </div>
                <div style={{ position: "relative", minHeight: loading ? "200px" : "auto" }}>
                    {loading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <span style={{ color: T.text, fontSize: 13 }}>Syncing...</span>
                        </div>
                    )}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(92,168,124,0.03)" }}>
                                {["Product", "SKU", "Stock Level", "Price", "Status", ""].map(h => (
                                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 && !loading && (
                                <tr><td colSpan="6" style={{ padding: 40, textAlign: "center", color: T.textFaint }}>No products found.</td></tr>
                            )}
                            {products.map((pr, i) => {
                                const s = stMap[pr.status] || stMap['In Stock'];
                                return (
                                    <tr key={`${pr.id}-${i}`} style={{ borderBottom: i < products.length - 1 ? `1px solid ${T.border}` : "none" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(92,168,124,0.04)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: T.r8, background: T.bgElev,
                                                    border: `1px solid ${T.border}`,
                                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
                                                }}><Icon name="pkg" size={16} /></div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{pr.name}</div>
                                                    <div style={{ fontSize: 10, color: T.textFaint }}>{pr.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}><span style={{ fontFamily: "monospace", fontSize: 11, color: T.j200, fontWeight: 600 }}>{pr.sku}</span></td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{ width: 48, height: 4, background: T.border, borderRadius: 2 }}>
                                                    <div style={{ height: "100%", width: `${Math.min(100, (pr.stock / 50) * 100)}%`, background: s.st === "out" ? T.red : s.st === "low" ? T.yellow : T.green, borderRadius: 2 }} />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: T.text, minWidth: 20 }}>{pr.stock}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Rs {Number(pr.price).toLocaleString()}</span></td>
                                        <td style={{ padding: "12px 14px" }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: T.r20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, border: `1px solid ${s.color}22` }}>
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
                                                {s.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 14px" }}>
                                            {s.st === "out" && <GradientButton size="xs" variant="primary" icon="refresh">Restock</GradientButton>}
                                            {s.st === "low" && <GradientButton size="xs" variant="primary" icon="plus">Create PO</GradientButton>}
                                            {s.st === "ok" && <GradientButton size="xs" variant="ghost" icon="edit">Edit</GradientButton>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {meta.pagination && (
                    <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 12, color: T.textFaint }}>Page {meta.pagination.page} of {Math.max(1, meta.pagination.lastPage)}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <GradientButton variant="secondary" size="xs" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</GradientButton>
                            <GradientButton variant="secondary" size="xs" disabled={page >= meta.pagination.lastPage} onClick={() => setPage(page + 1)}>Next</GradientButton>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

