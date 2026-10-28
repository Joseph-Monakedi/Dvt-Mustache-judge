import React, { useState, useEffect } from 'react';
import { 
  FaCamera, 
  FaTrophy, 
  FaRotate, 
  FaCircleCheck, 
  FaClock, 
  FaCircleInfo, 
  FaCalendarDays,
  FaStar,
  FaXmark,
  FaUpload,
  FaUserPlus,
  FaArrowRightToBracket,
  FaRightFromBracket,
  FaHandHoldingHeart
} from 'react-icons/fa6';
import { HiSparkles } from 'react-icons/hi2';
import { GiMustache } from 'react-icons/gi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { confirmPayFastReturn } from '../utils/payfast';
import confetti from 'canvas-confetti';
import Button from './common/Button';
import DayOneCleanShaveModal from './dashboard/DayOneCleanShaveModal';
import VaultEntryCard from './dashboard/VaultEntryCard';
import CharityPaymentModal from './dashboard/CharityPaymentModal';

export default function UserDashboard({ onGoToBooth, onGoToLeaderboard, onGoToQuiz, onSelectEntry }) {
  const navigate = useNavigate();
  const { user, token, refreshUser, openAuthModal, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/leaderboard');
  };
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
        throw new Error(`Failed to load dashboard data (${res.status})`);
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Unable to load your dashboard.');
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
            title: 'Donation Confirmed!',
            message: '🎉 Your donation was verified and your account is marked eligible for the R1,000 Grand Prize!'
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
        title: 'Checkout Cancelled',
        message: 'Donation checkout was cancelled. You can donate via Rose Allen anytime.'
      });
    }
  }, [token]);

  // Real-time synchronization when donation approval occurs
  useEffect(() => {
    if (token) {
      fetchDashboard();
    }
  }, [user?.leaderboardPaid, user?.isPrizeEligible, user?.amountPaid, user?.cleanShaveImageUrl]);

  if (!user) {
    return (
      <div className="dashboard-login-gate fade-in min-h-[60vh] flex items-center justify-center p-4">
        <div className="gate-card max-w-lg w-full bg-[#0d1522] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
          <div className="gate-icon-wrap w-20 h-20 mx-auto mb-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-4xl shadow-lg shadow-cyan-950/50">
            <GiMustache className="gate-icon" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign In to View Your Dashboard</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Track your best score, view past judging results, check your grand prize eligibility status, and submit new photos!
          </p>
          <div className="gate-actions flex flex-col sm:flex-row gap-3 justify-center">
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
              Create Free Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCrazyHair = user.preferredCompetition === 'CrazyHair';
  const isEligible = user.isPrizeEligible || user.leaderboardPaid || (user.amountPaid >= 100);
  const hasBaseline = Boolean(user.cleanShaveImageUrl || dashboardData?.cleanShaveImageUrl);
  const baselineDate = user.cleanShaveUploadedAt || dashboardData?.cleanShaveUploadedAt;

  return (
    <div className="user-dashboard-container fade-in max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Donation Notification Banner */}
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
            <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr ${
              isCrazyHair ? 'from-purple-600 to-pink-500 shadow-purple-500/30 border-purple-300/40' : 'from-[#007FBA] to-[#00b4d8] shadow-cyan-500/30 border-cyan-300/40'
            } flex items-center justify-center text-white text-4xl shadow-lg border-2`}>
              {isCrazyHair ? <HiSparkles /> : <GiMustache />}
            </div>
          </div>
          <div className="profile-details space-y-1">
            <div className="profile-badge-row flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#131f33] ${
                isCrazyHair ? 'text-purple-300 border-purple-500/30' : 'text-cyan-300 border-cyan-500/30'
              } border`}>
                {isCrazyHair ? <HiSparkles className="pill-icon" /> : <GiMustache className="pill-icon" />}
                {isCrazyHair ? 'The Mane Event Contestant' : 'Movember Mustache Contestant'}
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
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Sign out of your account"
              >
                <FaRightFromBracket className="text-xs" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Grand Prize Eligibility & Donation Status Card */}
        <div className="payment-status-card bg-[#070c14]/80 border border-white/10 rounded-xl p-4 sm:p-5 min-w-[300px] space-y-3">
          <div className="payment-header flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Grand Prize Status
            </span>
            <button 
              type="button" 
              className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                !isEligible
                  ? 'text-amber-300 hover:text-amber-200 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold'
              }`}
              onClick={() => setShowPaymentInfo(true)}
              title="View donation details and Grand Prize eligibility"
            >
              {isEligible ? (
                <>
                  <FaCircleCheck className="text-emerald-400" /> R1,000 Eligible
                </>
              ) : (
                <>
                  <FaHandHoldingHeart className="text-amber-400" /> Donation Info
                </>
              )}
            </button>
          </div>

          <div className={`p-3 rounded-lg border text-xs ${
            isEligible 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-start gap-2.5">
              <div className="text-base shrink-0 mt-0.5">
                {isEligible ? <FaCircleCheck className="text-emerald-400" /> : <FaClock className="text-amber-400" />}
              </div>
              <div className="space-y-0.5">
                <span className="block font-bold text-white text-[11px]">
                  {isEligible ? '🏆 Eligible for R1,000 Takealot Voucher' : '🎗️ Community Participant'}
                </span>
                <span className="block text-[10px] text-slate-300 leading-normal">
                  {isEligible 
                    ? 'Your donation has been approved. You are eligible to win the grand prize!' 
                    : 'Donate R100+ via Rose Allen to qualify for the R1,000 Takealot Voucher.'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Prostate Cancer Fund:</span>
            <button
              type="button"
              onClick={() => setShowPaymentInfo(true)}
              className="text-cyan-400 hover:underline font-bold"
            >
              How to Donate →
            </button>
          </div>
        </div>
      </div>

      {/* Clean Shave Baseline Management Card (Only required for Mustache Track) */}
      {!isCrazyHair ? (
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
                    ? 'Day 1 Clean Shave Baseline' 
                    : 'Day 1 Clean Shave Baseline (Recommended)'}
                </h3>
                {hasBaseline ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <FaCircleCheck className="text-[10px]" /> Baseline Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <FaClock className="text-[10px]" /> Growth Baseline
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {hasBaseline
                  ? 'Your baseline is recorded. Future mustache entries are evaluated against this photo to measure follicle growth and transformation.'
                  : 'Snap a clean-shaven selfie to establish your starting baseline. Your future mustache growth will be judged alongside this photo!'}
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
              className={!hasBaseline ? 'shadow-cyan-500/30' : ''}
            >
              {hasBaseline ? 'Replace Baseline Photo' : 'Upload or Snap Clean Shave'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/30 via-[#0d1522] to-pink-950/30 border border-purple-500/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-2xl shrink-0">
              <HiSparkles />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>The Mane Event: Crazy Hair Track</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">Active</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                No clean shave baseline is needed! Enter with crazy, colorful, creative hair styles whenever you like.
              </p>
            </div>
          </div>
          <Button variant="primary" size="md" icon={FaCamera} onClick={onGoToBooth}>
            Enter Crazy Hair
          </Button>
        </div>
      )}

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

        {/* Competition Track */}
        <div className="dash-stat-card bg-[#0d1522] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-purple-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl shrink-0">
            {isCrazyHair ? <HiSparkles /> : <GiMustache />}
          </div>
          <div>
            <span className="block text-base font-extrabold text-white truncate">
              {isCrazyHair ? 'The Mane Event' : 'Mustache Challenge'}
            </span>
            <span className="block text-xs font-medium text-slate-400">
              {dashboardData?.leaderboardRank ? `Rank #${dashboardData.leaderboardRank}` : 'Joined Track'}
            </span>
          </div>
        </div>

        {/* Grand Prize Eligibility */}
        <div className="dash-stat-card bg-[#0d1522] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shrink-0">
            <FaTrophy />
          </div>
          <div>
            <span className={`block text-base font-black ${isEligible ? 'text-emerald-400' : 'text-amber-300'}`}>
              {isEligible ? 'R1,000 Eligible' : 'Community Entry'}
            </span>
            <span className="block text-xs font-medium text-slate-400">
              {isEligible ? 'Min R100 Donated' : 'Donate R100 to Win'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar Header */}
      <div className="dashboard-action-bar flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="action-bar-left space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-3">
            <span>My Submissions</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
              {dashboardData?.entries?.length ?? 0} attempts
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Submit as many entries as you like. Only your highest-scoring submission is featured on the live leaderboard!
          </p>
        </div>

        <div className="action-bar-buttons flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button 
            variant="primary"
            icon={FaCamera}
            onClick={onGoToBooth}
          >
            {isCrazyHair ? 'New Crazy Hair Attempt' : 'New Mustache Attempt'}
          </Button>

          <Button 
            variant="ghost"
            icon={FaRotate}
            onClick={fetchDashboard}
            title="Refresh Submissions"
            className={loading ? 'animate-spin' : ''}
          />
        </div>
      </div>

      {/* Entries List / Grid */}
      {loading ? (
        <div className="dashboard-loading py-20 text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading your submissions...</p>
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
            {isCrazyHair ? <HiSparkles className="empty-icon" /> : <GiMustache className="empty-icon" />}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No Submissions Yet</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              You haven't submitted a photo yet! Enter the booth now to see your AI score.
            </p>
          </div>
          <Button 
            variant="primary" 
            size="lg" 
            icon={FaCamera} 
            onClick={onGoToBooth}
            className="shadow-xl shadow-cyan-500/25"
          >
            Enter the Booth
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

      {/* Donation & Grand Prize Instructions Modal */}
      <CharityPaymentModal
        isOpen={showPaymentInfo}
        onClose={() => setShowPaymentInfo(false)}
        userName={user.fullName}
        leaderboardPaid={user.leaderboardPaid}
        isPrizeEligible={user.isPrizeEligible}
        amountPaid={user.amountPaid}
      />
    </div>
  );
}
