import React from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaCamera, FaTrophy, FaTv, FaLock } from 'react-icons/fa6';
import { useIsMobile } from '../utils/useIsMobile';

export default function Navbar({ activeTab, setActiveTab, totalEntries }) {
  const isMobile = useIsMobile();

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
              className={`nav-btn ${activeTab === 'booth' ? 'active' : ''}`}
              onClick={() => setActiveTab('booth')}
              aria-label="Judge Me"
            >
              <FaCamera className="nav-icon" />
              <span className="nav-label">Judge Me</span>
            </button>

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
          </nav>

          {/* Mobile Header Right Badge & Quick Action */}
          <div className="mobile-header-right mobile-only">
            <div className="mobile-header-pill">
              <span className="live-dot"></span>
              <span>{totalEntries} in court</span>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Mobile Bottom Floating Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'booth' ? 'active' : ''}`}
          onClick={() => setActiveTab('booth')}
          aria-label="Judge Me"
        >
          <div className="mobile-nav-icon-wrap">
            <FaCamera className="mobile-nav-icon" />
          </div>
          <span className="mobile-nav-text">Judge Me</span>
        </button>

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
      </nav>
    </>
  );
}
