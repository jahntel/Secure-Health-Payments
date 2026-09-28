import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { api, getStoredToken, removeStoredToken } from '../api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      // Default to Demo Patient for instant seamless exploration
      await quickSwitchRole('PATIENT');
      return;
    }

    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
    } catch (err) {
      console.warn('Session expired or invalid token. Falling back to default patient.');
      removeStoredToken();
      await quickSwitchRole('PATIENT');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string = 'DemoSecurePassword2026!') => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
  };

  const quickSwitchRole = async (role: UserRole) => {
    setLoading(true);
    try {
      let email = 'demo.patient@example.com';
      if (role === 'PROVIDER') email = 'demo.provider@example.com';
      if (role === 'SECURITY_ADMIN') email = 'demo.admin@example.com';

      const res = await api.login(email, 'DemoSecurePassword2026!');
      setUser(res.user);
    } catch (err) {
      console.error('Quick switch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.getCurrentUser();
      setUser(data.user);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, quickSwitchRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
