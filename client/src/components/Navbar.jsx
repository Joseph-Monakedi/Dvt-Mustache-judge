import React from 'react';
import { GiMustache } from 'react-icons/gi';
import { 
  FaCamera, 
  FaTrophy, 
  FaTv, 
  FaLock, 
  FaGamepad, 
  FaAward, 
  FaUser, 
  FaRightToBracket, 
  FaRightFromBracket,
  FaCircleCheck,
  FaClock
} from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../utils/useIsMobile';

export default function Navbar({ activeTab, setActiveTab, totalEntries }) {
  const isMobile = useIsMobile();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand" onClick={() => setActiveTab('booth')}>
            <div className="brand-logo-icon-wrap">
              <GiMustache className="brand-logo-icon" />
            </div>
            <div className="brand-text">
              <div className="brand-title">
                <span className="brand-dvt">DVT</span> Mustache Judge
              </div>
              <div className="brand-tagline">Movember 2026 AI Facial Hair Court</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="navbar-nav desktop-nav">
            <button 
              type="button"
              className={`nav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
              aria-label="Leaderboard"
            >
              <FaTrophy className="nav-icon" />
              <span className="nav-label">Leaderboard</span>
              {totalEntries > 0 && (
                <span className="nav-badge">{totalEntries}</span>
              )}
            </button>

            {isAuthenticated && (
              <>
                <button 
                  type="button"
                  className={`nav-btn ${activeTab === 'booth' ? 'active' : ''}`}
                  onClick={() => setActiveTab('booth')}
                  aria-label="Enter Contest"
                >
                  <FaCamera className="nav-icon" />
                  <span className="nav-label">Enter Contest</span>
                </button>

                <button 
                  type="button"
                  className={`nav-btn ${activeTab === 'quiz' ? 'active' : ''}`}
                  onClick={() => setActiveTab('quiz')}
                  aria-label="Mustache Quiz Arena"
                >
                  <FaGamepad className="nav-icon text-cyan" />
                  <span className="nav-label">Quiz Arena</span>
                </button>

                <button 
                  type="button"
                  className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                  aria-label="My Mustache Vault"
                >
                  <FaAward className="nav-icon text-gold" />
                  <span className="nav-label">My Vault</span>
                </button>
              </>
            )}

            {/* Kiosk Mode is disabled/hidden on mobile devices */}
            {!isMobile && (
              <button 
                type="button"
                className={`nav-btn kiosk-nav-btn ${activeTab === 'kiosk' ? 'active' : ''}`}
                onClick={() => setActiveTab('kiosk')}
                aria-label="TV Kiosk"
              >
                <FaTv className="nav-icon" />
                <span className="nav-label">TV Kiosk</span>
              </button>
            )}

            {isAuthenticated && user?.role === 'Admin' && (
              <button 
                type="button"
                className={`nav-btn admin-nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
                title="Judicial Admin & Moderation Portal"
                aria-label="Admin Portal"
              >
                <FaLock className="nav-icon" />
                <span className="nav-label">Admin</span>
              </button>
            )}
          </nav>

          {/* Desktop Right User Profile / Sign In Pill */}
          <div className="navbar-auth-section desktop-only">
            {isAuthenticated ? (
              <div className="user-profile-nav-pill">
                <button 
                  type="button" 
                  className="user-profile-btn"
                  onClick={() => setActiveTab('dashboard')}
                  title="View your personal Mustache Vault"
                >
                  <div className="user-nav-avatar">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="user-nav-info">
                    <span className="user-nav-name">{user?.fullName || 'Contestant'}</span>
                    <span className="user-nav-badges">
                      <span className={`fee-pill-mini ${user?.leaderboardPaid ? 'paid' : 'pending'}`} title="R100 Contest Entry Status">
                        {user?.leaderboardPaid ? 'Contest ✓' : 'Contest ⏳'}
                      </span>
                      <span className={`fee-pill-mini ${user?.quizPaid ? 'paid' : 'pending'}`} title="R50 Quiz Arena Status">
                        {user?.quizPaid ? 'Quiz ✓' : 'Quiz ⏳'}
                      </span>
                    </span>
                  </div>
                </button>
                <button 
                  type="button" 
                  className="user-nav-logout-btn"
                  onClick={logout}
                  title="Sign Out"
                >
                  <FaRightFromBracket />
                </button>
              </div>
            ) : (
              <button 
                type="button"
                className="nav-signin-btn"
                onClick={() => openAuthModal('login')}
              >
                <FaRightToBracket className="btn-icon" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

          {/* Mobile Header Right Badge & Quick Action */}
          <div className="mobile-header-right mobile-only">
            {isAuthenticated ? (
              <button 
                type="button" 
                className="mobile-avatar-pill" 
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="mobile-avatar-circle">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </span>
                <span className="mobile-avatar-name">{user?.fullName?.split(' ')[0] || 'Me'}</span>
              </button>
            ) : (
              <button 
                type="button" 
                className="mobile-auth-btn"
                onClick={() => openAuthModal('login')}
              >
                <FaUser className="btn-icon" /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modern Mobile Bottom Floating Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
          aria-label="Leaderboard"
        >
          <div className="mobile-nav-icon-wrap">
            <FaTrophy className="mobile-nav-icon" />
            {totalEntries > 0 && (
              <span className="mobile-nav-badge">{totalEntries}</span>
            )}
          </div>
          <span className="mobile-nav-text">Leaderboard</span>
        </button>

        {isAuthenticated ? (
          <>
            <button
              type="button"
              className={`mobile-nav-item ${activeTab === 'booth' ? 'active' : ''}`}
              onClick={() => setActiveTab('booth')}
              aria-label="Enter Contest"
            >
              <div className="mobile-nav-icon-wrap">
                <FaCamera className="mobile-nav-icon" />
              </div>
              <span className="mobile-nav-text">Enter Contest</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
              aria-label="Quiz Arena"
            >
              <div className="mobile-nav-icon-wrap">
                <FaGamepad className="mobile-nav-icon text-cyan" />
              </div>
              <span className="mobile-nav-text">Quiz Arena</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              aria-label="My Vault"
            >
              <div className="mobile-nav-icon-wrap">
                <FaAward className="mobile-nav-icon text-gold" />
              </div>
              <span className="mobile-nav-text">My Vault</span>
            </button>

            {user?.role === 'Admin' && (
              <button
                type="button"
                className={`mobile-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
                aria-label="Admin Portal"
              >
                <div className="mobile-nav-icon-wrap">
                  <FaLock className="mobile-nav-icon" />
                </div>
                <span className="mobile-nav-text">Admin</span>
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="mobile-nav-item"
            onClick={() => openAuthModal('login')}
            aria-label="Sign In / Register"
          >
            <div className="mobile-nav-icon-wrap">
              <FaRightToBracket className="mobile-nav-icon text-cyan" />
            </div>
            <span className="mobile-nav-text">Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
}
