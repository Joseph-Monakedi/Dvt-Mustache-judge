import React from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaFire, FaPlay, FaArrowRight, FaTrophy } from 'react-icons/fa6';
import Button from '../common/Button';

export default function QuizTopBar({
  joinedPlayer,
  user,
  isAdmin,
  gameState,
  onAdminAction
}) {
  const streak = joinedPlayer?.streak || 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0d1522] border border-white/10 rounded-2xl shadow-xl">
      {/* Player info */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#007FBA] to-[#00b4d8] flex items-center justify-center text-white text-2xl shadow-md shadow-cyan-500/20 border border-cyan-300/30 shrink-0">
          <GiMustache />
        </div>
        <div>
          <span className="block text-sm font-bold text-white">
            {joinedPlayer?.contestantName || user?.fullName || 'Contestant'}
          </span>
          <span className="block text-xs font-mono font-semibold text-cyan-400">
            {joinedPlayer?.totalScore ?? 0} points
          </span>
        </div>
      </div>

      {/* Center: Streak Indicator */}
      {streak > 1 && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg shadow-amber-500/10 animate-bounce">
          <FaFire className="text-amber-400 text-sm" />
          <span>{streak} IN A ROW! 🔥</span>
        </div>
      )}

      {/* Admin Host Floating Toolbar */}
      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Host Controls
          </span>

          {gameState?.status === 'Lobby' && (
            <Button
              variant="primary"
              size="sm"
              icon={FaPlay}
              onClick={() => onAdminAction('next-question', { questionIndex: 0 })}
            >
              Start Question 1
            </Button>
          )}

          {gameState?.status === 'Question' && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => onAdminAction('reveal-round')}
            >
              Reveal Answer
            </Button>
          )}

          {gameState?.status === 'AnswerReveal' && (
            <Button
              variant="primary"
              size="sm"
              icon={FaArrowRight}
              iconPosition="right"
              onClick={() => onAdminAction('next-question')}
            >
              Next Question
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            icon={FaTrophy}
            onClick={() => onAdminAction('end')}
            title="End Game and show final podium"
          >
            End Game
          </Button>
        </div>
      )}
    </div>
  );
}
