/**
 * Resolves the acting merchant for a WhatsApp API call.
 *
 * Returns null rather than falling back to an arbitrary user. The older
 * /api/whatsapp/connection handler defaulted to the first row in `users` when the
 * header was absent, which let an unauthenticated caller read one merchant's
 * phone number and WABA id — or disconnect them.
 */
export function resolveWhatsAppUserId(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId || userId === 'null' || userId === 'undefined') return null;
    return userId;
}
