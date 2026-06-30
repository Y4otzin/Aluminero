'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import type { User } from '@/lib/api';

// ─── Tipos ──────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── Constantes ─────────────────────────────────────────

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ─── Helpers de storage ─────────────────────────────────

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persistAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // También guardamos en cookie para que el middleware pueda leerlo
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

// ─── Contexto ───────────────────────────────────────────

const AuthContext = createContext<AuthState | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Al montar, leer storage
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);

      // Verificar que el token sigue siendo válido
      api
        .getMe(storedToken)
        .then((freshUser) => {
          setUser(freshUser);
          persistAuth(storedToken, freshUser);
        })
        .catch(() => {
          // Token inválido o expirado — limpiar
          clearAuth();
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // ─── Login ───────────────────────────────────

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.login(email, password);
      persistAuth(response.access_token, response.user);
      setToken(response.access_token);
      setUser(response.user);
      router.push('/dashboard');
    },
    [router]
  );

  // ─── Register ────────────────────────────────

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await api.register(name, email, password);
      // Después del registro, hacemos login automático
      const response = await api.login(email, password);
      persistAuth(response.access_token, response.user);
      setToken(response.access_token);
      setUser(response.user);
      router.push('/dashboard');
    },
    [router]
  );

  // ─── Logout ──────────────────────────────────

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  // ─── Valor del contexto ──────────────────────

  const value: AuthState = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────

function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

// ─── Exportaciones ──────────────────────────────────────

export { AuthProvider, useAuth };
export type { AuthState, User };
