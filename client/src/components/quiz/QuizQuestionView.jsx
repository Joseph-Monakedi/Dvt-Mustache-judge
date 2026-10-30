import React from 'react';
import { FaClock, FaCheck } from 'react-icons/fa6';

export default function QuizQuestionView({
  gameState,
  question,
  timerSeconds,
  selectedOption,
  hasAnswered,
  onSelectAnswer
}) {
  const isTimeCritical = timerSeconds <= 5;

  const options = [
    {
      idx: 0,
      label: question.optionA,
      shape: '▲',
      colorName: 'red',
      bgClass: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700',
      borderClass: 'border-rose-400/40',
      shadowClass: 'shadow-rose-600/30'
    },
    {
      idx: 1,
      label: question.optionB,
      shape: '◆',
      colorName: 'blue',
      bgClass: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
      borderClass: 'border-blue-400/40',
      shadowClass: 'shadow-blue-600/30'
    },
    {
      idx: 2,
      label: question.optionC,
      shape: '●',
      colorName: 'yellow',
      bgClass: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950',
      borderClass: 'border-amber-300/40',
      shadowClass: 'shadow-amber-500/30'
    },
    {
      idx: 3,
      label: question.optionD,
      shape: '■',
      colorName: 'green',
      bgClass: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
      borderClass: 'border-emerald-400/40',
      shadowClass: 'shadow-emerald-600/30'
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto py-2 sm:py-4 animate-in fade-in">
      {/* Question Header & Timer Card */}
      <div className="p-4 sm:p-8 bg-[#0d1522] border border-white/10 rounded-2xl shadow-xl space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#131f33] text-cyan-300 border border-cyan-500/30">
            Question {(gameState?.currentQuestionIndex ?? 0) + 1} of {gameState?.totalQuestions || 12}
          </span>

          {/* Countdown timer badge */}
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-black text-sm transition-all ${
            isTimeCritical 
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse scale-105 shadow-lg shadow-rose-500/30' 
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}>
            <FaClock className={isTimeCritical ? 'text-rose-400' : 'text-cyan-400'} />
            <span className="font-mono text-base">{timerSeconds}s</span>
          </div>
        </div>

        {/* Question Prompt */}
        <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white leading-snug">
          {question.questionText}
        </h2>

        {/* Clue Image if present */}
        {question.imageUrl && (
          <div className="rounded-xl overflow-hidden max-h-40 sm:max-h-64 bg-slate-950 flex items-center justify-center border border-white/10">
            <img 
              src={question.imageUrl} 
              alt="Question Clue" 
              className="max-h-40 sm:max-h-64 object-contain"
            />
          </div>
        )}
      </div>

      {/* Answer Locked-In or Time Expired Banner */}
      {hasAnswered ? (
        <div className="flex items-center justify-center gap-2 p-3 bg-cyan-950/70 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs sm:text-sm font-semibold animate-in fade-in shadow-lg shadow-cyan-950/40">
          <FaCheck className="text-base text-cyan-400" />
          <span>
            {timerSeconds <= 0
              ? "Time's up! Revealing answers & scoring..."
              : "Answer Locked in! Waiting for round timer to expire..."}
          </span>
        </div>
      ) : timerSeconds <= 0 ? (
        <div className="flex items-center justify-center gap-2 p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm font-semibold animate-in fade-in shadow-lg shadow-rose-950/40">
          <FaClock className="text-base text-rose-400" />
          <span>Time's up! Revealing answers & scoring...</span>
        </div>
      ) : null}

      {/* 4 Answers Grid (Kahoot / Game Show Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => {
          const isSelected = selectedOption === opt.idx;
          return (
            <button
              key={opt.idx}
              type="button"
              disabled={hasAnswered || timerSeconds <= 0}
              onClick={() => onSelectAnswer(opt.idx)}
              className={`relative flex items-center gap-4 p-5 sm:p-6 rounded-2xl border text-left transition-all duration-200 select-none cursor-pointer shadow-lg ${opt.bgClass} ${opt.borderClass} ${opt.shadowClass} ${
                (hasAnswered || timerSeconds <= 0) && !isSelected ? 'opacity-40 grayscale-[40%]' : ''
              } ${
                isSelected 
                  ? 'ring-4 ring-white scale-[1.02] shadow-2xl brightness-110' 
                  : 'hover:scale-[1.01]'
              }`}
            >
              <span className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-2xl font-black shrink-0">
                {opt.shape}
              </span>
              <span className={`text-base sm:text-lg font-bold leading-tight flex-1 ${opt.colorName === 'yellow' ? 'text-slate-950' : 'text-white'}`}>
                {opt.label}
              </span>
              {isSelected && (
                <span className="w-7 h-7 rounded-full bg-white text-slate-950 flex items-center justify-center text-sm font-black shadow-md shrink-0">
                  <FaCheck />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
