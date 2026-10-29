import React, { useState, useEffect } from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaScaleBalanced, FaCheck, FaHourglassHalf, FaBolt } from 'react-icons/fa6';

const STAGES = [
  { label: 'Verifying Photo Quality', minSec: 0 },
  { label: 'Scanning Facial Hair', minSec: 1.2 },
  { label: 'Calculating Symmetry & Density', minSec: 2.8 },
  { label: 'Evaluating Growth Progression', minSec: 4.2 },
  { label: 'Generating Score & Review', minSec: 6.5 }
];

const COURT_TIPS = [
  'Tip: Judging evaluates facial hair growth, density, and styling.',
  'Tip: The Larnie and The Upper-Lip styles earn top marks for classic charm.',
  'Notice: Pet whiskers or drawings are awarded the Wooden Spoon!',
  'Fact: Tom Selleck is the unofficial spirit guide of Movember.',
  'Tip: Submit as many attempts as you want — your best score counts!'
];

export default function JudgingModal({ isOpen }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(prev => +(prev + 0.2).toFixed(1));
    }, 200);

    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % COURT_TIPS.length);
    }, 3800);

    return () => {
      clearInterval(timer);
      clearInterval(tipTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine current active stage index based on elapsed seconds
  const currentStageIndex = STAGES.reduce((acc, stage, idx) => {
    return elapsedSeconds >= stage.minSec ? idx : acc;
  }, 0);

  // Compute asymptotic progress (starts fast, slows down near 95% if waiting in queue)
  const progressPercent = Math.min(
    96,
    Math.round(
      elapsedSeconds < 2.5
        ? (elapsedSeconds / 2.5) * 60
        : 60 + (1 - Math.exp(-(elapsedSeconds - 2.5) / 6)) * 36
    )
  );

  const isQueuedDelay = elapsedSeconds >= 3.5;

  return (
    <div className="judging-modal-backdrop fade-in" role="dialog" aria-modal="true">
      <div className="judging-modal-content">
        {/* Animated Scanner Ring */}
        <div className="scanner-container">
          <div className="scanner-outer-ring"></div>
          <div className="scanner-inner-ring"></div>
          <div className="scanner-icon">
            <GiMustache className="scanner-stache-svg" />
          </div>
          <div className="scanner-sweep-line"></div>
        </div>

        <h2 className="judging-headline">Evaluating Your Mustache</h2>

        {/* Dynamic Queue Notification Banner if rate limited/queued */}
        {isQueuedDelay && (
          <div className="queue-waiting-banner fade-in">
            <div className="queue-beacon-dot"></div>
            <div className="queue-banner-text">
              <strong>High Volume:</strong> Evaluating your photo, please hold on a moment...
            </div>
          </div>
        )}

        {/* Multi-stage Pipeline Stepper */}
        <div className="judging-stepper">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isActive = idx === currentStageIndex;
            const stateClass = isCompleted ? 'completed' : isActive ? 'active' : 'pending';

            return (
              <div key={stage.label} className={`judging-step-item ${stateClass}`}>
                <div className="judging-step-icon-wrap">
                  {isCompleted ? (
                    <FaCheck />
                  ) : isActive ? (
                    <span className="spinner spinner-sm"></span>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="judging-step-text">{stage.label}</span>
              </div>
            );
          })}
        </div>

        {/* Simulated Progress Bar */}
        <div className="judging-progress-bar">
          <div 
            className="judging-progress-fill" 
            style={{ width: `${progressPercent}%`, transition: 'width 0.25s ease-out' }}
          ></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
          <span>Evaluating: {progressPercent}%</span>
          <span>Elapsed: {elapsedSeconds.toFixed(1)}s</span>
        </div>

        {/* Cycling Court Tip */}
        <div className="court-tip-box">
          <div className="court-tip-label">
            <FaScaleBalanced style={{ marginRight: '4px' }} /> Movember Tip
          </div>
          <div className="court-tip-text">
            {COURT_TIPS[tipIndex]}
          </div>
        </div>

        <p className="judging-footnote" style={{ marginTop: '16px' }}>
          Powered by Google Gemini Vision
        </p>
      </div>
    </div>
  );
}
