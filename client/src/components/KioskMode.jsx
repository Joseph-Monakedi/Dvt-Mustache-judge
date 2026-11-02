import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { GiMustache } from 'react-icons/gi';
import { FaExpand, FaCompress, FaXmark, FaScaleBalanced, FaMobileScreenButton, FaLocationDot } from 'react-icons/fa6';
import { HiSparkles } from 'react-icons/hi2';
import { apiUrl } from '../utils/api';
import { useIsMobile } from '../utils/useIsMobile';
import { useAuth } from '../context/AuthContext';

export default function KioskMode({ onExit }) {
  const isMobile = useIsMobile();
  const { logoSrc } = useAuth();
  const [entries, setEntries] = useState([]);
  const [divisionFilter, setDivisionFilter] = useState('all'); // 'all' | 'mustache' | 'creative'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Generate QR code for mobile URL
  useEffect(() => {
    const currentOrigin = window.location.origin;
    QRCode.toDataURL(currentOrigin, {
      width: 260,
      margin: 2,
      color: {
        dark: '#070c14',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.warn('QR code generation error:', err));
  }, []);

  // Fetch entries from both Mustache Challenge and Creative Mustache Challenge
  const fetchEntries = async () => {
    try {
      const [mustacheRes, creativeRes] = await Promise.all([
        fetch(apiUrl('/api/mustache/leaderboard?limit=30&division=mustache')),
        fetch(apiUrl('/api/mustache/leaderboard?limit=30&division=creative'))
      ]);

      const mustacheData = mustacheRes.ok ? await mustacheRes.json() : { entries: [] };
      const creativeData = creativeRes.ok ? await creativeRes.json() : { entries: [] };

      const mustacheList = (mustacheData.entries || []).map(e => ({
        ...e,
        isCreativeTrack: false,
        divisionTotal: (mustacheData.entries || []).length
      }));

      const creativeList = (creativeData.entries || []).map(e => ({
        ...e,
        isCreativeTrack: true,
        divisionTotal: (creativeData.entries || []).length
      }));

      // Interleave Mustache & Creative entries so both challenges get equal spotlight on the TV
      const combined = [];
      const maxLen = Math.max(mustacheList.length, creativeList.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < mustacheList.length) combined.push(mustacheList[i]);
        if (i < creativeList.length) combined.push(creativeList[i]);
      }

      setEntries(combined);
    } catch (err) {
      console.warn('Kiosk fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEntries();
      }
    }, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const displayedEntries = entries.filter(e => {
    if (divisionFilter === 'mustache') return !e.isCreativeTrack;
    if (divisionFilter === 'creative') return e.isCreativeTrack;
    return true;
  });

  // Auto-rotate submissions every 6 seconds
  useEffect(() => {
    if (displayedEntries.length <= 1) return;

    const rotateInterval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % displayedEntries.length);
    }, 6000);

    return () => clearInterval(rotateInterval);
  }, [displayedEntries.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [divisionFilter]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Exit fullscreen error:', err);
      });
      setIsFullscreen(false);
    }
  };

  const currentEntry = displayedEntries[currentIndex % Math.max(1, displayedEntries.length)] || null;
  const isCurrentCreative = Boolean(
    currentEntry?.isCreativeTrack ||
    (currentEntry?.competitionType && (
      currentEntry.competitionType.toLowerCase().includes('creative') ||
      currentEntry.competitionType.toLowerCase().includes('hair')
    ))
  );

  // If viewed on mobile, render mobile notice
  if (isMobile) {
    return (
      <div className="kiosk-mobile-disabled-screen">
        <div className="kiosk-mobile-disabled-card">
          <GiMustache className="kiosk-mobile-icon" />
          <h2>TV Kiosk Mode Disabled on Mobile</h2>
          <p>
            Kiosk TV Mode is designed specifically for large widescreen displays, office TVs, and projector setups.
          </p>
          <button type="button" className="action-btn" onClick={onExit}>
            Return to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-container">
      {/* Top Banner / Ticker */}
      <div className="kiosk-top-bar">
        <div className="kiosk-brand">
          <img src={logoSrc} alt="DVT" className="kiosk-brand-logo" />
          <div>
            <span className="kiosk-brand-dvt">DVT</span>
            <span className="kiosk-brand-title"> MOVEMBER MUSTACHE JUDGE</span>
          </div>
          <span className="kiosk-live-tag">LIVE OFFICE TV MODE</span>
        </div>

        <div className="kiosk-controls">
          <div className="flex items-center gap-1.5 mr-2 bg-slate-900/90 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setDivisionFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                divisionFilter === 'all'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Tracks ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setDivisionFilter('mustache')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                divisionFilter === 'mustache'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GiMustache className="text-cyan-400" /> Mustache ({entries.filter(e => !e.isCreativeTrack).length})
            </button>
            <button
              type="button"
              onClick={() => setDivisionFilter('creative')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                divisionFilter === 'creative'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HiSparkles className="text-purple-400" /> Creative ({entries.filter(e => e.isCreativeTrack).length})
            </button>
          </div>
          <button className="kiosk-btn" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <>
                <FaCompress className="btn-icon" /> Exit Fullscreen
              </>
            ) : (
              <>
                <FaExpand className="btn-icon" /> Fullscreen TV
              </>
            )}
          </button>
          <button className="kiosk-btn exit-btn" onClick={onExit}>
            <FaXmark className="btn-icon" /> Exit Kiosk
          </button>
        </div>
      </div>

      {/* Main Kiosk Layout */}
      <div className="kiosk-body">
        {/* Left: Featured Submission Carousel */}
        <div className="kiosk-featured-card">
          {currentEntry ? (
            <div className="featured-inner fade-in" key={currentEntry.id}>
              <div className="featured-badge-bar">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="featured-rank-chip">
                    Rank #{currentEntry.rank} of {currentEntry.divisionTotal || displayedEntries.length}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                      isCurrentCreative
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/50'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                    }`}
                  >
                    {isCurrentCreative ? (
                      <>
                        <HiSparkles className="text-purple-400" /> Creative Mustache Challenge
                      </>
                    ) : (
                      <>
                        <GiMustache className="text-cyan-400" /> Mustache Challenge
                      </>
                    )}
                  </span>
                </div>
                <span className="featured-badge-pill">
                  {currentEntry.verdictBadge || (isCurrentCreative ? 'Creative Legend' : 'Movember Legend')}
                </span>
              </div>

              <div className="featured-content-split">
                <div className="featured-photo-frame">
                  <img 
                    src={currentEntry.imageUrl || currentEntry.thumbnailUrl} 
                    alt={currentEntry.contestantName}
                    className="featured-photo"
                  />
                  <div className="featured-photo-tag">
                    {currentEntry.styleCategory}
                  </div>
                </div>

                <div className="featured-info-col">
                  <div className="featured-score-row">
                    <div className="featured-score-circle">
                      <span className="featured-score-number">{currentEntry.overallScore}</span>
                      <span className="featured-score-label">POINTS</span>
                    </div>

                    <div>
                      <h2 className="featured-contestant-name">{currentEntry.contestantName}</h2>
                      <div className="featured-office-tag">
                        {isCurrentCreative ? (
                          <>
                            <HiSparkles className="pin-icon text-purple-400" /> Creative Mustache Contestant
                          </>
                        ) : (
                          <>
                            <GiMustache className="pin-icon text-cyan-400" /> Movember Contestant
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="featured-stache-title">"{currentEntry.mustacheTitle}"</h3>

                  {/* Subscore bars */}
                  <div className="kiosk-subscores">
                    <div className="kiosk-subscore">
                      <span>{isCurrentCreative ? 'Craftsmanship' : 'Density'}</span>
                      <span className="kiosk-val">{currentEntry.densityScore}/10</span>
                      <div className="kiosk-bar-bg">
                        <div className="kiosk-bar-fill" style={{ width: `${currentEntry.densityScore * 10}%` }}></div>
                      </div>
                    </div>
                    <div className="kiosk-subscore">
                      <span>{isCurrentCreative ? 'Innovation' : 'Symmetry'}</span>
                      <span className="kiosk-val">{currentEntry.symmetryScore}/10</span>
                      <div className="kiosk-bar-bg">
                        <div className="kiosk-bar-fill" style={{ width: `${currentEntry.symmetryScore * 10}%` }}></div>
                      </div>
                    </div>
                    <div className="kiosk-subscore">
                      <span>{isCurrentCreative ? 'Audacity & Humor' : 'Swagger'}</span>
                      <span className="kiosk-val">{currentEntry.swaggerScore}/10</span>
                      <div className="kiosk-bar-bg">
                        <div className="kiosk-bar-fill" style={{ width: `${currentEntry.swaggerScore * 10}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="featured-roast-bubble">
                    <div className="roast-label">
                      <FaScaleBalanced /> SUPREME ROAST VERDICT
                    </div>
                    <p className="roast-text">"{currentEntry.roast}"</p>
                  </div>

                  <div className="featured-twin-row">
                    <HiSparkles className="twin-sparkle" />
                    <span><strong>Celebrity DNA:</strong> {currentEntry.celebrityTwin}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="kiosk-skeleton-inner fade-in">
              <div className="kiosk-skeleton-header">
                <div className="skeleton-shimmer" style={{ width: '130px', height: '26px', borderRadius: '20px' }}></div>
                <div className="skeleton-shimmer" style={{ width: '170px', height: '26px', borderRadius: '20px' }}></div>
              </div>
              <div className="kiosk-skeleton-split">
                <div className="skeleton-shimmer kiosk-skeleton-photo-frame"></div>
                <div className="kiosk-skeleton-info">
                  <div className="kiosk-skeleton-score-row">
                    <div className="skeleton-shimmer kiosk-skeleton-gauge"></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <div className="skeleton-shimmer" style={{ width: '70%', height: '32px', borderRadius: '6px' }}></div>
                      <div className="skeleton-shimmer" style={{ width: '40%', height: '18px', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                  <div className="skeleton-shimmer" style={{ width: '85%', height: '24px', borderRadius: '6px' }}></div>
                  <div className="kiosk-skeleton-bars">
                    <div className="skeleton-shimmer" style={{ width: '100%', height: '14px', borderRadius: '6px' }}></div>
                    <div className="skeleton-shimmer" style={{ width: '100%', height: '14px', borderRadius: '6px' }}></div>
                    <div className="skeleton-shimmer" style={{ width: '100%', height: '14px', borderRadius: '6px' }}></div>
                  </div>
                  <div className="skeleton-shimmer kiosk-skeleton-roast"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="kiosk-empty fade-in">
              <div className="kiosk-empty-badge">
                <GiMustache className="kiosk-empty-icon" />
              </div>
              <h3>Waiting for Contestants...</h3>
              <p>Open your phone camera, scan the QR code on the right, and submit your mustache for AI judging!</p>
              <div className="kiosk-live-beacon">
                <span className="beacon-pulse-dot"></span>
                <span>Live Optical Calipers Ready</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Join / Scan QR Code Sidecard */}
        <div className="kiosk-qr-sidebar">
          <div className="qr-card">
            <h3 className="qr-title">
              <FaMobileScreenButton className="qr-title-icon" /> SCAN TO BE JUDGED
            </h3>
            <p className="qr-desc">
              Open your phone camera to snap your mustache and get roasted by AI!
            </p>

            <div className="qr-image-wrapper">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Scan QR Code to Enter" className="qr-image" />
              ) : (
                <div className="skeleton-shimmer kiosk-qr-skeleton" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="spinner spinner-lg"></span>
                </div>
              )}
            </div>

            <div className="qr-instructions">
              <div className="step-item">
                <span className="step-num">1</span>
                <span>Scan code on phone</span>
              </div>
              <div className="step-item">
                <span className="step-num">2</span>
                <span>Snap photo in optical HUD</span>
              </div>
              <div className="step-item">
                <span className="step-num">3</span>
                <span>Appear live on office TV!</span>
              </div>
            </div>

            <div className="kiosk-live-ticker">
              <span className="ticker-dot"></span>
              <span>Next stache in 6s...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
