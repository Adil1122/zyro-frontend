import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { convertToBase, getUserBaseCurrency } from '@/lib/services/fxService';

export const maxDuration = 60;

function db() {
    return supabaseAdmin || supabase;
}

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db()
        .from('users')
        .select('base_currency')
        .eq('id', userId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        baseCurrency: data?.base_currency || 'PKR',
        supported: SUPPORTED_CURRENCIES,
    });
}

// Recomputes stored conversions after the base currency changes, and fills in
// orders that predate conversion. Paged so a large account cannot time out.
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const baseCurrency = await getUserBaseCurrency(userId);

    // `all` re-converts everything. The default pass can't simply trust a row
    // that already has a base amount: a row stamped rate 1 while charged in
    // another currency looks converted but isn't.
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';

    let query = db()
        .from('orders')
        .select('id, total_amount, total_amount_base, currency, created_at, base_currency, fx_rate')
        .eq('user_id', userId)
        .limit(500);

    if (!all) {
        query = query.or(
            `base_currency.neq.${baseCurrency},base_currency.is.null,total_amount_base.is.null,fx_rate.is.null`,
        );
    }

    const { data: candidates, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const orders = (candidates || []).filter(o => {
        if (all) return true;
        const orderCurrency = (o.currency || baseCurrency).toUpperCase();
        const misStamped = orderCurrency !== baseCurrency && Number(o.fx_rate) === 1;
        return misStamped
            || o.total_amount_base === null
            || o.fx_rate === null
            || (o.base_currency || '').toUpperCase() !== baseCurrency;
    });

    let updated = 0;
    let unconvertible = 0;

    for (const order of orders || []) {
        const { converted, rate } = await convertToBase(
            order.total_amount,
            order.currency || baseCurrency,
            baseCurrency,
            order.created_at,
        );

        if (converted === null) { unconvertible++; continue; }

        const { error: updateError } = await db()
            .from('orders')
            .update({ total_amount_base: converted, fx_rate: rate, base_currency: baseCurrency })
            .eq('id', order.id);

        if (updateError) unconvertible++;
        else updated++;
    }

    return NextResponse.json({
        success: true,
        baseCurrency,
        examined: orders.length,
        updated,
        unconvertible,
        moreRemaining: (candidates || []).length === 500,
    });
}

export async function PUT(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await request.json(); } catch { /* handled below */ }

    const currency = String(body.baseCurrency || '').toUpperCase();

    // Allowlist rather than free text: this value is used to look up FX rates
    // and labels every money figure in the account.
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
        return NextResponse.json(
            { error: `Unsupported currency. Choose one of: ${SUPPORTED_CURRENCIES.join(', ')}` },
            { status: 400 },
        );
    }

    const { error } = await db()
        .from('users')
        .update({ base_currency: currency })
        .eq('id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Existing orders keep the figures they were converted into, so changing the
    // currency needs a recalculation before totals agree with the new choice.
    return NextResponse.json({
        success: true,
        baseCurrency: currency,
        recalculationRequired: true,
    });
}
