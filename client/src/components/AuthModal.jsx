import React, { useState, useEffect } from 'react';
import { 
  FaXmark, 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaLocationDot, 
  FaRightToBracket, 
  FaUserPlus, 
  FaCircleExclamation,
  FaHeart
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';

const DVT_OFFICES = [
  'Johannesburg',
  'Cape Town',
  'Durban',
  'Gqeberha',
  'London',
  'Waterford',
  'Amsterdam',
  'Baar',
  'Nairobi',
  'Dubai',
  'West Perth',
  'Remote'
];

export default function AuthModal({ isOpen, initialMode = 'login', onClose, onLoginSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [officeLocation, setOfficeLocation] = useState('Johannesburg');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage('');
  }, [initialMode, isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email.trim(), password);
      } else {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (!email.trim()) {
          throw new Error('Please enter your work or personal email address.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await register({
          email: email.trim(),
          fullName: fullName.trim(),
          password,
          officeLocation
        });
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button 
          type="button" 
          className="modal-close-btn" 
          onClick={onClose}
          aria-label="Close dialog"
        >
          <FaXmark />
        </button>

        {/* Modal Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <GiMustache className="auth-mustache-icon" />
          </div>
          <h2 className="auth-title">
            {mode === 'login' ? 'Contestant Sign In' : 'Join DVT Movember Court'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' 
              ? 'Access your Mustache Vault, view past verdicts, and track your leaderboard ranking.'
              : 'Create an account to submit unlimited facial hair verdicts and compete for charity!'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
          >
            <FaRightToBracket className="tab-icon" /> Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMessage('');
            }}
          >
            <FaUserPlus className="tab-icon" /> Register
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="auth-error-alert fade-in">
            <FaCircleExclamation className="alert-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="reg-name" className="form-label">Full Name</label>
                <div className="input-with-icon">
                  <FaUser className="input-icon" />
                  <input
                    id="reg-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Liam Oosthuizen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-office" className="form-label">DVT Office Location</label>
                <div className="input-with-icon">
                  <FaLocationDot className="input-icon" />
                  <select
                    id="reg-office"
                    className="auth-select"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    disabled={loading}
                  >
                    {DVT_OFFICES.map((office) => (
                      <option key={office} value={office}>
                        {office}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="auth-email" className="form-label">Email Address</label>
            <div className="input-with-icon">
              <FaEnvelope className="input-icon" />
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="you@dvt.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="auth-password" className="form-label">Password</label>
            <div className="input-with-icon">
              <FaLock className="input-icon" />
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder={mode === 'register' ? 'Min 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="auth-movember-notice">
              <FaHeart className="notice-heart" />
              <span>
                <strong>Charity Rules:</strong> You can resubmit as many mustache attempts as you want. All entries are archived in your private dashboard. Once your <strong>R100</strong> leaderboard fee is confirmed by admin, your single highest score is published on the live leaderboard!
              </span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-wrap">
                <span className="loading-spinner"></span> Authenticating...
              </span>
            ) : mode === 'login' ? (
              <>
                <FaRightToBracket className="btn-icon" /> Sign In to Vault
              </>
            ) : (
              <>
                <FaUserPlus className="btn-icon" /> Create Movember Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-note">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
              >
                Sign up here
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
