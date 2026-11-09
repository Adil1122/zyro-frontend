import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
    DEFAULT_MERCHANT_PHONE,
    getActiveWhatsAppInstance,
    getAllWhatsAppInstances,
    setActiveWhatsAppInstance,
    clearWhatsAppInstances,
    restoreDefaultWhatsAppInstance,
    resolveTenantWhatsAppCredentials,
    getPlatformWhatsAppConfig,
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

        // Resolve credentials (checks tenant overrides first, then Master Platform credentials)
        const creds = await resolveTenantWhatsAppCredentials(userId);
        const platform = getPlatformWhatsAppConfig();

        let list = getAllWhatsAppInstances(userId);

        if (forceDefault || (!list && (!creds.merchantPhone || creds.merchantPhone.trim() === ''))) {
            const defaultInst = restoreDefaultWhatsAppInstance(userId);
            list = [defaultInst];
        } else if (!list) {
            const activePhone = creds.merchantPhone || platform.defaultMerchantPhone;
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
                is_official: creds.isConfigured,
                is_platform_managed: creds.isUsingPlatformMaster,
            };
            setActiveWhatsAppInstance(userId, inst);
            list = [inst];
        }

        const activeNumber = list[0]?.number || creds.merchantPhone;

        return NextResponse.json({
            instances: list,
            defaultNumber: platform.defaultMerchantPhone,
            activeNumber,
            isPlatformManaged: creds.isUsingPlatformMaster,
            isMetaConfigured: creds.isConfigured,
            officialCredentials: {
                configured: creds.isConfigured,
                isUsingPlatformMaster: creds.isUsingPlatformMaster,
                phoneNumberId: creds.phoneNumberId || '',
                wabaId: creds.wabaId || '',
                isActive: creds.isActive,
                merchantPhone: activeNumber,
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
            const platform = getPlatformWhatsAppConfig();
            try {
                await supabase.from('users').update({ wa_merchant_phone: platform.defaultMerchantPhone, wa_is_active: true }).eq('id', userId);
            } catch (err) {}
            return NextResponse.json({
                success: true,
                instance: defaultInstance,
                instances: [defaultInstance],
                message: `Default WhatsApp number ${platform.defaultMerchantPhone} restored successfully`
            });
        }

        const { number, server = 'WhatsApp-69', method = 'qr' } = body;

        if (!number) {
            return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 });
        }

        const cleanedNumber = number.trim().replace(/\s+/g, '');
        const creds = await resolveTenantWhatsAppCredentials(userId);

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
            is_official: creds.isConfigured,
            is_platform_managed: creds.isUsingPlatformMaster,
        };

        // Replaces the existing active number with this new single active number
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

        return NextResponse.json({
            success: true,
            instance: newInstance,
            instances: updated,
            isPlatformManaged: creds.isUsingPlatformMaster,
            message: `WhatsApp number ${cleanedNumber} connected successfully to your multi-tenant account`
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
