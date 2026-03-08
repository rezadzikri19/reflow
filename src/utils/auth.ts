// =============================================================================
// Auth Utilities
// =============================================================================

import type { SessionData } from '../types/auth';

// Hard-coded admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// =============================================================================
// Auth Functions
// =============================================================================

/**
 * Verify admin credentials
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Create session from token payload
 */
export function createSessionFromToken(exp: number, label?: string): SessionData {
  const now = Date.now();
  return {
    role: 'user',
    loginAt: now,
    expiresAt: exp * 1000, // Convert Unix timestamp to milliseconds
    name: label || 'User',
  };
}

/**
 * Create admin session
 */
export function createAdminSession(): SessionData {
  const now = Date.now();
  // Admin session expires in 24 hours
  const expiresAt = now + 24 * 60 * 60 * 1000;
  return {
    role: 'admin',
    loginAt: now,
    expiresAt,
    name: 'Admin',
  };
}

/**
 * Check if session is valid and not expired
 */
export function isSessionValid(session: SessionData | null): boolean {
  if (!session) {
    return false;
  }

  return Date.now() < session.expiresAt;
}

/**
 * Get time remaining until session expires (in milliseconds)
 */
export function getSessionTimeRemaining(session: SessionData | null): number {
  if (!session) {
    return 0;
  }

  return Math.max(0, session.expiresAt - Date.now());
}

/**
 * Format session expiry time for display
 */
export function formatSessionExpiry(session: SessionData | null): string {
  if (!session) {
    return 'Not logged in';
  }

  const expiresAt = new Date(session.expiresAt);
  return expiresAt.toLocaleString();
}
