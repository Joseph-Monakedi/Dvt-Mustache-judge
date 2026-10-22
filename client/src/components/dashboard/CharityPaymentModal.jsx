import React from 'react';
import { FaHandHoldingDollar, FaCircleCheck, FaClock, FaRotate } from 'react-icons/fa6';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function CharityPaymentModal({ 
  isOpen, 
  onClose, 
  userName,
  leaderboardPaid = false,
  quizPaid = false
}) {
  const reference = `MOVEM-${(userName || 'CONTESTANT').replace(/\s+/g, '').toUpperCase()}`;

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

        {/* Real-time sync guarantee callout */}
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl flex items-center gap-3 text-xs text-cyan-200">
          <FaRotate className="text-cyan-400 animate-spin shrink-0 text-base" style={{ animationDuration: '4s' }} />
          <span>
            <strong>Real-time Approval Sync Active:</strong> When an admin confirms your payment, your status will update automatically on this device with zero page refresh required!
          </span>
        </div>

        {/* Steps */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-white/10 space-y-3 text-xs text-slate-300">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
            How to Complete Your Approval:
          </h4>
          <ol className="space-y-2 list-decimal list-inside text-slate-300">
            <li>
              Pay <strong className="text-white">R100</strong> (Leaderboard) or <strong className="text-white">R50</strong> (Quiz) to your DVT office Movember coordinator or snap the charity QR code.
            </li>
            <li>
              Payment Reference: <strong className="text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">{reference}</strong>
            </li>
            <li>
              Send your proof of payment on Slack to <code className="bg-white/10 text-white px-1.5 py-0.5 rounded">#movember-dvt</code> or hand it to an Admin.
            </li>
            <li>
              An admin will toggle your pass active in the Admin Portal, and your status will immediately update live!
            </li>
          </ol>
        </div>

        {/* Done Button */}
        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose}>
            Understood, Back to Vault
          </Button>
        </div>
      </div>
    </Modal>
  );
}
