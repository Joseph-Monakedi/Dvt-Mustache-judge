import React from 'react';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function CharityPaymentModal({ isOpen, onClose, userName }) {
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
        {/* Tier Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-[#131f33]/60 border border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Mustache Leaderboard
            </span>
            <span className="text-2xl font-black text-white block">R100</span>
            <p className="text-xs text-slate-400">
              Unlimited AI mustache submissions. Your single highest score features on the live public leaderboard.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              Trivia Arena Pass
            </span>
            <span className="text-2xl font-black text-white block">R50</span>
            <p className="text-xs text-slate-400">
              Entry pass to the live multiplayer mustache trivia arena with podium rewards and real-time scoreboard.
            </p>
          </div>
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
              An admin will toggle your pass active in the Admin Portal, and your top entry will immediately go live on the public leaderboard!
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
