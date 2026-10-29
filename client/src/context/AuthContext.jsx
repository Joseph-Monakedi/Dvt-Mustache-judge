import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { apiUrl } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('dvt_mustache_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState('login'); // 'login' | 'register'

  // Ref to track payment state transitions
  const prevPaymentRef = useRef({ leaderboardPaid: null, quizPaid: null, initialCheckDone: false });

  // Fetch current user from /api/auth/me if token exists
  const fetchCurrentUser = useCallback(async (authToken = token, isPolling = false) => {
    if (!authToken) {
      setUser(null);
      setIsLoading(false);
      prevPaymentRef.current = { leaderboardPaid: null, quizPaid: null, initialCheckDone: false };
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

        // Check if payment transition occurred from unpaid to paid
        if (prevPaymentRef.current.initialCheckDone) {
          const wasLeaderboardPaid = Boolean(prevPaymentRef.current.leaderboardPaid);
          const wasQuizPaid = Boolean(prevPaymentRef.current.quizPaid);
          const isLeaderboardPaid = Boolean(userData.leaderboardPaid);
          const isQuizPaid = Boolean(userData.quizPaid);

          if (!wasLeaderboardPaid && isLeaderboardPaid) {
            try {
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 } });
            } catch {}
            window.dispatchEvent(new CustomEvent('dvt-payment-approved', {
              detail: {
                type: 'Donation',
                title: '🏆 Grand Prize Eligibility Confirmed!',
                message: '🎉 Awesome! Your donation has been verified. You are now officially eligible to win the R1,000 Takealot Voucher!'
              }
            }));
          }
        }

        prevPaymentRef.current = {
          leaderboardPaid: userData.leaderboardPaid,
          quizPaid: userData.quizPaid,
          initialCheckDone: true
        };

        setUser(prevUser => {
          if (!prevUser) return userData;
          const isSame = 
            prevUser.id === userData.id &&
            prevUser.email === userData.email &&
            prevUser.fullName === userData.fullName &&
            prevUser.role === userData.role &&
            Boolean(prevUser.leaderboardPaid) === Boolean(userData.leaderboardPaid) &&
            Boolean(prevUser.quizPaid) === Boolean(userData.quizPaid) &&
            prevUser.amountPaid === userData.amountPaid &&
            prevUser.cleanShaveImageUrl === userData.cleanShaveImageUrl &&
            prevUser.preferredCompetition === userData.preferredCompetition;
          return isSame ? prevUser : userData;
        });
        return userData;
      } else {
        // Token invalid or expired
        localStorage.removeItem('dvt_mustache_token');
        setToken(null);
        setUser(null);
        prevPaymentRef.current = { leaderboardPaid: null, quizPaid: null, initialCheckDone: false };
        return null;
      }
    } catch (err) {
      if (!isPolling) {
        console.warn('Failed to verify user session:', err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Real-time polling for donation/eligibility approvals without page refresh
  useEffect(() => {
    if (!token) return;

    const pollInterval = (user && !user.leaderboardPaid) ? 3000 : 12000;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCurrentUser(token, true);
      }
    }, pollInterval);

    // Also immediately refresh whenever user switches back to this browser tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchCurrentUser(token, true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [token, user?.leaderboardPaid, fetchCurrentUser]);

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
      preferredCompetition: data.preferredCompetition || 'Mustache',
      amountPaid: data.amountPaid ?? 0,
      isPrizeEligible: data.isPrizeEligible,
      cleanShaveImageUrl: data.cleanShaveImageUrl,
      cleanShaveUploadedAt: data.cleanShaveUploadedAt
    });

    // Refresh full profile stats
    fetchCurrentUser(data.token);
    setAuthModalOpen(false);
    return data;
  };

  // Register
  const register = async ({ email, fullName, password, preferredCompetition = 'Mustache' }) => {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, password, preferredCompetition })
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
      preferredCompetition: data.preferredCompetition || preferredCompetition,
      amountPaid: data.amountPaid ?? 0,
      isPrizeEligible: data.isPrizeEligible,
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
