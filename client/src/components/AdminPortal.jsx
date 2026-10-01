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
  FaScaleBalanced,
  FaRotate
} from 'react-icons/fa6';
import { MdOutlineWarningAmber } from 'react-icons/md';

export default function AdminPortal({ onBackToApp }) {
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('dvt_admin_token') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('dvt_admin_token')));
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'visible' | 'hidden'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Fetch admin entries
  const fetchAdminData = async (pwd = adminPassword) => {
    if (!pwd) return;
    setLoading(true);
    try {
      const res = await fetch('/api/mustache/admin/entries', {
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
      const res = await fetch('/api/mustache/admin/login', {
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
  };

  // Toggle Hide/Unhide
  const handleToggleHide = async (id) => {
    try {
      const res = await fetch(`/api/mustache/admin/entry/${id}/toggle-hide`, {
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

  // Delete Entry
  const handleDelete = async (id, contestantName) => {
    if (!window.confirm(`Permanently delete submission for "${contestantName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/mustache/admin/entry/${id}`, {
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

      setActionMessage(`Entry for ${contestantName} deleted permanently.`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Filter entries
  const filteredEntries = (overview?.entries || []).filter(e => {
    if (filterMode === 'visible' && e.isHidden) return false;
    if (filterMode === 'hidden' && !e.isHidden) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.contestantName.toLowerCase().includes(q) ||
        (e.officeLocation && e.officeLocation.toLowerCase().includes(q)) ||
        e.mustacheTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
            Protected area. Supply the admin password (configured in environment or app settings) to manage entries and moderate submissions.
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
            Hide offensive entries, delete rogue submissions, or monitor tournament statistics.
          </p>
        </div>

        <div className="admin-header-actions">
          <button className="kiosk-btn" onClick={() => fetchAdminData()}>
            <FaRotate className="btn-icon" /> Refresh
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
            <div className="stat-label">Public / Visible</div>
            <div className="stat-val text-green">{overview.visibleCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Hidden / Moderated</div>
            <div className="stat-val text-orange">{overview.hiddenCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Average Score</div>
            <div className="stat-val text-cyan">{overview.averageScore} / 100</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Top Score</div>
            <div className="stat-val text-gold">{overview.topScore} pts</div>
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
            All Submissions ({overview?.totalSubmissions || 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${filterMode === 'visible' ? 'active' : ''}`}
            onClick={() => setFilterMode('visible')}
          >
            Visible Only ({overview?.visibleCount || 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${filterMode === 'hidden' ? 'active' : ''}`}
            onClick={() => setFilterMode('hidden')}
          >
            Hidden Only ({overview?.hiddenCount || 0})
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
          <div className="standings-table-wrapper">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Contestant</th>
                  <th>Office Location</th>
                  <th>Title & Archetype</th>
                  <th>Score</th>
                  <th>Submitted</th>
                  <th>Visibility</th>
                  <th>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className={`standings-row ${entry.isHidden ? 'row-hidden' : ''}`}>
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
                    <td className="cohort-col">{entry.officeLocation || 'DVT'}</td>
                    <td className="category-col">
                      <div>"{entry.mustacheTitle}"</div>
                      <span className="style-tag">{entry.styleCategory}</span>
                    </td>
                    <td className="overall-col">
                      <span className="score-badge score-standard">{entry.overallScore}</span>
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
                          className="admin-btn-action btn-delete"
                          onClick={() => handleDelete(entry.id, entry.contestantName)}
                          title="Permanently Delete Entry"
                        >
                          <FaTrash className="btn-icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
