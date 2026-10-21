import React, { useState, useEffect, useRef } from 'react';
import { 
  FaCamera, 
  FaTrophy, 
  FaAward, 
  FaRotate, 
  FaCircleCheck, 
  FaClock, 
  FaGamepad, 
  FaCircleInfo, 
  FaShareNodes, 
  FaEye, 
  FaLocationDot,
  FaCalendarDays,
  FaStar,
  FaHandHoldingDollar,
  FaXmark,
  FaUpload,
  FaArrowTrendUp
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

export default function UserDashboard({ onGoToBooth, onGoToLeaderboard, onGoToQuiz, onSelectEntry }) {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const cleanShaveInputRef = useRef(null);
  const [uploadingCleanShave, setUploadingCleanShave] = useState(false);
  const [cleanShaveMsg, setCleanShaveMsg] = useState('');
  const [cleanShaveError, setCleanShaveError] = useState('');

  const handleCleanShaveUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCleanShaveError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setCleanShaveError('File size exceeds the 8MB limit.');
      return;
    }

    setUploadingCleanShave(true);
    setCleanShaveError('');
    setCleanShaveMsg('');

    try {
      const formData = new FormData();
      formData.append('image', file, `cleanshave_${Date.now()}.jpg`);

      const res = await fetch(apiUrl('/api/mustache/clean-shave'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const result = await res.json();
      setCleanShaveMsg(result.message || 'Day 1 Clean Shave baseline registered successfully!');
      await refreshUser();
      await fetchDashboard();
      setTimeout(() => setCleanShaveMsg(''), 5000);
    } catch (err) {
      setCleanShaveError(err.message || 'Failed to upload clean shave baseline.');
    } finally {
      setUploadingCleanShave(false);
      if (cleanShaveInputRef.current) {
        cleanShaveInputRef.current.value = '';
      }
    }
  };

  const fetchDashboard = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('/api/mustache/my-entries'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          openAuthModal('login');
          return;
        }
        throw new Error(`Failed to load vault data (${res.status})`);
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Unable to load your mustache vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboard();
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (!user) {
    return (
      <div className="dashboard-login-gate fade-in">
        <div className="gate-card">
          <div className="gate-icon-wrap">
            <GiMustache className="gate-icon" />
          </div>
          <h2>Sign In to View Your Mustache Vault</h2>
          <p>
            Track your personal best score, review past AI judging roasts, manage your entry status, and resubmit new facial hair attempts at any time!
          </p>
          <div className="gate-actions">
            <button 
              type="button" 
              className="gate-btn primary-btn"
              onClick={() => openAuthModal('login')}
            >
              Sign In to Your Vault
            </button>
            <button 
              type="button" 
              className="gate-btn secondary-btn"
              onClick={() => openAuthModal('register')}
            >
              Create New Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-dashboard-container fade-in">
      {/* Dashboard Top Header Banner */}
      <div className="dashboard-profile-banner">
        <div className="profile-main-info">
          <div className="profile-avatar-wrap">
            <GiMustache className="profile-avatar-icon" />
          </div>
          <div className="profile-details">
            <div className="profile-badge-row">
              <span className="office-pill">
                <FaLocationDot className="pill-icon" /> {user.officeLocation || 'Johannesburg'}
              </span>
              <span className="date-pill">
                <FaCalendarDays className="pill-icon" /> Joined Movember 2026
              </span>
            </div>
            <h1 className="profile-name">{user.fullName}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        {/* Charity & Fee Status Badges */}
        <div className="payment-status-card">
          <div className="payment-header">
            <span className="payment-title">Movember Charity Approvals</span>
            <button 
              type="button" 
              className="payment-info-btn"
              onClick={() => setShowPaymentInfo(true)}
              title="View Payment Instructions"
            >
              <FaCircleInfo /> Payment Info
            </button>
          </div>

          <div className="status-pills-wrap">
            {/* Leaderboard R100 Status */}
            <div className={`status-pill ${user.leaderboardPaid ? 'status-paid' : 'status-pending'}`}>
              <div className="status-icon">
                {user.leaderboardPaid ? <FaCircleCheck /> : <FaClock />}
              </div>
              <div className="status-text">
                <span className="status-label">Leaderboard (R100)</span>
                <span className="status-value">
                  {user.leaderboardPaid ? 'Approved & Live' : 'Payment Pending'}
                </span>
              </div>
            </div>

            {/* Quiz R50 Status */}
            <div className={`status-pill ${user.quizPaid ? 'status-paid' : 'status-pending'}`}>
              <div className="status-icon">
                {user.quizPaid ? <FaCircleCheck /> : <FaClock />}
              </div>
              <div className="status-text">
                <span className="status-label">Mustache Quiz (R50)</span>
                <span className="status-value">
                  {user.quizPaid ? 'Pass Active' : 'Pass Pending'}
                </span>
              </div>
            </div>
          </div>

          {!user.leaderboardPaid && (
            <p className="status-helper-text">
              * Pay R100 to an admin so your single highest score is unlocked on the public office leaderboard!
            </p>
          )}
        </div>
      </div>

      {/* Day 1 Clean Shave Baseline Management Card */}
      <div className="dashboard-cleanshave-banner">
        <input 
          type="file" 
          ref={cleanShaveInputRef}
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          onChange={handleCleanShaveUpload}
          style={{ display: 'none' }}
        />

        <div className="cleanshave-banner-left">
          {(user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl) ? (
            <div className="cleanshave-photo-wrap">
              <img 
                src={user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl} 
                alt="Day 1 Clean Shave Baseline" 
                className="cleanshave-photo-thumb"
              />
              <span className="cleanshave-badge-pill">Day 1 Baseline</span>
            </div>
          ) : (
            <div className="cleanshave-icon-wrap alert-pulse">
              <FaCamera className="cleanshave-icon" />
            </div>
          )}

          <div className="cleanshave-banner-info">
            <div className="cleanshave-header-row">
              <h3 className="cleanshave-banner-title">
                {(user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl)
                  ? 'Day 1 Clean Shave Baseline (Active)' 
                  : 'Day 1 Clean Shave Baseline Required'}
              </h3>
              {(user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl) ? (
                <span className="cleanshave-status-active">
                  <FaCircleCheck /> Registered
                </span>
              ) : (
                <span className="cleanshave-status-missing">
                  <FaClock /> Needed for Growth Scoring
                </span>
              )}
            </div>

            <p className="cleanshave-banner-desc">
              {(user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl)
                ? 'Your baseline is locked in! All subsequent mustache entries are evaluated alongside this clean-shave photo to track follicle density evolution and calculate your Growth Score.'
                : 'Upload or snap your clean-shaven face from Day 1 of Movember. All future submissions will be judged alongside this picture to calculate your follicle growth transformation!'}
            </p>

            {(user.cleanShaveUploadedAt || dashboardData?.cleanShaveUploadedAt) && (
              <span className="cleanshave-uploaded-date">
                Baseline saved: {new Date(user.cleanShaveUploadedAt || dashboardData.cleanShaveUploadedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            )}

            {cleanShaveMsg && (
              <div className="cleanshave-success-alert fade-in">
                <FaCircleCheck /> {cleanShaveMsg}
              </div>
            )}
            {cleanShaveError && (
              <div className="cleanshave-error-alert fade-in">
                <FaXmark /> {cleanShaveError}
              </div>
            )}
          </div>
        </div>

        <div className="cleanshave-banner-right">
          <button 
            type="button" 
            className={`cleanshave-upload-btn ${(user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl) ? 'secondary' : 'primary pulse-button'}`}
            onClick={() => cleanShaveInputRef.current?.click()}
            disabled={uploadingCleanShave}
          >
            {uploadingCleanShave ? (
              <>
                <span className="btn-spinner-sm"></span>
                <span>Uploading Baseline...</span>
              </>
            ) : (user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl) ? (
              <>
                <FaUpload className="btn-icon" /> Replace Baseline Photo
              </>
            ) : (
              <>
                <FaCamera className="btn-icon" /> Upload Day 1 Clean Shave
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="dashboard-stats-grid">
        <div className="dash-stat-card">
          <div className="stat-card-icon stat-blue">
            <FaCamera />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-num">{dashboardData?.totalSubmissions ?? 0}</span>
            <span className="stat-card-title">Total Submissions</span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="stat-card-icon stat-gold">
            <FaStar />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-num">{dashboardData?.bestScore ?? 0}</span>
            <span className="stat-card-title">Personal Best Score</span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="stat-card-icon stat-purple">
            <FaTrophy />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-num">
              {dashboardData?.leaderboardRank ? `#${dashboardData.leaderboardRank}` : user.leaderboardPaid ? 'Unranked' : 'Pending R100'}
            </span>
            <span className="stat-card-title">Leaderboard Standing</span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="stat-card-icon stat-green">
            <FaGamepad />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-num">
              {user.quizPaid ? 'Ready' : 'Locked'}
            </span>
            <span className="stat-card-title">Quiz Arena Pass</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="dashboard-action-bar">
        <div className="action-bar-left">
          <h2>My Mustache Vault ({dashboardData?.entries?.length ?? 0} attempts)</h2>
          <p>
            Submit as many entries as you like. Only your highest-scoring mustache is submitted to the leaderboard!
          </p>
        </div>
        <div className="action-bar-buttons">
          <button 
            type="button" 
            className="dash-action-btn primary"
            onClick={onGoToBooth}
          >
            <FaCamera className="btn-icon" /> New Mustache Attempt
          </button>
          <button 
            type="button" 
            className="dash-action-btn secondary"
            onClick={onGoToQuiz}
          >
            <FaGamepad className="btn-icon" /> Mustache Quiz Arena
          </button>
          <button 
            type="button" 
            className="dash-action-btn tertiary"
            onClick={fetchDashboard}
            title="Refresh Vault"
          >
            <FaRotate className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Entries List / Grid */}
      {loading ? (
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your mustache portfolio...</p>
        </div>
      ) : error ? (
        <div className="dashboard-error">
          <p>{error}</p>
          <button type="button" onClick={fetchDashboard} className="retry-btn">
            Retry
          </button>
        </div>
      ) : !dashboardData?.entries || dashboardData.entries.length === 0 ? (
        <div className="dashboard-empty-vault">
          <div className="empty-icon-wrap">
            <GiMustache className="empty-icon" />
          </div>
          <h3>Your Vault is Empty</h3>
          <p>
            You haven't stepped before the AI facial hair judge yet! Take a photo with the webcam booth now to start building your record.
          </p>
          <button type="button" className="empty-cta-btn" onClick={onGoToBooth}>
            <FaCamera className="btn-icon" /> Step into the Booth
          </button>
        </div>
      ) : (
        <div className="vault-entries-grid">
          {dashboardData.entries.map((entry) => (
            <div 
              key={entry.id} 
              className={`vault-entry-card ${entry.isBestEntry ? 'best-entry-card' : ''}`}
            >
              {/* Best Entry Ribbon */}
              {entry.isBestEntry && (
                <div className="best-entry-ribbon">
                  <FaAward className="ribbon-icon" />
                  <span>Personal Best • On Leaderboard</span>
                </div>
              )}                {/* Photo & Category */}
              <div className="vault-entry-media">
                <img 
                  src={entry.thumbnailUrl || entry.imageUrl} 
                  alt={entry.mustacheTitle || entry.contestantName}
                  className="vault-entry-img"
                  loading="lazy"
                />
                <span className="vault-category-badge">
                  {entry.styleCategory}
                </span>
                {entry.growthScore > 0 && (
                  <span className="vault-growth-score-badge">
                    <FaArrowTrendUp className="badge-mini-icon" /> {entry.growthScore}% Growth
                  </span>
                )}
                <div className="vault-score-badge">
                  <span className="score-num">{entry.overallScore}</span>
                  <span className="score-max">/100</span>
                </div>
              </div>

              {/* Entry Body */}
              <div className="vault-entry-body">
                <h4 className="vault-entry-title">
                  {entry.mustacheTitle || 'The Bristle Submission'}
                </h4>
                <div className="vault-meta-row">
                  <span className="vault-date">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="vault-badge-pill">
                    {entry.verdictBadge}
                  </span>
                </div>

                {/* Subscores */}
                <div className="vault-subscores">
                  <div className="subscore-item">
                    <span className="subscore-label">Density</span>
                    <span className="subscore-val">{entry.densityScore}/10</span>
                  </div>
                  <div className="subscore-item">
                    <span className="subscore-label">Symmetry</span>
                    <span className="subscore-val">{entry.symmetryScore}/10</span>
                  </div>
                  <div className="subscore-item">
                    <span className="subscore-label">Swagger</span>
                    <span className="subscore-val">{entry.swaggerScore}/10</span>
                  </div>
                  {entry.growthScore > 0 && (
                    <div className="subscore-item highlight-growth">
                      <span className="subscore-label">Growth</span>
                      <span className="subscore-val text-cyan">{entry.growthScore}%</span>
                    </div>
                  )}
                </div>

                {/* Celebrity Twin */}
                {entry.celebrityTwin && (
                  <div className="vault-celebrity-row">
                    <span className="celebrity-label">Celebrity Twin:</span>{' '}
                    <span className="celebrity-name">{entry.celebrityTwin}</span>
                  </div>
                )}

                {/* Roast Preview */}
                {entry.roast && (
                  <div className="vault-roast-quote">
                    "{entry.roast}"
                  </div>
                )}

                {/* Entry Action Buttons */}
                <div className="vault-card-actions">
                  <button
                    type="button"
                    className="vault-btn inspect-btn"
                    onClick={() => onSelectEntry(entry)}
                  >
                    <FaEye className="btn-icon" /> {entry.cleanShaveImageUrl ? 'View Transformation & Verdict' : 'View Verdict'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Instructions Modal */}
      {showPaymentInfo && (
        <div className="modal-backdrop fade-in" onClick={() => setShowPaymentInfo(false)}>
          <div className="payment-modal-card scale-in" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={() => setShowPaymentInfo(false)}
            >
              <FaXmark />
            </button>

            <div className="payment-modal-header">
              <FaHandHoldingDollar className="modal-header-icon" />
              <h3>DVT Movember 2026 Charity Donations</h3>
              <p>Entry fees directly support Men's Health, Cancer Awareness, and Suicide Prevention.</p>
            </div>

            <div className="pricing-tier-row">
              <div className="pricing-box">
                <span className="pricing-title">Mustache Leaderboard</span>
                <span className="pricing-cost">R100</span>
                <span className="pricing-desc">Unlimited submissions. Single highest score features on the public DVT leaderboard.</span>
              </div>
              <div className="pricing-box highlight">
                <span className="pricing-title">Mustache Trivia Arena</span>
                <span className="pricing-cost">R50</span>
                <span className="pricing-desc">Entry pass to the live multiplayer mustache trivia arena with live podium rewards.</span>
              </div>
            </div>

            <div className="payment-steps">
              <h4>How to Get Approved:</h4>
              <ol>
                <li>Make payment of <strong>R100</strong> (Leaderboard) and/or <strong>R50</strong> (Quiz) to the office Movember coordinator.</li>
                <li>Use reference: <strong>MOVEM-{user.fullName.replace(/\s+/g, '').toUpperCase()}</strong></li>
                <li>Send your payment slip or SnapScan proof to your office Movember Admin or Slack <code>#movember-dvt</code>.</li>
                <li>An admin will toggle your pass active in the Admin Portal, and your top mustache will immediately go live on the public leaderboard!</li>
              </ol>
            </div>

            <button 
              type="button" 
              className="payment-modal-done-btn"
              onClick={() => setShowPaymentInfo(false)}
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
