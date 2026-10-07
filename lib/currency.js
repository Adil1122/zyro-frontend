// Client-safe. No server imports — this is used in components.

const SYMBOLS = {
    PKR: 'Rs',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED',
    SAR: 'SAR',
    INR: '₹',
    AUD: 'A$',
    CAD: 'C$',
};

export const SUPPORTED_CURRENCIES = Object.keys(SYMBOLS);

export function currencySymbol(code) {
    return SYMBOLS[(code || 'PKR').toUpperCase()] || (code || '').toUpperCase();
}

/** e.g. formatMoney(195000, 'PKR') -> "Rs 195,000" */
export function formatMoney(amount, code = 'PKR', { decimals = 0 } = {}) {
    const value = Number(amount) || 0;
    return `${currencySymbol(code)} ${value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}`;
}
