import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaCircleCheck, 
  FaCircleExclamation, 
  FaTriangleExclamation,
  FaShieldHalved,
  FaArrowRight,
  FaEnvelope
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { apiUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openAuthModal } = useAuth();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token || !email) {
      setErrorMessage('Missing reset token or email address. Please request a new link.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password. The link may have expired.');
      }

      setIsSuccess(true);
      try {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 } });
      } catch {}
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while resetting your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/leaderboard');
    setTimeout(() => {
      openAuthModal('login');
    }, 150);
  };

  // If token or email is missing in the URL
  if (!token || !email) {
    return (
      <div className="reset-pwd-wrapper fade-in">
        <div className="reset-pwd-card">
          <div className="reset-pwd-header">
            <div className="reset-logo-badge error-badge">
              <FaTriangleExclamation className="reset-icon text-amber-400" />
            </div>
            <h1 className="reset-title">Invalid Reset Link</h1>
            <p className="reset-subtitle">
              This password reset link is invalid or incomplete.
            </p>
          </div>

          <div className="reset-invalid-box">
            <p>
              Please return to the login screen and click <strong>&ldquo;Forgot password?&rdquo;</strong> to request a fresh reset link.
            </p>
            
            <div className="spam-warning-callout">
              <FaEnvelope className="callout-icon text-cyan-400" />
              <span>
                <strong>Note:</strong> Check your <strong>Spam / Junk folder</strong> if you requested an email and cannot find it in your main inbox.
              </span>
            </div>
          </div>

          <button 
            type="button" 
            className="auth-submit-btn" 
            onClick={handleGoToLogin}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Success view
  if (isSuccess) {
    return (
      <div className="reset-pwd-wrapper fade-in">
        <div className="reset-pwd-card">
          <div className="reset-pwd-header">
            <div className="reset-logo-badge success-badge">
              <FaCircleCheck className="reset-icon text-emerald-400" />
            </div>
            <h1 className="reset-title">Password Reset Complete!</h1>
            <p className="reset-subtitle">
              Your password has been successfully updated.
            </p>
          </div>

          <div className="reset-success-box">
            <p>
              You can now sign in using your email <strong>{email}</strong> and your new password.
            </p>

            <div className="spam-warning-callout">
              <FaTriangleExclamation className="callout-icon text-amber-400" />
              <span>
                <strong>Tip:</strong> If our emails ever land in your Spam or Junk folder, mark them as <strong>&ldquo;Not Spam&rdquo;</strong> to receive judging results, announcements, and quiz updates promptly!
              </span>
            </div>
          </div>

          <button 
            type="button" 
            className="auth-submit-btn" 
            onClick={handleGoToLogin}
          >
            Sign In with New Password <FaArrowRight className="btn-icon" />
          </button>
        </div>
      </div>
    );
  }

  // Active form view
  return (
    <div className="reset-pwd-wrapper fade-in">
      <div className="reset-pwd-card scale-in">
        <div className="reset-pwd-header">
          <div className="reset-logo-badge">
            <img src="/dvt-logo.png" alt="DVT" className="auth-logo-img" />
          </div>
          <h1 className="reset-title">Choose New Password</h1>
          <p className="reset-subtitle">
            Resetting password for <span className="text-cyan-300 font-semibold">{email}</span>
          </p>
        </div>

        {errorMessage && (
          <div className="auth-error-alert fade-in">
            <FaCircleExclamation className="alert-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="new-password" className="form-label">New Password</label>
            <div className="input-with-icon">
              <FaLock className="input-icon" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password" className="form-label">Confirm New Password</label>
            <div className="input-with-icon">
              <FaLock className="input-icon" />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Re-type your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* SPAM FOLDER CALLOUT BOX */}
          <div className="spam-warning-callout">
            <FaTriangleExclamation className="callout-icon text-amber-400" />
            <div className="callout-text">
              <strong>Check Your Spam / Junk Folder:</strong>
              <p>
                Be sure to check your Spam or Junk folder for our emails, and mark them as <strong>&ldquo;Report Not Spam&rdquo;</strong> to stay updated on competition verdicts and live quizzes.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-wrap">
                <span className="loading-spinner"></span> Updating Password...
              </span>
            ) : (
              <>
                <FaShieldHalved className="btn-icon" /> Reset & Save Password
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-note">
          <p>
            Remembered your old password?{' '}
            <button 
              type="button" 
              className="auth-link-btn" 
              onClick={handleGoToLogin}
            >
              Back to Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
