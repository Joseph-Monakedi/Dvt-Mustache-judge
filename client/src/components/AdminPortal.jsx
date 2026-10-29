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
  FaTrophy, 
  FaBolt, 
  FaHandHoldingHeart, 
  FaGamepad, 
  FaPlay, 
  FaArrowRight, 
  FaCrown, 
  FaClock, 
  FaUsers, 
  FaUser, 
  FaCircleCheck,
  FaUserXmark
} from 'react-icons/fa6';
import { HiSparkles } from 'react-icons/hi2';
import { GiMustache } from 'react-icons/gi';
import { MdOutlineWarningAmber } from 'react-icons/md';
import { apiUrl } from '../utils/api';
import QuizManager from './admin/QuizManager';
import QuizLiveLeaderboard from './quiz/QuizLiveLeaderboard';

export default function AdminPortal({ onBackToApp }) {
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('dvt_admin_token') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('dvt_admin_token')));
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Active Admin Tab: 'donations' | 'entries' | 'quiz' (quiz hidden visually from UI tabs)
  const [activeAdminTab, setActiveAdminTab] = useState('donations');

  // Contestant Donation & Approval state
  const [contestantData, setContestantData] = useState(null);
  const [contestantsLoading, setContestantsLoading] = useState(false);
  const [contestantSearch, setContestantSearch] = useState('');
  const [contestantFilter, setContestantFilter] = useState('all'); // 'all' | 'eligible' | 'community' | 'mustache' | 'crazyhair'

  // Quiz host state (code preserved for future use)
  const [quizState, setQuizState] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubTab, setQuizSubTab] = useState('live');

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'mustache' | 'crazyhair' | 'visible' | 'hidden'
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

  // Fetch contestants and their donation statuses
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

  // Set / Toggle Donation and Prize Eligibility (min R100)
  const handleSetDonation = async (userId, eligible, amount = 100) => {
    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/contestant/${userId}/set-donation`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({ eligible, amount: eligible ? amount : 0 })
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message || 'Donation status updated.');
        setTimeout(() => setActionMessage(''), 4500);
        fetchContestants();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }
    } catch (err) {
      alert(`Donation status update failed: ${err.message}`);
    }
  };

  // Delete Contestant Account Permanently
  const handleDeleteContestantAccount = async (userId, fullName, email) => {
    const promptMsg = `Are you sure you want to PERMANENTLY delete the contestant account for:\n"${fullName}" (${email})?\n\nThis will permanently delete:\n• All submitted photos and judging entries\n• Day 1 baseline photo\n• Login credentials and account history\n\nThis action CANNOT be undone.`;
    if (!window.confirm(promptMsg)) {
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/contestant/${userId}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Password': adminPassword }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setActionMessage(data.message || `Account for "${fullName}" was permanently deleted.`);
      setTimeout(() => setActionMessage(''), 4500);

      // Refresh data
      fetchContestants();
      fetchAdminData();
    } catch (err) {
      alert(`Account deletion failed: ${err.message}`);
    }
  };

  // Fetch Quiz Game State (code preserved)
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

  // Host Quiz Actions (code preserved)
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

  // Toggle Competition Track between Mustache and Creative Mustache
  const handleToggleTrack = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/mustache/admin/entry/${id}/toggle-track`), {
        method: 'POST',
        headers: { 'X-Admin-Password': adminPassword }
      });

      if (!res.ok) throw new Error('Failed to toggle challenge track');
      const result = await res.json();

      setOverview(prev => {
        if (!prev) return prev;
        const updatedEntries = prev.entries.map(e => 
          e.id === id ? { 
            ...e, 
            competitionType: result.competitionType
          } : e
        );
        const mustacheCount = updatedEntries.filter(e => e.competitionType !== 'CreativeMustache' && e.competitionType !== 'CrazyHair').length;
        const creativeCount = updatedEntries.filter(e => e.competitionType === 'CreativeMustache' || e.competitionType === 'CrazyHair').length;
        return {
          ...prev,
          championshipCount: mustacheCount,
          mustacheEntriesCount: mustacheCount,
          creativeMustacheEntriesCount: creativeCount,
          entries: updatedEntries
        };
      });

      setActionMessage(result.competitionType === 'CreativeMustache' 
        ? 'Moved entry to Creative Mustache Challenge.' 
        : 'Moved entry to Mustache Challenge.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(`Track toggle error: ${err.message}`);
    }
  };

  // Re-analyse Selected Entries
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
            entries: nextEntries
          };
        });
      }

      setActionMessage(data.message || `Re-analysed ${data.reanalysedCount || 0} entries.`);
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      alert(`Re-analysis error: ${err.message}`);
    } finally {
      setIsReanalysing(false);
    }
  };

  // Re-analyse Single Entry
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
            entries: nextEntries
          };
        });
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

    if (!window.confirm(`Permanently delete ${count} selected submission${count > 1 ? 's' : ''}? Their images will also be removed from storage.`)) {
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
        mustacheEntriesCount: 0,
        creativeMustacheEntriesCount: 0,
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
    const isCreative = e.competitionType === 'CreativeMustache' || e.competitionType === 'CrazyHair';
    if (filterMode === 'mustache' && isCreative) return false;
    if ((filterMode === 'creative' || filterMode === 'crazyhair') && !isCreative) return false;
    if (filterMode === 'visible' && e.isHidden) return false;
    if (filterMode === 'hidden' && !e.isHidden) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (e.contestantName && e.contestantName.toLowerCase().includes(q)) ||
        (e.mustacheTitle && e.mustacheTitle.toLowerCase().includes(q)) ||
        (e.styleCategory && e.styleCategory.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter contestants for donation panel
  const filteredContestants = (contestantData?.contestants || []).filter(c => {
    if (c.role === 'Admin') return false;
    if (c.fullName && (c.fullName.toLowerCase().includes('movember admin') || c.fullName.toLowerCase().includes('alex movember'))) return false;
    if (c.email && (c.email.toLowerCase() === 'admin@dvt.co.za' || c.email.toLowerCase() === 'testparticipant@gmail.com')) return false;

    const isEligible = c.isEligibleToWin || c.leaderboardPaid || (c.amountPaid >= 100);
    const isContestantCreative = c.preferredCompetition === 'CreativeMustache' || c.preferredCompetition === 'CrazyHair';

    if (contestantFilter === 'eligible' && !isEligible) return false;
    if (contestantFilter === 'community' && isEligible) return false;
    if (contestantFilter === 'mustache' && isContestantCreative) return false;
    if ((contestantFilter === 'creative' || contestantFilter === 'crazyhair') && !isContestantCreative) return false;

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
          <div className="admin-lock-icon-wrap overflow-hidden p-1">
            <img src="/dvt-logo.png" alt="DVT" className="w-12 h-12 object-contain" />
          </div>
          <h2 className="admin-login-title">DVT Judicial Admin Portal</h2>
          <p className="admin-login-desc">
            Protected area. Supply the admin password to manage submissions, account moderation, and grand prize donation eligibility.
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
        <div className="flex items-center gap-4">
          <img src="/dvt-logo.png" alt="DVT" className="w-14 h-14 object-contain shrink-0 drop-shadow-[0_0_12px_rgba(0,180,216,0.5)]" />
          <div>
            <div className="admin-badge">
              <FaUnlock className="btn-icon" /> SECURE ADMINISTRATIVE SESSION
            </div>
            <h1 className="admin-title">DVT Movember Moderation Portal</h1>
            <p className="admin-subtitle">
              Manage contestants, mark R100+ donations for Grand Prize eligibility, permanently delete accounts, or re-analyse entries with Gemini AI.
            </p>
          </div>
        </div>

        <div className="admin-header-actions">
          <button className="kiosk-btn" onClick={() => { fetchAdminData(); fetchContestants(); }} disabled={loading}>
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
          className={`admin-tab-btn ${activeAdminTab === 'donations' ? 'active' : ''}`}
          onClick={() => {
            setActiveAdminTab('donations');
            fetchContestants();
          }}
        >
          <FaHandHoldingHeart className="btn-icon text-rose-400" />
          <span>Contestants, Donations & Prize Eligibility</span>
          {contestantData && (
            <span className="admin-tab-count-badge">
              {contestantData.prizeEligibleCount ?? contestantData.leaderboardPaidCount}/{contestantData.totalContestants}
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
      </div>

      {/* TAB 1: Contestants, Donations & Grand Prize Eligibility */}
      {activeAdminTab === 'donations' && (
        <div className="admin-payments-section fade-in">
          {/* Top Charity Overview Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-label">Total Registered Contestants</div>
              <div className="stat-val">{contestantData?.totalContestants || 0}</div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-label">
                <FaTrophy className="inline-icon text-gold" /> R1,000 Voucher Eligible (Donated)
              </div>
              <div className="stat-val text-gold">
                {contestantData?.prizeEligibleCount ?? contestantData?.leaderboardPaidCount ?? 0}
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-label">
                <GiMustache className="inline-icon text-cyan" /> Mustache Track Contestants
              </div>
              <div className="stat-val text-cyan">
                {contestantData?.mustacheContestantsCount || 0}
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-label">
                <HiSparkles className="inline-icon text-purple-400" /> Creative Mustache Contestants
              </div>
              <div className="stat-val text-purple-400">
                {contestantData?.creativeMustacheContestantsCount ?? contestantData?.crazyHairContestantsCount ?? 0}
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-label">
                <FaHandHoldingHeart className="inline-icon text-rose-400" /> Total Donated for Prostate Cancer
              </div>
              <div className="stat-val text-green">
                R {(contestantData?.totalFundsRaisedZar || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls for Donations */}
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
                className={`chip-btn ${contestantFilter === 'eligible' ? 'active' : ''}`}
                onClick={() => setContestantFilter('eligible')}
              >
                <FaTrophy className="inline-icon text-gold" /> Prize Eligible ({contestantData?.prizeEligibleCount ?? contestantData?.leaderboardPaidCount ?? 0})
              </button>
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'community' ? 'active' : ''}`}
                onClick={() => setContestantFilter('community')}
              >
                <FaClock className="inline-icon text-orange" /> Community / No Donation ({contestantData ? Math.max(0, contestantData.totalContestants - (contestantData.prizeEligibleCount ?? contestantData.leaderboardPaidCount ?? 0)) : 0})
              </button>
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'mustache' ? 'active' : ''}`}
                onClick={() => setContestantFilter('mustache')}
              >
                <GiMustache className="inline-icon text-cyan" /> Mustache Track ({contestantData?.mustacheContestantsCount || 0})
              </button>
              <button
                type="button"
                className={`chip-btn ${contestantFilter === 'creative' || contestantFilter === 'crazyhair' ? 'active' : ''}`}
                onClick={() => setContestantFilter('creative')}
              >
                <HiSparkles className="inline-icon text-purple-400" /> Creative Mustache ({contestantData?.creativeMustacheContestantsCount ?? contestantData?.crazyHairContestantsCount ?? 0})
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
                      <th>Track</th>
                      <th>Submissions & Top Score</th>
                      <th>Grand Prize Eligibility (R100+ Donated)</th>
                      <th>Registered</th>
                      <th style={{ textAlign: 'center' }}>Account Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContestants.map(c => {
                      const isEligible = c.isEligibleToWin || c.leaderboardPaid || (c.amountPaid >= 100);
                      const isCreative = c.preferredCompetition === 'CreativeMustache' || c.preferredCompetition === 'CrazyHair';
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="contestant-cell">
                              <div className={`contestant-avatar-fallback ${isCreative ? 'bg-purple-600' : 'bg-[#007FBA]'}`}>
                                {c.fullName ? c.fullName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="contestant-meta-info">
                                <span className="contestant-name-text">
                                  {c.fullName}
                                </span>
                                <span className="contestant-email-text">{c.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${
                              isCreative 
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
                                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            }`}>
                              {isCreative ? <HiSparkles /> : <GiMustache />}
                              {isCreative ? 'Creative Mustache' : 'Mustache'}
                            </span>
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
                              {isEligible ? (
                                <span className="payment-status-badge badge-paid">
                                  <FaCircleCheck className="badge-icon" /> R1,000 Eligible (Donated R{c.amountPaid || 100})
                                </span>
                              ) : (
                                <span className="payment-status-badge badge-pending">
                                  <FaClock className="badge-icon" /> Community (No Donation)
                                </span>
                              )}
                              <button
                                type="button"
                                className={`payment-toggle-btn ${isEligible ? 'btn-revoke' : 'btn-approve-100'}`}
                                onClick={() => handleSetDonation(c.id, !isEligible, 100)}
                                title={isEligible ? 'Mark as Community participant (Revoke eligibility)' : 'Mark as Eligible for R1,000 Grand Prize (R100 Donated)'}
                              >
                                {isEligible ? 'Revoke Eligibility' : 'Mark Donated R100 (Eligible)'}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className="joined-date-text">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="admin-btn-action btn-delete"
                              onClick={() => handleDeleteContestantAccount(c.id, c.fullName, c.email)}
                              title={`Permanently delete contestant account for ${c.fullName}`}
                              style={{ padding: '7px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <FaUserXmark className="btn-icon" /> Delete Account
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
                <div className="stat-label"><GiMustache className="inline-icon text-cyan" /> Mustache Challenge Entries</div>
                <div className="stat-val text-cyan">{overview.mustacheEntriesCount ?? overview.championshipCount ?? overview.entries.filter(e => e.competitionType !== 'CreativeMustache' && e.competitionType !== 'CrazyHair').length}</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-label"><HiSparkles className="inline-icon text-purple-400" /> Creative Mustache Entries</div>
                <div className="stat-val text-purple-400">{overview.creativeMustacheEntriesCount ?? overview.crazyHairEntriesCount ?? overview.entries.filter(e => e.competitionType === 'CreativeMustache' || e.competitionType === 'CrazyHair').length}</div>
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
                className={`chip-btn ${filterMode === 'mustache' ? 'active' : ''}`}
                onClick={() => setFilterMode('mustache')}
              >
                <GiMustache className="inline-icon text-cyan" /> Mustache Challenge
              </button>
              <button 
                type="button" 
                className={`chip-btn ${filterMode === 'creative' || filterMode === 'crazyhair' ? 'active' : ''}`}
                onClick={() => setFilterMode('creative')}
              >
                <HiSparkles className="inline-icon text-purple-400" /> Creative Mustache
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

          {/* Batch Action Bar */}
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
                  <button
                    type="button"
                    className="batch-btn batch-reanalyse-btn"
                    onClick={handleReanalyseSelected}
                    disabled={isReanalysing || isBatchDeleting}
                    title="Re-analyse selected submissions using Gemini AI"
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
                      <th>Challenge Track</th>
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
                      const isCreative = entry.competitionType === 'CreativeMustache' || entry.competitionType === 'CrazyHair';
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
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${
                              isCreative 
                                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
                                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            }`}>
                              {isCreative ? <HiSparkles /> : <GiMustache />}
                              {isCreative ? 'Creative Mustache' : 'Mustache'}
                            </span>
                          </td>
                          <td className="category-col">
                            <div>"{entry.mustacheTitle}"</div>
                            <span className="style-tag">{entry.styleCategory}</span>
                          </td>
                          <td className="overall-col">
                            <span className="score-badge score-standard">
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
                              <button
                                type="button"
                                className="admin-btn-action btn-reanalyse"
                                onClick={() => handleReanalyseSingle(entry.id, entry.contestantName)}
                                disabled={isRowReanalysing || isReanalysing}
                                title="Re-analyse this entry with Gemini AI"
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
                                className="admin-btn-action btn-make-genuine"
                                onClick={() => handleToggleTrack(entry.id)}
                                title="Switch entry between Real Mustache and Creative Mustache track"
                              >
                                {isCreative ? (
                                  <>
                                    <GiMustache className="btn-icon" /> To Stache
                                  </>
                                ) : (
                                  <>
                                    <HiSparkles className="btn-icon" /> To Creative
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
            )}
          </div>
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
