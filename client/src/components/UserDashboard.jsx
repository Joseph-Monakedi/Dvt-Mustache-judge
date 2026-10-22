import React, { useState, useEffect } from 'react';
import { 
  FaCamera, 
  FaTrophy, 
  FaRotate, 
  FaCircleCheck, 
  FaClock, 
  FaGamepad, 
  FaCircleInfo, 
  FaCalendarDays,
  FaStar,
  FaXmark,
  FaUpload,
  FaUserPlus,
  FaArrowRightToBracket,
  FaBolt
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { confirmPayFastReturn } from '../utils/payfast';
import confetti from 'canvas-confetti';
import Button from './common/Button';
import DayOneCleanShaveModal from './dashboard/DayOneCleanShaveModal';
import VaultEntryCard from './dashboard/VaultEntryCard';
import CharityPaymentModal from './dashboard/CharityPaymentModal';

export default function UserDashboard({ onGoToBooth, onGoToLeaderboard, onGoToQuiz, onSelectEntry }) {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [showCleanShaveModal, setShowCleanShaveModal] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState(null);

  const fetchDashboard = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('/api/mustache/my-entries'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          openAuthModal('login');
          return;
        }
        throw new Error(`Failed to load vault data (${res.status})`);
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Unable to load your mustache vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboard();
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Handle PayFast callback URL query params (?payment=success or ?payment=cancelled)
  useEffect(() => {
    if (!token) return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
      const ref = urlParams.get('ref') || sessionStorage.getItem('dvt_last_payfast_ref');
      const item = urlParams.get('item') || sessionStorage.getItem('dvt_last_payfast_item');

      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('dvt_last_payfast_ref');
      sessionStorage.removeItem('dvt_last_payfast_item');

      confirmPayFastReturn({ reference: ref, itemType: item, token })
        .then(async () => {
          await refreshUser();
          await fetchDashboard();
          setPaymentBanner({
            type: 'success',
            title: 'PayFast Payment Confirmed!',
            message: '🎉 Your payment was verified successfully and your entry has been automatically approved!'
          });
          try {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.3 } });
          } catch {}
        })
        .catch(async () => {
          await refreshUser();
          await fetchDashboard();
        });
    } else if (paymentStatus === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setPaymentBanner({
        type: 'warning',
        title: 'PayFast Checkout Cancelled',
        message: 'Your payment was cancelled. You can retry at any time whenever you are ready.'
      });
    }
  }, [token]);

  // Real-time synchronization when payment approval occurs
  useEffect(() => {
    if (token) {
      fetchDashboard();
    }
  }, [user?.leaderboardPaid, user?.quizPaid, user?.cleanShaveImageUrl]);

  if (!user) {
    return (
      <div className="dashboard-login-gate fade-in min-h-[60vh] flex items-center justify-center p-4">
        <div className="gate-card max-w-lg w-full bg-[#0d1522] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
          <div className="gate-icon-wrap w-20 h-20 mx-auto mb-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-4xl shadow-lg shadow-cyan-950/50">
            <GiMustache className="gate-icon" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign In to View Your Mustache Vault</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Track your personal best score, review past AI judging roasts, manage your entry status, and resubmit new facial hair attempts at any time!
          </p>
          <div className="gate-actions flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="primary"
              size="lg"
              icon={FaArrowRightToBracket}
              onClick={() => openAuthModal('login')}
            >
              Sign In to Your Vault
            </Button>
            <Button 
              variant="secondary"
              size="lg"
              icon={FaUserPlus}
              onClick={() => openAuthModal('register')}
            >
              Create New Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasBaseline = Boolean(user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl);
  const baselineDate = user.cleanShaveUploadedAt || dashboardData?.cleanShaveUploadedAt;

  return (
    <div className="user-dashboard-container fade-in max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* PayFast Payment Notification Banner */}
      {paymentBanner && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 fade-in ${
          paymentBanner.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/40'
            : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            {paymentBanner.type === 'success' ? (
              <FaCircleCheck className="text-emerald-400 text-2xl shrink-0" />
            ) : (
              <FaCircleInfo className="text-amber-400 text-2xl shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-white text-sm">{paymentBanner.title}</h4>
              <p className="text-xs text-slate-300">{paymentBanner.message}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setPaymentBanner(null)} 
            className="text-slate-400 hover:text-white p-1"
            aria-label="Dismiss message"
          >
            <FaXmark />
          </button>
        </div>
      )}

      {/* Dashboard Top Header Banner */}
      <div className="dashboard-profile-banner flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 sm:p-8 bg-[#0d1522] border border-white/10 rounded-2xl shadow-xl">
        <div className="profile-main-info flex items-center gap-5">
          <div className="profile-avatar-wrap relative shrink-0">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#007FBA] to-[#00b4d8] flex items-center justify-center text-white text-4xl shadow-lg shadow-cyan-500/30 border-2 border-cyan-300/40">
              <GiMustache className="profile-avatar-icon" />
            </div>
          </div>
          <div className="profile-details space-y-1">
            <div className="profile-badge-row flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#131f33] text-cyan-300 border border-cyan-500/30">
                <GiMustache className="pill-icon" /> Movember Contestant
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-white/5 text-slate-400 border border-white/5">
                <FaCalendarDays className="pill-icon" /> Joined Movember 2026
              </span>
            </div>
            <h1 className="profile-name text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {user.fullName}
            </h1>
            <p className="profile-email text-sm text-slate-400 font-mono">
              {user.email}
            </p>
          </div>
        </div>

        {/* Charity & Fee Status Badges */}
        <div className="payment-status-card bg-[#070c14]/80 border border-white/10 rounded-xl p-4 sm:p-5 min-w-[280px] space-y-3">
          <div className="payment-header flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Charity Entry Passes
            </span>
            <button 
              type="button" 
              className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                (!user.leaderboardPaid || !user.quizPaid)
                  ? 'text-amber-300 hover:text-amber-200 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold shadow-sm'
                  : 'text-cyan-400 hover:text-cyan-300'
              }`}
              onClick={() => setShowPaymentInfo(true)}
              title="Pay entry fee via PayFast"
            >
              {(!user.leaderboardPaid || !user.quizPaid) ? (
                <>
                  <FaBolt className="text-amber-400" /> Pay via PayFast
                </>
              ) : (
                <>
                  <FaCircleCheck className="text-emerald-400" /> Passes Active
                </>
              )}
            </button>
          </div>

          <div className="status-pills-wrap grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Leaderboard R100 Status */}
            <div className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${
              user.leaderboardPaid 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}>
              <div className="text-base shrink-0">
                {user.leaderboardPaid ? <FaCircleCheck className="text-emerald-400" /> : <FaClock className="text-amber-400" />}
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-white text-[11px]">Leaderboard (R100)</span>
                <span className="block truncate text-[10px]">
                  {user.leaderboardPaid ? 'Approved & Live' : 'Payment Pending'}
                </span>
              </div>
            </div>

            {/* Quiz R50 Status */}
            <div className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${
              user.quizPaid 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}>
              <div className="text-base shrink-0">
                {user.quizPaid ? <FaCircleCheck className="text-emerald-400" /> : <FaClock className="text-amber-400" />}
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-white text-[11px]">Quiz Pass (R50)</span>
                <span className="block truncate text-[10px]">
                  {user.quizPaid ? 'Pass Active' : 'Pass Pending'}
                </span>
              </div>
            </div>
          </div>

          {!user.leaderboardPaid && (
            <p className="text-[11px] text-slate-400 italic">
              * Pay R100 to unlock your single highest score on the public office leaderboard!
            </p>
          )}
        </div>
      </div>

      {/* Day 1 Clean Shave Baseline Management Card */}
      <div className={`dashboard-cleanshave-banner flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-7 rounded-2xl border transition-all ${
        hasBaseline 
          ? 'bg-[#0d1522] border-emerald-500/30 shadow-lg' 
          : 'bg-gradient-to-r from-[#0d1522] via-[#101b2c] to-[#0d1522] border-cyan-500/40 shadow-xl shadow-cyan-950/30'
      }`}>
        <div className="cleanshave-banner-left flex items-start gap-4 sm:gap-5">
          {hasBaseline ? (
            <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-lg group">
              <img 
                src={user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl} 
                alt="Day 1 Clean Shave Baseline" 
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-emerald-300 text-[9px] font-black text-center py-0.5 tracking-wider uppercase">
                Day 1
              </span>
            </div>
          ) : (
            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cyan-500/10 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-400 text-3xl shadow-lg shadow-cyan-500/20 animate-pulse">
              <FaCamera className="cleanshave-icon" />
            </div>
          )}

          <div className="cleanshave-banner-info space-y-1.5 max-w-2xl">
            <div className="cleanshave-header-row flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {hasBaseline 
                  ? 'Day 1 Clean Shave Baseline (Active)' 
                  : 'Day 1 Clean Shave Baseline Required'}
              </h3>
              {hasBaseline ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <FaCircleCheck className="text-[10px]" /> Registered & Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <FaClock className="text-[10px]" /> Needed for Growth Scoring
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {hasBaseline
                ? 'Your baseline is locked in! All subsequent mustache entries are evaluated alongside this clean-shave photo to track follicle density evolution and calculate your Growth Score.'
                : 'Upload or snap your clean-shaven face from Day 1 of Movember. All future submissions will be judged alongside this picture to calculate your follicle growth transformation!'}
            </p>

            {baselineDate && (
              <span className="inline-block text-xs font-medium text-slate-400">
                Baseline saved: {new Date(baselineDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>

        <div className="cleanshave-banner-right shrink-0">
          <Button 
            variant={hasBaseline ? 'secondary' : 'primary'}
            size="md"
            icon={hasBaseline ? FaUpload : FaCamera}
            onClick={() => setShowCleanShaveModal(true)}
            className={!hasBaseline ? 'shadow-cyan-500/30 animate-pulse' : ''}
          >
            {hasBaseline ? 'Replace Baseline Photo' : 'Upload or Snap Clean Shave'}
          </Button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="dashboard-stats-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <div className="dash-stat-card bg-[#0d1522] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-cyan-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl shrink-0">
            <FaCamera />
          </div>
          <div>
            <span className="block text-2xl font-black text-white">{dashboardData?.totalSubmissions ?? 0}</span>
            <span className="block text-xs font-medium text-slate-400">Total Submissions</span>
          </div>
        </div>

        {/* Personal Best */}
        <div className="dash-stat-card bg-[#0d1522] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-yellow-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shrink-0">
            <FaStar />
          </div>
          <div>
            <span className="block text-2xl font-black text-white">{dashboardData?.bestScore ?? 0}</span>
            <span className="block text-xs font-medium text-slate-400">Personal Best Score</span>
          </div>
        </div>

        {/* Leaderboard Standing */}
        <div className="dash-stat-card bg-[#0d1522] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-purple-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl shrink-0">
            <FaTrophy />
          </div>
          <div>
            <span className="block text-2xl font-black text-white">
              {dashboardData?.leaderboardRank ? `#${dashboardData.leaderboardRank}` : user.leaderboardPaid ? 'Unranked' : 'Pending R100'}
            </span>
            <span className="block text-xs font-medium text-slate-400">Leaderboard Standing</span>
          </div>
        </div>

        {/* Quiz Arena Pass */}
        <div className="dash-stat-card bg-[#0d1522] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shrink-0">
            <FaGamepad />
          </div>
          <div>
            <span className="block text-2xl font-black text-white">
              {user.quizPaid ? 'Ready' : 'Locked'}
            </span>
            <span className="block text-xs font-medium text-slate-400">Quiz Arena Pass</span>
          </div>
        </div>
      </div>

      {/* Action Bar Header */}
      <div className="dashboard-action-bar flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="action-bar-left space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-3">
            <span>My Mustache Vault</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              {dashboardData?.entries?.length ?? 0} attempts
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Submit as many entries as you like. Only your highest-scoring mustache is submitted to the leaderboard!
          </p>
        </div>

        <div className="action-bar-buttons flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button 
            variant="primary"
            icon={FaCamera}
            onClick={onGoToBooth}
          >
            New Mustache Attempt
          </Button>

          <Button 
            variant="secondary"
            icon={FaGamepad}
            onClick={onGoToQuiz}
          >
            Mustache Quiz Arena
          </Button>

          <Button 
            variant="ghost"
            icon={FaRotate}
            onClick={fetchDashboard}
            title="Refresh Vault"
            className={loading ? 'animate-spin' : ''}
          />
        </div>
      </div>

      {/* Entries List / Grid */}
      {loading ? (
        <div className="dashboard-loading py-20 text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading your mustache portfolio...</p>
        </div>
      ) : error ? (
        <div className="dashboard-error bg-rose-950/40 border border-rose-500/30 rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto">
          <p className="text-sm text-rose-300">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      ) : !dashboardData?.entries || dashboardData.entries.length === 0 ? (
        <div className="dashboard-empty-vault bg-[#0d1522] border border-white/10 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-5 shadow-xl">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-4xl shadow-lg shadow-cyan-950/50">
            <GiMustache className="empty-icon" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Your Vault is Empty</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              You haven't stepped before the AI facial hair judge yet! Take a photo with the webcam booth now to start building your record.
            </p>
          </div>
          <Button 
            variant="primary" 
            size="lg" 
            icon={FaCamera} 
            onClick={onGoToBooth}
            className="shadow-xl shadow-cyan-500/25"
          >
            Step into the Booth
          </Button>
        </div>
      ) : (
        <div className="vault-entries-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData.entries.map((entry) => (
            <VaultEntryCard 
              key={entry.id} 
              entry={entry} 
              onSelectEntry={onSelectEntry} 
            />
          ))}
        </div>
      )}

      {/* Reusable Clean Shave Capture / Upload Modal */}
      <DayOneCleanShaveModal
        isOpen={showCleanShaveModal}
        onClose={() => setShowCleanShaveModal(false)}
        onSuccess={() => {
          fetchDashboard();
          refreshUser();
        }}
      />

      {/* Payment Instructions Modal */}
      <CharityPaymentModal
        isOpen={showPaymentInfo}
        onClose={() => setShowPaymentInfo(false)}
        userName={user.fullName}
        leaderboardPaid={user.leaderboardPaid}
        quizPaid={user.quizPaid}
      />
    </div>
  );
}
