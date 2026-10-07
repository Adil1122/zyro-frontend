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

// Orders created by a courier integration or entered by hand. Real revenue, but
// not attributable to a connected store — so it is charted only when present
// rather than zero-filled like the stores above.
export const OTHER_LABEL = 'Other';

export function storeLabel(platformId) {
    return STORE_LABELS[platformId] || OTHER_LABEL;
}
