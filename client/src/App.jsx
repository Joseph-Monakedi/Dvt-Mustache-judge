import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import WebcamBooth from './components/WebcamBooth';
import JudgingModal from './components/JudgingModal';
import VerdictCard from './components/VerdictCard';
import Leaderboard from './components/Leaderboard';
import KioskMode from './components/KioskMode';
import EntryDetailModal from './components/EntryDetailModal';
import AdminPortal from './components/AdminPortal';
import UserDashboard from './components/UserDashboard';
import MustacheQuizArena from './components/MustacheQuizArena';
import QuizLiveLeaderboard from './components/quiz/QuizLiveLeaderboard';
import ResetPasswordPage from './components/ResetPasswordPage';
import AuthModal from './components/AuthModal';
import StyleGuide from './components/StyleGuide';
import { useAuth } from './context/AuthContext';
import { FaTv, FaMobileScreen } from 'react-icons/fa6';
import { apiUrl } from './utils/api';
import { useIsMobile } from './utils/useIsMobile';
import { confirmPayFastReturn } from './utils/payfast';
import confetti from 'canvas-confetti';
import './App.css';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, token, authModalOpen, authModalInitialMode, closeAuthModal, refreshUser } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [judgingModalOpen, setJudgingModalOpen] = useState(false);
  const [activeVerdict, setActiveVerdict] = useState(null);
  const [selectedLeaderboardEntry, setSelectedLeaderboardEntry] = useState(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch initial entry count
  useEffect(() => {
    fetch(apiUrl('/api/mustache/leaderboard?limit=1'))
      .then(res => res.json())
      .then(data => {
        if (data.totalEntries !== undefined) {
          setTotalEntries(data.totalEntries);
        }
      })
      .catch(err => console.warn('Count fetch error:', err));
  }, []);

  const showToast = msg => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Real-time payment approval notification listener
  useEffect(() => {
    const handlePaymentApproved = (e) => {
      if (e.detail?.message) {
        showToast(e.detail.message);
      }
    };
    window.addEventListener('dvt-payment-approved', handlePaymentApproved);
    return () => window.removeEventListener('dvt-payment-approved', handlePaymentApproved);
  }, []);

  // Global PayFast Return Handler: catches payment return on ANY page (booth, quiz, dashboard, leaderboard)
  useEffect(() => {
    if (!token) return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
      const ref = urlParams.get('ref') || localStorage.getItem('dvt_last_payfast_ref') || sessionStorage.getItem('dvt_last_payfast_ref');
      const item = urlParams.get('item') || localStorage.getItem('dvt_last_payfast_item') || sessionStorage.getItem('dvt_last_payfast_item') || 'Leaderboard';

      // Clean URL params to avoid re-triggering
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      localStorage.removeItem('dvt_last_payfast_ref');
      localStorage.removeItem('dvt_last_payfast_item');
      sessionStorage.removeItem('dvt_last_payfast_ref');
      sessionStorage.removeItem('dvt_last_payfast_item');

      confirmPayFastReturn({ reference: ref, itemType: item, token })
        .then(async () => {
          await refreshUser();
          showToast(`🎉 Payment Confirmed! Your ${item} Pass has been activated.`);
          try {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.3 } });
          } catch {}
        })
        .catch(async () => {
          await refreshUser();
        });
    } else if (paymentStatus === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('PayFast checkout was cancelled. You can retry at any time.');
    }
  }, [token, location.search]);

  // If a mobile user navigates to /kiosk, auto-redirect to /leaderboard
  useEffect(() => {
    if (location.pathname === '/kiosk' && isMobile) {
      navigate('/leaderboard', { replace: true });
      showToast('TV Kiosk mode is disabled on mobile devices (designed for widescreen TV displays).');
    }
  }, [location.pathname, isMobile, navigate]);

  // Handle Judge Submission
  const handleJudgeSubmit = async ({ name, imageBlob, cleanShaveBlob, competitionType = 'Mustache' }) => {
    setIsSubmitting(true);
    setJudgingModalOpen(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('competitionType', competitionType);
    
    // Ensure filename and extension
    const fileName = `${competitionType.toLowerCase()}_${Date.now()}.jpg`;
    formData.append('image', imageBlob, fileName);

    if (cleanShaveBlob) {
      const csName = `cleanshave_${Date.now()}.jpg`;
      formData.append('cleanShaveImage', cleanShaveBlob, csName);
    }

    // Guaranteed minimum 2.5s suspense animation as specified in WP4
    const delayPromise = new Promise(resolve => setTimeout(resolve, 2600));

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchPromise = fetch(apiUrl('/api/mustache/judge'), {
        method: 'POST',
        headers,
        body: formData
      });

      const [res] = await Promise.all([fetchPromise, delayPromise]);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const verdictData = await res.json();
      setActiveVerdict(verdictData);
      setTotalEntries(prev => prev + 1);
      if (token) {
        refreshUser();
      }
      showToast(`Verdict in for ${verdictData.contestantName}!`);
    } catch (err) {
      console.error('Submission failed:', err);
      const msg = err.message || 'An unexpected error occurred during judging.';
      showToast(msg.startsWith('Submission rejected') ? msg : `Judging error: ${msg}`);
    } finally {
      setIsSubmitting(false);
      setJudgingModalOpen(false);
    }
  };

  const handleResetBooth = () => {
    setActiveVerdict(null);
  };

  // If in TV Kiosk Mode (desktop/TV only), render standalone fullscreen layout
  if (location.pathname === '/kiosk' && !isMobile) {
    return (
      <KioskMode 
        onExit={() => navigate('/leaderboard')} 
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-banner fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navigation */}
      <Navbar totalEntries={totalEntries} />

      {/* Main Routed Content Area */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/leaderboard" replace />} />
          
          <Route 
            path="/leaderboard" 
            element={
              <Leaderboard 
                onSelectEntry={entry => setSelectedLeaderboardEntry(entry)}
                onGoToBooth={() => {
                  setActiveVerdict(null);
                  navigate('/booth');
                }}
              />
            } 
          />

          <Route 
            path="/booth" 
            element={
              activeVerdict ? (
                <VerdictCard
                  verdict={activeVerdict}
                  onReset={handleResetBooth}
                  onViewLeaderboard={() => {
                    setActiveVerdict(null);
                    navigate('/leaderboard');
                  }}
                />
              ) : (
                <WebcamBooth 
                  onJudgeSubmit={handleJudgeSubmit}
                  isSubmitting={isSubmitting}
                />
              )
            } 
          />

          <Route 
            path="/dashboard" 
            element={
              <UserDashboard
                onGoToBooth={() => {
                  setActiveVerdict(null);
                  navigate('/booth');
                }}
                onGoToLeaderboard={() => navigate('/leaderboard')}
                onGoToQuiz={() => navigate('/quiz')}
                onSelectEntry={entry => setSelectedLeaderboardEntry(entry)}
              />
            } 
          />

          <Route 
            path="/quiz" 
            element={
              <MustacheQuizArena
                onGoToDashboard={() => navigate('/dashboard')}
              />
            } 
          />

          <Route 
            path="/quiz-leaderboard" 
            element={
              <QuizLiveLeaderboard 
                onEnterArena={() => navigate('/quiz')}
              />
            } 
          />

          <Route 
            path="/quiz/leaderboard" 
            element={
              <QuizLiveLeaderboard 
                onEnterArena={() => navigate('/quiz')}
              />
            } 
          />

          <Route 
            path="/admin" 
            element={
              <AdminPortal 
                onBackToApp={() => navigate('/leaderboard')}
              />
            } 
          />

          <Route 
            path="/reset-password" 
            element={<ResetPasswordPage />} 
          />

          <Route 
            path="/style-guide" 
            element={<StyleGuide />} 
          />

          <Route path="*" element={<Navigate to="/leaderboard" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text flex items-center gap-2">
            <img src="/dvt-logo.png" alt="DVT" className="footer-dvt-logo" />
            <span>DVT Movember 2026</span> • Celebrating facial hair for a great cause
          </div>
          <div className="footer-links">
            {!isMobile ? (
              <button 
                type="button" 
                className="footer-link footer-kiosk-btn" 
                onClick={() => navigate('/kiosk')}
              >
                <FaTv className="btn-icon" /> Launch Kiosk TV Mode
              </button>
            ) : (
              <span className="footer-mobile-tag">
                <FaMobileScreen className="btn-icon" /> Mobile Active
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* Suspense Modal (WP4) */}
      <JudgingModal isOpen={judgingModalOpen} />

      {/* Entry Detail Modal (Leaderboard click) */}
      {selectedLeaderboardEntry && (
        <EntryDetailModal 
          entry={selectedLeaderboardEntry}
          onClose={() => setSelectedLeaderboardEntry(null)}
        />
      )}

      {/* Contestant Sign In / Register Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        initialMode={authModalInitialMode}
        onClose={closeAuthModal}
        onLoginSuccess={() => refreshUser()}
      />
    </div>
  );
}
