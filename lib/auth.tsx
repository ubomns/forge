/**
 * Auth state management for Forge (Option B: Refresh Token Architecture).
 *
 * Pattern:
 *   - Access token: 15-min httpOnly cookie (forge_session) — sent automatically
 *   - Refresh token: 7-day httpOnly cookie (forge_refresh) — sent automatically
 *   - Frontend stores NO tokens in localStorage or memory
 *   - On mount: call /api/auth/me to check auth status
 *   - On 401: call /api/auth/refresh to rotate tokens
 *   - On refresh 401: user is logged out
 *
 * This module provides:
 *   - useAuth() hook — returns { user, loading, logout }
 *   - AuthProvider — React context provider
 */

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  tier: 'anonymous' | 'free' | 'pro' | 'team';
  created_at: string;
  saved_plan_id?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Reducer for auth state (avoids setState-in-effect lint error)
type AuthAction =
  | { type: 'AUTH_SUCCESS'; user: AuthUser }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' };

interface AuthReducerState {
  user: AuthUser | null;
  loading: boolean;
}

function authReducer(state: AuthReducerState, action: AuthAction): AuthReducerState {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return { user: action.user, loading: false };
    case 'AUTH_FAILURE':
      return { user: null, loading: false };
    case 'LOGOUT':
      return { user: null, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, loading: true });

  const fetchMe = useCallback(async () => {
    const res = await fetch('/api/auth/me', {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      dispatch({ type: 'AUTH_SUCCESS', user: data });
      return true;
    }
    return false;
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      dispatch({ type: 'AUTH_SUCCESS', user: data });
      return true;
    }
    return false;
  }, []);

  const initAuth = useCallback(async () => {
    try {
      const meOk = await fetchMe();
      if (meOk) return;

      const refreshOk = await refresh();
      if (refreshOk) return;

      dispatch({ type: 'AUTH_FAILURE' });
    } catch {
      dispatch({ type: 'AUTH_FAILURE' });
    }
  }, [fetchMe, refresh]);

  useEffect(() => {
    void initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    dispatch({ type: 'LOGOUT' });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Provider = (AuthContext as React.Context<AuthState>).Provider as any;
  return (
    <Provider value={{ user: state.user, loading: state.loading, logout }}>
      {children}
    </Provider>
  );
}
