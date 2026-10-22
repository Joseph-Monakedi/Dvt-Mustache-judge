import React from 'react';
import { FaCheck, FaXmark, FaArrowRight, FaTrophy } from 'react-icons/fa6';
import Button from '../common/Button';

export default function QuizAnswerRevealView({
  gameState,
  question,
  answerResult,
  joinedPlayer,
  scoreboardData,
  isAdmin,
  onAdminAction
}) {
  const isCorrect = answerResult?.isCorrect;
  const stats = gameState?.answerStats || {};

  const barData = [
    { label: '▲ Red', count: stats.countA ?? 0, isCorrect: question.correctOption === 0, color: 'bg-rose-500' },
    { label: '◆ Blue', count: stats.countB ?? 0, isCorrect: question.correctOption === 1, color: 'bg-blue-500' },
    { label: '● Yellow', count: stats.countC ?? 0, isCorrect: question.correctOption === 2, color: 'bg-amber-400' },
    { label: '■ Green', count: stats.countD ?? 0, isCorrect: question.correctOption === 3, color: 'bg-emerald-500' }
  ];

  const maxCount = Math.max(1, ...barData.map(b => b.count));

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4 animate-in fade-in">
      {/* 1. Personal Feedback Banner */}
      <div className={`p-6 rounded-2xl border flex items-center gap-5 shadow-xl ${
        isCorrect 
          ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200' 
          : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
      }`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-lg ${
          isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          {isCorrect ? <FaCheck /> : <FaXmark />}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">
            {isCorrect ? 'GENIUS! That is Correct!' : 'WRONG FOLLICLE! Incorrect.'}
          </h3>
          <p className="text-sm">
            {isCorrect 
              ? `+${answerResult?.pointsEarned || 850} points earned! Total score: ${joinedPlayer?.totalScore || 0} pts` 
              : 'Zero points this round. Shake it off for the next mustache!'}
          </p>
        </div>
      </div>

      {/* 2. Answer Distribution Bars */}
      <div className="p-6 sm:p-8 bg-[#0d1522] border border-white/10 rounded-2xl shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-white text-center">
          Round Answer Distribution
        </h3>

        <div className="grid grid-cols-4 gap-3 sm:gap-6 h-48 items-end pt-6 pb-2 border-b border-white/10">
          {barData.map((bar, idx) => {
            const heightPercent = Math.max(15, Math.round((bar.count / maxCount) * 100));
            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end gap-2">
                <div 
                  className={`w-full max-w-[64px] rounded-t-xl ${bar.color} transition-all duration-700 flex items-center justify-center font-bold text-xs shadow-lg relative ${
                    bar.isCorrect ? 'ring-2 ring-white shadow-cyan-500/50' : 'opacity-70'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  <span className="text-slate-950 font-black">{bar.count}</span>
                  {bar.isCorrect && (
                    <span className="absolute -top-3 w-5 h-5 rounded-full bg-white text-emerald-600 flex items-center justify-center text-[10px] font-black shadow-md">
                      ✓
                    </span>
                  )}
                </div>
                <span className={`text-xs font-bold text-center ${bar.isCorrect ? 'text-white' : 'text-slate-400'}`}>
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Correct option explanation */}
        <div className="text-center text-xs text-slate-300">
          <span className="text-emerald-400 font-bold">Correct Answer: </span>
          <span>{question[`option${['A','B','C','D'][question.correctOption]}`]}</span>
        </div>
      </div>

      {/* 3. Top 5 Leaderboard Standings */}
      {scoreboardData?.topPlayers && (
        <div className="p-6 bg-[#0d1522] border border-white/10 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FaTrophy className="text-amber-400" />
              <span>Round Scoreboard</span>
            </h3>
            <span className="text-xs text-slate-400">Top Contestants</span>
          </div>

          <div className="space-y-2">
            {scoreboardData.topPlayers.slice(0, 5).map((p, idx) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                  p.name === (joinedPlayer?.contestantName || user?.fullName)
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 font-bold'
                    : 'bg-[#131f33]/60 border-white/5 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                    idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-slate-400'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span>{p.name}</span>
                </div>
                <span className="font-mono font-bold text-cyan-400">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Host proceed action */}
      {isAdmin && (
        <div className="flex justify-center pt-2">
          <Button
            variant="primary"
            size="lg"
            icon={FaArrowRight}
            iconPosition="right"
            onClick={() => onAdminAction('next-question')}
            className="shadow-xl shadow-cyan-500/30"
          >
            Proceed to Next Question
          </Button>
        </div>
      )}
    </div>
  );
}
