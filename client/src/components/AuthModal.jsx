import React, { useState, useEffect } from 'react';
import { 
  FaXmark, 
  FaUser, 
  FaEnvelope, 
  FaLock, 
  FaRightToBracket, 
  FaUserPlus, 
  FaCircleExclamation,
  FaHeart,
  FaBolt,
  FaShieldHalved,
  FaCreditCard,
  FaTriangleExclamation,
  FaPaperPlane,
  FaCircleCheck,
  FaArrowLeft
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import { initiatePayFastCheckout } from '../utils/payfast';
import { apiUrl } from '../utils/api';

export default function AuthModal({ isOpen, initialMode = 'login', onClose, onLoginSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredCompetition, setPreferredCompetition] = useState('Mustache'); // 'Mustache' | 'CreativeMustache'

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage('');
    setSuccessMessage('');
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
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }

        const res = await fetch(apiUrl('/api/auth/forgot-password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send password reset email.');
        }

        setSuccessMessage(data.message || 'If an account exists with this email address, a password reset link has been sent. Please make sure to check your spam or junk folder.');
      } else if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email.trim(), password);
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        onClose();
      } else {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        await register({
          email: email.trim(),
          fullName: fullName.trim(),
          password,
          preferredCompetition
        });

        if (onLoginSuccess) {
          onLoginSuccess();
        }
        onClose();
      }
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
            <img src="/dvt-logo.png" alt="DVT" className="auth-logo-img" />
          </div>
          <h2 className="auth-title">
            {mode === 'forgot'
              ? 'Reset Password'
              : mode === 'login' 
                ? 'Sign In' 
                : 'Join the Competition'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'forgot'
              ? 'Enter your account email to receive a password reset link.'
              : mode === 'login' 
                ? 'Sign in to access your dashboard and participate.'
                : 'Create your contestant account to get started.'}
          </p>
        </div>

        {/* Tab Switcher / Back Navigation */}
        {mode === 'forgot' ? (
          <div className="auth-forgot-nav">
            <button
              type="button"
              className="auth-back-btn"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              <FaArrowLeft className="btn-icon" /> Back to Sign In
            </button>
          </div>
        ) : (
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
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
                setSuccessMessage('');
              }}
            >
              <FaUserPlus className="tab-icon" /> Register
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="auth-error-alert fade-in">
            <FaCircleExclamation className="alert-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="auth-success-alert fade-in">
            <div className="success-alert-header">
              <FaCircleCheck className="alert-icon text-emerald-400" />
              <strong>Reset Link Dispatched</strong>
            </div>
            <p className="success-alert-text">{successMessage}</p>
            
            {/* SPAM REMINDER */}
            <div className="spam-folder-reminder">
              <FaTriangleExclamation className="reminder-icon text-amber-400" />
              <span>
                <strong>Important:</strong> Automated emails may land in your <strong>Spam / Junk</strong> folder. 
                Please check there and mark as &ldquo;Not Spam&rdquo;!
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">Full Name</label>
              <div className="input-with-icon">
                <FaUser className="input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Alex Morgan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email" className="form-label">Email Address</label>
            <div className="input-with-icon">
              <FaEnvelope className="input-icon" />
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="auth-password" className="form-label">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
          )}

          {/* Explicit Spam Warning Notice in Forgot Password View before submitting */}
          {mode === 'forgot' && !successMessage && (
            <div className="auth-spam-notice-box fade-in">
              <FaTriangleExclamation className="spam-notice-icon" />
              <div className="spam-notice-text">
                <strong>Check Your Spam / Junk Folder:</strong>
                <p>
                  Security links are often filtered by mail servers. If the email doesn't appear in your inbox within a few minutes, please check your spam or junk folder.
                </p>
              </div>
            </div>
          )}

          {/* Competition Track Selection for Registration */}
          {mode === 'register' && (
            <div className="auth-compact-plans-group">
              <label className="form-label">Choose Your Competition</label>
              <div className="compact-plans-list">
                {/* Mustache Challenge */}
                <label 
                  className={`compact-plan-item ${preferredCompetition === 'Mustache' ? 'selected' : ''}`}
                  onClick={() => setPreferredCompetition('Mustache')}
                >
                  <input 
                    type="radio" 
                    name="competitionTrack" 
                    checked={preferredCompetition === 'Mustache'} 
                    onChange={() => setPreferredCompetition('Mustache')} 
                  />
                  <div className="compact-plan-info">
                    <span className="compact-plan-title">👨 Movember Mustache Challenge</span>
                    <span className="compact-plan-desc text-xs text-slate-400">For men who can grow facial hair & mustaches</span>
                  </div>
                  <span className="compact-plan-price text-emerald-400 text-xs font-semibold">Free Entry</span>
                </label>

                {/* Creative Mustache Challenge */}
                <label 
                  className={`compact-plan-item ${preferredCompetition === 'CreativeMustache' ? 'selected' : ''}`}
                  onClick={() => setPreferredCompetition('CreativeMustache')}
                >
                  <input 
                    type="radio" 
                    name="competitionTrack" 
                    checked={preferredCompetition === 'CreativeMustache'} 
                    onChange={() => setPreferredCompetition('CreativeMustache')} 
                  />
                  <div className="compact-plan-info">
                    <span className="compact-plan-title">🎨 Creative Mustache Challenge</span>
                    <span className="compact-plan-desc text-xs text-slate-400">For women & creative non-growers (craft staches from wigs, paper, cotton, props — surprise us!)</span>
                  </div>
                  <span className="compact-plan-price text-purple-400 text-xs font-semibold">Free Entry</span>
                </label>
              </div>

              {/* Charitable Cause & Prize Eligibility Info Box */}
              <div className="auth-donation-info-card mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                  <FaHeart className="text-rose-400" />
                  <span>Grand Prize & Donation Details</span>
                </div>
                <p className="mb-1.5 leading-relaxed">
                  Anyone can enter and appear on the live leaderboards for free! Both tracks feature a <strong>R1,000 Takealot Voucher</strong> grand prize.
                </p>
                <p className="mb-1.5 leading-relaxed">
                  Only participants who <strong>donate a minimum of R100</strong> are eligible for the voucher. All proceeds go toward raising awareness for <strong>prostate cancer and men's health research</strong>.
                </p>
                <div className="p-2 rounded bg-black/40 border border-slate-700/60 text-slate-300">
                  <span className="font-semibold text-white">To donate:</span> Email{' '}
                  <a href="mailto:marketing@dvtsoftware.com" className="text-cyan-400 underline hover:text-cyan-300">
                    marketing@dvtsoftware.com
                  </a>.
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {mode === 'forgot' ? (
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-wrap">
                  <span className="loading-spinner"></span> Sending Reset Link...
                </span>
              ) : (
                <>
                  <FaPaperPlane className="btn-icon" /> Send Reset Link
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-wrap">
                  <span className="loading-spinner"></span> Processing...
                </span>
              ) : mode === 'login' ? (
                <>
                  <FaRightToBracket className="btn-icon" /> Sign In
                </>
              ) : (
                <>
                  <FaUserPlus className="btn-icon" /> Join Competition for Free
                </>
              )}
            </button>
          )}
        </form>

        <div className="auth-footer-note">
          {mode === 'forgot' ? (
            <p>
              Remember your password?{' '}
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                Sign in here
              </button>
            </p>
          ) : mode === 'login' ? (
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
