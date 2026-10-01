import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import WebcamBooth from './components/WebcamBooth';
import JudgingModal from './components/JudgingModal';
import VerdictCard from './components/VerdictCard';
import Leaderboard from './components/Leaderboard';
import KioskMode from './components/KioskMode';
import EntryDetailModal from './components/EntryDetailModal';
import AdminPortal from './components/AdminPortal';
import { FaTv, FaMobileScreen } from 'react-icons/fa6';
import { apiUrl } from './utils/api';
import { useIsMobile } from './utils/useIsMobile';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('booth'); // 'booth' | 'leaderboard' | 'kiosk' | 'admin'
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

  // Handle Judge Submission
  const handleJudgeSubmit = async ({ name, officeLocation, imageBlob }) => {
    setIsSubmitting(true);
    setJudgingModalOpen(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('officeLocation', officeLocation);
    formData.append('location', officeLocation);
    
    // Ensure filename and extension
    const fileName = `mustache_${Date.now()}.jpg`;
    formData.append('image', imageBlob, fileName);

    // Guaranteed minimum 2.5s suspense animation as specified in WP4
    const delayPromise = new Promise(resolve => setTimeout(resolve, 2600));

    try {
      const fetchPromise = fetch(apiUrl('/api/mustache/judge'), {
        method: 'POST',
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
    setActiveTab('booth');
  };

  const isMobile = useIsMobile();

  // If a mobile user enters kiosk tab, auto-redirect to leaderboard
  useEffect(() => {
    if (activeTab === 'kiosk' && isMobile) {
      setActiveTab('leaderboard');
      showToast('TV Kiosk mode is disabled on mobile devices (designed for widescreen TV displays).');
    }
  }, [activeTab, isMobile]);

  // If in TV Kiosk Mode (desktop/TV only), render standalone fullscreen layout
  if (activeTab === 'kiosk' && !isMobile) {
    return (
      <KioskMode 
        onExit={() => setActiveTab('leaderboard')} 
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
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        totalEntries={totalEntries} 
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'booth' && (
          activeVerdict ? (
            <VerdictCard
              verdict={activeVerdict}
              onReset={handleResetBooth}
              onViewLeaderboard={() => {
                setActiveVerdict(null);
                setActiveTab('leaderboard');
              }}
            />
          ) : (
            <WebcamBooth 
              onJudgeSubmit={handleJudgeSubmit}
              isSubmitting={isSubmitting}
            />
          )
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard 
            onSelectEntry={entry => setSelectedLeaderboardEntry(entry)}
            onGoToBooth={() => {
              setActiveVerdict(null);
              setActiveTab('booth');
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortal 
            onBackToApp={() => setActiveTab('leaderboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text">
            <span>DVT Movember 2026</span> • Zero Friction AI Facial Hair Court • Kindness Invariant Verified
          </div>
          <div className="footer-links">
            {!isMobile ? (
              <button className="footer-link footer-kiosk-btn" onClick={() => setActiveTab('kiosk')}>
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
    </div>
  );
}
