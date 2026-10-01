import React from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaCamera, FaTrophy, FaTv, FaLock } from 'react-icons/fa6';

export default function Navbar({ activeTab, setActiveTab, totalEntries }) {
  return (
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

        <nav className="navbar-nav">
          <button 
            className={`nav-btn ${activeTab === 'booth' ? 'active' : ''}`}
            onClick={() => setActiveTab('booth')}
          >
            <FaCamera className="nav-icon" />
            <span className="nav-label">Judge Me</span>
          </button>

          <button 
            className={`nav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <FaTrophy className="nav-icon" />
            <span className="nav-label">Leaderboard</span>
            {totalEntries > 0 && (
              <span className="nav-badge">{totalEntries}</span>
            )}
          </button>

          <button 
            className={`nav-btn ${activeTab === 'kiosk' ? 'active' : ''}`}
            onClick={() => setActiveTab('kiosk')}
          >
            <FaTv className="nav-icon" />
            <span className="nav-label">TV Kiosk</span>
          </button>

          <button 
            className={`nav-btn admin-nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            title="Judicial Admin & Moderation Portal"
          >
            <FaLock className="nav-icon" />
            <span className="nav-label">Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
