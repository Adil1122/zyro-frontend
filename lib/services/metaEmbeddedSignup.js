import crypto from 'node:crypto';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { encryptToken, decryptToken } from '@/lib/whatsappCrypto';

/**
 * Meta WhatsApp Embedded Signup v4 Service
 * Implements server-side state creation, authorization code exchange, WABA subscription,
 * and encrypted persistence per Section 6, 7, 8, and 10 of the integration spec.
 */

export function getMetaConfig() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '2070163980283029';
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || '2329644037853553';
    const appSecret = process.env.META_APP_SECRET || '';
    const graphApiVersion = process.env.META_GRAPH_API_VERSION || 'v26.0';
    const redirectUri = process.env.META_REDIRECT_URI || 'https://www.zyroocloud.com/meta-callback';
    const webhookVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || '';

    return {
        appId,
        configId,
        appSecret,
        graphApiVersion,
        redirectUri,
        webhookVerifyToken,
        graphBaseUrl: `https://graph.facebook.com/${graphApiVersion}`,
    };
}

/**
 * Generate a cryptographically secure signup session for an authenticated merchant
 * @param {string} userId
 */
export async function createSignupSession(userId) {
    if (!userId) throw new Error('Unauthorized');

    const db = supabaseAdmin || supabase;
    const rawState = crypto.randomBytes(32).toString('hex');
    const stateHash = crypto.createHash('sha256').update(rawState).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiry

    // Store signup session in Supabase (with graceful in-memory fallback if table is not yet migrated)
    try {
        await db.from('whatsapp_signup_sessions').insert({
            user_id: userId,
            state_hash: stateHash,
            status: 'pending',
            expires_at: expiresAt,
        });
    } catch (err) {
        console.warn('[Meta Embedded Signup] Note: whatsapp_signup_sessions DB insert skipped:', err.message);
    }

    const config = getMetaConfig();

    // Construct Meta Hosted Signup URL as specified in Section 3
    const extrasPayload = JSON.stringify({
        version: 'v4',
        sessionInfoVersion: '3',
        featureType: 'whatsapp_business_app_onboarding',
    });

    const hostedSignupUrl = `https://business.facebook.com/messaging/whatsapp/onboard/?app_id=${encodeURIComponent(config.appId)}&config_id=${encodeURIComponent(config.configId)}&extras=${encodeURIComponent(extrasPayload)}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=${encodeURIComponent(rawState)}`;

    return {
        rawState,
        expiresAt,
        hostedSignupUrl,
        appId: config.appId,
        configId: config.configId,
        graphApiVersion: config.graphApiVersion,
        redirectUri: config.redirectUri,
    };
}

/**
 * Validate signup state against database or memory
 */
export async function validateSignupState(userId, rawState) {
    if (!userId || !rawState) return false;

    const db = supabaseAdmin || supabase;
    const stateHash = crypto.createHash('sha256').update(rawState).digest('hex');

    try {
        const { data: session } = await db
            .from('whatsapp_signup_sessions')
            .select('id, user_id, status, expires_at')
            .eq('state_hash', stateHash)
            .eq('user_id', userId)
            .maybeSingle();

        if (session) {
            if (session.status !== 'pending' || new Date(session.expires_at) < new Date()) {
                return false;
            }
            // Mark session completed
            await db
                .from('whatsapp_signup_sessions')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', session.id);
            return true;
        }
        console.warn('[Meta Signup] No pending session matches this state.');
        return false;
    } catch (err) {
        // Previously any 32+ character string was accepted here, which made the
        // CSRF check bypassable whenever this query failed. If the table is
        // missing, run database_updates_whatsapp_embedded_signup.sql.
        console.error('[Meta Signup] Session lookup failed, rejecting:', err.message);
        return false;
    }
}

/**
 * Exchange Meta OAuth code for merchant access token and fetch WABA assets
 * @param {string} userId
 * @param {object} params { code, state, wabaId, phoneNumberId }
 */
/**
 * Clean authorization code or extract code from a full Meta Hosted callback URL
 */
export function sanitizeMetaCode(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return '';
    let val = rawInput.trim();
    // If user pasted full Meta callback URL
    if (val.includes('http://') || val.includes('https://') || val.includes('code=')) {
        try {
            // Remove hash fragment if present
            const cleanUrl = val.split('#')[0];
            const parsed = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://dummy.com/?${cleanUrl}`);
            const extracted = parsed.searchParams.get('code');
            if (extracted) val = extracted;
        } catch {
            const match = val.match(/[?&]code=([^&#]+)/);
            if (match && match[1]) val = match[1];
        }
    }
    // Remove Meta trailing hash
    return val.replace(/#_=_$/, '').trim();
}

/**
 * Exchange Meta OAuth code for merchant access token and fetch WABA assets
 * @param {string} userId
 * @param {object} params { code, state, wabaId, phoneNumberId, displayPhoneNumber }
 */
/**
 * Completes Meta Embedded Signup and connects the merchant.
 *
 * Every step below is a hard requirement. An earlier version treated them as
 * best-effort: it fell back to the app secret when the code exchange failed,
 * substituted hardcoded WABA/phone values when Meta returned nothing, skipped
 * Graph verification unless the token happened to start with "EAA", and then
 * saved connection_status 'connected' regardless. Opening the Meta popup and
 * closing it without logging in was therefore enough to show a connected
 * account with a fictional +1 (555) number.
 *
 * Returns { success: false, status, reason, message } on any failure and writes
 * nothing. An existing valid connection is left untouched, so a failed attempt
 * to link a new account cannot destroy a working one.
 */
export async function exchangeCodeAndConnectMerchant(userId, { code, state, wabaId, phoneNumberId }) {
    if (!userId) throw new Error('Unauthorized');

    const config = getMetaConfig();
    const fail = (reason, message) => ({
        success: false,
        status: 'authorization_failed',
        connectionStatus: 'disconnected',
        reason,
        message,
    });

    if (!config.appSecret) {
        console.error('[Meta Signup] META_APP_SECRET is not configured; refusing to connect.');
        return fail('server_misconfigured', 'WhatsApp is not configured on the server. Contact support.');
    }

    // 1. CSRF: the state must match a session this user actually started.
    const stateValid = await validateSignupState(userId, state);
    if (!stateValid) {
        console.warn(`[Meta Signup] Rejected signup for ${userId}: invalid or reused state.`);
        return fail('invalid_state', 'This authorization link is no longer valid. Please start again.');
    }

    // 2. No code means the merchant never completed Meta's flow.
    const cleanCode = sanitizeMetaCode(code);
    if (!cleanCode) {
        return fail('no_authorization_code', 'Authorization was not completed with Meta.');
    }

    // 3. Exchange the code. A failure here is fatal — there is no legitimate
    //    substitute for a merchant access token.
    let merchantAccessToken = null;
    let tokenExpiresAt = null;
    try {
        const tokenUrl = `${config.graphBaseUrl}/oauth/access_token?` + new URLSearchParams({
            client_id: config.appId,
            client_secret: config.appSecret,
            redirect_uri: config.redirectUri,
            code: cleanCode,
        }).toString();

        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json().catch(() => null);

        if (!tokenRes.ok || !tokenData?.access_token) {
            const msg = tokenData?.error?.message || `HTTP ${tokenRes.status}`;
            console.warn(`[Meta Signup] Code exchange failed for ${userId}: ${msg}`);
            return fail('code_exchange_failed', 'Meta did not accept the authorization. Please try connecting again.');
        }

        merchantAccessToken = tokenData.access_token;
        if (tokenData.expires_in) {
            tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        }
    } catch (err) {
        console.error('[Meta Signup] Token exchange error:', err.message);
        return fail('meta_unreachable', 'Could not reach Meta to complete authorization. Please try again.');
    }

    // 4. Resolve the WABA from the token's own granted scopes. Trusting a
    //    client-supplied wabaId would let a caller claim someone else's account.
    let resolvedWabaId = null;
    try {
        const debugRes = await fetch(`${config.graphBaseUrl}/debug_token?` + new URLSearchParams({
            input_token: merchantAccessToken,
            access_token: `${config.appId}|${config.appSecret}`,
        }).toString());
        const debugData = await debugRes.json().catch(() => null);

        const scopes = debugData?.data?.granular_scopes || [];
        const waScope = scopes.find(s =>
            s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
        const granted = Array.isArray(waScope?.target_ids) ? waScope.target_ids : [];

        if (!granted.length) {
            return fail('missing_permissions',
                'The Meta account did not grant WhatsApp Business access. Please complete the permission step.');
        }

        // Honour a requested WABA only if the token actually grants it.
        resolvedWabaId = wabaId && granted.includes(wabaId) ? wabaId : granted[0];
    } catch (err) {
        console.error('[Meta Signup] Token inspection error:', err.message);
        return fail('meta_unreachable', 'Could not verify the authorization with Meta. Please try again.');
    }

    // 5. The phone number must belong to that WABA — proven by Meta, not claimed.
    let phone;
    try {
        const phonesRes = await fetch(
            `${config.graphBaseUrl}/${resolvedWabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
            { headers: { Authorization: `Bearer ${merchantAccessToken}` } },
        );
        const phonesData = await phonesRes.json().catch(() => null);

        if (!phonesRes.ok || !Array.isArray(phonesData?.data) || phonesData.data.length === 0) {
            const msg = phonesData?.error?.message || `HTTP ${phonesRes.status}`;
            console.warn(`[Meta Signup] No phone numbers on WABA ${resolvedWabaId}: ${msg}`);
            return fail('no_phone_number',
                'No WhatsApp phone number is available on that Business Account. Add one in Meta, then reconnect.');
        }

        phone = phoneNumberId
            ? phonesData.data.find(p => p.id === phoneNumberId)
            : phonesData.data[0];

        if (!phone) {
            return fail('phone_not_in_waba',
                'That phone number does not belong to the authorized WhatsApp Business Account.');
        }
    } catch (err) {
        console.error('[Meta Signup] Phone lookup error:', err.message);
        return fail('meta_unreachable', 'Could not verify the phone number with Meta. Please try again.');
    }

    const resolvedPhoneNumberId = phone.id;
    const displayPhoneNumber = phone.display_phone_number || null;
    const verifiedName = phone.verified_name || null;
    const qualityRating = phone.quality_rating || null;

    // 6. Subscribe the app to the WABA. Idempotent on Meta's side, so retries
    //    cannot create duplicate webhook subscriptions.
    let webhookSubscribed = false;
    try {
        const subRes = await fetch(`${config.graphBaseUrl}/${resolvedWabaId}/subscribed_apps`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${merchantAccessToken}`, 'Content-Type': 'application/json' },
        });
        webhookSubscribed = subRes.ok;
        if (!subRes.ok) {
            console.warn('[Meta Signup] WABA subscription failed:', (await subRes.text()).slice(0, 200));
        }
    } catch (err) {
        console.warn('[Meta Signup] WABA subscription error:', err.message);
    }

    if (!webhookSubscribed) {
        return fail('webhook_subscription_failed',
            'Connected to Meta but could not subscribe to message updates. Please try again.');
    }

    // 7. Only now is this a real connection. Token encrypted at rest.
    const encryptedToken = encryptToken(merchantAccessToken);
    const db = supabaseAdmin || supabase;

    const connPayload = {
        user_id: userId,
        waba_id: resolvedWabaId,
        phone_number_id: resolvedPhoneNumberId,
        display_phone_number: displayPhoneNumber,
        verified_name: verifiedName,
        quality_rating: qualityRating,
        encrypted_access_token: encryptedToken,
        token_encryption_version: 1,
        token_expires_at: tokenExpiresAt,
        connection_status: 'connected',
        onboarding_type: 'embedded_signup_v4',
        app_version: config.graphApiVersion,
        updated_at: new Date().toISOString(),
    };

    let savedConnection = null;
    try {
        // Scoped to this user: matching on phone_number_id alone would let one
        // tenant overwrite another tenant's row for the same number.
        const { data: existing } = await db
            .from('whatsapp_connections')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existing?.id) {
            const { data, error } = await db
                .from('whatsapp_connections')
                .update(connPayload)
                .eq('id', existing.id)
                .select()
                .maybeSingle();
            if (error) throw error;
            savedConnection = data;
        } else {
            const { data, error } = await db
                .from('whatsapp_connections')
                .insert(connPayload)
                .select()
                .maybeSingle();
            if (error) throw error;
            savedConnection = data;
        }
    } catch (dbErr) {
        console.error('[Meta Signup] Could not save connection:', dbErr.message);
        return fail('save_failed', 'Verified with Meta but could not save the connection. Please try again.');
    }

    try {
        await db.from('users').update({
            wa_phone_number_id: resolvedPhoneNumberId,
            wa_waba_id: resolvedWabaId,
            wa_merchant_phone: displayPhoneNumber,
            wa_is_active: true,
        }).eq('id', userId);
    } catch (userErr) {
        console.warn('[Meta Signup] users mirror update warning:', userErr.message);
    }

    console.log(`[Meta Signup] Connected user=${userId} waba=${resolvedWabaId} phone=${resolvedPhoneNumberId}`);

    return {
        success: true,
        status: 'connected',
        wabaId: resolvedWabaId,
        phoneNumberId: resolvedPhoneNumberId,
        displayPhoneNumber,
        verifiedName,
        qualityRating,
        connectionStatus: 'connected',
        connectionId: savedConnection?.id || null,
    };
}

/**
 * Retrieve active WhatsApp connection for an authenticated merchant
 * (Never returns decrypted access tokens to the browser)
 */
export async function getMerchantWhatsAppConnection(userId) {
    if (!userId) return null;

    const db = supabaseAdmin || supabase;

    try {
        const { data: conn } = await db
            .from('whatsapp_connections')
            .select('id, user_id, waba_id, phone_number_id, display_phone_number, verified_name, quality_rating, connection_status, onboarding_type, created_at, updated_at')
            .eq('user_id', userId)
            .eq('connection_status', 'connected')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (conn) {
            return conn;
        }
    } catch (err) {
        console.warn('[Meta Embedded Signup] Connection query error:', err.message);
    }

    // No users-table fallback. It returned a synthetic "connected" object
    // whenever wa_phone_number_id and wa_is_active were set, so a connection that
    // was never authorized — or one that failed finalization after those columns
    // had been written — still reported as connected. whatsapp_connections is the
    // only record of a verified connection.
    return null;
}

/**
 * Disconnect merchant's WhatsApp Business Account
 */
export async function disconnectMerchantWhatsApp(userId) {
    if (!userId) throw new Error('Unauthorized');

    const db = supabaseAdmin || supabase;

    try {
        await db
            .from('whatsapp_connections')
            .update({ connection_status: 'disconnected', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
    } catch (err) {
        console.warn('[Meta Embedded Signup] whatsapp_connections disconnect error:', err.message);
    }

    try {
        await db
            .from('users')
            .update({ wa_is_active: false })
            .eq('id', userId);
    } catch (err) {}

    return { success: true };
}

/**
 * Meta error codes and HTTP statuses that mean the authorization itself is gone.
 * Anything else (5xx, network, rate limit) is treated as transient, so a Meta
 * outage never pushes a merchant through OAuth they do not actually need.
 */
const REAUTH_ERROR_CODES = new Set([190, 102, 463, 467, 2500]);
const REAUTH_HTTP = new Set([401, 403]);

function classifyMetaFailure(httpStatus, body) {
    const code = body?.error?.code;
    const subcode = body?.error?.error_subcode;
    const message = body?.error?.message || `HTTP ${httpStatus}`;

    if (REAUTH_ERROR_CODES.has(code) || REAUTH_HTTP.has(httpStatus)) {
        return { reauthRequired: true, message };
    }
    // Codes Meta uses for missing permissions on an otherwise live token.
    if (code === 200 || code === 3 || subcode === 33) {
        return { reauthRequired: true, message };
    }
    return { reauthRequired: false, message };
}

/**
 * Restores a previously authorized WhatsApp connection without sending the
 * merchant back through Meta.
 *
 * Disconnect only flips connection_status, so the encrypted token survives. This
 * decrypts it, proves it still works by reading the phone number it is supposed
 * to control, re-subscribes the WABA, and marks the connection live again.
 *
 * Returns { ok: true } on success, or { ok: false, reauthRequired } so the caller
 * can tell "ask Meta again" apart from "retry later".
 */
export async function reconnectMerchantWhatsApp(userId) {
    if (!userId) throw new Error('Unauthorized');

    const config = getMetaConfig();
    const db = supabaseAdmin || supabase;

    // Deliberately not filtered by connection_status: the row we want is the
    // disconnected one.
    const { data: conn } = await db
        .from('whatsapp_connections')
        .select('id, waba_id, phone_number_id, encrypted_access_token, token_expires_at, connection_status')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!conn) {
        return { ok: false, reauthRequired: true, reason: 'no_stored_connection',
            message: 'No previous WhatsApp authorization found. Connect with Meta to get started.' };
    }

    if (!conn.encrypted_access_token) {
        return { ok: false, reauthRequired: true, reason: 'no_stored_token',
            message: 'The stored WhatsApp authorization is incomplete. Please reconnect with Meta.' };
    }

    if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
        return { ok: false, reauthRequired: true, reason: 'token_expired',
            message: 'Your Meta authorization has expired. Please reconnect with Meta.' };
    }

    if (!conn.phone_number_id) {
        return { ok: false, reauthRequired: true, reason: 'no_phone_number',
            message: 'No WhatsApp phone number is on file. Please reconnect with Meta.' };
    }

    let token;
    try {
        token = decryptToken(conn.encrypted_access_token);
    } catch (err) {
        console.error('[WhatsApp Reconnect] Token decryption failed:', err.message);
        return { ok: false, reauthRequired: true, reason: 'token_unreadable',
            message: 'The stored authorization could not be read. Please reconnect with Meta.' };
    }

    // The real check: reading the phone number proves the token is live AND still
    // authorized for the number we intend to send from. A token-shape check, or
    // debug_token alone, would not prove the second part.
    let profile;
    try {
        const res = await fetch(
            `${config.graphBaseUrl}/${conn.phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        const body = await res.json().catch(() => null);

        if (!res.ok) {
            const { reauthRequired, message } = classifyMetaFailure(res.status, body);
            console.warn(`[WhatsApp Reconnect] Meta verification failed for user ${userId}: ${message}`);
            return {
                ok: false,
                reauthRequired,
                reason: reauthRequired ? 'meta_rejected' : 'meta_unavailable',
                message: reauthRequired
                    ? 'Meta no longer accepts the saved authorization. Please reconnect with Meta.'
                    : 'Could not reach Meta to verify the connection. Please try again in a moment.',
            };
        }
        profile = body || {};
    } catch (err) {
        console.error('[WhatsApp Reconnect] Meta request error:', err.message);
        return { ok: false, reauthRequired: false, reason: 'network',
            message: 'Could not reach Meta to verify the connection. Please try again in a moment.' };
    }

    // Re-subscribing is idempotent on Meta's side, so this cannot create a
    // duplicate webhook subscription.
    if (conn.waba_id) {
        try {
            await fetch(`${config.graphBaseUrl}/${conn.waba_id}/subscribed_apps`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
        } catch (err) {
            console.warn('[WhatsApp Reconnect] WABA re-subscription warning:', err.message);
        }
    }

    const refreshed = {
        connection_status: 'connected',
        updated_at: new Date().toISOString(),
    };
    if (profile.display_phone_number) refreshed.display_phone_number = profile.display_phone_number;
    if (profile.verified_name) refreshed.verified_name = profile.verified_name;
    if (profile.quality_rating) refreshed.quality_rating = profile.quality_rating;

    const { error: updateError } = await db
        .from('whatsapp_connections')
        .update(refreshed)
        .eq('id', conn.id);

    if (updateError) {
        console.error('[WhatsApp Reconnect] Status update failed:', updateError.message);
        return { ok: false, reauthRequired: false, reason: 'db_error',
            message: 'Verified with Meta but could not save the connection. Please try again.' };
    }

    // Mirrors the columns the messaging paths read.
    try {
        await db.from('users').update({
            wa_is_active: true,
            wa_phone_number_id: conn.phone_number_id,
            wa_waba_id: conn.waba_id,
        }).eq('id', userId);
    } catch (err) {
        console.warn('[WhatsApp Reconnect] users mirror update warning:', err.message);
    }

    return {
        ok: true,
        connection: {
            wabaId: conn.waba_id,
            phoneNumberId: conn.phone_number_id,
            displayPhoneNumber: refreshed.display_phone_number || null,
            verifiedName: refreshed.verified_name || null,
            qualityRating: refreshed.quality_rating || null,
            status: 'connected',
        },
    };
}

/** True when a stored authorization exists that reconnect could attempt. */
export async function hasStoredWhatsAppAuthorization(userId) {
    if (!userId) return false;
    const db = supabaseAdmin || supabase;

    const { data } = await db
        .from('whatsapp_connections')
        .select('id, encrypted_access_token, token_expires_at')
        .eq('user_id', userId)
        .not('encrypted_access_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!data) return false;
    if (data.token_expires_at && new Date(data.token_expires_at) <= new Date()) return false;
    return true;
}
