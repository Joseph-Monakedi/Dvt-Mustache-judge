import React, { useState } from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaUsers, FaPlay, FaKey } from 'react-icons/fa6';
import Button from '../common/Button';

export default function QuizLobby({
  gameState,
  joinedPlayer,
  user,
  isAdmin,
  onAdminAction
}) {
  const [isLaunching, setIsLaunching] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-6 animate-in fade-in">
      {/* Game PIN Highlight Card */}
      <div className="p-6 bg-gradient-to-r from-[#0d1522] via-[#101b2c] to-[#0d1522] border-2 border-cyan-500/40 rounded-2xl text-center shadow-2xl shadow-cyan-950/40 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
          <FaKey /> Game Room PIN
        </span>
        <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-widest drop-shadow-[0_0_25px_rgba(0,180,216,0.4)]">
          {gameState?.pinCode || 'PENDING'}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Tell fellow contestants to enter this PIN code to join the live trivia room!
        </p>
      </div>

      {/* Main Waiting Card */}
      <div className="p-8 bg-[#0d1522] border border-white/10 rounded-2xl text-center space-y-6 shadow-xl">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-cyan-500/10 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-400 text-5xl shadow-xl shadow-cyan-500/20 animate-pulse">
          <GiMustache />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {gameState?.title || 'DVT Movember Mustache Quiz Arena'}
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Waiting for the host to launch Question 1... Warm up your facial hair trivia reflexes!
          </p>
        </div>

        {/* Contestants Joined Box */}
        <div className="bg-[#070c14]/80 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <FaUsers className="text-cyan-400 text-sm" />
            <span>Contestants in Lobby ({gameState?.playerCount || 1})</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {joinedPlayer && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-xs font-bold shadow-md">
                <GiMustache className="text-sm" />
                {joinedPlayer?.contestantName || user?.fullName} (You)
              </span>
            )}
            {gameState?.players?.filter(p => p.name !== (joinedPlayer?.contestantName || user?.fullName)).map(p => (
              <span key={p.id} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 border border-white/10 text-xs font-medium">
                {p.name}
              </span>
            ))}
            {(!joinedPlayer && (!gameState?.players || gameState.players.length === 0)) && (
              <span className="text-xs text-slate-400 italic">
                Awaiting contestants to enter with Game PIN...
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={FaPlay}
              disabled={isLaunching}
              onClick={async () => {
                setIsLaunching(true);
                try {
                  await onAdminAction('next-question', { questionIndex: 0 });
                } catch {
                  setIsLaunching(false);
                }
              }}
              className="shadow-xl shadow-cyan-500/30"
            >
              {isLaunching ? 'Starting 3-2-1 Countdown...' : `Launch Game Now (${gameState?.totalQuestions || 8} Questions)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
