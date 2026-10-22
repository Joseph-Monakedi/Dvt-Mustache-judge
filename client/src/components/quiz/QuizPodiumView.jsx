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
        particleCount: 140,
        spread: 95,
        origin: { y: 0.5 }
      });
    } catch {
      // ignore
    }
  }, []);

  // Sort players descending by score
  const players = [...(scoreboardData?.topPlayers || [])].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Determine top 3 finishers
  const top1 = players[0] || (joinedPlayer?.totalScore ? { name: joinedPlayer.contestantName, score: joinedPlayer.totalScore } : null);
  const top2 = players[1] || null;
  const top3 = players[2] || null;

  const hasAnyPlayer = Boolean(top1 || top2 || top3);

  // Player personal finish check
  const myName = joinedPlayer?.contestantName;
  const myStats = scoreboardData?.playerStats || (joinedPlayer ? {
    name: myName,
    score: joinedPlayer.totalScore,
    rank: scoreboardData?.playerRank
  } : null);

  const isUserOnPodium = myName && [top1?.name, top2?.name, top3?.name].includes(myName);

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8 animate-in fade-in">
      {/* Header Banner - Centered Flex Container */}
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div 
          className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 text-4xl shadow-2xl shadow-amber-500/30 animate-bounce"
          style={{ margin: '0 auto' }}
        >
          <FaCrown />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            Grand Mustache Quiz Champions!
          </h1>
          <p className="text-sm sm:text-base font-medium text-slate-400 max-w-lg mx-auto">
            Movember 2026 Trivia Crown Claimed • Respect to the Follicles!
          </p>
        </div>
      </div>

      {!hasAnyPlayer ? (
        <div className="bg-[#0d1522] border border-white/10 rounded-2xl p-10 text-center max-w-md mx-auto space-y-3 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl">
            <FaTrophy />
          </div>
          <h3 className="text-lg font-bold text-white">Quiz Round Concluded</h3>
          <p className="text-xs text-slate-400">
            No contestants have recorded scores on the podium for this game session yet.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {/* 3D Stepped Podium Stage */}
          <div className="relative pt-14 pb-0 px-4 flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto min-h-[390px]">
            {/* 2nd Place: Silver */}
            <div className="flex-1 flex flex-col items-center group z-0">
              {/* Contestant Badge */}
              {top2 ? (
                <div className="p-3 bg-[#131f33] border-2 border-slate-400/60 rounded-xl text-center shadow-lg shadow-slate-900/50 mb-3 w-full max-w-[170px] transform group-hover:-translate-y-1 transition-transform">
                  <span className="block text-xs sm:text-sm font-bold text-white truncate">
                    {top2.name}
                  </span>
                  <span className="block text-xs font-mono font-bold text-slate-300 mt-0.5">
                    {top2.score} pts
                  </span>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30">
                    2nd Place
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-[#131f33]/40 border border-white/5 rounded-xl text-center mb-3 w-full max-w-[170px]">
                  <span className="block text-xs font-medium text-slate-500 italic">Unclaimed</span>
                </div>
              )}

              {/* Silver Pillar */}
              <div className="w-full h-48 sm:h-56 bg-gradient-to-t from-slate-800 to-slate-500 rounded-t-2xl border-t-2 border-x-2 border-slate-300/60 shadow-xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-30 pointer-events-none" />
                <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-slate-300 flex items-center justify-center text-2xl font-black text-slate-200 shadow-md">
                  2
                </div>
              </div>
            </div>

            {/* 1st Place: Gold Champion (Tallest) */}
            <div className="flex-1 flex flex-col items-center group -mt-10 z-10">
              {/* Winner Badge with Crown - Increased top padding to avoid overlapping name */}
              {top1 ? (
                <div className="relative pt-7 pb-4 px-4 bg-gradient-to-b from-[#1a283e] to-[#0d1522] border-2 border-amber-400 rounded-2xl text-center shadow-2xl shadow-amber-500/30 mb-3 w-full max-w-[210px] transform group-hover:-translate-y-1 transition-transform">
                  <div 
                    className="absolute -top-5 left-1/2 w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center text-lg shadow-lg ring-4 ring-[#070c14]"
                    style={{ transform: 'translateX(-50%)', left: '50%' }}
                  >
                    <FaCrown />
                  </div>
                  <span className="block text-sm sm:text-base font-black text-amber-300 truncate">
                    {top1.name}
                  </span>
                  <span className="block text-xs sm:text-sm font-mono font-black text-white mt-0.5">
                    {top1.score} pts
                  </span>
                  <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Quiz Champion 👑
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-[#131f33]/40 border border-white/5 rounded-2xl text-center mb-3 w-full max-w-[200px]">
                  <span className="block text-xs font-medium text-slate-500 italic">Unclaimed</span>
                </div>
              )}

              {/* Gold Pillar */}
              <div className="w-full h-64 sm:h-76 bg-gradient-to-t from-amber-800 via-amber-600 to-yellow-400 rounded-t-2xl border-t-2 border-x-2 border-yellow-200/80 shadow-2xl shadow-amber-500/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 opacity-40 pointer-events-none" />
                <div className="w-16 h-16 rounded-full bg-slate-950/80 border-2 border-yellow-300 flex items-center justify-center text-3xl font-black text-yellow-300 shadow-lg">
                  1
                </div>
              </div>
            </div>

            {/* 3rd Place: Bronze */}
            <div className="flex-1 flex flex-col items-center group z-0">
              {/* Contestant Badge */}
              {top3 ? (
                <div className="p-3 bg-[#131f33] border-2 border-amber-700/60 rounded-xl text-center shadow-lg shadow-slate-900/50 mb-3 w-full max-w-[170px] transform group-hover:-translate-y-1 transition-transform">
                  <span className="block text-xs sm:text-sm font-bold text-white truncate">
                    {top3.name}
                  </span>
                  <span className="block text-xs font-mono font-bold text-amber-400 mt-0.5">
                    {top3.score} pts
                  </span>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/40">
                    3rd Place
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-[#131f33]/40 border border-white/5 rounded-xl text-center mb-3 w-full max-w-[170px]">
                  <span className="block text-xs font-medium text-slate-500 italic">Unclaimed</span>
                </div>
              )}

              {/* Bronze Pillar */}
              <div className="w-full h-36 sm:h-40 bg-gradient-to-t from-amber-950 to-amber-700 rounded-t-2xl border-t-2 border-x-2 border-amber-600/60 shadow-xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-20 pointer-events-none" />
                <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-amber-600 flex items-center justify-center text-2xl font-black text-amber-400 shadow-md">
                  3
                </div>
              </div>
            </div>
          </div>

          {/* Podium Floor Base Pedestal */}
          <div 
            className="w-full max-w-2xl mx-auto h-4 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 rounded-b-2xl border-b-2 border-x-2 border-white/10 shadow-2xl"
            style={{ margin: '0 auto' }}
          />
        </div>
      )}

      {/* Tournament Standings Table (4th place & beyond) */}
      {players.length > 3 && (
        <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FaTrophy className="text-cyan-400" /> Full Arena Leaderboard ({players.length} Competitors)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Ranks #4 to #{players.length}
            </span>
          </div>

          <div className="divide-y divide-white/5 text-sm">
            {players.slice(3).map((p, idx) => {
              const rank = idx + 4;
              const isCurrent = myName && p.name?.toLowerCase() === myName.toLowerCase();
              return (
                <div 
                  key={p.id || idx}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                    isCurrent ? 'bg-cyan-950/40 border border-cyan-500/30 font-semibold' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center font-mono text-xs font-bold text-slate-500">
                      #{rank}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {p.name}
                      {isCurrent && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                          You
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {p.score.toLocaleString()} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-Podium Participant Finish Notice */}
      {!isUserOnPodium && myStats?.score > 0 && (
        <div className="max-w-md mx-auto p-4 bg-[#0d1522]/90 border border-cyan-500/30 rounded-xl text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold text-sm">
            <FaMedal /> Your Arena Finish: Rank #{myStats.rank || '—'} with {myStats.score} points
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Excellent trivia showdown! Thank you for participating in DVT Movember 2026.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
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
