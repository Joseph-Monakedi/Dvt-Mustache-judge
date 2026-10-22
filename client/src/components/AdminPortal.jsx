import React, { useState, useEffect } from 'react';
import { 
  FaLock, 
  FaUnlock, 
  FaEye, 
  FaEyeSlash, 
  FaTrash, 
  FaRightFromBracket, 
  FaMagnifyingGlass, 
  FaXmark,
  FaRotate,
  FaCheck,
  FaTriangleExclamation,
  FaUtensils,
  FaTrophy,
  FaBolt,
  FaHandHoldingDollar,
  FaGamepad,
  FaPlay,
  FaArrowRight,
  FaCrown,
  FaClock,
  FaUsers,
  FaUser,
  FaCircleCheck
} from 'react-icons/fa6';
import { MdOutlineWarningAmber } from 'react-icons/md';
import { apiUrl } from '../utils/api';
import QuizManager from './admin/QuizManager';

export default function AdminPortal({ onBackToApp }) {
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('dvt_admin_token') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('dvt_admin_token')));
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Active Admin Tab
  const [activeAdminTab, setActiveAdminTab] = useState('payments'); // 'payments' | 'entries' | 'quiz'

  // Contestant Payment & Approval state
  const [contestantData, setContestantData] = useState(null);
  const [contestantsLoading, setContestantsLoading] = useState(false);
  const [contestantSearch, setContestantSearch] = useState('');
  const [contestantFilter, setContestantFilter] = useState('all'); // 'all' | 'leaderboard-unpaid' | 'leaderboard-paid' | 'quiz-unpaid' | 'quiz-paid'

  // Quiz host state
  const [quizState, setQuizState] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubTab, setQuizSubTab] = useState('live'); // 'live' | 'crud'

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'genuine' | 'woodenspoon' | 'visible' | 'hidden'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Multi-select & Batch Delete state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Re-analyse state
  const [isReanalysing, setIsReanalysing] = useState(false);
  const [reanalysingId, setReanalysingId] = useState(null);

  // Delete All Modal state
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Fetch admin entries
  const fetchAdminData = async (pwd = adminPassword) => {
    if (!pwd) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/mustache/admin/entries'), {
        headers: {
          'X-Admin-Password': pwd
        }
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('dvt_admin_token');
        setLoginError('Session expired or invalid password.');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load admin data (${res.status})`);
      }

      const data = await res.json();
      setOverview(data);
    } catch (err) {
      console.warn('Error fetching admin entries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch contestants and their payment statuses
  const fetchContestants = async (pwd = adminPassword) => {
    if (!pwd) return;
    setContestantsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/mustache/admin/contestants'), {
        headers: { 'X-Admin-Password': pwd }
      });
      if (res.ok) {
        const data = await res.json();
        setContestantData(data);
      }
    } catch (err) {
      console.warn('Error fetching contestants:', err);
    } finally {
      setContestantsLoading(false);
    }
  };

  // Toggle R100 Leaderboard Payment
  const toggleLeaderboardPayment = async (userId) => {
    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/contestant/${userId}/toggle-leaderboard-paid`), {
        method: 'POST',
        headers: { 'X-Admin-Password': adminPassword }
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(''), 4500);
        fetchContestants();
      }
    } catch (err) {
      alert(`Payment toggle failed: ${err.message}`);
    }
  };

  // Toggle R50 Quiz Arena Payment
  const toggleQuizPayment = async (userId) => {
    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/contestant/${userId}/toggle-quiz-paid`), {
        method: 'POST',
        headers: { 'X-Admin-Password': adminPassword }
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(''), 4500);
        fetchContestants();
      }
    } catch (err) {
      alert(`Quiz pass toggle failed: ${err.message}`);
    }
  };

  // Fetch Quiz Game State
  const fetchQuizAdminState = async () => {
    try {
      const res = await fetch(apiUrl('/api/quiz/current'));
      if (res.ok) {
        const data = await res.json();
        setQuizState(data);
      }
    } catch (err) {
      console.warn('Quiz state fetch error:', err);
    }
  };

  // Host Quiz Actions
  const handleQuizAction = async (endpoint, body = {}) => {
    setQuizLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/quiz/admin/${endpoint}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message || 'Quiz action executed.');
        setTimeout(() => setActionMessage(''), 4500);
        fetchQuizAdminState();
      }
    } catch (err) {
      alert(`Quiz action error: ${err.message}`);
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && adminPassword) {
      fetchAdminData(adminPassword);
      fetchContestants(adminPassword);
      fetchQuizAdminState();
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch(apiUrl('/api/mustache/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() })
      });

      if (!res.ok) {
        throw new Error('Invalid administrative password.');
      }

      const data = await res.json();
      const token = data.token || passwordInput.trim();
      sessionStorage.setItem('dvt_admin_token', token);
      setAdminPassword(token);
      setIsAuthenticated(true);
      setPasswordInput('');
      fetchAdminData(token);
      fetchContestants(token);
      fetchQuizAdminState();
    } catch (err) {
      setLoginError(err.message || 'Authentication failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dvt_admin_token');
    setIsAuthenticated(false);
    setAdminPassword('');
    setOverview(null);
    setSelectedIds(new Set());
  };

  // Toggle Hide/Unhide
  const handleToggleHide = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/entry/${id}/toggle-hide`), {
        method: 'POST',
        headers: { 'X-Admin-Password': adminPassword }
      });

      if (!res.ok) throw new Error('Failed to toggle visibility');
      const result = await res.json();

      setOverview(prev => {
        if (!prev) return prev;
        const updatedEntries = prev.entries.map(e => 
          e.id === id ? { ...e, isHidden: result.isHidden } : e
        );
        const visible = updatedEntries.filter(e => !e.isHidden).length;
        const hidden = updatedEntries.filter(e => e.isHidden).length;
        return {
          ...prev,
          visibleCount: visible,
          hiddenCount: hidden,
          entries: updatedEntries
        };
      });

      setActionMessage(result.isHidden ? 'Entry hidden from public leaderboard.' : 'Entry restored to public leaderboard.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(`Action error: ${err.message}`);
    }
  };

  // Toggle Wooden Spoon classification
  const handleToggleWoodenSpoon = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/entry/${id}/toggle-woodenspoon`), {
        method: 'POST',
        headers: { 'X-Admin-Password': adminPassword }
      });

      if (!res.ok) throw new Error('Failed to toggle division');
      const result = await res.json();

      setOverview(prev => {
        if (!prev) return prev;
        const updatedEntries = prev.entries.map(e => 
          e.id === id ? { 
            ...e, 
            isWoodenSpoon: result.isWoodenSpoon, 
            woodenSpoonReason: result.woodenSpoonReason 
          } : e
        );
        return {
          ...prev,
          championshipCount: updatedEntries.filter(e => !e.isWoodenSpoon).length,
          woodenSpoonCount: updatedEntries.filter(e => e.isWoodenSpoon).length,
          entries: updatedEntries
        };
      });

      setActionMessage(result.isWoodenSpoon 
        ? 'Moved to Wooden Spoon Gallery.' 
        : 'Moved to Championship Division.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(`Division toggle error: ${err.message}`);
    }
  };

  // Re-analyse Selected Entries (Rate Limiter strictly enforced)
  const handleReanalyseSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    setIsReanalysing(true);
    setActionMessage(`Re-analysing ${count} selected contestant submission${count > 1 ? 's' : ''} with AI...`);

    try {
      const res = await fetch(apiUrl('/api/mustache/admin/entries/reanalyse'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      const data = await res.json();

      if (!res.ok && res.status !== 429) {
        throw new Error(data.error || data.message || `Re-analysis failed (${res.status})`);
      }

      if (data.updatedEntries && data.updatedEntries.length > 0) {
        setOverview(prev => {
          if (!prev) return prev;
          const updatedMap = new Map(data.updatedEntries.map(e => [e.id, e]));
          const nextEntries = prev.entries.map(e => updatedMap.get(e.id) ? { ...e, ...updatedMap.get(e.id) } : e);
          return {
            ...prev,
            remainingAiQuota: data.remainingRequests,
            secondsUntilQuotaReset: data.secondsUntilReset,
            championshipCount: nextEntries.filter(e => !e.isWoodenSpoon).length,
            woodenSpoonCount: nextEntries.filter(e => e.isWoodenSpoon).length,
            entries: nextEntries
          };
        });
      } else if (data.remainingRequests !== undefined) {
        setOverview(prev => prev ? { 
          ...prev, 
          remainingAiQuota: data.remainingRequests, 
          secondsUntilQuotaReset: data.secondsUntilReset 
        } : prev);
      }

      setActionMessage(data.message || `Re-analysed ${data.reanalysedCount || 0} entries.`);
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      alert(`Re-analysis error: ${err.message}`);
    } finally {
      setIsReanalysing(false);
    }
  };

  // Re-analyse Single Entry (Rate Limiter strictly enforced)
  const handleReanalyseSingle = async (id, contestantName) => {
    setReanalysingId(id);
    setActionMessage(`Re-analysing "${contestantName}" with AI...`);

    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/entry/${id}/reanalyse`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        }
      });

      const data = await res.json();

      if (!res.ok && res.status !== 429) {
        throw new Error(data.error || data.message || `Re-analysis failed (${res.status})`);
      }

      if (data.updatedEntries && data.updatedEntries.length > 0) {
        const updated = data.updatedEntries[0];
        setOverview(prev => {
          if (!prev) return prev;
          const nextEntries = prev.entries.map(e => e.id === id ? { ...e, ...updated } : e);
          return {
            ...prev,
            remainingAiQuota: data.remainingRequests,
            secondsUntilQuotaReset: data.secondsUntilReset,
            championshipCount: nextEntries.filter(e => !e.isWoodenSpoon).length,
            woodenSpoonCount: nextEntries.filter(e => e.isWoodenSpoon).length,
            entries: nextEntries
          };
        });
      } else if (data.remainingRequests !== undefined) {
        setOverview(prev => prev ? { 
          ...prev, 
          remainingAiQuota: data.remainingRequests, 
          secondsUntilQuotaReset: data.secondsUntilReset 
        } : prev);
      }

      setActionMessage(data.message || `Re-analysis complete for ${contestantName}.`);
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      alert(`Re-analysis error: ${err.message}`);
    } finally {
      setReanalysingId(null);
    }
  };

  // Delete Single Entry
  const handleDelete = async (id, contestantName) => {
    if (!window.confirm(`Permanently delete submission for "${contestantName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/entry/${id}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Password': adminPassword }
      });

      if (!res.ok) throw new Error('Failed to delete entry');

      setOverview(prev => {
        if (!prev) return prev;
        const updatedEntries = prev.entries.filter(e => e.id !== id);
        return {
          ...prev,
          totalSubmissions: updatedEntries.length,
          visibleCount: updatedEntries.filter(e => !e.isHidden).length,
          hiddenCount: updatedEntries.filter(e => e.isHidden).length,
          championshipCount: updatedEntries.filter(e => !e.isWoodenSpoon).length,
          woodenSpoonCount: updatedEntries.filter(e => e.isWoodenSpoon).length,
          entries: updatedEntries
        };
      });

      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      setActionMessage(`Entry for ${contestantName} deleted permanently.`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Multi-Selection Controls
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (visibleEntries) => {
    const visibleIds = visibleEntries.map(e => e.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Delete Selected Entries (Bulk Delete)
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    if (!window.confirm(`Permanently delete ${count} selected contestant submission${count > 1 ? 's' : ''}? Their images will also be removed from storage. This cannot be undone.`)) {
      return;
    }

    setIsBatchDeleting(true);
    try {
      const res = await fetch(apiUrl('/api/mustache/admin/entries/bulk-delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      if (!res.ok) throw new Error(`Batch delete failed (${res.status})`);
      const data = await res.json();

      setOverview(prev => {
        if (!prev) return prev;
        const remaining = prev.entries.filter(e => !selectedIds.has(e.id));
        return {
          ...prev,
          totalSubmissions: remaining.length,
          visibleCount: remaining.filter(e => !e.isHidden).length,
          hiddenCount: remaining.filter(e => e.isHidden).length,
          championshipCount: remaining.filter(e => !e.isWoodenSpoon).length,
          woodenSpoonCount: remaining.filter(e => e.isWoodenSpoon).length,
          entries: remaining
        };
      });

      setSelectedIds(new Set());
      setActionMessage(`Successfully deleted ${data.deletedCount || count} entries.`);
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err) {
      alert(`Batch delete error: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Delete All Entries
  const handleDeleteAll = async (e) => {
    e.preventDefault();
    const normalizedInput = deleteAllConfirmText.trim().toUpperCase();
    if (normalizedInput !== 'DELETE ALL' && normalizedInput !== 'DELETE') {
      return;
    }

    setIsDeletingAll(true);
    try {
      const res = await fetch(apiUrl('/api/mustache/admin/entries/delete-all'), {
        method: 'POST',
        headers: { 'X-Admin-Password': adminPassword }
      });

      if (!res.ok) throw new Error(`Delete all failed (${res.status})`);
      const data = await res.json();

      setOverview(prev => ({
        totalSubmissions: 0,
        visibleCount: 0,
        hiddenCount: 0,
        championshipCount: 0,
        woodenSpoonCount: 0,
        averageScore: 0,
        topScore: 0,
        remainingAiQuota: prev?.maxAiQuotaPerMinute ?? 3,
        maxAiQuotaPerMinute: prev?.maxAiQuotaPerMinute ?? 3,
        secondsUntilQuotaReset: 0,
        entries: []
      }));

      setSelectedIds(new Set());
      setShowDeleteAllModal(false);
      setDeleteAllConfirmText('');
      setActionMessage(`All tournament entries (${data.deletedCount || 0}) have been permanently deleted.`);
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err) {
      alert(`Delete all error: ${err.message}`);
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Filter entries
  const filteredEntries = (overview?.entries || []).filter(e => {
    if (filterMode === 'genuine' && e.isWoodenSpoon) return false;
    if (filterMode === 'woodenspoon' && !e.isWoodenSpoon) return false;
    if (filterMode === 'visible' && e.isHidden) return false;
    if (filterMode === 'hidden' && !e.isHidden) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.contestantName.toLowerCase().includes(q) ||
        e.mustacheTitle.toLowerCase().includes(q) ||
        (e.woodenSpoonReason && e.woodenSpoonReason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter contestants for payment panel
  const filteredContestants = (contestantData?.contestants || []).filter(c => {
    // Exclude Admin accounts and hardcoded test accounts
    if (c.role === 'Admin') return false;
    if (c.fullName && (c.fullName.toLowerCase().includes('movember admin') || c.fullName.toLowerCase().includes('alex movember'))) return false;
    if (c.email && (c.email.toLowerCase() === 'admin@dvt.co.za' || c.email.toLowerCase() === 'testparticipant@gmail.com')) return false;

    if (contestantFilter === 'leaderboard-unpaid' && c.leaderboardPaid) return false;
    if (contestantFilter === 'leaderboard-paid' && !c.leaderboardPaid) return false;
    if (contestantFilter === 'quiz-unpaid' && c.quizPaid) return false;
    if (contestantFilter === 'quiz-paid' && !c.quizPaid) return false;
    if (contestantSearch.trim()) {
      const q = contestantSearch.toLowerCase();
      return (
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const isAllFilteredSelected = filteredEntries.length > 0 && filteredEntries.every(e => selectedIds.has(e.id));

  // Password Prompt screen if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-login-backdrop fade-in">
        <div className="admin-login-card">
          <div className="admin-lock-icon-wrap">
            <FaLock className="admin-lock-icon" />
          </div>
          <h2 className="admin-login-title">DVT Judicial Admin Portal</h2>
          <p className="admin-login-desc">
            Protected area. Supply the admin password to manage entries, re-analyse submissions, and moderate entries.
          </p>

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-group">
              <input
                type="password"
                className="form-input"
                placeholder="Enter Admin Password..."
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                autoFocus
                required
              />
            </div>

            {loginError && (
              <div className="validation-error-badge">
                <MdOutlineWarningAmber className="error-icon" /> {loginError}
              </div>
            )}

            <button type="submit" className="submit-judge-btn" disabled={loggingIn}>
              {loggingIn ? (
                <>
                  <span className="btn-spinner"></span> Authenticating Session...
                </>
              ) : (
                <>
                  <FaLock className="btn-icon" /> Unlock Admin Portal
                </>
              )}
            </button>

            <button type="button" className="secondary-btn" onClick={onBackToApp}>
              Return to Public App
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-container fade-in">
      {/* Top ambient loading bar on sync */}
      {loading && <div className="global-loading-bar" />}

      {/* Admin Top Header */}
      <div className="admin-header">
        <div>
          <div className="admin-badge">
            <FaUnlock className="btn-icon" /> SECURE ADMINISTRATIVE SESSION
          </div>
          <h1 className="admin-title">DVT Movember Moderation Portal</h1>
          <p className="admin-subtitle">
            Manage submissions, bulk delete, reclassify divisions, or re-analyse entries with the Gemini AI Judge.
          </p>
        </div>

        <div className="admin-header-actions">
          <button className="kiosk-btn" onClick={() => fetchAdminData()} disabled={loading}>
            <FaRotate className={`btn-icon ${loading ? 'spin-icon' : ''}`} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            type="button" 
            className="kiosk-btn btn-danger-header" 
            onClick={() => setShowDeleteAllModal(true)}
            title="Permanently Delete All Entries"
          >
            <FaTrash className="btn-icon" /> Delete All Entries
          </button>
          <button className="kiosk-btn exit-btn" onClick={handleLogout}>
            <FaRightFromBracket className="btn-icon" /> Logout
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="toast-banner fade-in">
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Operational Progress Banner */}
      {(isReanalysing || isBatchDeleting) && (
        <div className="admin-operation-progress-banner fade-in">
          <div className="admin-op-text">
            <span className="spinner-sm"></span>
            <span>
              {isReanalysing 
                ? `Gemini AI Judicial Review in progress${reanalysingId ? ' (processing queued entry)' : ''}... Adhering to rate limit quota.`
                : 'Executing secure batch deletion from records...'}
            </span>
          </div>
          <span className="live-pulse-dot"></span>
        </div>
      )}

      {/* Admin Multi-Tab Navigation */}
      <div className="admin-tabs-nav">
        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === 'payments' ? 'active' : ''}`}
          onClick={() => {
            setActiveAdminTab('payments');
            fetchContestants();
          }}
        >
          <FaHandHoldingDollar className="btn-icon text-green" />
          <span>Charity Fees & Approvals (R100 / R50)</span>
          {contestantData && (
            <span className="admin-tab-count-badge">
              {contestantData.leaderboardPaidCount}/{contestantData.totalContestants}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === 'entries' ? 'active' : ''}`}
          onClick={() => {
            setActiveAdminTab('entries');
            fetchAdminData();
          }}
        >
          <FaTrophy className="btn-icon text-gold" />
          <span>Submissions & AI Moderation</span>
          {overview && (
            <span className="admin-tab-count-badge">
              {overview.totalSubmissions}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeAdminTab === 'quiz' ? 'active' : ''}`}
          onClick={() => {
            setActiveAdminTab('quiz');
            fetchQuizAdminState();
          }}
        >
          <FaGamepad className="btn-icon text-cyan" />
          <span>Mustache Quiz Arena Controller</span>
          {quizState && (
            <span className="admin-tab-count-badge quiz-status-badge">
              {quizState.status}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Charity Fees & Approvals */}
      {activeAdminTab === 'payments' && (
        <div className="admin-payments-section fade-in">
          {/* Top Charity Overview Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-label">Total Registered Contestants</div>
              <div className="stat-val">{contestantData?.totalContestants || 0}</div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-label">
                <FaTrophy className="inline-icon text-gold" /> Leaderboard Approved (R100)
              </div>
              <div className="stat-val text-gold">
                {contestantData?.leaderboardPaidCount || 0}
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-label">
                <FaGamepad className="inline-icon text-cyan" /> Quiz Arena Passes (R50)
              </div>
              <div className="stat-val text-cyan">
                {contestantData?.quizPaidCount || 0}
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-label">
                <FaHandHoldingDollar className="inline-icon text-green" /> Total Funds Raised
              </div>
              <div className="stat-val text-green">
                R {(contestantData?.totalFundsRaisedZar || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls for Payments */}
          <div className="leaderboard-controls">
            <div className="category-chips">
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'all' ? 'active' : ''}`}
                onClick={() => setContestantFilter('all')}
              >
                All ({contestantData?.totalContestants || 0})
              </button>
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'leaderboard-unpaid' ? 'active' : ''}`}
                onClick={() => setContestantFilter('leaderboard-unpaid')}
              >
                <FaClock className="inline-icon text-orange" /> Leaderboard Pending ({contestantData ? Math.max(0, contestantData.totalContestants - contestantData.leaderboardPaidCount) : 0})
              </button>
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'leaderboard-paid' ? 'active' : ''}`}
                onClick={() => setContestantFilter('leaderboard-paid')}
              >
                <FaCircleCheck className="inline-icon text-green" /> Leaderboard Approved ({contestantData?.leaderboardPaidCount || 0})
              </button>
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'quiz-unpaid' ? 'active' : ''}`}
                onClick={() => setContestantFilter('quiz-unpaid')}
              >
                <FaGamepad className="inline-icon text-orange" /> Quiz Pass Pending ({contestantData ? Math.max(0, contestantData.totalContestants - contestantData.quizPaidCount) : 0})
              </button>
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'quiz-paid' ? 'active' : ''}`}
                onClick={() => setContestantFilter('quiz-paid')}
              >
                <FaGamepad className="inline-icon text-green" /> Quiz Pass Active ({contestantData?.quizPaidCount || 0})
              </button>
            </div>

            <div className="search-bar">
              <FaMagnifyingGlass className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search contestant by name or email..."
                value={contestantSearch}
                onChange={e => setContestantSearch(e.target.value)}
              />
              {contestantSearch && (
                <button className="clear-search" onClick={() => setContestantSearch('')}>
                  <FaXmark />
                </button>
              )}
            </div>
          </div>

          {/* Contestants Table */}
          <div className="standings-card">
            {contestantsLoading && !contestantData ? (
              <AdminTableSkeleton />
            ) : filteredContestants.length === 0 ? (
              <div className="empty-state">
                <h3>No contestants found</h3>
                <p>No registered contestants match the selected filter criteria.</p>
              </div>
            ) : (
              <div className="standings-table-wrapper">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>Contestant</th>
                      <th>Submissions & Best</th>
                      <th>Leaderboard Entry (R100)</th>
                      <th>Quiz Arena Entry (R50)</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContestants.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="contestant-cell">
                            <div className="contestant-avatar-fallback">
                              {c.fullName ? c.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="contestant-meta-info">
                              <span className="contestant-name-text">
                                {c.fullName} {c.role === 'Admin' && <span className="admin-chip-mini">Admin</span>}
                              </span>
                              <span className="contestant-email-text">{c.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="entry-count-meta">
                            <span className="entry-count-num">{c.entryCount} submissions</span>
                            {c.highestScore > 0 ? (
                              <span className="best-score-badge">Top: {c.highestScore.toFixed(1)}/100</span>
                            ) : (
                              <span className="no-score-text">No uploads yet</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="payment-action-cell">
                            {c.leaderboardPaid ? (
                              <span className="payment-status-badge badge-paid">
                                <FaCircleCheck className="badge-icon" /> Approved (R100 Paid)
                              </span>
                            ) : (
                              <span className="payment-status-badge badge-pending">
                                <FaClock className="badge-icon" /> Pending Payment
                              </span>
                            )}
                            <button
                              type="button"
                              className={`payment-toggle-btn ${c.leaderboardPaid ? 'btn-revoke' : 'btn-approve-100'}`}
                              onClick={() => toggleLeaderboardPayment(c.id)}
                            >
                              {c.leaderboardPaid ? 'Revoke Approval' : 'Approve R100'}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="payment-action-cell">
                            {c.quizPaid ? (
                              <span className="payment-status-badge badge-paid">
                                <FaCircleCheck className="badge-icon" /> Pass Active (R50 Paid)
                              </span>
                            ) : (
                              <span className="payment-status-badge badge-pending">
                                <FaClock className="badge-icon" /> No Quiz Pass
                              </span>
                            )}
                            <button
                              type="button"
                              className={`payment-toggle-btn ${c.quizPaid ? 'btn-revoke' : 'btn-approve-50'}`}
                              onClick={() => toggleQuizPayment(c.id)}
                            >
                              {c.quizPaid ? 'Revoke Pass' : 'Approve R50'}
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className="joined-date-text">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Submissions & AI Moderation */}
      {activeAdminTab === 'entries' && (
        <div className="admin-entries-section fade-in">
          {/* Stats Cards Row or Skeleton */}
      {loading && !overview ? (
        <AdminStatsSkeleton />
      ) : overview ? (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="stat-label">Total Submissions</div>
            <div className="stat-val">{overview.totalSubmissions}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label"><FaTrophy className="inline-icon text-gold" /> Genuine Entries</div>
            <div className="stat-val text-gold">{overview.championshipCount ?? overview.entries.filter(e => !e.isWoodenSpoon).length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label"><FaUtensils className="inline-icon text-cyan" /> The Wooden Spoon</div>
            <div className="stat-val text-cyan">{overview.woodenSpoonCount ?? overview.entries.filter(e => e.isWoodenSpoon).length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Public / Visible</div>
            <div className="stat-val text-green">{overview.visibleCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">
              <FaBolt className="stat-icon-mini" /> AI Rate Limit Quota
            </div>
            <div className={`stat-val ${(overview.remainingAiQuota ?? 3) > 0 ? 'text-green' : 'text-orange'}`}>
              {overview.remainingAiQuota ?? 3} / {overview.maxAiQuotaPerMinute ?? 3}
            </div>
            {(overview.remainingAiQuota ?? 3) === 0 && overview.secondsUntilQuotaReset > 0 && (
              <span className="stat-subtext text-orange">
                Resets in {overview.secondsUntilQuotaReset}s
              </span>
            )}
            {(overview.queuedRequestsCount || 0) > 0 && (
              <span className="stat-subtext text-cyan" style={{ display: 'block', marginTop: '2px' }}>
                {overview.queuedRequestsCount} in queue
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="leaderboard-controls">
        <div className="category-chips">
          <button 
            type="button" 
            className={`chip-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All ({overview?.totalSubmissions || 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${filterMode === 'genuine' ? 'active' : ''}`}
            onClick={() => setFilterMode('genuine')}
          >
            <FaTrophy className="inline-icon" /> Genuine ({overview?.championshipCount ?? overview?.entries.filter(e => !e.isWoodenSpoon).length ?? 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${filterMode === 'woodenspoon' ? 'active' : ''}`}
            onClick={() => setFilterMode('woodenspoon')}
          >
            <FaUtensils className="inline-icon" /> Wooden Spoon ({overview?.woodenSpoonCount ?? overview?.entries.filter(e => e.isWoodenSpoon).length ?? 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${filterMode === 'visible' ? 'active' : ''}`}
            onClick={() => setFilterMode('visible')}
          >
            Visible ({overview?.visibleCount || 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${filterMode === 'hidden' ? 'active' : ''}`}
            onClick={() => setFilterMode('hidden')}
          >
            Hidden ({overview?.hiddenCount || 0})
          </button>
        </div>

        <div className="search-bar">
          <FaMagnifyingGlass className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search contestant or title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <FaXmark />
            </button>
          )}
        </div>
      </div>

      {/* Batch Action Bar (Triggered when entries are selected or visible) */}
      <div className={`admin-batch-toolbar ${selectedIds.size > 0 ? 'active' : ''}`}>
        <div className="batch-toolbar-left">
          <label className="batch-select-all-label">
            <input
              type="checkbox"
              className="admin-checkbox"
              checked={isAllFilteredSelected}
              onChange={() => handleToggleSelectAll(filteredEntries)}
            />
            <span className="batch-select-text">
              {isAllFilteredSelected ? 'Deselect Filtered' : 'Select All Filtered'}
            </span>
          </label>
          {selectedIds.size > 0 && (
            <span className="batch-count-pill">
              <FaCheck className="pill-check-icon" /> {selectedIds.size} Selected
            </span>
          )}
        </div>

        <div className="batch-toolbar-right">
          {selectedIds.size > 0 && (
            <>
              {/* Re-analyse Selected button with Rate Limit protection */}
              <button
                type="button"
                className="batch-btn batch-reanalyse-btn"
                onClick={handleReanalyseSelected}
                disabled={isReanalysing || isBatchDeleting}
                title="Re-analyse selected submissions using Gemini AI (strictly honors rate limits)"
              >
                <FaRotate className={`btn-icon ${isReanalysing ? 'spin-icon' : ''}`} />
                {isReanalysing ? 'Re-analysing...' : `Re-analyse Selected (${selectedIds.size})`}
              </button>

              <button
                type="button"
                className="batch-btn batch-delete-btn"
                onClick={handleDeleteSelected}
                disabled={isBatchDeleting || isReanalysing}
              >
                <FaTrash className="btn-icon" />
                {isBatchDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
              </button>

              <button
                type="button"
                className="batch-btn batch-clear-btn"
                onClick={handleClearSelection}
                disabled={isReanalysing || isBatchDeleting}
              >
                Clear Selection
              </button>
            </>
          )}

          <button
            type="button"
            className="batch-btn batch-delete-all-btn"
            onClick={() => setShowDeleteAllModal(true)}
            disabled={isReanalysing || isBatchDeleting}
            title="Permanently Delete All Entries"
          >
            <FaTrash className="btn-icon" /> Delete All Entries
          </button>
        </div>
      </div>

      {/* Admin Moderation Table */}
      <div className="standings-card">
        {loading && !overview ? (
          <AdminTableSkeleton />
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <h3>No entries found</h3>
            <p>No contestant records match your moderation filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop Moderation Table */}
            <div className="standings-table-wrapper desktop-only">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={isAllFilteredSelected}
                        onChange={() => handleToggleSelectAll(filteredEntries)}
                        aria-label="Select all entries"
                      />
                    </th>
                    <th>Contestant</th>
                    <th>Division</th>
                    <th>Title & Archetype</th>
                    <th>Score</th>
                    <th>Submitted</th>
                    <th>Visibility</th>
                    <th>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => {
                    const isSelected = selectedIds.has(entry.id);
                    const isRowReanalysing = reanalysingId === entry.id;
                    return (
                      <tr 
                        key={entry.id} 
                        className={`standings-row ${entry.isHidden ? 'row-hidden' : ''} ${isSelected ? 'row-selected' : ''}`}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(entry.id)}
                            aria-label={`Select ${entry.contestantName}`}
                          />
                        </td>
                        <td className="contestant-col">
                          <div className="contestant-cell">
                            <img 
                              src={entry.thumbnailUrl || entry.imageUrl} 
                              alt={entry.contestantName} 
                              className="table-avatar"
                            />
                            <div>
                              <div className="table-contestant-name">{entry.contestantName}</div>
                              <div className="table-id-tag">ID: {entry.id.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="cohort-col">
                          {entry.isWoodenSpoon ? (
                            <span className="division-badge badge-woodenspoon" title={entry.woodenSpoonReason || 'Wooden Spoon entry'}>
                              <FaUtensils className="inline-icon" /> Wooden Spoon
                            </span>
                          ) : (
                            <span className="division-badge badge-genuine" title="Genuine Human Contestant">
                              <FaTrophy className="inline-icon" /> Genuine
                            </span>
                          )}
                        </td>
                        <td className="category-col">
                          <div>"{entry.mustacheTitle}"</div>
                          <span className="style-tag">{entry.styleCategory}</span>
                        </td>
                        <td className="overall-col">
                          <span className={`score-badge ${entry.isWoodenSpoon ? 'score-woodenspoon' : 'score-standard'}`}>
                            {entry.overallScore}
                          </span>
                        </td>
                        <td className="cohort-col">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td className="cohort-col">
                          {entry.isHidden ? (
                            <span className="status-pill status-hidden">Hidden</span>
                          ) : (
                            <span className="status-pill status-visible">Visible</span>
                          )}
                        </td>
                        <td className="action-col">
                          <div className="admin-actions-cell">
                            {/* Re-analyse button (Rate Limiter strictly enforced) */}
                            <button
                              type="button"
                              className="admin-btn-action btn-reanalyse"
                              onClick={() => handleReanalyseSingle(entry.id, entry.contestantName)}
                              disabled={isRowReanalysing || isReanalysing}
                              title="Re-analyse this entry with Gemini AI (strictly honors rate limit)"
                            >
                              <FaRotate className={`btn-icon ${isRowReanalysing ? 'spin-icon' : ''}`} />
                              {isRowReanalysing ? 'Re-analysing...' : 'Re-analyse'}
                            </button>

                            <button
                              type="button"
                              className={`admin-btn-action ${entry.isHidden ? 'btn-unhide' : 'btn-hide'}`}
                              onClick={() => handleToggleHide(entry.id)}
                              title={entry.isHidden ? 'Restore to leaderboard' : 'Hide from public'}
                            >
                              {entry.isHidden ? (
                                <>
                                  <FaEye className="btn-icon" /> Show
                                </>
                              ) : (
                                <>
                                  <FaEyeSlash className="btn-icon" /> Hide
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className={`admin-btn-action ${entry.isWoodenSpoon ? 'btn-make-genuine' : 'btn-make-spoon'}`}
                              onClick={() => handleToggleWoodenSpoon(entry.id)}
                              title={entry.isWoodenSpoon ? 'Move to Genuine Championship' : 'Move to Wooden Spoon Gallery'}
                            >
                              {entry.isWoodenSpoon ? (
                                <>
                                  <FaTrophy className="btn-icon" /> Genuine
                                </>
                              ) : (
                                <>
                                  <FaUtensils className="btn-icon" /> Spoon
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="admin-btn-action btn-delete"
                              onClick={() => handleDelete(entry.id, entry.contestantName)}
                              title="Permanently Delete Entry"
                            >
                              <FaTrash className="btn-icon" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Moderation Cards */}
            <div className="admin-mobile-cards mobile-only">
              {filteredEntries.map(entry => {
                const isSelected = selectedIds.has(entry.id);
                const isRowReanalysing = reanalysingId === entry.id;
                return (
                  <div 
                    key={entry.id} 
                    className={`admin-mobile-card ${entry.isHidden ? 'row-hidden' : ''} ${isSelected ? 'row-selected' : ''}`}
                  >
                    <div className="admin-mobile-card-header">
                      <div className="admin-mobile-checkbox-wrap">
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(entry.id)}
                        />
                      </div>
                      <img 
                        src={entry.thumbnailUrl || entry.imageUrl} 
                        alt={entry.contestantName} 
                        className="admin-mobile-avatar"
                      />
                      <div className="admin-mobile-meta">
                        <div className="admin-mobile-name">{entry.contestantName}</div>
                        <div className="admin-mobile-title">"{entry.mustacheTitle}"</div>
                      </div>
                      <div className="admin-mobile-score-wrap">
                        <span className={`score-badge ${entry.isWoodenSpoon ? 'score-woodenspoon' : 'score-standard'}`}>
                          {entry.overallScore}
                        </span>
                      </div>
                    </div>

                    <div className="admin-mobile-card-badges">
                      {entry.isWoodenSpoon ? (
                        <span className="division-badge badge-woodenspoon">
                          <FaUtensils className="inline-icon" /> Spoon
                        </span>
                      ) : (
                        <span className="division-badge badge-genuine">
                          <FaTrophy className="inline-icon" /> Genuine
                        </span>
                      )}
                      <span className="style-tag">{entry.styleCategory}</span>
                      {entry.isHidden ? (
                        <span className="status-pill status-hidden">Hidden</span>
                      ) : (
                        <span className="status-pill status-visible">Visible</span>
                      )}
                      <span className="admin-mobile-date">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="admin-mobile-actions">
                      <button
                        type="button"
                        className="admin-btn-action mobile-act-btn btn-reanalyse"
                        onClick={() => handleReanalyseSingle(entry.id, entry.contestantName)}
                        disabled={isRowReanalysing || isReanalysing}
                      >
                        <FaRotate className={`btn-icon ${isRowReanalysing ? 'spin-icon' : ''}`} />
                        {isRowReanalysing ? 'Re-analysing...' : 'Re-analyse'}
                      </button>

                      <button
                        type="button"
                        className={`admin-btn-action mobile-act-btn ${entry.isHidden ? 'btn-unhide' : 'btn-hide'}`}
                        onClick={() => handleToggleHide(entry.id)}
                      >
                        {entry.isHidden ? (
                          <>
                            <FaEye className="btn-icon" /> Unhide
                          </>
                        ) : (
                          <>
                            <FaEyeSlash className="btn-icon" /> Hide
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className={`admin-btn-action mobile-act-btn ${entry.isWoodenSpoon ? 'btn-make-genuine' : 'btn-make-spoon'}`}
                        onClick={() => handleToggleWoodenSpoon(entry.id)}
                      >
                        {entry.isWoodenSpoon ? (
                          <>
                            <FaTrophy className="btn-icon" /> Genuine
                          </>
                        ) : (
                          <>
                            <FaUtensils className="btn-icon" /> Spoon
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="admin-btn-action btn-delete mobile-act-delete"
                        onClick={() => handleDelete(entry.id, entry.contestantName)}
                      >
                        <FaTrash className="btn-icon" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      </div>
      )}

      {/* TAB 3: Mustache Quiz Arena Controller & CRUD */}
      {activeAdminTab === 'quiz' && (
        <div className="admin-quiz-section fade-in">
          {/* Sub Navigation: Live Host Controls vs Quiz CRUD Manager */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`admin-tab-btn ${quizSubTab === 'live' ? 'active' : ''}`}
              onClick={() => setQuizSubTab('live')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}
            >
              <FaBolt className="btn-icon" /> Live Arena Host Controls
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${quizSubTab === 'crud' ? 'active' : ''}`}
              onClick={() => setQuizSubTab('crud')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}
            >
              <FaGamepad className="btn-icon" /> Manage Quizzes & Questions (CRUD)
            </button>
          </div>

          {quizSubTab === 'crud' ? (
            <QuizManager
              adminPassword={adminPassword}
              onQuizChanged={() => {
                fetchQuizAdminState();
              }}
            />
          ) : (
            <>
              {/* Quiz Host Status Overview Card */}
              <div className="quiz-host-status-card">
            <div className="quiz-host-header">
              <div className="quiz-host-title-wrap">
                <span className="quiz-host-badge">
                  <FaGamepad className="btn-icon" /> ARENA MASTER CONTROL
                </span>
                <h2 className="quiz-host-title">
                  {quizState?.title || 'DVT Movember 2026 Grand Mustache Quiz Arena'}
                </h2>
                <p className="quiz-host-subtitle">
                  Direct the live interactive quiz for all contestants. Advance questions, reveal answer distributions, and crown the Mustache Trivia Champion.
                </p>
              </div>

              <div className="quiz-host-pin-box">
                <span className="quiz-pin-label">GAME PIN</span>
                <span className="quiz-pin-number">{quizState?.pinCode || 'No PIN'}</span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={() => {
                      if (quizState?.pinCode) {
                        navigator.clipboard?.writeText(quizState.pinCode);
                        setActionMessage(`PIN ${quizState.pinCode} copied to clipboard! Communicate this manually to players.`);
                        setTimeout(() => setActionMessage(''), 3500);
                      }
                    }}
                    disabled={!quizState?.pinCode}
                    title="Copy PIN to clipboard"
                  >
                    Copy PIN
                  </button>
                  <button
                    type="button"
                    className="admin-mini-btn"
                    onClick={async () => {
                      const newPin = Math.floor(10000 + Math.random() * 90000).toString();
                      await handleQuizAction('set-pin', { pin: newPin });
                    }}
                    disabled={quizLoading}
                    title="Generate a fresh 5-digit PIN"
                  >
                    Generate Fresh PIN
                  </button>
                </div>
              </div>
            </div>

            <div className="quiz-host-meta-grid">
              <div className="quiz-meta-item">
                <span className="quiz-meta-label">Game Status</span>
                <span className={`quiz-status-tag status-${quizState?.status?.toLowerCase() || 'lobby'}`}>
                  {quizState?.status || 'Lobby'}
                </span>
              </div>
              <div className="quiz-meta-item">
                <span className="quiz-meta-label">Connected Players</span>
                <span className="quiz-meta-value">
                  <FaUsers className="inline-icon" /> {quizState?.playerCount || 0}
                </span>
              </div>
              <div className="quiz-meta-item">
                <span className="quiz-meta-label">Question Progress</span>
                <span className="quiz-meta-value">
                  {quizState?.currentQuestion 
                    ? `${(quizState.currentQuestionIndex ?? 0) + 1} / ${quizState.totalQuestions || 8}`
                    : `0 / ${quizState?.totalQuestions || 8} (In Lobby)`}
                </span>
              </div>
            </div>

            {/* Host Action Buttons */}
            <div className="quiz-host-action-bar">
              <button
                type="button"
                className="quiz-host-btn btn-lobby"
                onClick={() => handleQuizAction('start-lobby')}
                disabled={quizLoading}
              >
                <FaRotate className="btn-icon" /> Open / Reset Lobby
              </button>

              <button
                type="button"
                className="quiz-host-btn btn-next-question"
                onClick={() => handleQuizAction('next-question')}
                disabled={quizLoading}
              >
                <FaPlay className="btn-icon" /> Launch Next Question
              </button>

              <button
                type="button"
                className="quiz-host-btn btn-reveal"
                onClick={() => handleQuizAction('reveal-round')}
                disabled={quizLoading || quizState?.status !== 'InQuestion'}
              >
                <FaEye className="btn-icon" /> Reveal Answers & Scoring
              </button>

              <button
                type="button"
                className="quiz-host-btn btn-crown"
                onClick={() => handleQuizAction('end')}
                disabled={quizLoading}
              >
                <FaCrown className="btn-icon" /> Crown Champions (End Quiz)
              </button>

              <button
                type="button"
                className="quiz-host-btn btn-reset-scores"
                onClick={() => {
                  if (window.confirm('Reset all player scores to 0 for a new tournament?')) {
                    handleQuizAction('reset-scores');
                  }
                }}
                disabled={quizLoading}
              >
                <FaRotate className="btn-icon" /> Reset Scores to 0
              </button>
            </div>
          </div>

          {/* Current Question Live Display */}
          {quizState?.currentQuestion ? (
            <div className="quiz-current-question-card fade-in">
              <div className="quiz-q-header">
                <span className="quiz-q-index">Question {(quizState.currentQuestionIndex ?? 0) + 1}</span>
                <h3 className="quiz-q-text">{quizState.currentQuestion.questionText}</h3>
              </div>

              {quizState.currentQuestion.imageUrl && (
                <div className="quiz-q-image-wrap">
                  <img src={quizState.currentQuestion.imageUrl} alt="Quiz Question" className="quiz-q-img" />
                </div>
              )}

              <div className="quiz-q-options-grid">
                <div className={`quiz-q-option opt-red ${quizState.currentQuestion.correctOption === 1 ? 'is-correct' : ''}`}>
                  <span className="opt-shape">▲</span>
                  <span className="opt-label">{quizState.currentQuestion.optionA}</span>
                  {quizState.answerStats && (
                    <span className="opt-vote-count">{quizState.answerStats.countA || 0} votes</span>
                  )}
                </div>
                <div className={`quiz-q-option opt-blue ${quizState.currentQuestion.correctOption === 2 ? 'is-correct' : ''}`}>
                  <span className="opt-shape">◆</span>
                  <span className="opt-label">{quizState.currentQuestion.optionB}</span>
                  {quizState.answerStats && (
                    <span className="opt-vote-count">{quizState.answerStats.countB || 0} votes</span>
                  )}
                </div>
                <div className={`quiz-q-option opt-yellow ${quizState.currentQuestion.correctOption === 3 ? 'is-correct' : ''}`}>
                  <span className="opt-shape">●</span>
                  <span className="opt-label">{quizState.currentQuestion.optionC}</span>
                  {quizState.answerStats && (
                    <span className="opt-vote-count">{quizState.answerStats.countC || 0} votes</span>
                  )}
                </div>
                <div className={`quiz-q-option opt-green ${quizState.currentQuestion.correctOption === 4 ? 'is-correct' : ''}`}>
                  <span className="opt-shape">■</span>
                  <span className="opt-label">{quizState.currentQuestion.optionD}</span>
                  {quizState.answerStats && (
                    <span className="opt-vote-count">{quizState.answerStats.countD || 0} votes</span>
                  )}
                </div>
              </div>

              {quizState.answerStats && (
                <div className="quiz-total-answers-bar">
                  Total answers collected this round: <strong>{quizState.answerStats.totalAnswers || 0}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="quiz-waiting-card">
              <FaGamepad className="waiting-icon" />
              <h3>Arena is in Lobby Mode</h3>
              <p>Players can join using PIN <strong>{quizState?.pinCode || 'Pending PIN'}</strong>. When all players have arrived, click <strong>Launch Next Question</strong> above.</p>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="admin-modal-backdrop fade-in" onClick={() => !isDeletingAll && setShowDeleteAllModal(false)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-danger-icon">
              <FaTriangleExclamation />
            </div>
            <h2 className="admin-modal-title">Delete All Contestant Submissions?</h2>
            <p className="admin-modal-desc">
              Warning: This action will permanently wipe <strong>ALL {overview?.totalSubmissions || 0} entries</strong> from the database and remove all associated photos from storage.
            </p>
            <div className="admin-modal-callout">
              This cannot be undone. All leaderboard scores and verdicts will be lost immediately.
            </div>

            <form onSubmit={handleDeleteAll}>
              <div className="admin-modal-input-group">
                <label className="admin-modal-input-label">
                  Type <strong>DELETE ALL</strong> to confirm:
                </label>
                <input
                  type="text"
                  className="form-input text-center"
                  placeholder="DELETE ALL"
                  value={deleteAllConfirmText}
                  onChange={e => setDeleteAllConfirmText(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={isDeletingAll}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-danger-confirm"
                  disabled={
                    isDeletingAll || 
                    (deleteAllConfirmText.trim().toUpperCase() !== 'DELETE ALL' && 
                     deleteAllConfirmText.trim().toUpperCase() !== 'DELETE')
                  }
                >
                  {isDeletingAll ? (
                    <>
                      <span className="spinner"></span> Purging Database...
                    </>
                  ) : (
                    <>
                      <FaTrash className="btn-icon" /> Permanently Delete All
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminStatsSkeleton() {
  return (
    <div className="admin-stats-skeleton-grid fade-in">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="admin-stat-skeleton-card">
          <div className="skeleton-shimmer" style={{ width: '65%', height: '14px', borderRadius: '4px' }}></div>
          <div className="skeleton-shimmer" style={{ width: '40%', height: '28px', borderRadius: '6px' }}></div>
        </div>
      ))}
    </div>
  );
}

function AdminTableSkeleton() {
  return (
    <div className="table-skeleton-wrap fade-in">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="table-skeleton-row">
          <div className="skeleton-shimmer" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
          <div className="skeleton-shimmer table-skel-avatar" style={{ borderRadius: '8px' }}></div>
          <div className="table-skel-info" style={{ flex: 2 }}>
            <div className="skeleton-shimmer" style={{ width: '50%', height: '16px', borderRadius: '4px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '30%', height: '12px', borderRadius: '4px' }}></div>
          </div>
          <div className="table-skel-info" style={{ flex: 1 }}>
            <div className="skeleton-shimmer" style={{ width: '60%', height: '16px', borderRadius: '4px' }}></div>
          </div>
          <div className="skeleton-shimmer" style={{ width: '130px', height: '32px', borderRadius: '6px' }}></div>
        </div>
      ))}
    </div>
  );
}
