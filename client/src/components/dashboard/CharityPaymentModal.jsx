import React, { useState } from 'react';
import { 
  FaHandHoldingHeart, 
  FaCircleCheck, 
  FaClock, 
  FaEnvelope,
  FaCopy,
  FaCheck,
  FaTrophy,
  FaShieldHalved
} from 'react-icons/fa6';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
// Keep PayFast import intact for future re-activation once registration is verified
import { initiatePayFastCheckout } from '../../utils/payfast';

export default function CharityPaymentModal({ 
  isOpen, 
  onClose, 
  userName,
  leaderboardPaid = false,
  isPrizeEligible = false,
  amountPaid = 0
}) {
  const { token, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // PayFast is temporarily disabled on the frontend until merchant account validation is complete.
  // Set enablePayFastGateway to true when ready to re-activate.
  const enablePayFastGateway = false;

  const eligible = isPrizeEligible || user?.isPrizeEligible || leaderboardPaid || (amountPaid >= 100);

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText('RAllen@dvtsoftware.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prostate Cancer Awareness & Research Fund"
      subtitle="All proceeds directly fund prostate cancer awareness and critical research."
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Status Highlight Banner */}
        <div className={`p-5 rounded-2xl border transition-all ${
          eligible 
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/30' 
            : 'bg-gradient-to-br from-[#0d1522] to-[#131f33] border-cyan-500/40'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
              eligible ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
            }`}>
              {eligible ? <FaCircleCheck /> : <FaTrophy />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Grand Prize Status
                </span>
                {eligible ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                    🏆 ELIGIBLE FOR R1,000 VOUCHER
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    🎗️ COMMUNITY PARTICIPANT
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white">
                {eligible ? 'You Are Eligible for the R1,000 Grand Prize!' : 'Donate R100+ to Qualify for the R1,000 Voucher'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {eligible
                  ? `Thank you for your generous donation! You are in the running for the R1,000 Takealot Voucher in your competition track.`
                  : `Anyone can register and enter leaderboards for free. A minimum donation of R100 qualifies you to win the R1,000 Takealot Voucher for your challenge!`}
              </p>
            </div>
          </div>
        </div>

        {/* Donation Instructions Card */}
        <div className="p-5 bg-[#0b1320] border border-cyan-500/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5 text-cyan-300 font-bold text-sm border-b border-white/10 pb-3">
            <FaHandHoldingHeart className="text-rose-400 text-lg" />
            <span>How to Donate (Prostate Cancer Awareness & Research)</span>
          </div>

          {/* <p className="text-xs text-slate-300 leading-relaxed">
            Online card checkout via PayFast is currently being finalized. For now, all donations are handled directly through DVT:
          </p> */}

          <div className="bg-[#070c14] border border-white/10 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Donation Coordinator:</span>
              <strong className="text-white text-xs sm:text-sm">Rose Allen</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Contact Method 1:</span>
              <span className="text-cyan-300 text-xs font-semibold">Microsoft Teams (Rose Allen)</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-xs text-slate-400">Contact Method 2:</span>
              <div className="flex items-center gap-2">
                <a 
                  href="mailto:RAllen@dvtsoftware.com?subject=DVT%20Movember%20Donation%20-%20Prostate%20Cancer%20Research" 
                  className="text-cyan-400 hover:underline font-mono text-xs font-bold"
                >
                  RAllen@dvtsoftware.com
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                  title="Copy email to clipboard"
                  aria-label="Copy email address"
                >
                  {copied ? <FaCheck className="text-emerald-400 text-xs" /> : <FaCopy className="text-xs" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-xs text-slate-400">Grand Prize Eligibility:</span>
              <span className="text-amber-300 font-bold text-xs">Min R100 Donation</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Once Rose confirms your donation, your account will automatically be marked as <strong>Eligible for the R1,000 Grand Prize</strong> on the leaderboards.
          </div>
        </div>

        {/* PayFast Integration preserved for future re-activation */}
        {enablePayFastGateway && (
          <div className="p-4 bg-gradient-to-br from-cyan-950/50 to-blue-950/40 border border-cyan-500/30 rounded-xl space-y-3">
            <p className="text-xs text-slate-300">
              Pay securely online with Cards, Instant EFT, SnapScan, or Zapper:
            </p>
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                className="flex-1 text-xs justify-center py-2.5"
                onClick={() => handlePayFast('Leaderboard')}
                disabled={loadingType !== null}
              >
                {loadingType === 'Leaderboard' ? 'Connecting...' : 'Donate R100 via PayFast'}
              </Button>
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
