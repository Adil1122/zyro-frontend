import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import {
    availableToPush,
    pushStockToShopify,
    createShopifyProduct,
    findShopifyVariantBySku,
} from '@/lib/services/shopifyInventory';
import { getValidShopifyCreds } from '@/lib/shopifyToken';
import { isShopifyConfigured } from '@/lib/services/shopifyService';
import {
    isWooCommerceConfigured,
    setWooCommerceStock,
    createWooCommerceProduct,
    findWooCommerceProductBySku,
} from '@/lib/services/woocommerceService';

function db() {
    return supabaseAdmin || supabase;
}

async function log(userId, productId, channel, action, status, detail) {
    await db().from('channel_sync_log').insert({
        user_id: userId, product_id: productId, channel, action, status,
        detail: detail ? String(detail).slice(0, 500) : null,
    }).catch(() => { /* logging must never break a sync */ });
}

async function wooCreds(userId) {
    const { data } = await db()
        .from('users')
        .select('wc_store_url, wc_consumer_key, wc_consumer_secret')
        .eq('id', userId)
        .maybeSingle();

    const creds = {
        url: data?.wc_store_url,
        key: data?.wc_consumer_key,
        secret: data?.wc_consumer_secret,
    };
    return isWooCommerceConfigured(creds) ? creds : null;
}

async function shopifyCreds(userId) {
    try {
        const creds = await getValidShopifyCreds(userId);
        return creds && isShopifyConfigured(creds) ? creds : null;
    } catch {
        // An expired token must not block the other channels.
        return null;
    }
}

/**
 * Pushes current stock for the given products to every connected channel.
 *
 * `originChannel` is skipped: a store that recorded its own sale has already
 * decremented itself, and pushing our number back invites an echo loop with the
 * inbound webhook.
 */
export async function pushStockToChannels(userId, productIds, { originChannel = null } = {}) {
    if (!productIds?.length) return { shopify: null, woocommerce: null };

    const { data: products } = await db()
        .from('products')
        .select('id, name, sku, stock_quantity, safety_buffer, wc_product_id, shopify_inventory_item_id, shopify_location_id')
        .eq('user_id', userId)
        .in('id', productIds);

    const result = { shopify: null, woocommerce: null };

    if (originChannel !== 'shopify') {
        const creds = await shopifyCreds(userId);
        if (creds) {
            try {
                result.shopify = await pushStockToShopify(userId, productIds, creds);
            } catch (e) {
                result.shopify = { error: e.message };
                await log(userId, null, 'shopify', 'push_stock', 'error', e.message);
            }
        }
    }

    if (originChannel !== 'woocommerce') {
        const creds = await wooCreds(userId);
        if (creds) {
            let pushed = 0;
            const failures = [];
            for (const p of products || []) {
                if (!p.wc_product_id) continue;
                try {
                    await setWooCommerceStock(creds, p.wc_product_id, availableToPush(p.stock_quantity, p.safety_buffer));
                    pushed++;
                } catch (e) {
                    failures.push({ product: p.name || p.id, error: e.message });
                    await log(userId, p.id, 'woocommerce', 'push_stock', 'error', e.message);
                }
            }
            result.woocommerce = { pushed, failures };
        }
    }

    return result;
}

/**
 * Makes a Zyro product exist on every connected channel and records the ids
 * needed to push stock to it. Links to an existing listing when the SKU already
 * matches, rather than creating a duplicate.
 */
export async function createProductOnChannels(userId, productId, { channels = ['shopify', 'woocommerce'] } = {}) {
    const { data: product } = await db()
        .from('products')
        .select('id, name, sku, price, stock_quantity, safety_buffer, category, image_url, wc_product_id, shopify_inventory_item_id')
        .eq('id', productId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!product) return { error: 'Product not found' };

    const result = { shopify: null, woocommerce: null };
    const patch = {};

    const sCreds = channels.includes('shopify') ? await shopifyCreds(userId) : null;
    if (sCreds && !product.shopify_inventory_item_id) {
        try {
            const existing = product.sku ? await findShopifyVariantBySku(sCreds, product.sku) : null;
            const ids = existing || await createShopifyProduct(sCreds, product);

            patch.shopify_variant_id = ids.variantId;
            patch.shopify_inventory_item_id = ids.inventoryItemId;
            patch.shopify_location_id = ids.locationId;
            result.shopify = { linked: !!existing, created: !existing, ...ids };
            await log(userId, productId, 'shopify', existing ? 'link_product' : 'create_product', 'ok', product.sku);
        } catch (e) {
            result.shopify = { error: e.message };
            await log(userId, productId, 'shopify', 'create_product', 'error', e.message);
        }
    }

    const wCreds = channels.includes('woocommerce') ? await wooCreds(userId) : null;
    if (wCreds && !product.wc_product_id) {
        try {
            const existing = product.sku ? await findWooCommerceProductBySku(wCreds, product.sku) : null;
            const created = existing || await createWooCommerceProduct(wCreds, {
                name: product.name,
                sku: product.sku,
                price: product.price,
                stock: availableToPush(product.stock_quantity, product.safety_buffer),
                image_url: product.image_url,
                category: product.category,
            });

            patch.wc_product_id = created.id;
            result.woocommerce = { linked: !!existing, created: !existing, id: created.id };
            await log(userId, productId, 'woocommerce', existing ? 'link_product' : 'create_product', 'ok', product.sku);
        } catch (e) {
            result.woocommerce = { error: e.message };
            await log(userId, productId, 'woocommerce', 'create_product', 'error', e.message);
        }
    }

    // Persisted even on partial success: a channel that did link must not be
    // re-created on the next attempt.
    if (Object.keys(patch).length) {
        await db().from('products').update(patch).eq('id', productId);
    }

    return result;
}
