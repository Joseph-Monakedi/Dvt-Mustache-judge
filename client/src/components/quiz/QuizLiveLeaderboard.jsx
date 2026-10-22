import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaTrophy, 
  FaCrown, 
  FaMedal, 
  FaFire, 
  FaRotate, 
  FaPlay, 
  FaMagnifyingGlass, 
  FaXmark, 
  FaGamepad,
  FaCircleCheck,
  FaUser,
  FaBolt
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { apiUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';

export default function QuizLiveLeaderboard({
  isModal = false,
  onClose,
  embedded = false,
  onEnterArena
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scoreboardData, setScoreboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMounted = useRef(true);

  // Read joinedPlayer from sessionStorage if present
  const joinedPlayer = (() => {
    try {
      const stored = sessionStorage.getItem('dvt_quiz_player');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const fetchScoreboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const playerId = joinedPlayer?.playerId;
      const url = playerId 
        ? apiUrl(`/api/quiz/scoreboard?playerId=${playerId}`)
        : apiUrl('/api/quiz/scoreboard');
      
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          setScoreboardData({ topPlayers: [], totalPlayers: 0, status: 'Lobby' });
          return;
        }
        throw new Error(`Failed to load scoreboard: ${res.status}`);
      }
      const data = await res.json();
      if (isMounted.current) {
        setScoreboardData(data);
        setLastUpdated(new Date());
        setError('');
      }
    } catch (err) {
      if (isMounted.current) {
        console.warn('Live leaderboard fetch error:', err);
        setError(err.message || 'Unable to load live leaderboard.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchScoreboard();

    // Auto-poll live standings every 3 seconds
    const interval = setInterval(() => {
      fetchScoreboard();
    }, 3000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const handleGoToArena = () => {
    if (onEnterArena) {
      onEnterArena();
    } else {
      navigate('/quiz');
    }
  };

  const allPlayers = scoreboardData?.topPlayers || [];
  const filteredPlayers = allPlayers.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const top1 = allPlayers[0];
  const top2 = allPlayers[1];
  const top3 = allPlayers[2];

  const myPlayerId = joinedPlayer?.playerId;
  const myName = joinedPlayer?.contestantName || user?.fullName;
  const isMe = (p) => (myPlayerId && p.id === myPlayerId) || (myName && p.name?.toLowerCase() === myName.toLowerCase());

  const myRankInfo = allPlayers.find(isMe);

  const content = (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-5xl mx-auto py-6 px-4 animate-in fade-in'}`}>
      {/* Top Header Card */}
      <div className="bg-[#0b1320] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/30 border-2 border-yellow-400/50 flex items-center justify-center text-yellow-300 text-3xl shadow-xl shadow-yellow-500/20 shrink-0">
              <FaTrophy />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-black uppercase tracking-wider">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  Live Leaderboard
                </span>
                {scoreboardData?.pinCode && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                    PIN: {scoreboardData.pinCode}
                  </span>
                )}
                {scoreboardData?.status && (
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[11px] font-semibold">
                    Status: <strong className="text-white">{scoreboardData.status}</strong>
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Mustache Quiz Arena Live Standings
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time speed scoring & multi-round trivia crowns • Updates automatically
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchScoreboard(true)}
              className="p-3 rounded-xl bg-[#131f33] border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all shadow-md active:scale-95 cursor-pointer"
              title="Refresh Leaderboard"
            >
              <FaRotate className={`text-base ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <Button
              variant="accent"
              size="md"
              icon={FaPlay}
              onClick={handleGoToArena}
              className="shadow-xl shadow-amber-500/20"
            >
              Enter Quiz Arena
            </Button>
          </div>
        </div>

        {/* Live Meta Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              Contestants in Game: <strong className="text-white font-mono">{allPlayers.length}</strong>
            </span>
            {scoreboardData?.currentQuestionIndex != null && (
              <span>
                Round: <strong className="text-cyan-400 font-mono">Q{scoreboardData.currentQuestionIndex + 1}</strong> of {scoreboardData.totalQuestions || 12}
              </span>
            )}
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-slate-500">
              Synced at {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {allPlayers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2nd Place: Silver */}
          <div className="bg-[#0d1522] border-2 border-slate-400/50 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between order-2 md:order-1">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-400/20 border border-slate-400/40 text-slate-200 text-xs font-black uppercase tracking-wider">
                <FaMedal className="text-slate-300 text-sm" /> 2nd Place
              </span>
              <span className="text-2xl font-black font-mono text-slate-400">#2</span>
            </div>
            {top2 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-700/60 border-2 border-slate-400 flex items-center justify-center text-white font-black text-lg">
                    {top2.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <span className="block text-base font-bold text-white truncate">
                      {top2.name}
                      {isMe(top2) && <span className="ml-1.5 text-xs text-cyan-400 font-semibold">(You)</span>}
                    </span>
                    <span className="block text-lg font-black font-mono text-slate-300">
                      {top2.score.toLocaleString()} <span className="text-xs text-slate-500 font-normal">pts</span>
                    </span>
                  </div>
                </div>
                {top2.streak > 1 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    <FaFire className="text-amber-400" /> {top2.streak} in a row
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">Awaiting contestant...</p>
            )}
          </div>

          {/* 1st Place: Gold Champion */}
          <div className="bg-gradient-to-b from-[#162033] to-[#0d1522] border-2 border-yellow-400/70 rounded-2xl p-6 shadow-2xl shadow-yellow-500/15 relative overflow-hidden flex flex-col justify-between order-1 md:order-2 md:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 text-xs font-black uppercase tracking-wider shadow-md">
                <FaCrown className="text-yellow-400 text-sm animate-bounce" /> Current Leader
              </span>
              <span className="text-3xl font-black font-mono text-yellow-400">#1</span>
            </div>
            {top1 ? (
              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-400 border-2 border-yellow-200 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-yellow-500/30">
                    {top1.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <span className="block text-lg font-black text-white truncate">
                      {top1.name}
                      {isMe(top1) && <span className="ml-1.5 text-xs text-cyan-400 font-semibold">(You)</span>}
                    </span>
                    <span className="block text-2xl font-black font-mono text-yellow-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                      {top1.score.toLocaleString()} <span className="text-xs text-yellow-400/70 font-normal">pts</span>
                    </span>
                  </div>
                </div>
                {top1.streak > 1 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black shadow-md">
                    <FaFire className="text-amber-400 text-sm" /> {top1.streak} IN A ROW 🔥
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">Awaiting contestant...</p>
            )}
          </div>

          {/* 3rd Place: Bronze */}
          <div className="bg-[#0d1522] border-2 border-amber-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between order-3">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-700/20 border border-amber-700/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                <FaMedal className="text-amber-400 text-sm" /> 3rd Place
              </span>
              <span className="text-2xl font-black font-mono text-amber-600">#3</span>
            </div>
            {top3 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-950 border-2 border-amber-600 flex items-center justify-center text-amber-200 font-black text-lg">
                    {top3.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <span className="block text-base font-bold text-white truncate">
                      {top3.name}
                      {isMe(top3) && <span className="ml-1.5 text-xs text-cyan-400 font-semibold">(You)</span>}
                    </span>
                    <span className="block text-lg font-black font-mono text-amber-400">
                      {top3.score.toLocaleString()} <span className="text-xs text-slate-500 font-normal">pts</span>
                    </span>
                  </div>
                </div>
                {top3.streak > 1 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    <FaFire className="text-amber-400" /> {top3.streak} in a row
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">Awaiting contestant...</p>
            )}
          </div>
        </div>
      )}

      {/* Your Standing Banner */}
      {myRankInfo && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-[#0d1f33] to-cyan-950/60 border border-cyan-400/40 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-bold text-sm">
              #{myRankInfo.rank}
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-cyan-400">Your Current Rank</span>
              <span className="text-sm sm:text-base font-bold text-white">
                {myRankInfo.name} • <span className="font-mono text-cyan-300">{myRankInfo.score.toLocaleString()} pts</span>
              </span>
            </div>
          </div>
          {myRankInfo.streak > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40">
              <FaFire /> {myRankInfo.streak} Streak
            </div>
          )}
        </div>
      )}

      {/* Full Live Standings List / Table */}
      <div className="bg-[#0b1320] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FaBolt className="text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Full Live Standings ({allPlayers.length})</h2>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
            <input
              type="text"
              placeholder="Search contestants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-lg text-xs text-white outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                <FaXmark />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading live trivia standings...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl text-slate-500">
              <GiMustache />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {searchQuery ? `No contestants match "${searchQuery}"` : 'No contestants have joined the live quiz yet.'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first to enter the Mustache Quiz Arena and claim the leaderboard crown!
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                icon={FaPlay}
                onClick={handleGoToArena}
              >
                Join Live Quiz Arena
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3 w-16 text-center">Rank</th>
                  <th className="py-3 px-3">Contestant</th>
                  <th className="py-3 px-3 text-center">Hot Streak</th>
                  <th className="py-3 px-3 text-center">Accuracy</th>
                  <th className="py-3 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredPlayers.map((p) => {
                  const isCurrent = isMe(p);
                  return (
                    <tr 
                      key={p.id}
                      className={`transition-colors ${
                        isCurrent 
                          ? 'bg-cyan-950/40 hover:bg-cyan-950/60 font-semibold' 
                          : p.rank <= 3
                            ? 'bg-white/[0.02] hover:bg-white/[0.05]'
                            : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3.5 px-3 text-center">
                        {p.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 font-bold text-xs shadow-md">
                            🥇
                          </span>
                        ) : p.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 font-bold text-xs shadow-md">
                            🥈
                          </span>
                        ) : p.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-300 border border-amber-700/40 font-bold text-xs shadow-md">
                            🥉
                          </span>
                        ) : (
                          <span className="inline-block font-mono text-xs font-bold text-slate-400">
                            #{p.rank}
                          </span>
                        )}
                      </td>

                      {/* Contestant Name */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                            p.rank === 1 
                              ? 'bg-yellow-500 border border-yellow-300 text-slate-950 font-black' 
                              : p.rank === 2
                                ? 'bg-slate-600 border border-slate-400'
                                : p.rank === 3
                                  ? 'bg-amber-800 border border-amber-600'
                                  : 'bg-white/10 border border-white/10 text-slate-300'
                          }`}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <span className="text-white block truncate">
                              {p.name}
                              {isCurrent && (
                                <span className="ml-2 inline-block px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Streak Column */}
                      <td className="py-3.5 px-3 text-center">
                        {p.streak > 1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-black shadow-sm">
                            <FaFire className="text-amber-400 text-xs" /> {p.streak}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Accuracy Column */}
                      <td className="py-3.5 px-3 text-center">
                        {p.totalAnswered != null && p.totalAnswered > 0 ? (
                          <span className="font-mono text-xs text-slate-300">
                            <span className="text-emerald-400 font-bold">{p.correctCount || 0}</span>/{p.totalAnswered}
                            <span className="text-[10px] text-slate-500 ml-1">
                              ({Math.round(((p.correctCount || 0) / p.totalAnswered) * 100)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Score Column */}
                      <td className="py-3.5 px-3 text-right">
                        <span className={`font-mono text-base font-black ${
                          p.rank === 1 ? 'text-yellow-300' : 'text-cyan-400'
                        }`}>
                          {p.score.toLocaleString()} <span className="text-xs text-slate-500 font-normal">pts</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0b1320] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center text-sm cursor-pointer transition-colors z-20"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FaXmark />
          </button>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
