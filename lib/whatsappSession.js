// Shared in-memory active WhatsApp instance store
export const DEFAULT_MERCHANT_PHONE = '923475776857';

// Global cache across all Next.js API routes & server processes
const globalStore = globalThis.__zyro_wa_store || (globalThis.__zyro_wa_store = {
    instances: new Map(),
    currentActiveInstance: null,
    isExplicitlyCleared: false,
});

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
    const defaultInstance = {
        id: `wa-inst-${userId || 'default'}`,
        number: DEFAULT_MERCHANT_PHONE,
        server: 'WhatsApp-69',
        out_message: 'Yes',
        notification: 'Yes',
        group_notification: 'No',
        priority: '1',
        status: 'connected',
        linked_at: new Date().toISOString(),
        is_official: false,
    };
    globalStore.currentActiveInstance = defaultInstance;
    if (userId) {
        globalStore.instances.set(userId, [defaultInstance]);
    }
    return defaultInstance;
}
