import React, { useState } from 'react';
import { 
  FaHandHoldingDollar, 
  FaCircleCheck, 
  FaClock, 
  FaRotate,
  FaBolt,
  FaShieldHalved,
  FaArrowRight
} from 'react-icons/fa6';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { initiatePayFastCheckout } from '../../utils/payfast';

export default function CharityPaymentModal({ 
  isOpen, 
  onClose, 
  userName,
  leaderboardPaid = false,
  quizPaid = false
}) {
  const { token } = useAuth();
  const [loadingType, setLoadingType] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const reference = `MOVEM-${(userName || 'CONTESTANT').replace(/\s+/g, '').toUpperCase()}`;

  const handlePayFast = async (itemType) => {
    setErrorMsg('');
    setLoadingType(itemType);

    try {
      await initiatePayFastCheckout({
        itemType,
        token,
        returnPath: '/dashboard?payment=success',
        cancelPath: '/dashboard?payment=cancelled'
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect to PayFast.');
      setLoadingType(null);
    }
  };

  const isFullyPaid = leaderboardPaid && quizPaid;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DVT Movember 2026 Charity Donations"
      subtitle="Entry fees directly support Men's Mental Health, Prostate & Testicular Cancer charities."
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Tier Cards with Live Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Leaderboard Card */}
          <div className={`p-4 rounded-xl border space-y-2 transition-all ${
            leaderboardPaid 
              ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/30' 
              : 'bg-[#131f33]/60 border-white/10'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Mustache Leaderboard
              </span>
              {leaderboardPaid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <FaCircleCheck /> Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <FaClock /> Pending
                </span>
              )}
            </div>
            <span className="text-2xl font-black text-white block">R100</span>
            <p className="text-xs text-slate-400">
              {leaderboardPaid 
                ? 'Your top mustache score is active and visible on the official public leaderboard!' 
                : 'Unlimited AI mustache submissions. Your single highest score features on the live public leaderboard.'}
            </p>
          </div>

          {/* Quiz Arena Card */}
          <div className={`p-4 rounded-xl border space-y-2 transition-all ${
            quizPaid 
              ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/30' 
              : 'bg-cyan-950/30 border-cyan-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                Trivia Arena Pass
              </span>
              {quizPaid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <FaCircleCheck /> Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <FaClock /> Pending
                </span>
              )}
            </div>
            <span className="text-2xl font-black text-white block">R50</span>
            <p className="text-xs text-slate-400">
              {quizPaid
                ? 'You are cleared to join live multiplayer trivia sessions and compete for the crown!'
                : 'Entry pass to the live multiplayer mustache trivia arena with podium rewards and real-time scoreboard.'}
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* PayFast Instant Checkout Actions */}
        {!isFullyPaid ? (
          <div className="p-4 bg-gradient-to-br from-cyan-950/50 to-blue-950/40 border border-cyan-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 text-sm font-bold">
                <FaBolt className="text-amber-400" /> Pay via PayFast Gateway
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Instant Auto-Approval
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Pay securely online with Cards, Instant EFT, SnapScan, or Zapper. Your entry pass activates immediately upon payment.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {!leaderboardPaid && !quizPaid && (
                <Button 
                  variant="primary" 
                  className="flex-1 text-xs justify-center py-2.5"
                  onClick={() => handlePayFast('Combo')}
                  disabled={loadingType !== null}
                >
                  {loadingType === 'Combo' ? 'Connecting...' : 'Pay R150 Combo (Both)'}
                </Button>
              )}

              {!leaderboardPaid && (
                <Button 
                  variant={quizPaid ? "primary" : "secondary"}
                  className="flex-1 text-xs justify-center py-2.5"
                  onClick={() => handlePayFast('Leaderboard')}
                  disabled={loadingType !== null}
                >
                  {loadingType === 'Leaderboard' ? 'Connecting...' : 'Pay R100 Leaderboard'}
                </Button>
              )}

              {!quizPaid && (
                <Button 
                  variant={leaderboardPaid ? "primary" : "secondary"}
                  className="flex-1 text-xs justify-center py-2.5"
                  onClick={() => handlePayFast('Quiz')}
                  disabled={loadingType !== null}
                >
                  {loadingType === 'Quiz' ? 'Connecting...' : 'Pay R50 Quiz Pass'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-xs text-emerald-200">
            <FaCircleCheck className="text-emerald-400 text-xl shrink-0" />
            <div>
              <strong className="text-white block text-sm">Full Movember Access Active!</strong>
              You are all set for both the official Leaderboard and the interactive Quiz Arena. Thank you for your charity contribution!
            </div>
          </div>
        )}

        {/* Done Button */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </Modal>
  );
}
