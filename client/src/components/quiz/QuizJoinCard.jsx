import React from 'react';
import { GiMustache } from 'react-icons/gi';
import { 
  FaPlay, 
  FaKey, 
  FaUser, 
  FaCircleCheck, 
  FaCircleExclamation, 
  FaCrown,
  FaTrophy
} from 'react-icons/fa6';

export default function QuizJoinCard({
  pinInput,
  setPinInput,
  nicknameInput,
  setNicknameInput,
  user,
  error,
  isAdmin,
  onJoinGame,
  onAdminAction,
  onOpenLeaderboard
}) {
  return (
    <div className="quiz-entry-wrapper animate-in fade-in">
      <div className="quiz-entry-card auth-modal-card scale-in space-y-6">
        {/* Modal Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <GiMustache className="auth-mustache-icon" />
          </div>
          <h2 className="auth-title">Mustache Quiz Arena</h2>
          <p className="auth-subtitle">
            High-speed facial hair trivia • 1,000 points per round • Real-time speed scoring
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-alert fade-in">
            <FaCircleExclamation className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Entry Form */}
        <form onSubmit={onJoinGame} className="auth-form">
          <div className="form-group">
            <label htmlFor="quiz-pin" className="form-label">
              Game PIN (from Host)
            </label>
            <div className="input-with-icon">
              <FaKey className="input-icon" />
              <input
                id="quiz-pin"
                type="text"
                className="auth-input font-mono tracking-widest text-base font-bold placeholder:tracking-normal placeholder:font-sans placeholder:font-normal"
                placeholder="e.g. 592814"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                required
                maxLength={8}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="quiz-nick" className="form-label">
              Your Contestant Nickname
            </label>
            <div className="input-with-icon">
              <FaUser className="input-icon" />
              <input
                id="quiz-nick"
                type="text"
                className="auth-input font-medium"
                placeholder="e.g. Tom Selleck"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                required
                maxLength={30}
                autoComplete="nickname"
              />
            </div>
          </div>

          {/* User Pass Badge */}
          {user && (
            <div className="auth-movember-notice !bg-emerald-950/40 !border-emerald-500/35 !text-emerald-200 flex items-start gap-3">
              <FaCircleCheck className="text-emerald-400 text-base shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                Contestant: <strong className="text-emerald-100">{user.fullName}</strong> • <span className="text-emerald-300 font-semibold">R50 Pass Active</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn !py-3.5 !text-base font-bold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
          >
            <FaPlay className="btn-icon text-sm" /> Enter Quiz Arena
          </button>

          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <FaTrophy className="text-yellow-400 text-xs" />
              <span>View Live Quiz Leaderboard</span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
              </span>
            </button>
          )}
        </form>

        {/* Admin Quick Jump */}
        {isAdmin && (
          <div className="auth-footer-note flex items-center justify-between pt-3 border-t border-white/10 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-amber-400">
              <FaCrown className="text-xs" /> Host Active
            </span>
            <button
              type="button"
              className="auth-link-btn"
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
