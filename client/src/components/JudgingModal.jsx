import React, { useState, useEffect } from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaScaleBalanced, FaCheck, FaHourglassHalf, FaBolt } from 'react-icons/fa6';

const STAGES = [
  { label: 'Specimen Intake & Integrity Verification', minSec: 0 },
  { label: 'Multimodal Neural Vision Philtrum Scan', minSec: 1.2 },
  { label: 'Symmetry, Density & Swagger Calculation', minSec: 2.8 },
  { label: 'Judicial Chamber Rate Limit Clearance', minSec: 4.2 },
  { label: 'Synthesizing Official Declaration & Roast', minSec: 6.5 }
];

const COURT_TIPS = [
  'Rule #1: Zero remarks on non-mustache features. Kindness Invariant strictly enforced.',
  'Tip: Chevron and Handlebar styles receive maximum swagger weighting in championship standings.',
  'Notice: Marker pen drawings and pet whiskers will be exiled to the Wooden Spoon Division!',
  'Fact: Tom Selleck was consulted in spirit during the training of this neural court.',
  'Notice: High server traffic is managed via a FIFO rate-limit queue to ensure fair judging for all squads.'
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

        <h2 className="judging-headline">The Supreme Court is Deliberating</h2>

        {/* Dynamic Queue Notification Banner if rate limited/queued */}
        {isQueuedDelay && (
          <div className="queue-waiting-banner fade-in">
            <div className="queue-beacon-dot"></div>
            <div className="queue-banner-text">
              <strong>High Court Volume Detected:</strong> Your photo is queued in the rate-limiter chamber. Evaluating automatically as soon as the window opens!
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
          <span>Deliberation Progress: {progressPercent}%</span>
          <span>Elapsed: {elapsedSeconds.toFixed(1)}s</span>
        </div>

        {/* Cycling Court Tip */}
        <div className="court-tip-box">
          <div className="court-tip-label">
            <FaScaleBalanced style={{ marginRight: '4px' }} /> Movember Court Directive
          </div>
          <div className="court-tip-text">
            {COURT_TIPS[tipIndex]}
          </div>
        </div>

        <p className="judging-footnote" style={{ marginTop: '16px' }}>
          Powered by Google Gemini 3.5 Flash-Lite Multimodal Vision • Zero Data Loss Guaranteed
        </p>
      </div>
    </div>
  );
}
