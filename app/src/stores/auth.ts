import { create } from 'zustand';
import type { ZkLoginSession } from '@/lib/sui/zklogin';

// ─── Types ────────────────────────────────────────────────────────────────

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  /** ユーザーのオンチェーンアドレス */
  address: string | null;
  /** ZkLogin セッション全体 (TX 署名に必要) */
  session: ZkLoginSession | null;
  /** エラーメッセージ */
  error: string | null;
}

interface AuthActions {
  setLoading(): void;
  setAuthenticated(session: ZkLoginSession): void;
  setError(message: string): void;
  clearSession(): void;
}

// ─── Store ────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // ── State ──
  status: 'idle',
  address: null,
  session: null,
  error: null,

  // ── Actions ──
  setLoading: () => set({ status: 'loading', error: null }),

  setAuthenticated: (session) =>
    set({
      status: 'authenticated',
      address: session.address,
      session,
      error: null,
    }),

  setError: (message) =>
    set({
      status: 'error',
      error: message,
    }),

  clearSession: () =>
    set({
      status: 'idle',
      address: null,
      session: null,
      error: null,
    }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────

export const selectIsAuthenticated = (s: AuthState) => s.status === 'authenticated';
export const selectAddress = (s: AuthState) => s.address;
export const selectSession = (s: AuthState) => s.session;
