// Sales channels a merchant connects a store to. Courier-created orders use other
// platform_id values and are not stores, so they aggregate under "Other".
export const STORE_PLATFORM_IDS = {
    woocommerce: 1,
    daraz: 5,
    shopify: 6,
};

export const STORE_LABELS = {
    1: 'WooCommerce',
    5: 'Daraz',
    6: 'Shopify',
};

// Chart series are keyed by label, so every store appears even at zero rather than
// disappearing from the legend on a quiet day.
export const STORE_LABEL_LIST = ['Shopify', 'WooCommerce', 'Daraz'];

export function storeLabel(platformId) {
    return STORE_LABELS[platformId] || 'Other';
}
