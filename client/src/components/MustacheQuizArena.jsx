import React, { useState, useEffect, useRef } from 'react';
import { 
  FaLock, 
  FaRotate, 
  FaShieldHalved,
  FaArrowRightToBracket,
  FaUserPlus,
  FaBolt
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { initiatePayFastCheckout } from '../utils/payfast';
import Button from './common/Button';
import QuizTopBar from './quiz/QuizTopBar';
import QuizLobby from './quiz/QuizLobby';
import QuizQuestionView from './quiz/QuizQuestionView';
import QuizAnswerRevealView from './quiz/QuizAnswerRevealView';
import QuizPodiumView from './quiz/QuizPodiumView';
import QuizJoinCard from './quiz/QuizJoinCard';
import QuizLiveLeaderboard from './quiz/QuizLiveLeaderboard';
import QuizCountdownOverlay from './quiz/QuizCountdownOverlay';
import { playCountdownTone } from '../utils/quizAudio';

export default function MustacheQuizArena({ onGoToDashboard }) {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [isPaying, setIsPaying] = useState(false);
  
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
  const [showLiveLeaderboard, setShowLiveLeaderboard] = useState(false);

  // 3-2-1 Countdown & display tracking strictly from backend timestamps
  const [countdownValue, setCountdownValue] = useState(null);
  const lastCountdownQIndexRef = useRef(null);
  const wasCountdownRef = useRef(false);
  const lastToneRef = useRef(null);
  const goTimeoutRef = useRef(null);
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

  // Poll quiz state dynamically (1s during active Question, 1.2s in Lobby/AnswerReveal)
  useEffect(() => {
    fetchQuizState();
    const pollInterval = gameState?.status === 'Question' ? 1000 : 1200;
    const interval = setInterval(fetchQuizState, pollInterval);
    return () => clearInterval(interval);
  }, [gameState?.status]);

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

  // Synchronize question timer & countdown strictly from backend authoritative state
  useEffect(() => {
    if (gameState?.status === 'Question' && gameState?.currentQuestion) {
      const currentQIdx = gameState.currentQuestionIndex ?? 0;
      const isNewQuestion = lastCountdownQIndexRef.current !== currentQIdx;

      if (isNewQuestion) {
        lastCountdownQIndexRef.current = currentQIdx;
        setSelectedOption(null);
        setHasAnswered(false);
        setAnswerResult(null);
        lastToneRef.current = null;
      }

      if (gameState.isCountdown) {
        wasCountdownRef.current = true;
        const count = gameState.countdownSeconds || 3;
        setCountdownValue(count);
        if (lastToneRef.current !== count) {
          lastToneRef.current = count;
          playCountdownTone(count);
        }
        setTimerSeconds(gameState.remainingSeconds ?? gameState.currentQuestion.timeLimitSeconds ?? 20);
      } else {
        // Countdown finished or round already live
        if (wasCountdownRef.current) {
          wasCountdownRef.current = false;
          setCountdownValue('GO!');
          playCountdownTone('GO!');
          clearTimeout(goTimeoutRef.current);
          goTimeoutRef.current = setTimeout(() => {
            setCountdownValue(null);
          }, 450);
        } else {
          setCountdownValue(null);
        }

        const rem = typeof gameState.remainingSeconds === 'number'
          ? gameState.remainingSeconds
          : (gameState.currentQuestion.timeLimitSeconds || 20);
        setTimerSeconds(rem);
      }
    } else {
      wasCountdownRef.current = false;
      lastCountdownQIndexRef.current = null;
      setCountdownValue(null);
      clearTimeout(goTimeoutRef.current);
      if (gameState?.status === 'AnswerReveal') {
        fetchScoreboard();
      }
    }

    return () => {
      clearTimeout(goTimeoutRef.current);
    };
  }, [gameState?.currentQuestionIndex, gameState?.status, gameState?.isCountdown, gameState?.countdownSeconds, gameState?.remainingSeconds]);

  // Smooth local tick-down between backend polls (for UI display only - never executes game actions!)
  useEffect(() => {
    if (gameState?.status === 'Question' && !gameState?.isCountdown) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => Math.max(0, prev - 1));
      }, 1000);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [gameState?.status, gameState?.isCountdown, gameState?.currentQuestionIndex]);

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
    if (gameState?.isCountdown || countdownValue !== null || hasAnswered || !joinedPlayer || gameState?.status !== 'Question' || !gameState?.currentQuestion || timerSeconds <= 0) {
      return;
    }

    setSelectedOption(optionIndex);
    setHasAnswered(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiUrl('/api/quiz/answer'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          playerId: joinedPlayer.playerId,
          questionId: gameState.currentQuestion.id,
          selectedOption: optionIndex
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

      const payload = endpoint === 'reveal-round' && !body.questionId
        ? { questionIndex: gameState?.currentQuestionIndex, questionId: gameState?.currentQuestion?.id, ...body }
        : body;

      await fetch(apiUrl(`/api/quiz/admin/${endpoint}`), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
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
      <div className="quiz-entry-wrapper animate-in fade-in">
        <div className="quiz-entry-card auth-modal-card scale-in space-y-6">
          <div className="auth-header">
            <div className="auth-logo-badge">
              <GiMustache className="auth-mustache-icon" />
            </div>
            <h1 className="auth-title">Mustache Quiz Arena</h1>
            <p className="auth-subtitle">
              High-speed facial hair trivia • 1,000 points per round • Real-time speed scoring
            </p>
          </div>

          <div className="auth-movember-notice !bg-cyan-950/40 !border-cyan-500/30 !text-cyan-100 flex items-start gap-3">
            <FaLock className="text-cyan-400 text-base shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <div className="font-bold text-white uppercase tracking-wider text-[11px]">Sign In Required</div>
              <p className="text-slate-300">
                Please sign in or register to join the multiplayer Mustache Quiz Arena. Once signed in, you can unlock your pass and play live!
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={FaArrowRightToBracket}
              className="flex-1 shadow-lg shadow-cyan-500/25"
              onClick={() => openAuthModal('login')}
            >
              Sign In
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={FaUserPlus}
              className="flex-1"
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
    return (
      <div className="quiz-entry-wrapper animate-in fade-in">
        <div className="quiz-entry-card auth-modal-card scale-in space-y-6">
          <div className="auth-header">
            <div className="auth-logo-badge">
              <FaLock className="auth-mustache-icon" />
            </div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-2">
              Movember Charity Pass
            </span>
            <h2 className="auth-title">Mustache Quiz Arena Locked</h2>
            <p className="auth-subtitle">
              Entry to the live multiplayer Mustache Quiz Arena requires the <strong className="text-white">R50</strong> Movember charity donation. All proceeds support men's health initiatives.
            </p>
          </div>

          <div className="p-4 bg-[#070c14]/90 border border-white/10 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Quiz Arena Pass</span>
              <span className="text-lg font-black text-white">R50</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pay securely online with Cards, Instant EFT, SnapScan, or Zapper. Your quiz pass activates immediately upon payment!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={FaBolt}
              className="flex-1 shadow-lg shadow-cyan-500/25"
              disabled={isPaying}
              onClick={async () => {
                try {
                  setIsPaying(true);
                  await initiatePayFastCheckout({
                    itemType: 'Quiz',
                    token,
                    returnPath: '/quiz?payment=success',
                    cancelPath: '/quiz?payment=cancelled'
                  });
                } catch (e) {
                  setIsPaying(false);
                }
              }}
            >
              {isPaying ? 'Connecting to PayFast...' : 'Pay R50 via PayFast & Play'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={FaShieldHalved}
              className="flex-1"
              onClick={onGoToDashboard}
            >
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Joining / Enter PIN screen
  if (!joinedPlayer && gameState?.status !== 'Finished') {
    return (
      <>
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
          onOpenLeaderboard={() => setShowLiveLeaderboard(true)}
        />
        {showLiveLeaderboard && (
          <QuizLiveLeaderboard 
            isModal={true} 
            onClose={() => setShowLiveLeaderboard(false)} 
          />
        )}
      </>
    );
  }

  // Current Question
  const q = gameState?.currentQuestion;

  return (
    <div className="quiz-gameplay-container max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in">
      {/* 3-2-1 Countdown Overlay when quiz starts and when next question is about to show */}
      {countdownValue !== null && (
        <QuizCountdownOverlay
          countdown={countdownValue}
          currentQuestionIndex={gameState?.currentQuestionIndex ?? 0}
          totalQuestions={gameState?.totalQuestions || 8}
          quizTitle={gameState?.title}
        />
      )}

      {/* Top Header Bar (active gameplay only) */}
      {gameState?.status !== 'Finished' && (
        <QuizTopBar
          joinedPlayer={joinedPlayer}
          user={user}
          isAdmin={isAdmin}
          gameState={gameState}
          onAdminAction={handleAdminAction}
          onOpenLeaderboard={() => setShowLiveLeaderboard(true)}
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

      {/* Live Leaderboard Modal Popup */}
      {showLiveLeaderboard && (
        <QuizLiveLeaderboard 
          isModal={true} 
          onClose={() => setShowLiveLeaderboard(false)} 
        />
      )}
    </div>
  );
}
