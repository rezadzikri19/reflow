// =============================================================================
// Token Utilities
// =============================================================================

import type { TokenPayload, TokenGenOptions } from '../types/auth';

// Secret key for signing (stored in code - frontend limitation)
const SECRET_KEY = 'reflow-token-secret-2024';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert ArrayBuffer to Base64URL string
 */
function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert string to Base64URL
 */
function stringToBase64URL(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert Base64URL to string
 */
function base64URLToString(base64url: string): string {
  // Add padding if needed
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return atob(base64);
}

/**
 * Create HMAC-SHA256 signature using Web Crypto API
 */
async function createSignature(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return arrayBufferToBase64URL(signature);
}

/**
 * Verify HMAC-SHA256 signature
 */
async function verifySignature(data: string, signature: string, key: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);

  // Convert base64url signature back to ArrayBuffer
  const base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
  const binaryString = atob(paddedBase64);
  const signatureBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    signatureBuffer[i] = binaryString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return crypto.subtle.verify('HMAC', cryptoKey, signatureBuffer, messageData);
}

// =============================================================================
// Token Functions
// =============================================================================

/**
 * Generate a signed token with embedded expiration
 * Token format: payload.signature
 */
export async function generateToken(options: TokenGenOptions): Promise<string> {
  const { expiresAt, label } = options;

  const payload: TokenPayload = {
    exp: Math.floor(expiresAt.getTime() / 1000),
    iat: Math.floor(Date.now() / 1000),
    ...(label && { label }),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = stringToBase64URL(payloadStr);
  const signature = await createSignature(payloadBase64, SECRET_KEY);

  return `${payloadBase64}.${signature}`;
}

/**
 * Decode token and validate signature
 * Returns payload if valid, null otherwise
 */
export async function decodeToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadBase64, signature] = parts;

    // Verify signature
    const isValid = await verifySignature(payloadBase64, signature, SECRET_KEY);
    if (!isValid) {
      return null;
    }

    // Decode payload
    const payloadStr = base64URLToString(payloadBase64);
    const payload = JSON.parse(payloadStr) as TokenPayload;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: TokenPayload): boolean {
  return Date.now() >= payload.exp * 1000;
}

/**
 * Validate token and return payload if valid
 */
export async function validateToken(token: string): Promise<TokenPayload | null> {
  const payload = await decodeToken(token);

  if (!payload) {
    return null;
  }

  if (isTokenExpired(payload)) {
    return null;
  }

  return payload;
}
