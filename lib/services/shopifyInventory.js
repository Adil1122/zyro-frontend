import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { shopifyApiGet, shopifyApiPost } from '@/lib/services/shopifyService';

function db() {
    return supabaseAdmin || supabase;
}

/** Quantity we expose to a channel: real stock minus the buffer, never below zero. */
export function availableToPush(stockQuantity, safetyBuffer) {
    return Math.max((stockQuantity ?? 0) - (safetyBuffer ?? 0), 0);
}

/**
 * An inventory level already carries the location it belongs to, and reading it
 * needs only read_inventory. Preferred over /locations.json, which requires
 * read_locations — a scope a store connected before it was requested will not
 * have granted, and whose absence otherwise blocks product creation entirely.
 */
async function locationFromInventoryItem(creds, inventoryItemId) {
    if (!inventoryItemId) return null;
    try {
        const { inventory_levels } = await shopifyApiGet('/inventory_levels.json', {
            inventory_item_ids: String(inventoryItemId), limit: 1,
        }, creds);
        return inventory_levels?.[0]?.location_id || null;
    } catch {
        return null;
    }
}

export async function getPrimaryLocationId(creds, { inventoryItemId = null } = {}) {
    const viaItem = await locationFromInventoryItem(creds, inventoryItemId);
    if (viaItem) return viaItem;

    try {
        const { locations } = await shopifyApiGet('/locations.json', {}, creds);
        const active = (locations || []).filter(l => l.active !== false);
        return (active[0] || locations?.[0])?.id || null;
    } catch (e) {
        console.warn('[Shopify Inventory] locations.json unavailable:', e.message);
        return null;
    }
}

/**
 * Links our products to Shopify variants so stock can be pushed.
 * Matches on SKU — the only identifier both sides share.
 */
export async function syncProductMapping(userId, creds) {
    // Resolved lazily from the first variant we match, so a store without
    // read_locations can still be mapped.
    let locationId = null;

    const { data: products } = await db()
        .from('products')
        .select('id, sku, name')
        .eq('user_id', userId);

    const bySku = new Map();
    for (const p of products || []) {
        if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p);
    }

    let pageInfo = null;
    let mapped = 0;
    let unmatched = 0;
    let pages = 0;

    do {
        const params = pageInfo ? { limit: 250, page_info: pageInfo } : { limit: 250 };
        const { products: shopifyProducts } = await shopifyApiGet('/products.json', params, creds);

        for (const sp of shopifyProducts || []) {
            for (const variant of sp.variants || []) {
                const key = (variant.sku || '').trim().toLowerCase();
                const match = key ? bySku.get(key) : null;

                if (!match) { unmatched++; continue; }

                if (!locationId) {
                    locationId = await getPrimaryLocationId(creds, { inventoryItemId: variant.inventory_item_id });
                }

                const { error } = await db()
                    .from('products')
                    .update({
                        shopify_variant_id: variant.id,
                        shopify_inventory_item_id: variant.inventory_item_id,
                        shopify_location_id: locationId,
                    })
                    .eq('id', match.id);

                if (!error) mapped++;
            }
        }

        // /products.json is not cursor-paged by this helper; one pass of 250 is the cap.
        pageInfo = null;
        pages++;
    } while (pageInfo && pages < 10);

    return { mapped, unmatched, locationId };
}

/**
 * Applies a sale to stock atomically via the apply_order_stock Postgres function.
 * items: [{ product_id, quantity }]
 */
export async function applyOrderStock(userId, items, reference, reason = 'Shopify order') {
    const payload = items
        .filter(i => i.product_id && i.quantity > 0)
        .map(i => ({ product_id: i.product_id, quantity: i.quantity }));

    if (!payload.length) return [];

    const { data, error } = await db().rpc('apply_order_stock', {
        p_user_id: userId,
        p_items: payload,
        p_reference: reference,
        p_reason: reason,
    });

    if (error) throw new Error(`Stock update failed: ${error.message}`);
    return data || [];
}

/**
 * Pushes current stock for the given products out to Shopify.
 * Called after the stock transaction has committed, so a failed push leaves our
 * own numbers correct and reconciliation repairs the channel.
 */
export async function pushStockToShopify(userId, productIds, creds) {
    if (!productIds?.length) return { pushed: 0, skipped: 0, failures: [] };

    const { data: products } = await db()
        .from('products')
        .select('id, name, stock_quantity, safety_buffer, shopify_inventory_item_id, shopify_location_id')
        .eq('user_id', userId)
        .in('id', productIds);

    let pushed = 0;
    let skipped = 0;
    const failures = [];

    for (const p of products || []) {
        if (!p.shopify_inventory_item_id || !p.shopify_location_id) { skipped++; continue; }

        try {
            await shopifyApiPost('/inventory_levels/set.json', {
                location_id: p.shopify_location_id,
                inventory_item_id: p.shopify_inventory_item_id,
                available: availableToPush(p.stock_quantity, p.safety_buffer),
            }, creds);
            pushed++;
        } catch (e) {
            failures.push({ product: p.name || p.id, error: e.message });
        }
    }

    return { pushed, skipped, failures };
}

/**
 * Convenience wrapper that resolves credentials itself, for callers that only
 * know the user and product (inventory adjustments, POS sales).
 */
export async function pushStockForProducts(userId, productIds) {
    const { getValidShopifyCreds } = await import('@/lib/shopifyToken');
    const { isShopifyConfigured } = await import('@/lib/services/shopifyService');

    const creds = await getValidShopifyCreds(userId);
    if (!creds || !isShopifyConfigured(creds)) return { pushed: 0, skipped: 0, failures: [] };

    return pushStockToShopify(userId, productIds, creds);
}

/** Applies a Shopify-side stock change back onto our product row. */
export async function applyInboundInventoryLevel(userId, inventoryItemId, available) {
    const { data: product } = await db()
        .from('products')
        .select('id, stock_quantity, safety_buffer')
        .eq('user_id', userId)
        .eq('shopify_inventory_item_id', inventoryItemId)
        .maybeSingle();

    if (!product) return null;

    // Shopify reports what it can sell; add our buffer back to get true stock.
    const trueStock = (available ?? 0) + (product.safety_buffer ?? 0);
    if (trueStock === product.stock_quantity) return { id: product.id, unchanged: true };

    const delta = trueStock - (product.stock_quantity ?? 0);

    await db().from('products')
        .update({ stock_quantity: trueStock })
        .eq('id', product.id);

    await db().from('inventory_movements').insert({
        user_id: userId,
        product_id: product.id,
        movement_type: 'Adjustment',
        quantity: delta,
        reason: 'Shopify inventory update',
        reference: `shopify:inventory_level:${inventoryItemId}`,
    });

    return { id: product.id, from: product.stock_quantity, to: trueStock };
}

/**
 * Compares both sides and corrects Shopify to match us.
 * Our database is authoritative, so drift is resolved by pushing, not pulling.
 */
export async function reconcileInventory(userId, creds) {
    const { data: products } = await db()
        .from('products')
        .select('id, name, sku, stock_quantity, safety_buffer, shopify_inventory_item_id, shopify_location_id')
        .eq('user_id', userId)
        .not('shopify_inventory_item_id', 'is', null);

    if (!products?.length) {
        return { checked: 0, corrected: 0, drift: [], unmapped: true };
    }

    const itemIds = products.map(p => p.shopify_inventory_item_id);
    const levels = [];

    // Shopify caps inventory_item_ids per request.
    for (let i = 0; i < itemIds.length; i += 50) {
        const chunk = itemIds.slice(i, i + 50);
        const { inventory_levels } = await shopifyApiGet('/inventory_levels.json', {
            inventory_item_ids: chunk.join(','),
            limit: 250,
        }, creds);
        levels.push(...(inventory_levels || []));
    }

    const remoteByItem = new Map(levels.map(l => [l.inventory_item_id, l.available]));

    const drift = [];
    let corrected = 0;

    for (const p of products) {
        const expected = availableToPush(p.stock_quantity, p.safety_buffer);
        const actual = remoteByItem.get(p.shopify_inventory_item_id);

        if (actual === undefined || actual === expected) continue;

        drift.push({ product: p.name || p.sku || p.id, expected, actual });

        try {
            await shopifyApiPost('/inventory_levels/set.json', {
                location_id: p.shopify_location_id,
                inventory_item_id: p.shopify_inventory_item_id,
                available: expected,
            }, creds);
            corrected++;
        } catch (e) {
            console.error('[Shopify Reconcile] push failed:', p.id, e.message);
        }
    }

    return { checked: products.length, corrected, drift };
}

/**
 * Creates a product on Shopify and returns the ids stock pushes need.
 * Shopify keeps stock on the variant's inventory_item, not the product, so those
 * ids are captured here rather than looked up again later.
 */
export async function createShopifyProduct(creds, product) {
    const { product: created } = await shopifyApiPost('/products.json', {
        product: {
            title: product.name,
            status: 'active',
            variants: [{
                sku: product.sku || undefined,
                price: product.price != null ? String(product.price) : undefined,
                inventory_management: 'shopify',
            }],
            images: product.image_url ? [{ src: product.image_url }] : undefined,
        },
    }, creds);

    const variant = created?.variants?.[0];
    if (!variant) throw new Error('Shopify returned no variant for the new product');

    // Resolved from the variant Shopify just created, so no location lookup —
    // and no read_locations — is needed.
    const locationId = await getPrimaryLocationId(creds, { inventoryItemId: variant.inventory_item_id });

    // Stock is set separately: the create call does not accept a location.
    if (locationId && variant.inventory_item_id) {
        await shopifyApiPost('/inventory_levels/set.json', {
            location_id: locationId,
            inventory_item_id: variant.inventory_item_id,
            // stock_quantity is the column; product.stock is undefined here and
            // silently became available: 0, so every created product read sold out.
            available: availableToPush(product.stock_quantity ?? product.stock, product.safety_buffer),
        }, creds);
    }

    return {
        productId: created.id,
        variantId: variant.id,
        inventoryItemId: variant.inventory_item_id,
        locationId,
    };
}

/** Links an existing Shopify variant to one of our products, matched by SKU. */
export async function findShopifyVariantBySku(creds, sku) {
    if (!sku) return null;

    const { products } = await shopifyApiGet('/products.json', { limit: 250 }, creds);

    const target = sku.trim().toLowerCase();
    for (const p of products || []) {
        for (const v of p.variants || []) {
            if ((v.sku || '').trim().toLowerCase() === target) {
                const locationId = await getPrimaryLocationId(creds, { inventoryItemId: v.inventory_item_id });
                return { variantId: v.id, inventoryItemId: v.inventory_item_id, locationId };
            }
        }
    }
    return null;
}
