import React from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaPlay, FaCheck, FaRotate } from 'react-icons/fa6';
import Button from '../common/Button';

export default function QuizJoinCard({
  pinInput,
  setPinInput,
  nicknameInput,
  setNicknameInput,
  user,
  error,
  isAdmin,
  onJoinGame,
  onAdminAction
}) {
  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in">
      <div className="bg-[#0d1522] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-3xl shadow-lg shadow-cyan-950/50">
            <GiMustache />
          </div>
          <h1 className="text-2xl font-black text-white">Mustache Quiz Arena</h1>
          <p className="text-xs text-slate-400">
            High-speed facial hair trivia • 1000 points per round • Real-time speed scoring
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={onJoinGame} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="quiz-pin" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Game PIN (from Admin)
            </label>
            <input
              id="quiz-pin"
              type="text"
              className="w-full px-4 py-3 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white font-mono text-center text-lg tracking-widest outline-none transition-colors"
              placeholder="e.g. 592814"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              required
              maxLength={8}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quiz-nick" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Your Contestant Nickname
            </label>
            <input
              id="quiz-nick"
              type="text"
              className="w-full px-4 py-3 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white text-sm outline-none transition-colors"
              placeholder="e.g. Tom Selleck"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              required
              maxLength={30}
            />
          </div>

          {/* User Badge */}
          {user && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              <FaCheck className="text-emerald-400 shrink-0" />
              <span>Entering as <strong>{user.fullName}</strong> • R50 Pass Active</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={FaPlay}
            className="w-full shadow-xl shadow-cyan-500/25"
          >
            Enter Quiz Arena
          </Button>
        </form>

        {/* Admin quick jump */}
        {isAdmin && (
          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>👑 Host Active</span>
            <button
              type="button"
              className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              onClick={() => onAdminAction('start-lobby')}
            >
              Reset to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
