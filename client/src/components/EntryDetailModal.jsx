import React, { useEffect } from 'react';
import { FaXmark } from 'react-icons/fa6';
import VerdictCard from './VerdictCard';

export default function EntryDetailModal({ entry, onClose }) {
  useEffect(() => {
    if (!entry) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <div className="entry-modal-backdrop" role="dialog" aria-modal="true" aria-label="Submission Verdict Details" onClick={onClose}>
      <div className="entry-modal-wrapper" onClick={e => e.stopPropagation()}>
        <div className="modal-sheet-handle mobile-only"></div>
        <div className="entry-modal-top">
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <FaXmark />
          </button>
        </div>
        <VerdictCard
          verdict={entry}
          onReset={onClose}
          onViewLeaderboard={onClose}
        />
      </div>
    </div>
  );
}
