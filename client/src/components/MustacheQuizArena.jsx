import React, { useState, useEffect, useRef } from 'react';
import { 
  FaGamepad, 
  FaPlay, 
  FaRotate, 
  FaTrophy, 
  FaFire, 
  FaCheck, 
  FaXmark, 
  FaClock, 
  FaUsers, 
  FaLock, 
  FaHandHoldingDollar,
  FaArrowRight,
  FaCrown,
  FaShieldHalved
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

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
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
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
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.8 }
          });
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
      <div className="quiz-join-container fade-in">
        <div className="quiz-join-card">
          <div className="quiz-brand-header">
            <div className="quiz-mustache-badge">
              <GiMustache className="quiz-brand-icon" />
            </div>
            <h1 className="quiz-join-title">Mustache Quiz Arena</h1>
            <p className="quiz-join-subtitle">
              High-speed facial hair trivia • 1000 points per round • Real-time speed scoring
            </p>
          </div>

          <div className="quiz-paywall-card" style={{ border: 'none', background: 'transparent', padding: '10px 0' }}>
            <div className="paywall-icon-wrap">
              <FaLock className="paywall-lock-icon" />
            </div>
            <span className="paywall-pill">Sign In Required</span>
            <h2>Sign In to Enter Quiz Arena</h2>
            <p>
              Please sign in or register to join the multiplayer Mustache Quiz Arena. Once signed in, you can unlock your pass and play live!
            </p>
            <div className="paywall-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="paywall-btn primary"
                onClick={() => openAuthModal('login')}
              >
                Sign In / Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Paywall Check if user is logged in but hasn't paid R50 quiz pass
  if (user && !user.quizPaid && !isAdmin) {
    return (
      <div className="quiz-paywall-container fade-in">
        <div className="quiz-paywall-card">
          <div className="paywall-icon-wrap">
            <FaLock className="paywall-lock-icon" />
          </div>
          <span className="paywall-pill">Movember Charity Pass</span>
          <h2>Mustache Quiz Arena Locked</h2>
          <p>
            Entry to the live multiplayer Mustache Quiz Arena requires the <strong>R50</strong> Movember charity donation. 
            All proceeds go directly to men's health, mental well-being, and cancer initiatives.
          </p>

          <div className="paywall-fee-card">
            <div className="fee-row">
              <span className="fee-name">Quiz Arena Pass</span>
              <span className="fee-amount">R50</span>
            </div>
            <div className="fee-instruction">
              Pay via SnapScan/EFT with reference <strong>MOVEM-{(user.fullName || '').replace(/\s+/g, '').toUpperCase()}</strong> and ask an admin to toggle your pass active in the Admin Portal.
            </div>
          </div>

          <div className="paywall-actions">
            <button 
              type="button" 
              className="paywall-btn primary"
              onClick={refreshUser}
            >
              <FaRotate className="btn-icon" /> Check Approval Status
            </button>
            <button 
              type="button" 
              className="paywall-btn secondary"
              onClick={onGoToDashboard}
            >
              <FaShieldHalved className="btn-icon" /> View My Vault & Payment Reference
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Joining / Enter PIN screen
  if (!joinedPlayer && gameState?.status !== 'Finished') {
    return (
      <div className="quiz-join-container fade-in">
        <div className="quiz-join-card">
          <div className="quiz-brand-header">
            <div className="quiz-mustache-badge">
              <GiMustache className="quiz-brand-icon" />
            </div>
            <h1 className="quiz-join-title">Mustache Quiz Arena</h1>
            <p className="quiz-join-subtitle">
              High-speed facial hair trivia • 1000 points per round • Real-time speed scoring
            </p>
          </div>

          {error && (
            <div className="quiz-error-box fade-in">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoinGame} className="quiz-join-form">
            <div className="form-group">
              <label htmlFor="quiz-pin" className="quiz-label">Game PIN (from Admin)</label>
              <input
                id="quiz-pin"
                type="text"
                className="quiz-input-pin"
                placeholder="Enter PIN from Admin"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                required
                maxLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="quiz-nick" className="quiz-label">Your Nickname</label>
              <input
                id="quiz-nick"
                type="text"
                className="quiz-input-name"
                placeholder="e.g. Tom Selleck"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                required
                maxLength={30}
              />
            </div>

            <div className="quiz-auth-user-badge">
              <FaCheck className="badge-icon-check" />
              <span>Entering as <strong>{user.fullName}</strong> • R50 Pass Active</span>
            </div>

            <button type="submit" className="quiz-enter-btn">
              <FaPlay className="btn-icon" /> Enter Quiz Arena
            </button>
          </form>

          {/* Admin host quick jump */}
          {isAdmin && (
            <div className="admin-host-banner">
              <span>👑 Host Controls Active</span>
              <button 
                type="button" 
                className="admin-mini-btn"
                onClick={() => handleAdminAction('start-lobby')}
              >
                Reset to Lobby
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Current Question
  const q = gameState?.currentQuestion;

  return (
    <div className="quiz-gameplay-container fade-in">
      {/* Top Header Bar */}
      <div className="quiz-top-bar">
        <div className="bar-player-info">
          <div className="player-avatar-mini">
            <GiMustache />
          </div>
          <div className="player-meta-mini">
            <span className="player-name-mini">{joinedPlayer?.contestantName || user?.fullName}</span>
            <span className="player-score-mini">{joinedPlayer?.totalScore || 0} pts</span>
          </div>
        </div>

        {/* Hot Streak Flame */}
        {(joinedPlayer?.streak || 0) > 1 && (
          <div className="streak-indicator fade-in">
            <FaFire className="streak-flame" />
            <span>{joinedPlayer.streak} IN A ROW!</span>
          </div>
        )}

        {/* Admin Host Floating Toolbar */}
        {isAdmin && (
          <div className="admin-host-toolbar">
            <span className="admin-tag">Host</span>
            {gameState?.status === 'Lobby' && (
              <button 
                type="button" 
                className="host-action-btn start-btn"
                onClick={() => handleAdminAction('next-question', { questionIndex: 0 })}
              >
                <FaPlay /> Start Question 1
              </button>
            )}
            {gameState?.status === 'Question' && (
              <button 
                type="button" 
                className="host-action-btn reveal-btn"
                onClick={() => handleAdminAction('reveal-round')}
              >
                Reveal Answer
              </button>
            )}
            {gameState?.status === 'AnswerReveal' && (
              <button 
                type="button" 
                className="host-action-btn next-btn"
                onClick={() => handleAdminAction('next-question')}
              >
                Next Question <FaArrowRight />
              </button>
            )}
            <button 
              type="button" 
              className="host-action-btn end-btn"
              onClick={() => handleAdminAction('end')}
              title="Calculate Final Podium"
            >
              <FaTrophy /> End Game
            </button>
          </div>
        )}
      </div>

      {/* 3. LOBBY SCREEN */}
      {gameState?.status === 'Lobby' && (
        <div className="quiz-lobby-screen fade-in">
          <div className="lobby-pin-card">
            <span className="lobby-pin-label">Join with Game PIN</span>
            <div className="lobby-pin-display">{gameState.pinCode || 'Pending PIN'}</div>
          </div>

          <div className="lobby-main-card">
            <div className="lobby-icon-animated">
              <GiMustache className="mustache-floating" />
            </div>
            <h2>{gameState.title || 'DVT Movember Mustache Quiz Arena'}</h2>
            <p className="lobby-instruction">
              Waiting for the host to launch Question 1... Get your fingers ready!
            </p>

            <div className="lobby-players-box">
              <div className="lobby-players-header">
                <FaUsers className="icon-users" />
                <span>Contestants Joined ({gameState.playerCount || 1})</span>
              </div>
              <div className="lobby-player-pills">
                <span className="player-lobby-pill highlight">
                  {joinedPlayer?.contestantName || user?.fullName} (You)
                </span>
                <span className="player-lobby-pill">Kgothatso M.</span>
                <span className="player-lobby-pill">Charl V.</span>
                <span className="player-lobby-pill">Liam O.</span>
                <span className="player-lobby-pill">Movember Hero</span>
              </div>
            </div>

            {isAdmin && (
              <button 
                type="button" 
                className="lobby-launch-btn"
                onClick={() => handleAdminAction('next-question', { questionIndex: 0 })}
              >
                <FaPlay className="btn-icon" /> Launch Game Now (8 Questions)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. ACTIVE QUESTION SCREEN */}
      {gameState?.status === 'Question' && q && (
        <div className="quiz-question-screen fade-in">
          {/* Question Banner & Timer */}
          <div className="question-header-card">
            <div className="question-meta-row">
              <span className="question-order-pill">
                Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
              </span>
              <div className={`countdown-timer-circle ${timerSeconds <= 5 ? 'timer-critical' : ''}`}>
                <FaClock className="timer-icon" />
                <span className="timer-number">{timerSeconds}</span>
              </div>
            </div>

            <h2 className="question-title-text">{q.questionText}</h2>

            {q.imageUrl && (
              <div className="question-media-wrap">
                <img src={q.imageUrl} alt="Question clue" className="question-img" />
              </div>
            )}
          </div>

          {/* Locked-In Answer Banner */}
          {hasAnswered && (
            <div className="locked-in-banner fade-in">
              <FaCheck className="locked-icon" />
              <span>Answer Locked in! Waiting for round timer to expire...</span>
            </div>
          )}

          {/* 4 COLOR/GEOMETRIC BUTTONS */}
          <div className="quiz-answers-grid">
            {/* Option A: Red Triangle */}
            <button
              type="button"
              className={`quiz-btn btn-red ${selectedOption === 0 ? 'selected' : ''}`}
              onClick={() => handleSelectAnswer(0)}
              disabled={hasAnswered}
            >
              <div className="shape-symbol shape-triangle">▲</div>
              <span className="option-text">{q.optionA}</span>
            </button>

            {/* Option B: Blue Diamond */}
            <button
              type="button"
              className={`quiz-btn btn-blue ${selectedOption === 1 ? 'selected' : ''}`}
              onClick={() => handleSelectAnswer(1)}
              disabled={hasAnswered}
            >
              <div className="shape-symbol shape-diamond">◆</div>
              <span className="option-text">{q.optionB}</span>
            </button>

            {/* Option C: Yellow Circle */}
            <button
              type="button"
              className={`quiz-btn btn-yellow ${selectedOption === 2 ? 'selected' : ''}`}
              onClick={() => handleSelectAnswer(2)}
              disabled={hasAnswered}
            >
              <div className="shape-symbol shape-circle">●</div>
              <span className="option-text">{q.optionC}</span>
            </button>

            {/* Option D: Green Square */}
            <button
              type="button"
              className={`quiz-btn btn-green ${selectedOption === 3 ? 'selected' : ''}`}
              onClick={() => handleSelectAnswer(3)}
              disabled={hasAnswered}
            >
              <div className="shape-symbol shape-square">■</div>
              <span className="option-text">{q.optionD}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. ANSWER REVEAL SCREEN */}
      {gameState?.status === 'AnswerReveal' && q && (
        <div className="quiz-reveal-screen fade-in">
          {/* Result Card for Player */}
          <div className={`personal-reveal-banner ${answerResult?.isCorrect ? 'reveal-correct' : 'reveal-incorrect'}`}>
            <div className="reveal-badge-icon">
              {answerResult?.isCorrect ? <FaCheck /> : <FaXmark />}
            </div>
            <div className="reveal-banner-text">
              <h3>{answerResult?.isCorrect ? 'GENIUS! That is Correct!' : 'WRONG FOLLICLE! Incorrect.'}</h3>
              <p>
                {answerResult?.isCorrect 
                  ? `+${answerResult?.pointsEarned || 850} points earned! Total score: ${joinedPlayer?.totalScore || 0}`
                  : 'Zero points this round. Shake it off for the next mustache!'}
              </p>
            </div>
          </div>

          {/* Reveal Distribution Stats */}
          <div className="reveal-stats-card">
            <h3>Answer Distribution</h3>
            <div className="stats-bars-row">
              <div className={`stats-bar-col ${q.correctOption === 0 ? 'is-correct-option' : ''}`}>
                <div className="bar-fill red" style={{ height: '70%' }}>
                  <span>{gameState.answerStats?.countA ?? 3}</span>
                </div>
                <span className="bar-label">▲ Red</span>
              </div>
              <div className={`stats-bar-col ${q.correctOption === 1 ? 'is-correct-option' : ''}`}>
                <div className="bar-fill blue" style={{ height: '40%' }}>
                  <span>{gameState.answerStats?.countB ?? 1}</span>
                </div>
                <span className="bar-label">◆ Blue</span>
              </div>
              <div className={`stats-bar-col ${q.correctOption === 2 ? 'is-correct-option' : ''}`}>
                <div className="bar-fill yellow" style={{ height: '55%' }}>
                  <span>{gameState.answerStats?.countC ?? 2}</span>
                </div>
                <span className="bar-label">● Yellow</span>
              </div>
              <div className={`stats-bar-col ${q.correctOption === 3 ? 'is-correct-option' : ''}`}>
                <div className="bar-fill green" style={{ height: '30%' }}>
                  <span>{gameState.answerStats?.countD ?? 1}</span>
                </div>
                <span className="bar-label">■ Green</span>
              </div>
            </div>
          </div>

          {/* Top 5 Leaderboard Standings */}
          {scoreboardData?.topPlayers && (
            <div className="round-scoreboard-card">
              <h3>Round Leaderboard</h3>
              <div className="scoreboard-list">
                {scoreboardData.topPlayers.slice(0, 5).map((p, idx) => (
                  <div key={p.id} className="scoreboard-row">
                    <span className="score-rank">#{idx + 1}</span>
                    <span className="score-name">{p.name}</span>
                    <span className="score-pts">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="reveal-host-actions">
              <button 
                type="button" 
                className="host-next-round-btn"
                onClick={() => handleAdminAction('next-question')}
              >
                Proceed to Next Question <FaArrowRight className="btn-icon" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. GRAND PODIUM CELEBRATION (Finished state) */}
      {gameState?.status === 'Finished' && (
        <div className="quiz-podium-screen fade-in">
          <div className="podium-header">
            <FaCrown className="podium-crown-icon" />
            <h1>Grand Mustache Quiz Champions!</h1>
            <p>Movember 2026 Trivia Crown Claimed</p>
          </div>

          {/* 3D Gold, Silver, Bronze Podium */}
          <div className="podium-stage">
            {/* 2nd Place: Silver */}
            <div className="podium-step step-silver">
              <div className="podium-player-badge">
                <span className="badge-name">
                  {scoreboardData?.topPlayers?.[1]?.name || 'Charl V.'}
                </span>
                <span className="badge-score">
                  {scoreboardData?.topPlayers?.[1]?.score || 5400} pts
                </span>
              </div>
              <div className="podium-pillar pillar-silver">
                <span className="pillar-rank">2</span>
              </div>
            </div>

            {/* 1st Place: Gold Champion */}
            <div className="podium-step step-gold">
              <div className="podium-player-badge winner">
                <FaCrown className="gold-crown" />
                <span className="badge-name">
                  {scoreboardData?.topPlayers?.[0]?.name || joinedPlayer?.contestantName || 'Liam O.'}
                </span>
                <span className="badge-score">
                  {scoreboardData?.topPlayers?.[0]?.score || 6850} pts
                </span>
              </div>
              <div className="podium-pillar pillar-gold">
                <span className="pillar-rank">1</span>
              </div>
            </div>

            {/* 3rd Place: Bronze */}
            <div className="podium-step step-bronze">
              <div className="podium-player-badge">
                <span className="badge-name">
                  {scoreboardData?.topPlayers?.[2]?.name || 'Kgothatso M.'}
                </span>
                <span className="badge-score">
                  {scoreboardData?.topPlayers?.[2]?.score || 4200} pts
                </span>
              </div>
              <div className="podium-pillar pillar-bronze">
                <span className="pillar-rank">3</span>
              </div>
            </div>
          </div>

          <div className="podium-actions">
            <button 
              type="button" 
              className="podium-btn primary"
              onClick={onGoToDashboard}
            >
              <GiMustache className="btn-icon" /> Back to My Mustache Vault
            </button>
            {isAdmin && (
              <button 
                type="button" 
                className="podium-btn reset-btn"
                onClick={() => handleAdminAction('reset-scores')}
              >
                Reset & Play Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
