import React, { useEffect } from 'react';
import { FaCrown, FaRotate, FaTrophy, FaMedal } from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import confetti from 'canvas-confetti';
import Button from '../common/Button';

export default function QuizPodiumView({
  scoreboardData,
  joinedPlayer,
  isAdmin,
  onGoToDashboard,
  onAdminAction
}) {
  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 }
      });
    } catch {
      // ignore
    }
  }, []);

  const top1 = scoreboardData?.topPlayers?.[0] || { name: joinedPlayer?.contestantName || 'Liam O.', score: 6850 };
  const top2 = scoreboardData?.topPlayers?.[1] || { name: 'Charl V.', score: 5400 };
  const top3 = scoreboardData?.topPlayers?.[2] || { name: 'Kgothatso M.', score: 4200 };

  return (
    <div className="space-y-10 max-w-4xl mx-auto py-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 text-4xl shadow-2xl shadow-amber-500/30 animate-bounce">
          <FaCrown />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          Grand Mustache Quiz Champions!
        </h1>
        <p className="text-sm sm:text-base font-medium text-slate-400">
          Movember 2026 Trivia Crown Claimed • Respect to the Follicles!
        </p>
      </div>

      {/* 3D Stepped Podium Stage */}
      <div className="relative pt-12 pb-6 px-4 flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto min-h-[380px]">
        {/* 2nd Place: Silver */}
        <div className="flex-1 flex flex-col items-center group">
          {/* Contestant Badge */}
          <div className="p-3 bg-[#131f33] border-2 border-slate-400/60 rounded-xl text-center shadow-lg shadow-slate-900/50 mb-3 w-full max-w-[160px] transform group-hover:-translate-y-1 transition-transform">
            <span className="block text-xs sm:text-sm font-bold text-white truncate">
              {top2.name}
            </span>
            <span className="block text-xs font-mono font-bold text-slate-300">
              {top2.score} pts
            </span>
          </div>

          {/* Silver Pillar */}
          <div className="w-full h-44 sm:h-52 bg-gradient-to-t from-slate-800 to-slate-500 rounded-t-2xl border-t-2 border-x-2 border-slate-300/60 shadow-xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-30 pointer-events-none" />
            <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-slate-300 flex items-center justify-center text-2xl font-black text-slate-200 shadow-md">
              2
            </div>
          </div>
        </div>

        {/* 1st Place: Gold Champion (Tallest) */}
        <div className="flex-1 flex flex-col items-center group -mt-8">
          {/* Winner Badge with Crown */}
          <div className="relative p-4 bg-gradient-to-b from-[#1a283e] to-[#0d1522] border-2 border-amber-400 rounded-2xl text-center shadow-2xl shadow-amber-500/25 mb-3 w-full max-w-[190px] transform group-hover:-translate-y-1 transition-transform">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-base shadow-lg ring-4 ring-[#070c14]">
              <FaCrown />
            </div>
            <span className="block text-sm sm:text-base font-black text-amber-300 truncate mt-1">
              {top1.name}
            </span>
            <span className="block text-xs sm:text-sm font-mono font-black text-white">
              {top1.score} pts
            </span>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
              Quiz Champion
            </span>
          </div>

          {/* Gold Pillar */}
          <div className="w-full h-60 sm:h-72 bg-gradient-to-t from-amber-800 via-amber-600 to-yellow-400 rounded-t-2xl border-t-2 border-x-2 border-yellow-200/80 shadow-2xl shadow-amber-500/30 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 opacity-40 pointer-events-none" />
            <div className="w-16 h-16 rounded-full bg-slate-950/80 border-2 border-yellow-300 flex items-center justify-center text-3xl font-black text-yellow-300 shadow-lg">
              1
            </div>
          </div>
        </div>

        {/* 3rd Place: Bronze */}
        <div className="flex-1 flex flex-col items-center group">
          {/* Contestant Badge */}
          <div className="p-3 bg-[#131f33] border-2 border-amber-700/60 rounded-xl text-center shadow-lg shadow-slate-900/50 mb-3 w-full max-w-[160px] transform group-hover:-translate-y-1 transition-transform">
            <span className="block text-xs sm:text-sm font-bold text-white truncate">
              {top3.name}
            </span>
            <span className="block text-xs font-mono font-bold text-amber-400">
              {top3.score} pts
            </span>
          </div>

          {/* Bronze Pillar */}
          <div className="w-full h-32 sm:h-36 bg-gradient-to-t from-amber-950 to-amber-700 rounded-t-2xl border-t-2 border-x-2 border-amber-600/60 shadow-xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-20 pointer-events-none" />
            <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-amber-600 flex items-center justify-center text-2xl font-black text-amber-400 shadow-md">
              3
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Button
          variant="primary"
          size="lg"
          icon={GiMustache}
          onClick={onGoToDashboard}
          className="shadow-2xl shadow-cyan-500/30 w-full sm:w-auto"
        >
          Back to My Mustache Vault
        </Button>

        {isAdmin && (
          <Button
            variant="secondary"
            size="lg"
            icon={FaRotate}
            onClick={() => onAdminAction('reset-scores')}
            className="w-full sm:w-auto"
          >
            Reset & Play Again
          </Button>
        )}
      </div>
    </div>
  );
}
