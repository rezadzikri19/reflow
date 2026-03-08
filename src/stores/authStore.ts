// =============================================================================
// Auth Store
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionData } from '../types/auth';
import { validateToken } from '../utils/token';
import {
  verifyAdminCredentials,
  createSessionFromToken,
  createAdminSession,
  isSessionValid,
} from '../utils/auth';

// =============================================================================
// Store Types
// =============================================================================

interface AuthState {
  session: SessionData | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  tokenLogin: (token: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: AuthState = {
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// =============================================================================
// Store Definition
// =============================================================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initialize: async () => {
        const { session } = get();

        // Check if existing session is still valid
        if (session && isSessionValid(session)) {
          set({ isInitialized: true, isLoading: false });
        } else {
          // Clear invalid session
          set({ session: null, isInitialized: true, isLoading: false });
        }
      },

      adminLogin: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!verifyAdminCredentials(username, password)) {
          set({ isLoading: false, error: 'Invalid admin credentials' });
          return false;
        }

        const session = createAdminSession();
        set({ session, isLoading: false, error: null });
        return true;
      },

      tokenLogin: async (token: string) => {
        set({ isLoading: true, error: null });

        try {
          const payload = await validateToken(token);

          if (!payload) {
            set({ isLoading: false, error: 'Invalid or expired token' });
            return false;
          }

          const session = createSessionFromToken(payload.exp, payload.label);
          set({ session, isLoading: false, error: null });
          return true;
        } catch {
          set({ isLoading: false, error: 'Invalid token format' });
          return false;
        }
      },

      logout: () => {
        set({ session: null, error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'reflow-auth',
      partialize: (state) => ({ session: state.session }),
    }
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

export const useSession = () => useAuthStore((state) => state.session);

export const useIsAuthenticated = () => {
  const session = useAuthStore((state) => state.session);
  return session !== null && isSessionValid(session);
};

export const useIsAdmin = () => {
  const session = useAuthStore((state) => state.session);
  return session?.role === 'admin' && isSessionValid(session);
};

export const useSessionExpiry = () => {
  const session = useAuthStore((state) => state.session);
  if (!session) return null;
  return {
    expiresAt: new Date(session.expiresAt),
    loginAt: new Date(session.loginAt),
    timeRemaining: Math.max(0, session.expiresAt - Date.now()),
    name: session.name || (session.role === 'admin' ? 'Admin' : 'User'),
  };
};
