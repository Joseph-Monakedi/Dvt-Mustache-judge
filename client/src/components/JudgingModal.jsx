import React, { useState, useEffect } from 'react';
import { GiMustache } from 'react-icons/gi';

const STATUS_LINES = [
  'Calibrating bristle calipers...',
  'Scanning for marker pen deceit...',
  'Consulting Tom Selleck archives...',
  'Calculating follicle aerodynamic drag...',
  'Evaluating upper-lip symmetry vectors...',
  'Cross-referencing DVT Movember records...',
  'Synthesizing Supreme Judicial Declaration...'
];

export default function JudgingModal({ isOpen }) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    setCurrentLineIndex(0);
    const interval = setInterval(() => {
      setCurrentLineIndex(prev => (prev + 1) % STATUS_LINES.length);
    }, 700);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="judging-modal-backdrop">
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

        <h2 className="judging-headline">The Court is Deliberating</h2>
        
        {/* Humorous cycling status */}
        <div className="judging-status-box">
          <div className="status-terminal-dot"></div>
          <p className="judging-status-text">
            {STATUS_LINES[currentLineIndex]}
          </p>
        </div>

        <div className="judging-progress-bar">
          <div className="judging-progress-fill"></div>
        </div>

        <p className="judging-footnote">
          Powered by Google Gemini 3.5 Flash-Lite Multimodal Vision
        </p>
      </div>
    </div>
  );
}
