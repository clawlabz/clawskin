/**
 * DeviceIdentity.js — Ed25519 device identity for OpenClaw Gateway authentication
 *
 * The Gateway requires every WebSocket client to present a device identity:
 * - Generate an Ed25519 keypair on first use (stored in localStorage)
 * - Sign the connect message with the private key
 * - Include deviceId, publicKey, signature in connect params
 *
 * Uses Web Crypto API (Ed25519 supported in Chrome 113+, Firefox 129+, Safari 17+).
 */
class DeviceIdentity {
  static STORAGE_KEY = 'clawskin-device-identity-v1';

  /**
   * Get or create device identity (keypair + deviceId)
   */
  static async getOrCreate() {
    // Try loading from localStorage
    const stored = DeviceIdentity._load();
    if (stored) return stored;

    // Generate new keypair
    const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
    const rawPublic = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const rawPrivate = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    const publicKeyB64 = DeviceIdentity._bufToB64url(rawPublic);
    const deviceId = await DeviceIdentity._sha256hex(rawPublic);

    const identity = {
      deviceId,
      publicKey: publicKeyB64,
      privateKeyPkcs8: DeviceIdentity._bufToB64url(rawPrivate),
    };

    DeviceIdentity._save(identity);
    return identity;
  }

  /**
   * Sign a connect message
   * Format: "v2|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce"
   */
  static async sign(identity, params) {
    const { deviceId, privateKeyPkcs8 } = identity;
    const { clientId, clientMode, role, scopes, token, nonce } = params;

    const signedAtMs = Date.now();
    const scopeStr = (scopes || []).join(',');
    const message = [
      'v2', deviceId, clientId, clientMode, role || '',
      scopeStr, String(signedAtMs), token || '', nonce || ''
    ].join('|');

    // Import private key
    const rawKey = DeviceIdentity._b64urlToBuf(privateKeyPkcs8);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8', rawKey, 'Ed25519', false, ['sign']
    );

    // Sign
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = await crypto.subtle.sign('Ed25519', privateKey, msgBytes);

    return {
      id: deviceId,
      publicKey: identity.publicKey,
      signature: DeviceIdentity._bufToB64url(sigBytes),
      signedAt: signedAtMs,
      nonce: nonce || '',
    };
  }

  // ── Helpers ──

  static _bufToB64url(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  static _b64urlToBuf(b64) {
    const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standard + '='.repeat((4 - standard.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  static async _sha256hex(buf) {
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static _load() {
    try {
      const raw = localStorage.getItem(DeviceIdentity.STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.deviceId && data?.publicKey && data?.privateKeyPkcs8) return data;
      return null;
    } catch { return null; }
  }

  static _save(identity) {
    try {
      localStorage.setItem(DeviceIdentity.STORAGE_KEY, JSON.stringify({
        ...identity,
        version: 1,
        createdAtMs: Date.now(),
      }));
    } catch {}
  }
}

if (typeof window !== 'undefined') window.DeviceIdentity = DeviceIdentity;
