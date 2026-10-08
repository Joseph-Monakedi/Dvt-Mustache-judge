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
  FaBolt
} from 'react-icons/fa6';
import { MdOutlineWarningAmber } from 'react-icons/md';
import { apiUrl } from '../utils/api';

export default function AdminPortal({ onBackToApp }) {
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('dvt_admin_token') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('dvt_admin_token')));
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated && adminPassword) {
      fetchAdminData(adminPassword);
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
        (e.officeLocation && e.officeLocation.toLowerCase().includes(q)) ||
        e.mustacheTitle.toLowerCase().includes(q) ||
        (e.woodenSpoonReason && e.woodenSpoonReason.toLowerCase().includes(q))
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
              {loggingIn ? 'Authenticating...' : 'Unlock Admin Portal'}
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
          <button className="kiosk-btn" onClick={() => fetchAdminData()}>
            <FaRotate className="btn-icon" /> Refresh
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

      {/* Stats Cards Row */}
      {overview && (
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
      )}

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
            placeholder="Search contestant or office..."
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
          <div className="loading-state">
            <span className="spinner"></span> Loading administrative records...
          </div>
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
                    <th>Office Location</th>
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
                        <td className="cohort-col">{entry.officeLocation || 'DVT'}</td>
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
                        <div className="admin-mobile-loc">{entry.officeLocation || 'REMOTE'}</div>
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
