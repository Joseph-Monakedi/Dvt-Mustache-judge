import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { apiUrl } from '../utils/api';

const AuthContext = createContext(null);

const normalizeThemePref = (val) => {
  if (!val) return 'system';
  const lower = String(val).trim().toLowerCase();
  if (lower === 'light' || lower === 'dark') return lower;
  return 'system';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('dvt_mustache_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState('login'); // 'login' | 'register'

  // Theme preference ('system' | 'light' | 'dark') & OS color-scheme listener
  const [themePreference, setThemePreferenceState] = useState(() => {
    const stored = localStorage.getItem('color-scheme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;
  const logoSrc = resolvedTheme === 'light' ? '/dvt-logo-light.png' : '/dvt-logo.png';

  // Listen for OS prefers-color-scheme changes and cross-tab storage events
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const handleMediaChange = (e) => {
      setSystemTheme(e.matches ? 'light' : 'dark');
    };
    mql.addEventListener('change', handleMediaChange);

    const handleStorage = (e) => {
      if (e.key === 'color-scheme') {
        if (e.newValue === 'light' || e.newValue === 'dark') {
          setThemePreferenceState(e.newValue);
        } else {
          setThemePreferenceState('system');
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      mql.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Apply resolved theme and color-scheme meta to DOM & localStorage
  useEffect(() => {
    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    const schemeValue = themePreference === 'system' ? 'light dark' : themePreference;
    if (metaScheme) {
      metaScheme.content = schemeValue;
    }

    if (themePreference === 'system') {
      localStorage.removeItem('color-scheme');
    } else {
      localStorage.setItem('color-scheme', themePreference);
    }

    document.documentElement.dataset.theme = resolvedTheme;

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = resolvedTheme === 'light' ? '#f0f4f8' : '#070c14';
    }

    const favicons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
    favicons.forEach((link) => {
      link.setAttribute('href', logoSrc);
    });
  }, [themePreference, resolvedTheme, logoSrc]);

  // Ref to track payment state transitions and throttle background/focus polls
  const prevPaymentRef = useRef({ leaderboardPaid: null, quizPaid: null, initialCheckDone: false });
  const lastFetchTimeRef = useRef(0);

  // Persist theme preference locally and to database when authenticated
  const setThemePreference = useCallback(async (newPref) => {
    const normalized = normalizeThemePref(newPref);
    setThemePreferenceState(normalized);
    setUser((prev) => (prev ? { ...prev, themePreference: normalized } : prev));

    if (token) {
      try {
        await fetch(apiUrl('/api/auth/theme'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ themePreference: normalized })
        });
      } catch (err) {
        console.warn('Failed to sync theme preference to server:', err);
      }
    }
  }, [token]);

  // Quick two-state toggle: flips rendered scheme; if target matches OS preference, resets override to 'system'
  const toggleTheme = useCallback(() => {
    const target = resolvedTheme === 'dark' ? 'light' : 'dark';
    const nextPref = target === systemTheme ? 'system' : target;
    setThemePreference(nextPref);
  }, [resolvedTheme, systemTheme, setThemePreference]);

  // Fetch current user from /api/auth/me if token exists
  const fetchCurrentUser = useCallback(async (authToken = token, isPolling = false) => {
    if (!authToken) {
      setUser(null);
      setIsLoading(false);
      prevPaymentRef.current = { leaderboardPaid: null, quizPaid: null, initialCheckDone: false };
      return null;
    }

    const now = Date.now();
    if (isPolling && now - lastFetchTimeRef.current < 15000) {
      return null;
    }
    lastFetchTimeRef.current = now;

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

        if (userData.themePreference) {
          setThemePreferenceState(normalizeThemePref(userData.themePreference));
        }

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
            prevUser.preferredCompetition === userData.preferredCompetition &&
            prevUser.themePreference === userData.themePreference;
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

    const pollInterval = 60000;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCurrentUser(token, true);
      }
    }, pollInterval);

    // Refresh when user switches back to this browser tab (throttled by 15s cooldown in fetchCurrentUser)
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
  }, [token, fetchCurrentUser]);

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
    if (data.themePreference) {
      setThemePreferenceState(normalizeThemePref(data.themePreference));
    }
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
      cleanShaveUploadedAt: data.cleanShaveUploadedAt,
      themePreference: normalizeThemePref(data.themePreference)
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
    if (data.themePreference) {
      setThemePreferenceState(normalizeThemePref(data.themePreference));
    }
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
      cleanShaveUploadedAt: data.cleanShaveUploadedAt,
      themePreference: normalizeThemePref(data.themePreference)
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
        closeAuthModal,
        themePreference,
        resolvedTheme,
        setThemePreference,
        toggleTheme,
        logoSrc
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
