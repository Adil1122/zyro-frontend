import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';

const SOURCE = 'open.er-api.com';

function db() {
    return supabaseAdmin || supabase;
}

function today() {
    return new Date().toISOString().split('T')[0];
}

function dateOnly(value) {
    if (!value) return today();
    const d = new Date(value);
    return isNaN(d) ? today() : d.toISOString().split('T')[0];
}

/** Most recent cached rate on or before the given date. */
async function readCachedRate(from, to, onDate) {
    const { data } = await db()
        .from('fx_rates')
        .select('rate, rate_date')
        .eq('base_currency', from)
        .eq('quote_currency', to)
        .lte('rate_date', onDate)
        .order('rate_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    return data || null;
}

/**
 * Fetches today's rates for `from` and caches every quote in one go, so a
 * multi-currency store costs one request rather than one per currency pair.
 * Returns null when the service is unreachable — callers fall back to cache.
 */
async function fetchAndCacheRates(from) {
    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
        if (!res.ok) {
            console.error('[FX] Rate fetch failed:', res.status);
            return null;
        }

        const body = await res.json();
        if (body.result !== 'success' || !body.rates) {
            console.error('[FX] Unexpected rate payload:', body.result);
            return null;
        }

        const rateDate = today();
        const rows = Object.entries(body.rates)
            .filter(([, rate]) => typeof rate === 'number' && rate > 0)
            .map(([quote, rate]) => ({
                base_currency: from,
                quote_currency: quote,
                rate,
                rate_date: rateDate,
                source: SOURCE,
            }));

        const { error } = await db()
            .from('fx_rates')
            .upsert(rows, { onConflict: 'base_currency,quote_currency,rate_date' });

        if (error) console.error('[FX] Rate cache write failed:', error.message);

        return body.rates;
    } catch (e) {
        console.error('[FX] Rate fetch error:', e.message);
        return null;
    }
}

/**
 * Rate to multiply a `from` amount by to get `to`.
 * Prefers a cached rate for the order's own date, so historical figures do not
 * move when today's rate does. Returns null if no rate can be established.
 */
export async function getRate(from, to, onDate = null) {
    if (!from || !to) return null;
    if (from === to) return 1;

    const target = dateOnly(onDate);

    const cached = await readCachedRate(from, to, target);
    // A rate already dated on or after the order is as good as it gets.
    if (cached && cached.rate_date >= target) return Number(cached.rate);

    const live = await fetchAndCacheRates(from);
    if (live && typeof live[to] === 'number') return live[to];

    // Stale beats nothing: a slightly old rate is far better than discarding
    // the amount or silently treating it as 1:1.
    if (cached) {
        console.warn(`[FX] Using stale ${from}->${to} rate from ${cached.rate_date}`);
        return Number(cached.rate);
    }

    console.error(`[FX] No rate available for ${from}->${to}`);
    return null;
}

/**
 * Converts an amount into the base currency.
 * Returns the converted amount plus the rate used, so the row records how the
 * figure was arrived at. A missing rate yields converted: null rather than a
 * fabricated number.
 */
export async function convertToBase(amount, fromCurrency, baseCurrency, onDate = null) {
    const from = (fromCurrency || baseCurrency || 'PKR').toUpperCase();
    const base = (baseCurrency || 'PKR').toUpperCase();
    const value = Number(amount) || 0;

    if (from === base) return { converted: value, rate: 1, baseCurrency: base };

    const rate = await getRate(from, base, onDate);
    if (rate === null) return { converted: null, rate: null, baseCurrency: base };

    return {
        converted: Math.round(value * rate * 100) / 100,
        rate,
        baseCurrency: base,
    };
}

export async function getUserBaseCurrency(userId) {
    const { data } = await db()
        .from('users')
        .select('base_currency')
        .eq('id', userId)
        .maybeSingle();

    return (data?.base_currency || 'PKR').toUpperCase();
}
