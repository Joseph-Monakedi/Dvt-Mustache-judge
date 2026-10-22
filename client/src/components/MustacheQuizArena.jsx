import React, { useState, useEffect, useRef } from 'react';
import { 
  FaLock, 
  FaRotate, 
  FaShieldHalved,
  FaArrowRightToBracket,
  FaUserPlus
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import Button from './common/Button';
import QuizTopBar from './quiz/QuizTopBar';
import QuizLobby from './quiz/QuizLobby';
import QuizQuestionView from './quiz/QuizQuestionView';
import QuizAnswerRevealView from './quiz/QuizAnswerRevealView';
import QuizPodiumView from './quiz/QuizPodiumView';
import QuizJoinCard from './quiz/QuizJoinCard';

export default function MustacheQuizArena({ onGoToDashboard }) {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  
  // Game session states
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Player state
  const [joinedPlayer, setJoinedPlayer] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dvt_quiz_player');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pinInput, setPinInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState(user?.fullName || '');
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [scoreboardData, setScoreboardData] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(20);

  const questionStartTimeRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);

  // Synchronize nickname with user
  useEffect(() => {
    if (user?.fullName && !nicknameInput) {
      setNicknameInput(user.fullName);
    }
  }, [user]);

  // Fetch current quiz state from API
  const fetchQuizState = async () => {
    try {
      const res = await fetch(apiUrl('/api/quiz/current'));
      if (!res.ok) {
        throw new Error('No active quiz found.');
      }
      const data = await res.json();
      setGameState(data);
      return data;
    } catch (err) {
      console.warn('Error fetching quiz state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll quiz state every 2.5 seconds
  useEffect(() => {
    fetchQuizState();
    const interval = setInterval(fetchQuizState, 2500);
    return () => clearInterval(interval);
  }, []);

  // Fetch scoreboard when in AnswerReveal or Finished
  const fetchScoreboard = async (playerId = joinedPlayer?.playerId) => {
    try {
      const url = playerId 
        ? apiUrl(`/api/quiz/scoreboard?playerId=${playerId}`)
        : apiUrl('/api/quiz/scoreboard');
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setScoreboardData(data);
      }
    } catch (err) {
      console.warn('Scoreboard fetch error:', err);
    }
  };

  // Trigger Confetti on Podium (Finished state)
  useEffect(() => {
    if (gameState?.status === 'Finished') {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
      fetchScoreboard();
    }
  }, [gameState?.status]);

  // When question changes, reset answer selection and countdown
  useEffect(() => {
    if (gameState?.status === 'Question' && gameState?.currentQuestion) {
      setSelectedOption(null);
      setHasAnswered(false);
      setAnswerResult(null);
      questionStartTimeRef.current = Date.now();

      const limit = gameState.currentQuestion.timeLimitSeconds || 20;
      setTimerSeconds(limit);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (gameState?.status === 'AnswerReveal') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      fetchScoreboard();
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState?.currentQuestionIndex, gameState?.status]);

  // Join Game
  const handleJoinGame = async (e) => {
    e?.preventDefault();
    setError('');

    const nameToUse = nicknameInput.trim() || user?.fullName || 'Contestant';
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl('/api/quiz/join'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pin: pinInput.trim(),
          name: nameToUse
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.paywall) {
          throw new Error(data.error || 'R50 Movember Quiz Pass required. Please request admin activation.');
        }
        throw new Error(data.error || 'Failed to join quiz.');
      }

      const playerInfo = {
        playerId: data.playerId,
        quizId: data.quizId,
        contestantName: data.contestantName,
        totalScore: data.totalScore || 0,
        streak: data.streak || 0
      };

      setJoinedPlayer(playerInfo);
      sessionStorage.setItem('dvt_quiz_player', JSON.stringify(playerInfo));
      fetchQuizState();
    } catch (err) {
      setError(err.message || 'Unable to join quiz session.');
    }
  };

  // Submit Answer
  const handleSelectAnswer = async (optionIndex) => {
    if (hasAnswered || !joinedPlayer || gameState?.status !== 'Question' || !gameState?.currentQuestion) {
      return;
    }

    setSelectedOption(optionIndex);
    setHasAnswered(true);

    const responseTimeMs = Date.now() - questionStartTimeRef.current;

    try {
      const res = await fetch(apiUrl('/api/quiz/answer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: joinedPlayer.playerId,
          questionId: gameState.currentQuestion.id,
          selectedOption: optionIndex,
          responseTimeMs
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAnswerResult(data);
        
        // Update local player stats
        setJoinedPlayer(prev => prev ? {
          ...prev,
          totalScore: data.totalScore,
          streak: data.streak
        } : null);

        if (data.isCorrect) {
          try {
            confetti({
              particleCount: 40,
              spread: 50,
              origin: { y: 0.8 }
            });
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn('Answer submit error:', err);
    }
  };

  // Admin Host controls
  const handleAdminAction = async (endpoint, body = {}) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Admin-Password': sessionStorage.getItem('dvt_admin_token') || 'dvt-movember-admin-2026'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(apiUrl(`/api/quiz/admin/${endpoint}`), {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      fetchQuizState();
      fetchScoreboard();
    } catch (err) {
      console.warn(`Admin action ${endpoint} error:`, err);
    }
  };

  const isAdmin = user?.role === 'Admin' || Boolean(sessionStorage.getItem('dvt_admin_token'));

  // 1. Gate Check if user is not logged in
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 animate-in fade-in">
        <div className="max-w-md w-full bg-[#0d1522] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-3xl shadow-lg shadow-cyan-950/50">
            <GiMustache />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white">Mustache Quiz Arena</h1>
            <p className="text-xs text-slate-400">
              High-speed facial hair trivia • 1000 points per round • Real-time speed scoring
            </p>
          </div>

          <div className="p-5 bg-[#070c14]/80 border border-white/10 rounded-xl space-y-3 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-lg">
              <FaLock />
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Sign In Required
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Please sign in or register to join the multiplayer Mustache Quiz Arena. Once signed in, you can unlock your pass and play live!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              icon={FaArrowRightToBracket}
              onClick={() => openAuthModal('login')}
            >
              Sign In
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={FaUserPlus}
              onClick={() => openAuthModal('register')}
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Paywall Check if user is logged in but hasn't paid R50 quiz pass
  if (user && !user.quizPaid && !isAdmin) {
    const reference = `MOVEM-${(user.fullName || '').replace(/\s+/g, '').toUpperCase()}`;
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 animate-in fade-in">
        <div className="max-w-lg w-full bg-[#0d1522] border border-cyan-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl shadow-cyan-950/50">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-3xl shadow-lg shadow-cyan-950/50">
            <FaLock />
          </div>

          <div className="space-y-1">
            <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Movember Charity Pass
            </span>
            <h2 className="text-2xl font-black text-white">Mustache Quiz Arena Locked</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Entry to the live multiplayer Mustache Quiz Arena requires the <strong className="text-white">R50</strong> Movember charity donation. All proceeds go directly to men's health, mental well-being, and cancer initiatives.
            </p>
          </div>

          <div className="p-4 bg-[#070c14]/80 border border-white/10 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Quiz Arena Pass</span>
              <span className="text-lg font-black text-white">R50</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pay via SnapScan/EFT with reference <strong className="text-cyan-300 font-mono bg-cyan-950 px-1 py-0.5 rounded border border-cyan-500/30">{reference}</strong> and ask an admin to toggle your pass active in the Admin Portal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="md"
              icon={FaRotate}
              onClick={refreshUser}
            >
              Check Approval Status
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={FaShieldHalved}
              onClick={onGoToDashboard}
            >
              View My Vault
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Joining / Enter PIN screen
  if (!joinedPlayer && gameState?.status !== 'Finished') {
    return (
      <QuizJoinCard
        pinInput={pinInput}
        setPinInput={setPinInput}
        nicknameInput={nicknameInput}
        setNicknameInput={setNicknameInput}
        user={user}
        error={error}
        isAdmin={isAdmin}
        onJoinGame={handleJoinGame}
        onAdminAction={handleAdminAction}
      />
    );
  }

  // Current Question
  const q = gameState?.currentQuestion;

  return (
    <div className="quiz-gameplay-container max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in">
      {/* Top Header Bar (active gameplay only) */}
      {gameState?.status !== 'Finished' && (
        <QuizTopBar
          joinedPlayer={joinedPlayer}
          user={user}
          isAdmin={isAdmin}
          gameState={gameState}
          onAdminAction={handleAdminAction}
        />
      )}

      {/* 4. LOBBY SCREEN */}
      {gameState?.status === 'Lobby' && (
        <QuizLobby
          gameState={gameState}
          joinedPlayer={joinedPlayer}
          user={user}
          isAdmin={isAdmin}
          onAdminAction={handleAdminAction}
        />
      )}

      {/* 5. ACTIVE QUESTION SCREEN */}
      {gameState?.status === 'Question' && q && (
        <QuizQuestionView
          gameState={gameState}
          question={q}
          timerSeconds={timerSeconds}
          selectedOption={selectedOption}
          hasAnswered={hasAnswered}
          onSelectAnswer={handleSelectAnswer}
        />
      )}

      {/* 6. ANSWER REVEAL SCREEN */}
      {gameState?.status === 'AnswerReveal' && q && (
        <QuizAnswerRevealView
          gameState={gameState}
          question={q}
          answerResult={answerResult}
          joinedPlayer={joinedPlayer}
          scoreboardData={scoreboardData}
          isAdmin={isAdmin}
          onAdminAction={handleAdminAction}
        />
      )}

      {/* 7. GRAND PODIUM CELEBRATION (Finished state) */}
      {gameState?.status === 'Finished' && (
        <QuizPodiumView
          scoreboardData={scoreboardData}
          joinedPlayer={joinedPlayer}
          isAdmin={isAdmin}
          onGoToDashboard={onGoToDashboard}
          onAdminAction={handleAdminAction}
        />
      )}
    </div>
  );
}
