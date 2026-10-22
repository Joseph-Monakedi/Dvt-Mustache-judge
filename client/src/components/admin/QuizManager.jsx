import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaPen, 
  FaTrash, 
  FaRotate, 
  FaCheck, 
  FaGamepad, 
  FaKey, 
  FaClock, 
  FaStar, 
  FaCircleCheck, 
  FaTriangleExclamation,
  FaArrowRight,
  FaXmark,
  FaListOl,
  FaTrophy
} from 'react-icons/fa6';
import { apiUrl } from '../../utils/api';
import Button from '../common/Button';
import Modal from '../common/Modal';
import QuizLiveLeaderboard from '../quiz/QuizLiveLeaderboard';

export default function QuizManager({ adminPassword, onQuizChanged }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeManagerTab, setActiveManagerTab] = useState('questions'); // 'questions' | 'scores'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Question Modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 0,
    timeLimitSeconds: 20,
    points: 1000,
    imageUrl: '',
    questionOrder: 1
  });
  const [savingQuestion, setSavingQuestion] = useState(false);

  // New Quiz Modal state
  const [showNewQuizModal, setShowNewQuizModal] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('Movember Mustache Quiz Arena');
  const [newQuizPin, setNewQuizPin] = useState('');
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Password': adminPassword || sessionStorage.getItem('dvt_admin_token') || 'dvt-movember-admin-2026'
  });

  // Fetch all quizzes
  const fetchQuizzes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/quiz/admin/quizzes'), {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`Failed to load quizzes (${res.status})`);
      const data = await res.json();
      setQuizzes(data);
      if (data.length > 0 && !selectedQuizId) {
        setSelectedQuizId(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Error fetching quizzes.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions for selected quiz
  const fetchQuestions = async (quizId) => {
    if (!quizId) return;
    try {
      const res = await fetch(apiUrl(`/api/quiz/admin/quizzes/${quizId}/questions`), {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.warn('Error fetching questions:', err);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      fetchQuestions(selectedQuizId);
    }
  }, [selectedQuizId]);

  // Open Question Modal for Add
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 0,
      timeLimitSeconds: 20,
      points: 1000,
      imageUrl: '',
      questionOrder: questions.length + 1
    });
    setShowQuestionModal(true);
  };

  // Open Question Modal for Edit
  const handleOpenEditQuestion = (q) => {
    if (!q) return;
    setEditingQuestion(q);
    setQuestionForm({
      questionText: q.questionText || '',
      optionA: q.optionA || '',
      optionB: q.optionB || '',
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0,
      timeLimitSeconds: q.timeLimitSeconds || 20,
      points: q.points || 1000,
      imageUrl: q.imageUrl || '',
      questionOrder: q.questionOrder || 1
    });
    setShowQuestionModal(true);
  };

  // Save Question (Create or Update)
  const handleSaveQuestion = async (e) => {
    e?.preventDefault();
    setSavingQuestion(true);
    setError('');

    try {
      const url = editingQuestion
        ? apiUrl(`/api/quiz/admin/questions/${editingQuestion.id}`)
        : apiUrl(`/api/quiz/admin/quizzes/${selectedQuizId}/questions`);

      const method = editingQuestion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(questionForm)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save question (${res.status})`);
      }

      setSuccessMsg(editingQuestion ? 'Question updated successfully!' : 'New question added!');
      setShowQuestionModal(false);
      await fetchQuestions(selectedQuizId);
      await fetchQuizzes();
      onQuizChanged?.();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error saving question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(apiUrl(`/api/quiz/admin/questions/${qId}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setSuccessMsg('Question deleted.');
        await fetchQuestions(selectedQuizId);
        await fetchQuizzes();
        onQuizChanged?.();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete question.');
    }
  };

  // Reset to Official 12 Movember Questions
  const handleSeedOfficialQuestions = async () => {
    if (!selectedQuizId) return;
    if (!window.confirm('Reset this quiz to the official 12 Movember trivia questions? This will replace all existing questions for this quiz.')) return;

    try {
      const res = await fetch(apiUrl(`/api/quiz/admin/quizzes/${selectedQuizId}/seed-official-questions`), {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setSuccessMsg('Successfully loaded official 12 Movember questions into database!');
        await fetchQuestions(selectedQuizId);
        await fetchQuizzes();
        onQuizChanged?.();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError('Error resetting questions.');
    }
  };

  // Create New Quiz Tournament
  const handleCreateQuiz = async (e) => {
    e?.preventDefault();
    setCreatingQuiz(true);
    try {
      const res = await fetch(apiUrl('/api/quiz/admin/quizzes'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: newQuizTitle,
          pinCode: newQuizPin
        })
      });

      if (!res.ok) throw new Error('Failed to create quiz tournament.');
      const data = await res.json();
      setSuccessMsg('New Quiz Tournament created with 12 questions!');
      setShowNewQuizModal(false);
      setNewQuizPin('');
      await fetchQuizzes();
      if (data.quizId) setSelectedQuizId(data.quizId);
      onQuizChanged?.();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Error creating quiz.');
    } finally {
      setCreatingQuiz(false);
    }
  };

  // Activate Quiz
  const handleActivateQuiz = async (quizId) => {
    try {
      const res = await fetch(apiUrl(`/api/quiz/admin/quizzes/${quizId}/activate`), {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setSuccessMsg('Quiz tournament activated for players!');
        setSelectedQuizId(quizId);
        await fetchQuizzes();
        onQuizChanged?.();
        setTimeout(() => setSuccessMsg(''), 3500);
      }
    } catch (err) {
      setError('Failed to activate quiz.');
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to permanently delete this quiz tournament and all its questions and player scores?')) return;
    try {
      const res = await fetch(apiUrl(`/api/quiz/admin/quizzes/${quizId}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setSuccessMsg('Quiz tournament deleted.');
        await fetchQuizzes();
        onQuizChanged?.();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete quiz.');
    }
  };

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

  return (
    <div className="space-y-6 pt-4 animate-in fade-in">
      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm font-semibold">
          <FaCircleCheck className="text-emerald-400 text-lg shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-sm font-semibold">
          <FaTriangleExclamation className="text-rose-400 text-lg shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quiz Selector & Tournament Manager Header */}
      <div className="p-6 bg-[#0d1522] border border-white/10 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block mb-1">
              Database Quiz Management
            </span>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <FaGamepad className="text-cyan-400" />
              <span>{selectedQuiz?.title || 'Mustache Quiz Tournament'}</span>
            </h3>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant={activeManagerTab === 'scores' ? 'accent' : 'secondary'}
              size="sm"
              icon={FaTrophy}
              onClick={(e) => {
                e?.stopPropagation?.();
                setActiveManagerTab(prev => prev === 'scores' ? 'questions' : 'scores');
              }}
            >
              {activeManagerTab === 'scores' ? 'View Questions' : 'Live Tournament Scoring'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={FaPlus}
              onClick={(e) => {
                e?.stopPropagation?.();
                setShowNewQuizModal(true);
              }}
            >
              Add New Quiz
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={FaRotate}
              onClick={handleSeedOfficialQuestions}
              title="Replace with official 12 Movember questions"
            >
              Reset to 12 Official Questions
            </Button>
          </div>
        </div>

        {/* Tournament Pills List */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
          {quizzes.map((q) => {
            const isSelected = q.id === selectedQuizId;
            return (
              <div
                key={q.id}
                onClick={() => setSelectedQuizId(q.id)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all shrink-0 min-w-[200px] ${
                  isSelected
                    ? 'bg-cyan-950/50 border-cyan-400 ring-2 ring-cyan-500/30'
                    : 'bg-[#131f33]/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-xs text-white truncate">{q.title}</span>
                  <span className="text-[10px] font-mono font-bold bg-[#070c14] px-1.5 py-0.5 rounded text-cyan-300 border border-white/10">
                    PIN: {q.pinCode}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{q.questionCount} Questions</span>
                  <span className={`font-semibold ${q.status === 'Lobby' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {q.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Quiz Action Bar */}
        {selectedQuiz && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span>Game PIN: <strong className="text-white font-mono text-sm">{selectedQuiz.pinCode}</strong></span>
              <span>•</span>
              <span>Total Questions: <strong className="text-cyan-400">{questions.length}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/25 transition-colors"
                onClick={() => handleActivateQuiz(selectedQuiz.id)}
              >
                Set as Active Live Quiz
              </button>
              {quizzes.length > 1 && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold hover:bg-rose-500/25 transition-colors"
                  onClick={() => handleDeleteQuiz(selectedQuiz.id)}
                >
                  Delete Quiz
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-navigation tabs: Questions Editor vs Live Quiz Scoring */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveManagerTab('questions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeManagerTab === 'questions'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FaListOl className="text-sm" />
          <span>Questions Editor ({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveManagerTab('scores')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeManagerTab === 'scores'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FaTrophy className="text-sm text-amber-400" />
          <span>Live Quiz Scoring</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>
      </div>

      {activeManagerTab === 'scores' ? (
        <div className="space-y-4 animate-in fade-in">
          <QuizLiveLeaderboard embedded={true} />
        </div>
      ) : (
        <>
          {/* Questions List Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <FaListOl className="text-cyan-400 text-base" />
                <span>Questions for this Quiz ({questions.length})</span>
              </h4>
              <p className="text-xs text-slate-400">
                Contestants answer these multiple choice questions in sequence during live arena rounds.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={FaPlus}
              onClick={(e) => {
                e?.stopPropagation?.();
                handleOpenAddQuestion();
              }}
            >
              Add New Question
            </Button>
          </div>

          {/* Questions Grid / List */}
          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="p-10 bg-[#0d1522] border border-white/10 rounded-2xl text-center space-y-3">
                <FaGamepad className="text-3xl text-slate-500 mx-auto" />
                <h4 className="text-white font-bold">No Questions Found</h4>
                <p className="text-xs text-slate-400">
                  Click "Add New Question" or "Reset to 12 Official Questions" above to populate trivia questions.
                </p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-5 bg-[#0d1522] border border-white/10 rounded-2xl space-y-3 hover:border-cyan-500/30 transition-colors shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                        #{idx + 1}
                      </span>
                      <div>
                        <h5 className="text-base font-bold text-white leading-snug">
                          {q.questionText}
                        </h5>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <FaClock className="text-slate-500 text-[10px]" /> {q.timeLimitSeconds}s Limit
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FaStar className="text-amber-400 text-[10px]" /> {q.points} Points
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={FaPen}
                        onClick={(e) => {
                          e?.stopPropagation?.();
                          handleOpenEditQuestion(q);
                        }}
                        title="Edit Question"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={FaTrash}
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="Delete Question"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    {[
                      { label: q.optionA, letter: 'A', shape: '▲', color: 'border-rose-500/30 text-rose-300', isCorrect: q.correctOption === 0 },
                      { label: q.optionB, letter: 'B', shape: '◆', color: 'border-blue-500/30 text-blue-300', isCorrect: q.correctOption === 1 },
                      { label: q.optionC, letter: 'C', shape: '●', color: 'border-amber-500/30 text-amber-300', isCorrect: q.correctOption === 2 },
                      { label: q.optionD, letter: 'D', shape: '■', color: 'border-emerald-500/30 text-emerald-300', isCorrect: q.correctOption === 3 }
                    ].map((opt, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          opt.isCorrect 
                            ? 'bg-emerald-950/50 border-emerald-400 text-emerald-200 font-bold ring-1 ring-emerald-400/50' 
                            : 'bg-[#131f33]/40 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-400">{opt.shape} {opt.letter}:</span>
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {opt.isCorrect && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title={editingQuestion ? 'Edit Quiz Question' : 'Add New Quiz Question'}
        subtitle="Configure question text, 4 multiple choice options, and mark the correct answer."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Question Prompt
            </label>
            <textarea
              className="w-full px-4 py-2.5 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white text-sm outline-none resize-none h-20"
              placeholder="e.g. Which moustache style is named after a sea mammal?"
              value={questionForm.questionText}
              onChange={(e) => setQuestionForm(prev => ({ ...prev, questionText: e.target.value }))}
              required
            />
          </div>

          {/* Options A, B, C, D */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Answer Options & Correct Answer
            </label>

            {[
              { key: 'optionA', letter: 'A', shape: '▲', color: 'text-rose-400' },
              { key: 'optionB', letter: 'B', shape: '◆', color: 'text-blue-400' },
              { key: 'optionC', letter: 'C', shape: '●', color: 'text-amber-400' },
              { key: 'optionD', letter: 'D', shape: '■', color: 'text-emerald-400' }
            ].map((opt, idx) => {
              const isChecked = questionForm.correctOption === idx;
              return (
                <div key={opt.key} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuestionForm(prev => ({ ...prev, correctOption: idx }))}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border transition-all ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-[#131f33] border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title={`Mark Option ${opt.letter} as Correct`}
                  >
                    {isChecked ? <FaCheck /> : opt.letter}
                  </button>

                  <input
                    type="text"
                    className="flex-1 px-4 py-2 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
                    placeholder={`Option ${opt.letter} text`}
                    value={questionForm[opt.key]}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, [opt.key]: e.target.value }))}
                    required
                  />
                </div>
              );
            })}
            <p className="text-[11px] text-slate-400 italic">
              Click the square button (A, B, C, D) to designate which answer is correct.
            </p>
          </div>

          {/* Time & Points */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                className="w-full px-4 py-2 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
                value={questionForm.timeLimitSeconds}
                onChange={(e) => setQuestionForm(prev => ({ ...prev, timeLimitSeconds: parseInt(e.target.value) || 20 }))}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Points Value
              </label>
              <input
                type="number"
                min="100"
                max="5000"
                step="100"
                className="w-full px-4 py-2 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
                value={questionForm.points}
                onChange={(e) => setQuestionForm(prev => ({ ...prev, points: parseInt(e.target.value) || 1000 }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="secondary"
              onClick={() => setShowQuestionModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingQuestion}
              icon={FaCheck}
            >
              Save Question
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Tournament / Quiz Modal */}
      <Modal
        isOpen={showNewQuizModal}
        onClose={() => setShowNewQuizModal(false)}
        title="Add New Quiz Tournament"
        subtitle="Creates a new tournament seeded with the official 12 Movember questions."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateQuiz} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Tournament Title
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white text-sm outline-none"
              placeholder="e.g. DVT Friday Movember Trivia"
              value={newQuizTitle}
              onChange={(e) => setNewQuizTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Custom Game PIN (optional)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-[#070c14] border border-white/10 focus:border-cyan-400 rounded-xl text-white font-mono text-sm outline-none"
              placeholder="Leave blank for random PIN"
              value={newQuizPin}
              onChange={(e) => setNewQuizPin(e.target.value)}
              maxLength={8}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              variant="secondary"
              onClick={() => setShowNewQuizModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={creatingQuiz}
              icon={FaCheck}
            >
              Create Tournament
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
