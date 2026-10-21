import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('dvt_mustache_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState('login'); // 'login' | 'register'

  // Fetch current user from /api/auth/me if token exists
  const fetchCurrentUser = useCallback(async (authToken = token) => {
    if (!authToken) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        return userData;
      } else {
        // Token invalid or expired
        localStorage.removeItem('dvt_mustache_token');
        setToken(null);
        setUser(null);
        return null;
      }
    } catch (err) {
      console.warn('Failed to verify user session:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Login
  const login = async (email, password) => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to login. Please check credentials.');
    }

    localStorage.setItem('dvt_mustache_token', data.token);
    setToken(data.token);
    setUser({
      id: data.id,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      leaderboardPaid: data.leaderboardPaid,
      quizPaid: data.quizPaid,
      cleanShaveImageUrl: data.cleanShaveImageUrl,
      cleanShaveUploadedAt: data.cleanShaveUploadedAt
    });

    // Refresh full profile stats
    fetchCurrentUser(data.token);
    setAuthModalOpen(false);
    return data;
  };

  // Register
  const register = async ({ email, fullName, password }) => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed. Please check your details.');
    }

    localStorage.setItem('dvt_mustache_token', data.token);
    setToken(data.token);
    setUser({
      id: data.id,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      leaderboardPaid: data.leaderboardPaid,
      quizPaid: data.quizPaid,
      cleanShaveImageUrl: data.cleanShaveImageUrl,
      cleanShaveUploadedAt: data.cleanShaveUploadedAt
    });

    setAuthModalOpen(false);
    return data;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('dvt_mustache_token');
    setToken(null);
    setUser(null);
  };

  const openAuthModal = (mode = 'login') => {
    setAuthModalInitialMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
        authModalOpen,
        authModalInitialMode,
        openAuthModal,
        closeAuthModal
      }}
    >
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
