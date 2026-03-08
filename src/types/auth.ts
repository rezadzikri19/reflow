// =============================================================================
// Auth Types
// =============================================================================

export type UserRole = 'admin' | 'user';

// Token payload structure (embedded in token)
export interface TokenPayload {
  exp: number;        // Expiration timestamp (Unix)
  iat: number;        // Issued at timestamp (Unix)
  label?: string;     // Optional label for token identification
}

// Session stored in Zustand (persisted to localStorage)
export interface SessionData {
  role: UserRole;
  loginAt: number;
  expiresAt: number;
  name?: string; // Admin: "Admin", User: token label or "User"
}

// Admin credentials type
export interface AdminCredentials {
  username: string;
  password: string;
}

// Token generation options
export interface TokenGenOptions {
  expiresAt: Date;
  label?: string;
}
