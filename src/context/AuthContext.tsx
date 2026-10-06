import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../../shared/types/user.ts';
import type { UserLoginInput, UserRegistrationRouteInput } from '../../shared/schemas/index.ts';
import { authApi, tokenStorage } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  error: string | null;
  login: (input: UserLoginInput) => Promise<void>;
  register: (input: UserRegistrationRouteInput) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore authenticated session on application initialization
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const existingToken = tokenStorage.get();
      if (!existingToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { user: restoredUser } = await authApi.getMe();
        if (isMounted) {
          setUser(restoredUser);
          setToken(existingToken);
          setError(null);
        }
      } catch (err: unknown) {
        // Clear invalid or expired session safely
        tokenStorage.clear();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (input: UserLoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await authApi.login(input);
      setUser(session.user);
      setToken(session.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check credentials.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (input: UserRegistrationRouteInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await authApi.register(input);
      setUser(session.user);
      setToken(session.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setToken(null);
      setError(null);
      tokenStorage.clear();
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    role: user?.role || null,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
