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

// One hue per source, shared by every chart so a store is the same colour
// wherever it appears. Validated for the dark chart surface across colour-vision
// types; the greens these replaced were three shades of the theme and unreadable
// against each other. Deliberately outside the green/red/yellow status palette so
// a store colour can never be mistaken for an order state.
//
// Stack order is per-chart, because the separation check applies to adjacent
// pairs: blue beside cyan fails, so charts containing both must not stack them
// together. Changing a colour here means re-running the validator.
export const STORE_COLORS = {
    Shopify: '#3B82F6',
    WooCommerce: '#C026D3',
    Daraz: '#EA580C',
    [OTHER_LABEL]: '#0891B2',
};

export const OTHER_DISPLAY = 'Manual & Courier';
