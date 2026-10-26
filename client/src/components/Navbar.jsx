import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
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
  FaRightFromBracket
} from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../utils/useIsMobile';

export default function Navbar({ totalEntries = 0 }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/leaderboard');
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <Link to="/leaderboard" className="navbar-brand">
            <div className="brand-logo-icon-wrap">
              <GiMustache className="brand-logo-icon" />
            </div>
            <div className="brand-text">
              <div className="brand-title">
                <span className="brand-dvt">DVT</span> Mustache Judge
              </div>
              <div className="brand-tagline">Movember 2026 Mustache Contest</div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="navbar-nav desktop-nav">
            <NavLink 
              to="/leaderboard"
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
              aria-label="Leaderboard"
            >
              <FaTrophy className="nav-icon" />
              <span className="nav-label">Leaderboard</span>
              {totalEntries > 0 && (
                <span className="nav-badge">{totalEntries}</span>
              )}
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink 
                  to="/booth"
                  className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                  aria-label="Enter Contest"
                >
                  <FaCamera className="nav-icon" />
                  <span className="nav-label">Enter Contest</span>
                </NavLink>

                <NavLink 
                  to="/quiz"
                  className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                  aria-label="Mustache Quiz Arena"
                >
                  <FaGamepad className="nav-icon text-cyan" />
                  <span className="nav-label">Quiz Arena</span>
                </NavLink>

                <NavLink 
                  to="/dashboard"
                  className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                  aria-label="Dashboard"
                >
                  <FaAward className="nav-icon text-gold" />
                  <span className="nav-label">Dashboard</span>
                </NavLink>
              </>
            )}

            {/* Kiosk Mode is disabled/hidden on mobile devices */}
            {!isMobile && (
              <NavLink 
                to="/kiosk"
                className={({ isActive }) => `nav-btn kiosk-nav-btn ${isActive ? 'active' : ''}`}
                aria-label="TV Kiosk"
              >
                <FaTv className="nav-icon" />
                <span className="nav-label">TV Kiosk</span>
              </NavLink>
            )}

            {isAuthenticated && user?.role === 'Admin' && (
              <NavLink 
                to="/admin"
                className={({ isActive }) => `nav-btn admin-nav-btn ${isActive ? 'active' : ''}`}
                title="Admin Portal"
                aria-label="Admin Portal"
              >
                <FaLock className="nav-icon" />
                <span className="nav-label">Admin</span>
              </NavLink>
            )}
          </nav>

          {/* Desktop Right User Profile / Sign In Pill */}
          <div className="navbar-auth-section desktop-only">
            {isAuthenticated ? (
              <div className="user-profile-nav-pill">
                <button 
                  type="button" 
                  className="user-profile-btn"
                  onClick={() => navigate('/dashboard')}
                  title="View your Dashboard"
                >
                  <div className="user-nav-avatar">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="user-nav-info">
                    <span className="user-nav-name">{user?.fullName || 'Contestant'}</span>
                  </div>
                </button>
                <button 
                  type="button" 
                  className="user-nav-logout-btn"
                  onClick={handleLogout}
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
                onClick={() => navigate('/dashboard')}
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
        <NavLink
          to="/leaderboard"
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          aria-label="Leaderboard"
        >
          <div className="mobile-nav-icon-wrap">
            <FaTrophy className="mobile-nav-icon" />
            {totalEntries > 0 && (
              <span className="mobile-nav-badge">{totalEntries}</span>
            )}
          </div>
          <span className="mobile-nav-text">Leaderboard</span>
        </NavLink>

        {isAuthenticated ? (
          <>
            <NavLink
              to="/booth"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              aria-label="Enter Contest"
            >
              <div className="mobile-nav-icon-wrap">
                <FaCamera className="mobile-nav-icon" />
              </div>
              <span className="mobile-nav-text">Enter Contest</span>
            </NavLink>

            <NavLink
              to="/quiz"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              aria-label="Quiz Arena"
            >
              <div className="mobile-nav-icon-wrap">
                <FaGamepad className="mobile-nav-icon text-cyan" />
              </div>
              <span className="mobile-nav-text">Quiz Arena</span>
            </NavLink>

            <NavLink
              to="/dashboard"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              aria-label="Dashboard"
            >
              <div className="mobile-nav-icon-wrap">
                <FaAward className="mobile-nav-icon text-gold" />
              </div>
              <span className="mobile-nav-text">Dashboard</span>
            </NavLink>

            {user?.role === 'Admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                aria-label="Admin Portal"
              >
                <div className="mobile-nav-icon-wrap">
                  <FaLock className="mobile-nav-icon" />
                </div>
                <span className="mobile-nav-text">Admin</span>
              </NavLink>
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
