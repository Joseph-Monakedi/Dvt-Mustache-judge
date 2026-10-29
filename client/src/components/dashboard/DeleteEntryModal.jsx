import React, { useState } from 'react';
import { 
  FaTriangleExclamation, 
  FaTrashCan, 
  FaAward, 
  FaCalendarDays, 
  FaArrowRotateRight
} from 'react-icons/fa6';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';

export default function DeleteEntryModal({
  isOpen,
  onClose,
  entry,
  onSuccess
}) {
  const { token } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!entry) return null;

  const isBest = Boolean(entry.isBestEntry);

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmed(false);
    setErrorMsg('');
    onClose?.();
  };

  const handleDelete = async () => {
    if (!token) {
      setErrorMsg('You must be logged in to delete this submission.');
      return;
    }

    if (!confirmed) {
      setErrorMsg('Please tick the confirmation checkbox to acknowledge this irreversible deletion.');
      return;
    }

    setIsDeleting(true);
    setErrorMsg('');

    try {
      const res = await fetch(apiUrl(`/api/mustache/my-entry/${entry.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to delete entry (${res.status})`);
      }

      setConfirmed(false);
      onSuccess?.(entry.id);
      onClose?.();
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while deleting your submission.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Submission"
      subtitle="Irreversible Action Warning"
      maxWidth="max-w-lg"
    >
      <div className="p-6 space-y-5">
        {/* Irreversible Action Banner */}
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 flex items-start gap-3.5 shadow-lg shadow-rose-950/30">
          <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0 text-lg">
            <FaTriangleExclamation />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>This Action Cannot Be Undone</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">
                Irreversible
              </span>
            </h4>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              Once deleted, your photo, AI evaluation scorecard, and historical subscores will be permanently purged from the cloud storage and database.
            </p>
          </div>
        </div>

        {/* Extra Warning if this is the user's personal best on leaderboard */}
        {isBest && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3">
            <FaAward className="text-amber-400 text-base mt-0.5 shrink-0" />
            <div className="text-xs space-y-0.5">
              <strong className="text-amber-300 block font-bold">Personal Best on Live Leaderboard</strong>
              <p className="text-amber-200/80">
                This is currently your highest-scoring entry! Deleting it will immediately recalculate or remove your position on the live challenge leaderboard.
              </p>
            </div>
          </div>
        )}

        {/* Entry Preview Card */}
        <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#131f33]/70 border border-white/10">
          <div className="w-16 h-16 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-white/10">
            <img
              src={entry.thumbnailUrl || entry.imageUrl}
              alt={entry.mustacheTitle || 'Submission thumbnail'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-bold text-white truncate">
                {entry.mustacheTitle || 'Facial Hair Submission'}
              </h5>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                {entry.overallScore}/100
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Style: <span className="text-slate-300 font-medium">{entry.styleCategory || 'Classic'}</span>
            </p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
              <FaCalendarDays className="text-[10px] text-slate-400" />
              <span>
                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </p>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500/40 cursor-pointer"
          />
          <span className="text-xs text-slate-300 select-none leading-relaxed">
            I acknowledge that this action is <strong className="text-white">permanent and irreversible</strong>. I wish to erase this submission and all associated AI scoring records.
          </span>
        </label>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isDeleting}
            className="text-xs"
          >
            Cancel, Keep Submission
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!confirmed || isDeleting}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              confirmed && !isDeleting
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 hover:shadow-rose-600/30'
                : 'bg-rose-950/50 text-rose-300/40 border border-rose-500/20 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <>
                <FaArrowRotateRight className="animate-spin text-xs" />
                <span>Deleting Submission...</span>
              </>
            ) : (
              <>
                <FaTrashCan className="text-xs" />
                <span>Permanently Delete Entry</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
