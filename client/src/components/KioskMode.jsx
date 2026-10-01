import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { GiMustache } from 'react-icons/gi';
import { FaExpand, FaCompress, FaXmark, FaScaleBalanced, FaMobileScreenButton, FaLocationDot } from 'react-icons/fa6';
import { HiSparkles } from 'react-icons/hi2';

export default function KioskMode({ onExit }) {
  const [entries, setEntries] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Fetch entries
  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/mustache/leaderboard?limit=30');
      if (res.ok) {
        const data = await res.json();
        if (data.entries && data.entries.length > 0) {
          setEntries(data.entries);
        }
      }
    } catch (err) {
      console.warn('Kiosk fetch error:', err);
    }
  };

  useEffect(() => {
    fetchEntries();
    const pollInterval = setInterval(fetchEntries, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Auto-rotate submissions every 6 seconds
  useEffect(() => {
    if (entries.length <= 1) return;

    const rotateInterval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % entries.length);
    }, 6000);

    return () => clearInterval(rotateInterval);
  }, [entries.length]);

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

  const currentEntry = entries[currentIndex] || null;

  return (
    <div className="kiosk-container">
      {/* Top Banner / Ticker */}
      <div className="kiosk-top-bar">
        <div className="kiosk-brand">
          <GiMustache className="kiosk-emoji-icon" />
          <div>
            <span className="kiosk-brand-dvt">DVT</span>
            <span className="kiosk-brand-title"> MOVEMBER MUSTACHE JUDGE</span>
          </div>
          <span className="kiosk-live-tag">LIVE OFFICE TV MODE</span>
        </div>

        <div className="kiosk-controls">
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
                <span className="featured-rank-chip">
                  Rank #{currentEntry.rank} of {entries.length}
                </span>
                <span className="featured-badge-pill">
                  {currentEntry.verdictBadge || 'Movember Legend'}
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
                        <FaLocationDot className="pin-icon" /> {currentEntry.officeLocation || 'REMOTE'}
                      </div>
                    </div>
                  </div>

                  <h3 className="featured-stache-title">"{currentEntry.mustacheTitle}"</h3>

                  {/* Subscore bars */}
                  <div className="kiosk-subscores">
                    <div className="kiosk-subscore">
                      <span>Density</span>
                      <span className="kiosk-val">{currentEntry.densityScore}/10</span>
                      <div className="kiosk-bar-bg">
                        <div className="kiosk-bar-fill" style={{ width: `${currentEntry.densityScore * 10}%` }}></div>
                      </div>
                    </div>
                    <div className="kiosk-subscore">
                      <span>Symmetry</span>
                      <span className="kiosk-val">{currentEntry.symmetryScore}/10</span>
                      <div className="kiosk-bar-bg">
                        <div className="kiosk-bar-fill" style={{ width: `${currentEntry.symmetryScore * 10}%` }}></div>
                      </div>
                    </div>
                    <div className="kiosk-subscore">
                      <span>Swagger</span>
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
          ) : (
            <div className="kiosk-empty">
              <h3>Waiting for contestants...</h3>
              <p>Scan the QR code to submit your mustache!</p>
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
                <div className="qr-loading">Generating QR...</div>
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
