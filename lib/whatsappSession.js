import { supabase } from '@/lib/supabase';

// Shared in-memory active WhatsApp instance store
export const DEFAULT_MERCHANT_PHONE = '923475776857';

// Global cache across all Next.js API routes & server processes
const globalStore = globalThis.__zyro_wa_store || (globalThis.__zyro_wa_store = {
    instances: new Map(),
    currentActiveInstance: null,
    isExplicitlyCleared: false,
    pendingTokens: new Map(), // code -> { userId, number, createdAt }
});

/**
 * Master Platform WhatsApp Business Account configuration from Environment Variables
 * This allows Zyro to act as a centralized Multi-Tenant Meta Tech Provider so individual
 * merchants do not need to configure their own API tokens or webhooks.
 */
export function getPlatformWhatsAppConfig() {
    const systemAccessToken = process.env.WA_SYSTEM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
    const wabaId = process.env.WA_DEFAULT_WABA_ID || process.env.META_WABA_ID || '';
    const defaultPhoneNumberId = process.env.WA_DEFAULT_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '';
    const defaultMerchantPhone = process.env.WA_DEFAULT_MERCHANT_PHONE || DEFAULT_MERCHANT_PHONE;
    const verifyToken = process.env.WA_VERIFY_TOKEN || 'zyro_verify_token';
    const appId = process.env.WA_APP_ID || '';
    const appSecret = process.env.WA_APP_SECRET || '';

    return {
        systemAccessToken,
        wabaId,
        defaultPhoneNumberId,
        defaultMerchantPhone,
        verifyToken,
        appId,
        appSecret,
        isPlatformConfigured: Boolean(systemAccessToken && defaultPhoneNumberId),
    };
}

/**
 * Resolves WhatsApp credentials for a specific tenant.
 * If the tenant doesn't have custom credentials in the DB, it seamlessly uses the Master Platform credentials.
 */
export async function resolveTenantWhatsAppCredentials(userId) {
    const platform = getPlatformWhatsAppConfig();

    let user = null;
    if (userId) {
        try {
            const { data } = await supabase
                .from('users')
                .select('id, wa_phone_number_id, wa_waba_id, wa_access_token, wa_merchant_phone, wa_is_active')
                .eq('id', userId)
                .maybeSingle();
            user = data;
        } catch (err) {
            console.warn('[WhatsApp Session] User credential fetch:', err.message);
        }
    }

    // Tenant-specific credentials take precedence if explicitly provided by that merchant,
    // otherwise fallback to Master Platform credentials provided in Environment Variables.
    const accessToken = user?.wa_access_token || platform.systemAccessToken;
    const phoneNumberId = user?.wa_phone_number_id || platform.defaultPhoneNumberId;
    const wabaId = user?.wa_waba_id || platform.wabaId;
    const merchantPhone = (user?.wa_merchant_phone && user.wa_merchant_phone.trim()) || platform.defaultMerchantPhone;

    const isConfigured = Boolean(accessToken && (phoneNumberId || merchantPhone));
    const isUsingPlatformMaster = !user?.wa_access_token && Boolean(platform.systemAccessToken);

    return {
        userId,
        accessToken,
        phoneNumberId,
        wabaId,
        merchantPhone,
        isActive: user?.wa_is_active !== false,
        isConfigured,
        isUsingPlatformMaster,
        platform,
    };
}

export function registerPendingPairingToken(code, { userId, number }) {
    globalStore.pendingTokens.set(code.toUpperCase(), {
        userId,
        number,
        createdAt: Date.now(),
    });
}

export function getPendingPairingToken(code) {
    if (!code) return null;
    return globalStore.pendingTokens.get(code.toUpperCase()) || null;
}

export function clearPendingPairingToken(code) {
    if (code) globalStore.pendingTokens.delete(code.toUpperCase());
}

export function getActiveWhatsAppInstance(userId) {
    if (globalStore.isExplicitlyCleared) {
        return null;
    }
    if (globalStore.currentActiveInstance) {
        return globalStore.currentActiveInstance;
    }
    if (userId && globalStore.instances.has(userId)) {
        const list = globalStore.instances.get(userId);
        if (list && list.length > 0) return list[0];
    }
    return null;
}

export function getAllWhatsAppInstances(userId) {
    if (globalStore.isExplicitlyCleared) {
        return [];
    }
    if (globalStore.currentActiveInstance) {
        return [globalStore.currentActiveInstance];
    }
    if (userId && globalStore.instances.has(userId)) {
        return globalStore.instances.get(userId);
    }
    return null;
}

export function setActiveWhatsAppInstance(userId, instance) {
    globalStore.isExplicitlyCleared = false;
    globalStore.currentActiveInstance = instance;
    if (userId) {
        globalStore.instances.set(userId, [instance]);
    }
}

export function clearWhatsAppInstances(userId) {
    globalStore.isExplicitlyCleared = true;
    globalStore.currentActiveInstance = null;
    if (userId) {
        globalStore.instances.set(userId, []);
    }
}

export function restoreDefaultWhatsAppInstance(userId) {
    globalStore.isExplicitlyCleared = false;
    const platform = getPlatformWhatsAppConfig();
    const defaultInstance = {
        id: `wa-inst-${userId || 'default'}`,
        number: platform.defaultMerchantPhone,
        server: 'WhatsApp-69',
        out_message: 'Yes',
        notification: 'Yes',
        group_notification: 'No',
        priority: '1',
        status: 'connected',
        linked_at: new Date().toISOString(),
        is_official: platform.isPlatformConfigured,
        is_platform_managed: true,
    };
    globalStore.currentActiveInstance = defaultInstance;
    if (userId) {
        globalStore.instances.set(userId, [defaultInstance]);
    }
    return defaultInstance;
}
