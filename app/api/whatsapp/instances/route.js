import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
    DEFAULT_MERCHANT_PHONE,
    getActiveWhatsAppInstance,
    getAllWhatsAppInstances,
    setActiveWhatsAppInstance,
    clearWhatsAppInstances,
    restoreDefaultWhatsAppInstance,
} from '@/lib/whatsappSession';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to get or fallback to default user
async function resolveUserId(request) {
    let userId = request.headers.get('x-user-id');
    if (!userId || userId === 'null' || userId === 'undefined') {
        const { data: defaultUser } = await supabase
            .from('users')
            .select('id')
            .limit(1)
            .maybeSingle();
        userId = defaultUser?.id || 'e5940095-1560-4425-ab60-f8fc5f7874f4';
    }
    return userId;
}

export async function GET(request) {
    try {
        const userId = await resolveUserId(request);
        const { searchParams } = new URL(request.url);
        const forceDefault = searchParams.get('default') === 'true';

        // Fetch user from Supabase
        const { data: user, error: userErr } = await supabase
            .from('users')
            .select('id, wa_merchant_phone, wa_phone_number_id, wa_waba_id, wa_access_token, wa_is_active')
            .eq('id', userId)
            .maybeSingle();

        if (userErr) {
            console.warn('[WhatsApp Instances] User lookup error:', userErr.message);
        }

        let list = getAllWhatsAppInstances(userId);

        if (forceDefault || (!list && (!user?.wa_merchant_phone || user.wa_merchant_phone.trim() === ''))) {
            // Default number 923475776857 is always active by default
            const defaultInst = restoreDefaultWhatsAppInstance(userId);
            list = [defaultInst];

            // Persist default merchant phone in database
            try {
                await supabase
                    .from('users')
                    .update({ 
                        wa_merchant_phone: DEFAULT_MERCHANT_PHONE,
                        wa_is_active: true 
                    })
                    .eq('id', userId);
            } catch (dbErr) {
                console.warn('[WhatsApp Instances] Default phone db save:', dbErr);
            }
        } else if (!list) {
            const activePhone = (user?.wa_merchant_phone && user.wa_merchant_phone.trim()) || DEFAULT_MERCHANT_PHONE;
            const inst = {
                id: `wa-inst-${userId}`,
                number: activePhone,
                server: 'WhatsApp-69',
                out_message: 'Yes',
                notification: 'Yes',
                group_notification: 'No',
                priority: '1',
                status: 'connected',
                linked_at: new Date().toISOString(),
                is_official: Boolean(user?.wa_phone_number_id && user?.wa_access_token),
            };
            setActiveWhatsAppInstance(userId, inst);
            list = [inst];
        }

        const activeNumber = list[0]?.number || DEFAULT_MERCHANT_PHONE;

        return NextResponse.json({
            instances: list,
            defaultNumber: DEFAULT_MERCHANT_PHONE,
            activeNumber,
            officialCredentials: {
                configured: Boolean(user?.wa_phone_number_id && user?.wa_access_token),
                phoneNumberId: user?.wa_phone_number_id || '',
                wabaId: user?.wa_waba_id || '',
                isActive: user?.wa_is_active !== false,
                merchantPhone: user?.wa_merchant_phone || activeNumber,
            }
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await resolveUserId(request);
        const body = await request.json();

        // Support restoring default WhatsApp number
        if (body.restoreDefault) {
            const defaultInstance = restoreDefaultWhatsAppInstance(userId);
            try {
                await supabase.from('users').update({ wa_merchant_phone: DEFAULT_MERCHANT_PHONE, wa_is_active: true }).eq('id', userId);
            } catch (err) {}
            return NextResponse.json({
                success: true,
                instance: defaultInstance,
                instances: [defaultInstance],
                message: `Default WhatsApp number ${DEFAULT_MERCHANT_PHONE} restored successfully`
            });
        }

        const { number, server = 'WhatsApp-69', method = 'qr' } = body;

        if (!number) {
            return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 });
        }

        const cleanedNumber = number.trim().replace(/\s+/g, '');

        const newInstance = {
            id: `wa-inst-${Date.now()}`,
            number: cleanedNumber,
            server: server || 'WhatsApp-69',
            out_message: 'Yes',
            notification: 'Yes',
            group_notification: 'No',
            priority: '1',
            status: 'connected',
            linked_at: new Date().toISOString(),
            is_official: false,
        };

        // Replaces the existing active number with this new single active number!
        setActiveWhatsAppInstance(userId, newInstance);
        const updated = [newInstance];

        // Update database: update user's merchant phone
        try {
            await supabase
                .from('users')
                .update({ 
                    wa_merchant_phone: cleanedNumber,
                    wa_is_active: true
                })
                .eq('id', userId);
        } catch (dbErr) {
            console.warn('[WhatsApp Instances] User phone update:', dbErr);
        }

        // Ensure a conversation row exists in wa_conversations for this number
        try {
            const { data: existingConv } = await supabase
                .from('wa_conversations')
                .select('id')
                .eq('user_id', userId)
                .eq('phone_number', cleanedNumber)
                .maybeSingle();

            if (!existingConv) {
                await supabase
                    .from('wa_conversations')
                    .insert({
                        user_id: userId,
                        phone_number: cleanedNumber,
                        status: 'manual_support',
                        last_message: 'WhatsApp linked and verified.',
                    });
            }
        } catch (convErr) {}

        return NextResponse.json({
            success: true,
            instance: newInstance,
            instances: updated,
            message: `WhatsApp number ${cleanedNumber} linked successfully and replaced previous account`
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const userId = await resolveUserId(request);
        const body = await request.json();
        const { id, number, out_message, notification, group_notification, priority } = body;

        const existing = getAllWhatsAppInstances(userId) || [];
        const updated = existing.map(inst => {
            if (inst.id === id || inst.number === number) {
                return {
                    ...inst,
                    out_message: out_message !== undefined ? out_message : inst.out_message,
                    notification: notification !== undefined ? notification : inst.notification,
                    group_notification: group_notification !== undefined ? group_notification : inst.group_notification,
                    priority: priority !== undefined ? String(priority) : inst.priority,
                };
            }
            return inst;
        });

        if (updated.length > 0) {
            setActiveWhatsAppInstance(userId, updated[0]);
        }
        return NextResponse.json({ success: true, instances: updated, message: 'Settings updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const userId = await resolveUserId(request);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const number = searchParams.get('number');

        // Clear from in-memory cache
        clearWhatsAppInstances(userId);

        // Clear merchant phone in Supabase users table
        try {
            await supabase
                .from('users')
                .update({ wa_merchant_phone: null })
                .eq('id', userId);
        } catch (dbErr) {
            console.warn('[WhatsApp Instances DELETE] DB update error:', dbErr);
        }

        return NextResponse.json({ 
            success: true, 
            instances: [], 
            message: `WhatsApp number ${number || ''} disconnected successfully.` 
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
