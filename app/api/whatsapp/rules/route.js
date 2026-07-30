import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_KEYWORDS = [
    'complaint', 'problem', 'issue', 'broken', 'damaged', 'not working', 'defective',
    'wrong item', 'wrong product', 'refund', 'return', 'fraud', 'fake', 'cheated',
    'scam', 'worst', 'terrible', 'pathetic', 'disgusting', 'angry', 'very bad',
    'not received', 'missing', 'lost', 'stolen', 'late delivery', 'where is my order',
    'still not delivered', 'not delivered', 'where is my parcel', 'waste of money',
    'farzi', 'dhoka', 'naqli', 'kharab', 'wapas karo', 'paisa wapas', 'bohat bura',
    'galat cheez', 'wrong cheez', 'complaint karna', 'jhooth', 'bekaar', 'barbaad',
    'zabardasti', 'paisa loot', 'chori', 'nahi mila', 'order nahi aya',
];

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: user } = await supabase
        .from('users')
        .select('wa_escalation_keywords')
        .eq('id', userId)
        .single();

    const custom = Array.isArray(user?.wa_escalation_keywords) && user.wa_escalation_keywords.length > 0
        ? user.wa_escalation_keywords
        : null;

    return NextResponse.json({
        keywords: custom || DEFAULT_KEYWORDS,
        isCustom: !!custom,
        defaults: DEFAULT_KEYWORDS,
    });
}

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { keywords } = await request.json();
    if (!Array.isArray(keywords)) {
        return NextResponse.json({ error: 'keywords must be an array' }, { status: 400 });
    }

    const cleaned = keywords.map(k => k.trim()).filter(Boolean);

    const { error } = await supabase
        .from('users')
        .update({ wa_escalation_keywords: cleaned.length > 0 ? cleaned : null })
        .eq('id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, keywords: cleaned });
}
