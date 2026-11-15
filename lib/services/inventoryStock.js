import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';

// Channel-agnostic stock helpers. These previously lived in the Shopify service,
// but nothing about them is Shopify-specific and the WooCommerce path depends on
// them, so they outlive that integration here.

function db() {
    return supabaseAdmin || supabase;
}

/** Quantity exposed to a channel: real stock minus the buffer, never below zero. */
export function availableToPush(stockQuantity, safetyBuffer) {
    return Math.max((stockQuantity ?? 0) - (safetyBuffer ?? 0), 0);
}

/**
 * Applies a sale to stock atomically via the apply_order_stock Postgres function.
 * The function locks the row, writes the movement and returns the new quantity in
 * one transaction — a read-then-write from here would race itself on the last unit.
 *
 * items: [{ product_id, quantity }]
 */
export async function applyOrderStock(userId, items, reference, reason = 'Order') {
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
