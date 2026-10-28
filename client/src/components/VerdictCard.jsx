import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { FaScaleBalanced, FaLocationDot, FaCamera, FaTrophy, FaRotate, FaArrowTrendUp } from 'react-icons/fa6';
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

  const isCreative = verdict.competitionType === 'CreativeMustache' || verdict.competitionType === 'CrazyHair' || verdict.isWoodenSpoon;

  return (
    <div className="verdict-container fade-in">
      <div className="verdict-card">
        {/* Header Banner */}
        <div className="verdict-card-header">
          <div className="judicial-seal">
            <FaScaleBalanced className="judicial-seal-icon" />
          </div>
          <div>
            <div className="verdict-tag">
              {isCreative 
                ? '🎨 Creative Mustache Verdict' 
                : '👨🏻 Official Mustache Judging Verdict'}
            </div>
            <h2 className="contestant-display-name">{verdict.contestantName}</h2>
            <div className="contestant-cohort-tag flex items-center gap-2">
              <span>{isCreative ? 'Creative Mustache Challenge' : 'Movember 2026 Contestant'}</span>
              {verdict.isPrizeEligible ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🏆 R1,000 Eligible
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10">
                  🎗️ Community Entry
                </span>
              )}
            </div>
          </div>
          <div className="archetype-badge">
            {verdict.verdictBadge || 'Certified Hero'}
          </div>
        </div>

        {/* Main Grid: Photo(s) + Gauge + Subscores */}
        <div className={`verdict-main-grid ${verdict.cleanShaveImageUrl ? 'has-comparison' : ''}`}>
          {/* Photos: Side-by-side Before & After comparison when clean shave exists */}
          {verdict.cleanShaveImageUrl ? (
            <div className="transformation-comparison-wrapper">
              {/* Before: Day 1 Clean Shave */}
              <div className="comparison-card before-card">
                <div className="comparison-badge before-badge">
                  <span className="comparison-dot"></span> BEFORE: CLEAN SHAVE
                </div>
                <div className="comparison-photo-frame">
                  <img 
                    src={verdict.cleanShaveImageUrl} 
                    alt="Day 1 Clean Shave Baseline" 
                    className="comparison-photo"
                  />
                  <div className="comparison-label-chip">
                    Day 1 Baseline
                  </div>
                </div>
              </div>

              {/* After: Current Movember Growth */}
              <div className="comparison-card after-card">
                <div className="comparison-badge after-badge">
                  <span className="comparison-dot cyan"></span> AFTER: MOVEMBER GROWTH
                </div>
                <div className="comparison-photo-frame">
                  <img 
                    src={verdict.imageUrl || verdict.thumbnailUrl} 
                    alt={verdict.contestantName} 
                    className="comparison-photo"
                  />
                  <div className="style-chip">
                    Style: {verdict.styleCategory}
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
          )}

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
              {isCreative ? (
                <>
                  <div className="subscore-item">
                    <div className="subscore-labels">
                      <span>Craftsmanship & Texture</span>
                      <span className="subscore-val text-purple-400">{verdict.densityScore || 0}/10</span>
                    </div>
                    <div className="subscore-bar">
                      <div 
                        className="subscore-fill" 
                        style={{ width: `${(verdict.densityScore || 0) * 10}%`, background: 'linear-gradient(90deg, #a855f7, #9333ea)' }}
                      />
                    </div>
                  </div>

                  <div className="subscore-item">
                    <div className="subscore-labels">
                      <span>Design & Innovation</span>
                      <span className="subscore-val text-purple-400">{verdict.symmetryScore || 0}/10</span>
                    </div>
                    <div className="subscore-bar">
                      <div 
                        className="subscore-fill" 
                        style={{ width: `${(verdict.symmetryScore || 0) * 10}%`, background: 'linear-gradient(90deg, #ec4899, #db2777)' }}
                      />
                    </div>
                  </div>

                  <div className="subscore-item">
                    <div className="subscore-labels">
                      <span>Audacity & Humor</span>
                      <span className="subscore-val text-purple-400">{verdict.swaggerScore || 0}/10</span>
                    </div>
                    <div className="subscore-bar">
                      <div 
                        className="subscore-fill" 
                        style={{ width: `${(verdict.swaggerScore || 0) * 10}%`, background: 'linear-gradient(90deg, #f43f5e, #e11d48)' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Follicle Growth & Transformation Analysis */}
        {(verdict.cleanShaveImageUrl || verdict.growthScore > 0 || verdict.growthAnalysis) && (
          <div className="follicle-growth-card">
            <div className="follicle-growth-header">
              <div className="growth-header-left">
                <FaArrowTrendUp className="growth-icon text-cyan" />
                <div>
                  <h4 className="growth-header-title">Follicle Transformation Analysis</h4>
                  <span className="growth-header-sub">
                    {verdict.cleanShaveImageUrl ? 'Evaluated against Day 1 Clean Shave Baseline' : 'Follicle Evolution Assessment'}
                  </span>
                </div>
              </div>
              <div className="growth-score-badge">
                <span className="growth-score-label">Growth Rating:</span>
                <span className="growth-score-val">{verdict.growthScore || Math.min(verdict.overallScore, 98)}%</span>
              </div>
            </div>

            <div className="growth-bar-track">
              <div 
                className="growth-bar-fill" 
                style={{ width: `${Math.max(12, Math.min(verdict.growthScore || verdict.overallScore, 100))}%` }}
              />
            </div>

            {verdict.growthAnalysis && (
              <p className="growth-analysis-quote">
                "{verdict.growthAnalysis}"
              </p>
            )}
          </div>
        )}

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
