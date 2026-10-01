import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import VerdictCard from './VerdictCard';

export default function EntryDetailModal({ entry, onClose }) {
  if (!entry) return null;

  return (
    <div className="entry-modal-backdrop" onClick={onClose}>
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
