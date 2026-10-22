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
  FaCreditCard
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import { initiatePayFastCheckout } from '../utils/payfast';

export default function AuthModal({ isOpen, initialMode = 'login', onClose, onLoginSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Combo'); // 'Combo' | 'Leaderboard' | 'Quiz' | 'Free'

  const [loading, setLoading] = useState(false);
  const [isRedirectingPayFast, setIsRedirectingPayFast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage('');
    setIsRedirectingPayFast(false);
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

        const authData = await register({
          email: email.trim(),
          fullName: fullName.trim(),
          password
        });

        // If a paid tier is selected, seamlessly redirect to PayFast checkout
        if (selectedPlan !== 'Free' && authData?.token) {
          setIsRedirectingPayFast(true);
          await initiatePayFastCheckout({
            itemType: selectedPlan,
            token: authData.token,
            returnPath: '/dashboard?payment=success',
            cancelPath: '/dashboard?payment=cancelled'
          });
          return;
        }

        if (onLoginSuccess) {
          onLoginSuccess();
        }
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
      setIsRedirectingPayFast(false);
    } finally {
      if (!isRedirectingPayFast) {
        setLoading(false);
      }
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
            {mode === 'login' ? 'Contestant Sign In' : 'Join the Movember Challenge'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' 
              ? 'Access your Mustache Vault, view your verdicts, and enter the contest & quiz arena.'
              : 'Sign up to compete! Choose your charity entry pass for instant PayFast activation.'}
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

          {/* PayFast Tier Selection for Registration */}
          {mode === 'register' && (
            <div className="auth-payfast-plans-group">
              <div className="flex items-center justify-between">
                <label className="form-label">Choose Entry Pass</label>
                <span className="payfast-badge-mini">⚡ Instant PayFast</span>
              </div>

              <div className="payfast-plans-grid">
                {/* Combo */}
                <div 
                  className={`payfast-plan-card ${selectedPlan === 'Combo' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('Combo')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="plan-badge-rec">Best Value</div>
                  <div className="plan-top">
                    <span className="plan-title">Combo Pass</span>
                    <span className="plan-price">R150</span>
                  </div>
                  <p className="plan-desc">Contest Leaderboard + Live Quiz Arena pass</p>
                </div>

                {/* Leaderboard Only */}
                <div 
                  className={`payfast-plan-card ${selectedPlan === 'Leaderboard' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('Leaderboard')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="plan-top">
                    <span className="plan-title">Mustache Contest</span>
                    <span className="plan-price">R100</span>
                  </div>
                  <p className="plan-desc">Unlimited AI entries & live public leaderboard feature</p>
                </div>

                {/* Quiz Only */}
                <div 
                  className={`payfast-plan-card ${selectedPlan === 'Quiz' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('Quiz')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="plan-top">
                    <span className="plan-title">Quiz Arena Pass</span>
                    <span className="plan-price">R50</span>
                  </div>
                  <p className="plan-desc">Live multiplayer trivia arena & podium rewards</p>
                </div>

                {/* Free / Pay Later */}
                <div 
                  className={`payfast-plan-card ${selectedPlan === 'Free' ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan('Free')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="plan-top">
                    <span className="plan-title">Pay Later</span>
                    <span className="plan-price">R0</span>
                  </div>
                  <p className="plan-desc">Register now; you can pay anytime on your dashboard</p>
                </div>
              </div>

              <div className="payfast-guarantee-box">
                <div className="payfast-guarantee-header">
                  <FaShieldHalved className="text-cyan-400" />
                  <span>Secure PayFast Checkout</span>
                </div>
                <p className="payfast-guarantee-text">
                  Pay with Cards, Instant EFT, SnapScan, or Zapper. Your entry pass activates immediately upon payment.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-wrap">
                <span className="loading-spinner"></span> {isRedirectingPayFast ? 'Connecting to PayFast...' : 'Processing...'}
              </span>
            ) : mode === 'login' ? (
              <>
                <FaRightToBracket className="btn-icon" /> Sign In to Vault
              </>
            ) : selectedPlan === 'Free' ? (
              <>
                <FaUserPlus className="btn-icon" /> Register (Pay Later)
              </>
            ) : (
              <>
                <FaBolt className="btn-icon text-amber-300" /> Pay R{selectedPlan === 'Combo' ? '150' : selectedPlan === 'Quiz' ? '50' : '100'} via PayFast & Join
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
