import crypto from 'node:crypto';

/**
 * AES-256-GCM Token Encryption Service
 * Complies with Section 8: Access Token Storage and Encryption.
 * Uses a unique 12-byte IV per encryption operation, extracts a 16-byte GCM auth tag,
 * and outputs an encrypted string formatted as: "enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>".
 */

const ALGORITHM = 'aes-256-gcm';
const CURRENT_VERSION = 1;

function getEncryptionKey() {
    const rawKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY || process.env.META_APP_SECRET || '';
    if (!rawKey) {
        throw new Error('[WhatsAppCrypto] WHATSAPP_TOKEN_ENCRYPTION_KEY or META_APP_SECRET is not configured');
    }

    // If key is a 64-char hex string (32 bytes), parse hex directly; otherwise derive 32-byte key via SHA-256
    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
        return Buffer.from(rawKey, 'hex');
    }
    return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
}

/**
 * Encrypt a plaintext access token using AES-256-GCM
 * @param {string} plaintext 
 * @returns {string} Serialized encrypted token string
 */
export function encryptToken(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('[WhatsAppCrypto] Invalid plaintext to encrypt');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // Standard 12-byte nonce for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return `enc:v${CURRENT_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted token string
 * @param {string} encryptedString 
 * @returns {string} Decrypted access token
 */
export function decryptToken(encryptedString) {
    if (!encryptedString || typeof encryptedString !== 'string') {
        return null;
    }

    // If string is not encrypted (e.g., legacy token), return as-is
    if (!encryptedString.startsWith('enc:v')) {
        return encryptedString;
    }

    const parts = encryptedString.split(':');
    if (parts.length !== 5) {
        throw new Error('[WhatsAppCrypto] Malformed encrypted token string');
    }

    const [, versionStr, ivHex, tagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}
