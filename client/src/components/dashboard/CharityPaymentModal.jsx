import React, { useState } from 'react';
import { 
  FaHandHoldingHeart, 
  FaCircleCheck, 
  FaClock, 
  FaEnvelope,
  FaCopy,
  FaCheck,
  FaTrophy,
  FaShieldHalved,
  FaBuildingColumns,
  FaReceipt
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
  const [copiedField, setCopiedField] = useState('');
  const [loadingType, setLoadingType] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // PayFast is temporarily disabled on the frontend until merchant account validation is complete.
  // Set enablePayFastGateway to true when ready to re-activate.
  const enablePayFastGateway = false;

  const eligible = isPrizeEligible || user?.isPrizeEligible || leaderboardPaid || (amountPaid >= 100);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
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

        {/* EFT Banking Details Card */}
        <div className="p-5 bg-[#0b1320] border border-cyan-500/30 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5 text-cyan-300 font-bold text-sm">
              <FaBuildingColumns className="text-cyan-400 text-lg" />
              <span>Direct EFT Banking Details (South Africa)</span>
            </div>
            <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              FNB
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Please make your donation via EFT. A minimum of <strong>R100</strong> makes you eligible for the <strong>R1,000 Takealot Voucher</strong> grand prize.
          </p>

          <div className="bg-[#070c14] border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden text-xs">
            <div className="flex items-center justify-between p-3 hover:bg-white/[0.02]">
              <span className="text-slate-400">Bank:</span>
              <strong className="text-white font-bold text-sm">First National Bank (FNB)</strong>
            </div>

            <div className="flex items-center justify-between p-3 hover:bg-white/[0.02]">
              <span className="text-slate-400">Account Holder:</span>
              <div className="flex items-center gap-2">
                <strong className="text-white font-semibold">Rosemary Allen</strong>
                <button
                  type="button"
                  onClick={() => handleCopy('Rosemary Allen', 'holder')}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                  title="Copy account holder"
                >
                  {copiedField === 'holder' ? <FaCheck className="text-emerald-400 text-xs" /> : <FaCopy className="text-xs" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 hover:bg-white/[0.02] bg-cyan-950/20">
              <span className="text-cyan-300 font-semibold">Account Number:</span>
              <div className="flex items-center gap-2">
                <strong className="text-white font-mono text-sm tracking-wider">625 3333 8621</strong>
                <button
                  type="button"
                  onClick={() => handleCopy('62533338621', 'account')}
                  className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 font-semibold text-[11px] flex items-center gap-1 transition-all"
                  title="Copy account number"
                >
                  {copiedField === 'account' ? (
                    <>
                      <FaCheck className="text-emerald-400 text-xs" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <FaCopy className="text-xs" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 hover:bg-white/[0.02]">
              <span className="text-slate-400">Account Type:</span>
              <span className="text-slate-200 font-medium">Cheque Account</span>
            </div>

            <div className="flex items-center justify-between p-3 hover:bg-white/[0.02]">
              <span className="text-slate-400">Branch Code:</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-medium">254 005</span>
                <button
                  type="button"
                  onClick={() => handleCopy('254005', 'branch')}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                  title="Copy branch code"
                >
                  {copiedField === 'branch' ? <FaCheck className="text-emerald-400 text-xs" /> : <FaCopy className="text-xs" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 hover:bg-white/[0.02]">
              <span className="text-slate-400">Payment Reference:</span>
              <div className="flex items-center gap-2">
                <span className="text-amber-300 font-mono font-semibold text-[11px]">
                  {userName || user?.displayName || user?.email ? `${userName || user?.displayName || user?.email.split('@')[0]} - Movember` : 'Your Name - Movember'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(userName || user?.displayName || user?.email || 'Your Name - Movember', 'reference')}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                  title="Copy reference"
                >
                  {copiedField === 'reference' ? <FaCheck className="text-emerald-400 text-xs" /> : <FaCopy className="text-xs" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 hover:bg-white/[0.02]">
              <span className="text-slate-400">Send Proof of Payment (POP):</span>
              <div className="flex items-center gap-2">
                <a 
                  href="mailto:marketing@dvtsoftware.com?subject=DVT%20Movember%20Donation%20Proof%20of%20Payment"
                  className="text-cyan-400 hover:underline font-mono text-xs font-bold"
                >
                  marketing@dvtsoftware.com
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy('marketing@dvtsoftware.com', 'email')}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                  title="Copy email"
                >
                  {copiedField === 'email' ? <FaCheck className="text-emerald-400 text-xs" /> : <FaCopy className="text-xs" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2.5">
            <FaReceipt className="text-amber-400 text-base shrink-0 mt-0.5" />
            <div>
              <strong>How verification works:</strong> Once you make your transfer and email your proof of payment (POP) to <strong>marketing@dvtsoftware.com</strong>, the team will verify it and mark your profile as <strong>Eligible for the R1,000 Takealot Voucher</strong> on the leaderboards.
            </div>
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
