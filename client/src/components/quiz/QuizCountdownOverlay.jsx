import React from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaBolt, FaClock } from 'react-icons/fa6';

export default function QuizCountdownOverlay({
  countdown,
  currentQuestionIndex = 0,
  totalQuestions = 8,
  quizTitle = 'Mustache Quiz Arena'
}) {
  if (!countdown) return null;

  const isStarting = currentQuestionIndex === 0;
  const isGo = countdown === 'GO!';

  let circleClass = 'step-3';
  let valClass = 'val-3';
  let tagline = 'Fastest answers score the highest bonus points!';
  let headline = isStarting ? 'GAME STARTING!' : 'NEXT QUESTION!';

  if (countdown === 2) {
    circleClass = 'step-2';
    valClass = 'val-2';
    tagline = 'Focus your eyes and get your thumbs ready!';
  } else if (countdown === 1) {
    circleClass = 'step-1';
    valClass = 'val-1';
    tagline = 'Lock in your answer the moment options appear!';
  } else if (isGo) {
    circleClass = 'step-go';
    valClass = 'val-go';
    tagline = 'TAP FAST FOR MAXIMUM POINTS!';
    headline = 'ROUND IS LIVE!';
  }

  return (
    <div className="quiz-countdown-overlay" role="dialog" aria-modal="true" aria-label="Question Countdown">
      <div className="quiz-countdown-card">
        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-black uppercase tracking-wider mb-2 shadow-lg shadow-cyan-950/40">
          <GiMustache className="text-base text-cyan-400" />
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
        </div>

        {/* Section Headline */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase mt-1">
          {headline}
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          {quizTitle}
        </p>

        {/* Giant Pulsating Countdown Circle */}
        <div className={`quiz-countdown-circle ${circleClass}`}>
          <div className="quiz-countdown-ripple" />
          <span className={`quiz-countdown-val ${valClass}`} key={String(countdown)}>
            {countdown}
          </span>
        </div>

        {/* Motivational Tip / Tagline */}
        <p className="text-sm font-bold text-slate-200 mt-2 px-4 h-6 flex items-center justify-center gap-1.5 transition-all">
          <FaBolt className={isGo ? 'text-emerald-400' : 'text-amber-400'} />
          <span>{tagline}</span>
        </p>

        {/* 3 Step Visual Indicators */}
        <div className="flex items-center gap-3 mt-6">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            countdown === 3 || isGo ? 'bg-cyan-400 shadow-[0_0_10px_#38bdf8] scale-125' : 'bg-white/20'
          }`} />
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            countdown === 2 || isGo ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24] scale-125' : 'bg-white/20'
          }`} />
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            countdown === 1 || isGo ? 'bg-rose-400 shadow-[0_0_10px_#f43f5e] scale-125' : 'bg-white/20'
          }`} />
        </div>
      </div>
    </div>
  );
}
