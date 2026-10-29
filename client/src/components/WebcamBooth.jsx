import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GiMustache } from 'react-icons/gi';
import { 
  FaCamera, 
  FaRotate, 
  FaScaleBalanced, 
  FaArrowRight, 
  FaArrowDown, 
  FaCircleCheck, 
  FaLock, 
  FaHandHoldingDollar,
  FaClock,
  FaUserCheck,
  FaBolt,
  FaHeart
} from 'react-icons/fa6';
import { MdOutlineWarningAmber } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { initiatePayFastCheckout } from '../utils/payfast';

export default function WebcamBooth({ onJudgeSubmit, isSubmitting }) {
  const navigate = useNavigate();
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState(user?.fullName || '');
  
  const getInitialCompetitionType = () => {
    if (user?.preferredCompetition) {
      const isUserCreative = user.preferredCompetition.toLowerCase().includes('creative') || user.preferredCompetition.toLowerCase().includes('hair');
      return isUserCreative ? 'CreativeMustache' : 'Mustache';
    }
    const trackParam = searchParams.get('track') || searchParams.get('division') || searchParams.get('competition');
    if (trackParam && (trackParam.toLowerCase().includes('creative') || trackParam.toLowerCase().includes('hair'))) {
      return 'CreativeMustache';
    }
    return 'Mustache';
  };

  const [competitionType, setCompetitionType] = useState(getInitialCompetitionType);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState('user');
  const [validationError, setValidationError] = useState('');
  const [savingCleanShave, setSavingCleanShave] = useState(false);
  const [cleanShaveSuccess, setCleanShaveSuccess] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detailsCardRef = useRef(null);

  const scrollToDetails = () => {
    if (detailsCardRef.current && window.innerWidth <= 768) {
      setTimeout(() => {
        detailsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const userFullName = user?.fullName;
  const userPreferredComp = user?.preferredCompetition;

  // Registered contestants can only enter the track they signed up for (managed in Dashboard)
  useEffect(() => {
    if (userFullName && !name) {
      setName(userFullName);
    }
    if (userPreferredComp) {
      const isUserCreative = userPreferredComp.toLowerCase().includes('creative') || userPreferredComp.toLowerCase().includes('hair');
      setCompetitionType(isUserCreative ? 'CreativeMustache' : 'Mustache');
    }
  }, [userFullName, userPreferredComp, name]);

  const isCreative = competitionType === 'CreativeMustache' || competitionType === 'CrazyHair';
  const hasCleanShave = Boolean(user?.cleanShaveImageUrl);
  const needsCleanShave = !isCreative && !hasCleanShave;

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    // If stream is already active and tracks are running with correct facingMode, do not restart
    if (streamRef.current && streamRef.current.active && videoRef.current?.srcObject === streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === 'live') {
        return;
      }
    }

    try {
      setCameraError(null);
      setIsCameraInitializing(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported on this browser/device.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name !== 'AbortError') {
              console.warn('Auto-play prevented:', err);
            }
          });
        }
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access issue:', err);
      setCameraError('Camera access is required. Please allow camera permissions in your browser to take your photo.');
      setCameraActive(false);
    } finally {
      setIsCameraInitializing(false);
    }
  }, [facingMode]);

  const isAuth = Boolean(user);

  // Initialize camera when user is authenticated or camera orientation toggles
  useEffect(() => {
    if (isAuth) {
      startCamera();
    }
  }, [isAuth, facingMode, startCamera]);

  // Clean up hardware media stream tracks ONLY when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const maxDim = 1200;
    let targetW = width;
    let targetH = height;

    if (targetW > maxDim) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    if (facingMode === 'user') {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, targetW, targetH);

    canvas.toBlob(
      blob => {
        if (blob) {
          setCapturedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setValidationError('');
          scrollToDetails();
        }
      },
      'image/jpeg',
      0.85
    );
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
    setValidationError('');
    if (!cameraActive) {
      startCamera();
    }
  };

  // Step 1: Save Clean Shave Baseline (only for Mustache growers)
  const handleSaveCleanShaveBaseline = async () => {
    if (!capturedBlob) {
      setValidationError('Please snap or upload your clean-shaven face first.');
      return;
    }

    setSavingCleanShave(true);
    setValidationError('');
    setCleanShaveSuccess('');

    try {
      const formData = new FormData();
      formData.append('image', capturedBlob, `cleanshave_${Date.now()}.jpg`);

      const res = await fetch(apiUrl('/api/mustache/clean-shave'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save clean shave baseline.');
      }

      setCleanShaveSuccess('Day 1 Clean Shave baseline registered! Proceed to submit your mustache growth entries.');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setCapturedBlob(null);
      setPreviewUrl(null);
      await refreshUser();
    } catch (err) {
      setValidationError(err.message || 'Error uploading clean shave baseline.');
    } finally {
      setSavingCleanShave(false);
    }
  };

  // Step 2: Submit Entry
  const handleSubmitEntry = e => {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError('Contestant name is required.');
      scrollToDetails();
      return;
    }
    if (name.trim().length < 2) {
      setValidationError('Name must be at least 2 characters long.');
      scrollToDetails();
      return;
    }
    if (!capturedBlob) {
      setValidationError(isCreative ? 'Please snap a photo of your creative mustache.' : 'Please snap a photo of your mustache.');
      return;
    }

    setValidationError('');
    onJudgeSubmit({
      name: name.trim(),
      imageBlob: capturedBlob,
      competitionType
    });
  };

  // 1. GATE: Unauthenticated user
  if (!user) {
    return (
      <div className="booth-container fade-in">
        <div className="booth-header">
          <h1 className="booth-title">
            Enter the Competition <GiMustache className="title-stache-icon" />
          </h1>
          <p className="booth-subtitle">
            Sign in or register to join the competition and submit your entries.
          </p>
        </div>

        <div className="quiz-paywall-container fade-in">
          <div className="quiz-paywall-card">
            <div className="paywall-icon-wrap">
              <FaLock className="paywall-lock-icon" />
            </div>
            <span className="paywall-pill">Contestant Access</span>
            <h2>Sign In Required to Enter</h2>
            <p>
              Free entry for all! Sign in or create your free account to submit your photos for AI judging and join the live leaderboard.
            </p>

            <div className="paywall-actions" style={{ marginTop: '24px' }}>
              <button 
                type="button" 
                className="paywall-btn primary"
                onClick={() => openAuthModal('login')}
              >
                <FaUserCheck className="btn-icon" /> Sign In / Register
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN BOOTH: Completely free access for all registered contestants!
  return (
    <div className="booth-container fade-in">
      {/* Registered Contestant Track Banner (One enters the track signed up for at registration) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mb-6 rounded-2xl bg-slate-900/90 border border-slate-700/70 shadow-lg max-w-4xl mx-auto">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
            isCreative 
              ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-900/40' 
              : 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-900/40'
          }`}>
            {isCreative ? <span>🎨</span> : <GiMustache className="text-2xl" />}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Your Registered Track:
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                isCreative 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isCreative ? 'Creative Challenge' : 'Movember Mustache'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {isCreative 
                ? 'Judging faux, paper, prop, and creative mustaches for women and supporters.' 
                : 'Judging natural facial hair and grooming growth.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-white/10 hover:border-cyan-500/40 hover:text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          title="Switch competition track in your dashboard"
        >
          <span>Switch Track in Dashboard</span>
          <span className="text-xs">→</span>
        </button>
      </div>

      {/* Donation & Prize Eligibility Banner */}
      <div className="mb-6 max-w-4xl mx-auto">
        {user?.isPrizeEligible ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-200">
            <FaCircleCheck className="text-emerald-400 text-lg flex-shrink-0" />
            <div>
              <strong className="text-emerald-300">🏆 Grand Prize Eligible (Donated):</strong> Your donation is confirmed! You are officially in the running for the <strong>R1,000 Takealot Voucher</strong> in this challenge track.
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-start sm:items-center gap-2.5">
              <FaHeart className="text-rose-400 text-base flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold text-amber-400">🎗️ Free Community Entry:</span> Open to everyone for free! To be eligible to win the <strong>R1,000 Takealot Voucher</strong>, donate a minimum of R100 towards prostate cancer research.
              </div>
            </div>
            <div className="flex-shrink-0 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs text-slate-300">
              <span className="text-cyan-300 font-bold">EFT:</span> FNB • Acc: <strong className="text-white font-mono">625 3333 8621</strong> (POP to <a href="mailto:marketing@dvtsoftware.com" className="text-cyan-400 underline hover:text-cyan-300 font-medium">marketing@dvtsoftware.com</a>)
            </div>
          </div>
        )}
      </div>

      {/* Participant Style Guide Quick Callout */}
      {!isCreative && (
        <div className="mb-6 max-w-4xl mx-auto">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                <GiMustache className="text-cyan-400 text-xl" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Official Moustache Style Guide</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    6 Mzansi Styles
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  The Larnie • The French-Cut • The Upper-Lip • The Buffalo • The Chops • The Whale Tale
                </p>
              </div>
            </div>
            <Link
              to="/style-guide"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all whitespace-nowrap self-start sm:self-auto"
            >
              <span>Explore Style Guide</span>
              <FaArrowRight className="text-[10px]" />
            </Link>
          </div>
        </div>
      )}

      <div className="booth-header">
        <h1 className="booth-title">
          {isCreative ? (
            <>Creative Mustache Challenge 🎨</>
          ) : needsCleanShave ? (
            <>Step 1: Capture Day 1 Clean Shave Baseline <GiMustache className="title-stache-icon" /></>
          ) : (
            <>Enter Movember Mustache Challenge <GiMustache className="title-stache-icon" /></>
          )}
        </h1>
        <p className="booth-subtitle">
          {isCreative
            ? 'Women can participate too by taking part in the creative challenge! Craft a wild, funny, or inventive mustache using wigs, paper, cotton, cardboard, drawings, or surprise items. The more creative the better! Grand Prize: R1,000 Takealot Voucher!'
            : needsCleanShave
              ? 'Before entering the mustache contest, snap a fresh clean-shaven photo. This baseline is saved to your profile and used to evaluate your growth over time.'
              : 'Submit as many photos as you want! Growth is evaluated alongside your clean-shave baseline, and only your single highest score is featured on the leaderboard.'}
        </p>
      </div>

      <div className="booth-layout">
        {/* Left: Camera Viewport */}
        <div className="viewport-card">
          <div className="viewport-screen">
            {previewUrl ? (
              <div className="snapshot-preview">
                <img src={previewUrl} alt="Contestant Preview" className="preview-image" />
                <div className="preview-badge">
                  {needsCleanShave 
                    ? 'Clean Shave Snapshot Ready' 
                    : (isCreative ? 'Creative Mustache Snapshot Ready' : 'Mustache Snapshot Ready')}
                </div>
                <div className="snapshot-overlay-actions">
                  <button 
                    type="button" 
                    className="retake-button" 
                    onClick={handleRetake}
                    disabled={isSubmitting || savingCleanShave}
                  >
                    <FaRotate className="btn-icon" /> Retake
                  </button>
                  <button 
                    type="button" 
                    className="proceed-details-btn mobile-only" 
                    onClick={scrollToDetails}
                  >
                    Enter Details <FaArrowDown className="btn-icon" />
                  </button>
                </div>
              </div>
            ) : cameraError ? (
              <div className="camera-error-overlay fade-in p-6 text-center flex flex-col items-center justify-center min-h-[320px] bg-slate-950/90 rounded-2xl">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl">
                  <FaCamera />
                </div>
                <h3 className="text-white font-bold text-base mb-1">Camera Permission Required</h3>
                <p className="text-slate-300 text-xs max-w-sm mb-4 leading-relaxed">{cameraError}</p>
                <button 
                  type="button" 
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-600/30"
                  onClick={startCamera}
                >
                  <FaRotate /> Try Camera Again
                </button>
              </div>
            ) : (
              <div className="camera-feed-wrapper">
                {isCameraInitializing && !cameraActive && (
                  <div className="camera-initializing-overlay fade-in">
                    <div className="camera-radar-container">
                      <div className="camera-radar-ring"></div>
                      <div className="camera-radar-pulse"></div>
                      <FaCamera className="camera-radar-icon" />
                    </div>
                    <div className="camera-init-title">Starting Camera...</div>
                    <p className="camera-init-desc">
                      Please hold on while your camera initializes...
                    </p>
                  </div>
                )}

                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
                />

                {/* Face Guide HUD Overlay */}
                <div className="optical-hud-overlay">
                  <svg className="hud-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                    <ellipse 
                      cx="200" 
                      cy="190" 
                      rx="125" 
                      ry="160" 
                      fill="none" 
                      stroke="rgba(255, 255, 255, 0.5)" 
                      strokeWidth="2.5" 
                      strokeDasharray="6,8" 
                    />
                  </svg>

                  <div className="hud-guidance-banner">
                    <span className="guidance-pulse"></span>
                    <span>
                      {isCreative 
                        ? 'Center your crafted mustache & strike a proud pose' 
                        : (needsCleanShave ? 'Center your clean-shaven face' : 'Center your mustache within outline')}
                    </span>
                  </div>

                  <div className="hud-camera-controls">
                    <button 
                      type="button" 
                      className="hud-control-btn"
                      onClick={toggleCameraFacing}
                      title="Flip Camera (Front/Rear)"
                      aria-label="Flip Camera"
                    >
                      <FaRotate className="btn-icon" /> Flip
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!previewUrl && !cameraError && (
            <div className="shutter-bar">
              <button 
                type="button" 
                className="shutter-button mobile-tactile-shutter"
                onClick={captureSnapshot}
                disabled={!cameraActive}
                aria-label="Snap Photo"
              >
                <div className="shutter-inner">
                  <FaCamera className="shutter-icon" />
                  <span className="shutter-text">
                    {needsCleanShave 
                      ? 'SNAP CLEAN SHAVE' 
                      : (isCreative ? 'SNAP CREATIVE MUSTACHE' : 'SNAP MUSTACHE')}
                  </span>
                </div>
              </button>

              {/* Mobile quick secondary controls */}
              <div className="mobile-shutter-secondary mobile-only">
                <button 
                  type="button" 
                  className="mobile-secondary-control"
                  onClick={toggleCameraFacing}
                >
                  <FaRotate className="btn-icon" /> Flip Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Submission Form */}
        <div className="details-card" ref={detailsCardRef}>
          <h2 className="form-card-title">
            {isCreative 
              ? 'Creative Mustache Entry' 
              : (needsCleanShave ? 'Clean Shave Baseline' : 'Mustache Entry')}
          </h2>
          <p className="form-card-desc">
            {isCreative
              ? 'Enter the Creative Mustache Challenge! Craft your mustache using paper, cotton, wigs, drawings, or wild props. Unlimited submissions, highest score features on the leaderboard.'
              : needsCleanShave
                ? 'Record your Day 1 baseline. All future mustache entries are evaluated against this photo.'
                : 'Unlimited submissions allowed. Only your highest scored photo reaches the leaderboard.'}
          </p>

          <form onSubmit={needsCleanShave ? (e) => { e.preventDefault(); handleSaveCleanShaveBaseline(); } : handleSubmitEntry} className="judge-form">
            <div className="form-group">
              <label htmlFor="contestant-name" className="form-label">
                Contestant Name <span className="required-star">*</span>
              </label>
              <input 
                id="contestant-name"
                type="text" 
                className="form-input" 
                placeholder="e.g. Alex M. or Craft Maestro"
                value={name}
                maxLength={50}
                onChange={e => setName(e.target.value)}
                disabled={isSubmitting || savingCleanShave}
                required
              />
            </div>

            <div className="rules-box">
              <div className="rules-title">
                <FaScaleBalanced className="rules-icon" /> Competition Rules
              </div>
              <ul className="rules-list">
                {isCreative ? (
                  <>
                    <li>Faux & DIY mustaches: Craft your mustache using wigs, paper, cotton, cardboard, drawings, yarn, or surprise props — the more creative, the better!</li>
                    <li>Judged on Craftsmanship & Texture, Innovation & Design, and Audacity & Humor.</li>
                    <li>Grand Prize: R1,000 Takealot Voucher for participants who donated R100+.</li>
                    <li>Submit unlimited attempts — only your top score features on the leaderboard.</li>
                  </>
                ) : (
                  <>
                    <li>Facial hair only: Judging focuses strictly on mustache growth and styling.</li>
                    <li>Growth evaluated against your Day 1 clean shave photo.</li>
                    <li>Grand Prize: R1,000 Takealot Voucher for participants who donated R100+.</li>
                    <li>Submit unlimited attempts — only your top score features on the leaderboard.</li>
                  </>
                )}
              </ul>
            </div>

            {/* Baseline Status Card for Mustache Growers */}
            {!isCreative && hasCleanShave && user?.cleanShaveImageUrl && (
              <div className="booth-baseline-card active fade-in">
                <div className="booth-baseline-left">
                  <img src={user.cleanShaveImageUrl} alt="Baseline" className="booth-baseline-thumb" />
                  <div>
                    <span className="booth-baseline-tag"><FaCircleCheck /> Day 1 Baseline Active</span>
                    <p className="booth-baseline-desc">Your facial hair growth is judged alongside this clean shave photo.</p>
                  </div>
                </div>
              </div>
            )}

            {cleanShaveSuccess && (
              <div className="cleanshave-success-alert fade-in" style={{ width: '100%', boxSizing: 'border-box' }}>
                <FaCircleCheck /> {cleanShaveSuccess}
              </div>
            )}

            {validationError && (
              <div className="validation-error-badge">
                <MdOutlineWarningAmber className="error-icon" /> {validationError}
              </div>
            )}

            <button 
              type="submit" 
              className={`submit-judge-btn ${!capturedBlob ? 'disabled' : ''} ${needsCleanShave ? 'save-baseline-btn' : ''}`}
              disabled={!capturedBlob || isSubmitting || savingCleanShave}
            >
              {savingCleanShave ? (
                <span className="btn-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="btn-spinner"></span>
                  <span>Saving Day 1 Clean Shave Baseline...</span>
                </span>
              ) : isSubmitting ? (
                <span className="btn-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="btn-spinner"></span>
                  <span>Submitting for AI Judging...</span>
                </span>
              ) : needsCleanShave ? (
                <>
                  <FaCamera className="btn-icon" />
                  <span>SAVE DAY 1 CLEAN SHAVE BASELINE</span>
                </>
              ) : (
                <>
                  <span>SUBMIT FOR AI JUDGING</span>
                  <FaArrowRight className="btn-arrow" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
