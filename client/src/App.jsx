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
import AuthModal from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import { FaTv, FaMobileScreen } from 'react-icons/fa6';
import { apiUrl } from './utils/api';
import { useIsMobile } from './utils/useIsMobile';
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
    setTimeout(() => setToastMessage(null), 4000);
  };

  // If a mobile user navigates to /kiosk, auto-redirect to /leaderboard
  useEffect(() => {
    if (location.pathname === '/kiosk' && isMobile) {
      navigate('/leaderboard', { replace: true });
      showToast('TV Kiosk mode is disabled on mobile devices (designed for widescreen TV displays).');
    }
  }, [location.pathname, isMobile, navigate]);

  // Handle Judge Submission
  const handleJudgeSubmit = async ({ name, imageBlob, cleanShaveBlob }) => {
    setIsSubmitting(true);
    setJudgingModalOpen(true);

    const formData = new FormData();
    formData.append('name', name);
    
    // Ensure filename and extension
    const fileName = `mustache_${Date.now()}.jpg`;
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
            path="/admin" 
            element={
              <AdminPortal 
                onBackToApp={() => navigate('/leaderboard')}
              />
            } 
          />

          <Route path="*" element={<Navigate to="/leaderboard" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text">
            <span>DVT Movember 2026</span> • Zero Friction AI Facial Hair Court • Kindness Invariant Verified
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
                <FaMobileScreen className="btn-icon" /> Mobile Court Active
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
