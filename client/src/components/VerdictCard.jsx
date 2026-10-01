import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { FaScaleBalanced, FaLocationDot, FaCamera, FaTrophy, FaRotate } from 'react-icons/fa6';
import { HiSparkles, HiOutlineDocumentText } from 'react-icons/hi2';
import ShareableCanvasCard from './ShareableCanvasCard';

export default function VerdictCard({ verdict, onReset, onViewLeaderboard }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!verdict) return;

    if (verdict.overallScore >= 75) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Fallback gracefully
      }
    }

    let start = 0;
    const end = verdict.overallScore;
    const duration = 1200;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = end / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [verdict]);

  if (!verdict) return null;

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  const getScoreColor = score => {
    if (score === 0) return '#EF4444';
    if (score >= 90) return '#F59E0B';
    if (score >= 80) return '#00b4d8';
    if (score >= 70) return '#007FBA';
    return '#94A3B8';
  };

  return (
    <div className="verdict-container fade-in">
      <div className="verdict-card">
        {/* Header Banner */}
        <div className="verdict-card-header">
          <div className="judicial-seal">
            <FaScaleBalanced className="judicial-seal-icon" />
          </div>
          <div>
            <div className="verdict-tag">Supreme Movember Court Verdict</div>
            <h2 className="contestant-display-name">{verdict.contestantName}</h2>
            <div className="contestant-cohort-tag">
              <FaLocationDot className="pin-icon" /> {verdict.officeLocation || 'REMOTE'}
            </div>
          </div>
          <div className="archetype-badge">
            {verdict.verdictBadge || 'Certified Hero'}
          </div>
        </div>

        {/* Main Grid: Photo + Gauge + Subscores */}
        <div className="verdict-main-grid">
          {/* Photo Frame */}
          <div className="verdict-photo-col">
            <div className="verdict-photo-frame">
              <img 
                src={verdict.imageUrl || verdict.thumbnailUrl} 
                alt={verdict.contestantName}
                className="verdict-photo"
              />
              <div className="style-chip">
                Style: {verdict.styleCategory}
              </div>
            </div>
          </div>

          {/* Score & Gauge Column */}
          <div className="verdict-scores-col">
            <div className="score-gauge-wrapper">
              <svg className="gauge-svg" width="160" height="160" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={getScoreColor(verdict.overallScore)}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="gauge-score-content">
                <span className="gauge-num" style={{ color: getScoreColor(verdict.overallScore) }}>
                  {animatedScore}
                </span>
                <span className="gauge-label">OUT OF 100</span>
              </div>
            </div>

            <h3 className="mustache-title-hero">
              "{verdict.mustacheTitle}"
            </h3>

            {/* Sub-Score Bars */}
            <div className="subscores-list">
              <div className="subscore-item">
                <div className="subscore-labels">
                  <span>Bristle Density</span>
                  <span className="subscore-val">{verdict.densityScore}/10</span>
                </div>
                <div className="subscore-bar">
                  <div 
                    className="subscore-fill density" 
                    style={{ width: `${verdict.densityScore * 10}%` }}
                  />
                </div>
              </div>

              <div className="subscore-item">
                <div className="subscore-labels">
                  <span>Facial Symmetry</span>
                  <span className="subscore-val">{verdict.symmetryScore}/10</span>
                </div>
                <div className="subscore-bar">
                  <div 
                    className="subscore-fill symmetry" 
                    style={{ width: `${verdict.symmetryScore * 10}%` }}
                  />
                </div>
              </div>

              <div className="subscore-item">
                <div className="subscore-labels">
                  <span>Bristle Swagger</span>
                  <span className="subscore-val">{verdict.swaggerScore}/10</span>
                </div>
                <div className="subscore-bar">
                  <div 
                    className="subscore-fill swagger" 
                    style={{ width: `${verdict.swaggerScore * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Celebrity Twin Match */}
        <div className="celebrity-twin-box">
          <HiSparkles className="twin-icon" />
          <div className="twin-text">
            <span className="twin-heading">Celebrity Follicle DNA:</span> {verdict.celebrityTwin}
          </div>
        </div>

        {/* Judicial Roast Speech Bubble */}
        <div className="roast-declaration-box">
          <div className="declaration-header">
            <span className="declaration-seal-badge">
              <HiOutlineDocumentText className="doc-icon" /> OFFICIAL JUDICIAL DECLARATION
            </span>
          </div>
          <blockquote className="roast-quote">
            "{verdict.roast}"
          </blockquote>
        </div>

        {/* Action Buttons */}
        <div className="verdict-actions-bar">
          <button 
            type="button" 
            className="action-btn share-btn"
            onClick={() => setShowShareModal(true)}
          >
            <FaCamera className="btn-icon" /> Share Scorecard
          </button>

          <button 
            type="button" 
            className="action-btn leaderboard-nav-btn"
            onClick={onViewLeaderboard}
          >
            <FaTrophy className="btn-icon" /> View Leaderboard
          </button>

          <button 
            type="button" 
            className="action-btn reset-btn"
            onClick={onReset}
          >
            <FaRotate className="btn-icon" /> Judge Another
          </button>
        </div>
      </div>

      {showShareModal && (
        <ShareableCanvasCard 
          verdict={verdict} 
          onClose={() => setShowShareModal(false)} 
        />
      )}
    </div>
  );
}
