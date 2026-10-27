import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  FaBolt
} from 'react-icons/fa6';
import { MdOutlineWarningAmber } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import { initiatePayFastCheckout } from '../utils/payfast';

export default function WebcamBooth({ onJudgeSubmit, isSubmitting }) {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [isPaying, setIsPaying] = useState(false);
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

  // Sync user's name
  useEffect(() => {
    if (user?.fullName && !name) {
      setName(user.fullName);
    }
  }, [user]);

  // Determine stage:
  // Step 1: User needs to take Day 1 clean shave baseline photo
  // Step 2: Clean shave is on file; user can submit unlimited growth photos
  const hasCleanShave = Boolean(user?.cleanShaveImageUrl);
  const isPaidOrAdmin = Boolean(user?.leaderboardPaid || user?.role === 'Admin');

  // Initialize camera stream
  const startCamera = useCallback(async () => {
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

  useEffect(() => {
    // Only run camera if user is authenticated and paid
    if (user && isPaidOrAdmin) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [startCamera, user, isPaidOrAdmin]);

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

  // Step 1: Save Clean Shave Baseline
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

  // Step 2: Submit Mustache Growth Entry
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
      setValidationError('Please snap a photo of your mustache.');
      return;
    }

    setValidationError('');
    onJudgeSubmit({
      name: name.trim(),
      imageBlob: capturedBlob
    });
  };

  // 1. GATE: Unauthenticated user
  if (!user) {
    return (
      <div className="booth-container fade-in">
        <div className="booth-header">
          <h1 className="booth-title">
            Enter the Movember Contest <GiMustache className="title-stache-icon" />
          </h1>
          <p className="booth-subtitle">
            Sign in or register to join the competition and submit your mustache photos.
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
              To enter the competition, record your Day 1 clean shave baseline photo, and submit entries for judging, please sign in or register with your email.
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

  // 2. GATE: Unpaid user (Requires R100 contest fee)
  if (!isPaidOrAdmin) {
    return (
      <div className="booth-container fade-in">
        <div className="booth-header">
          <h1 className="booth-title">
            Movember Contest Pass Required <GiMustache className="title-stache-icon" />
          </h1>
          <p className="booth-subtitle">
            Welcome, <strong>{user.fullName}</strong>. Contest entry requires the R100 Movember charity fee.
          </p>
        </div>

        <div className="quiz-paywall-container fade-in">
          <div className="quiz-paywall-card">
            <div className="paywall-icon-wrap">
              <FaHandHoldingDollar className="paywall-lock-icon text-gold" />
            </div>
            <span className="paywall-pill">Movember Charity Entry Fee</span>
            <h2>Contest Pass Required</h2>
            <p>
              Entry to the Mustache Contest and live leaderboard requires the <strong>R100</strong> charity donation. 
              All proceeds support men's mental health, suicide prevention, and prostate/testicular cancer initiatives.
            </p>

            <div className="paywall-fee-card">
              <div className="fee-row">
                <span className="fee-name">Leaderboard Entry Pass</span>
                <span className="fee-amount text-gold">R100</span>
              </div>
              <div className="fee-instruction">
                Pay securely online with Cards, Instant EFT, SnapScan, or Zapper. Your entry pass activates immediately upon payment!
              </div>
            </div>

            <div className="paywall-actions flex flex-col gap-2">
              <button 
                type="button" 
                className="paywall-btn primary flex items-center justify-center gap-2"
                disabled={isPaying}
                onClick={async () => {
                  try {
                    setIsPaying(true);
                    await initiatePayFastCheckout({
                      itemType: 'Leaderboard',
                      token,
                      returnPath: '/booth?payment=success',
                      cancelPath: '/booth?payment=cancelled'
                    });
                  } catch (e) {
                    setIsPaying(false);
                  }
                }}
              >
                <FaBolt className="btn-icon text-amber-300" /> {isPaying ? 'Connecting to PayFast...' : 'Pay R100 via PayFast & Enter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. MAIN BOOTH:
  // Step 1: Clean Shave Baseline (if not yet captured)
  // Step 2: Mustache Growth Submission (if clean shave exists)
  return (
    <div className="booth-container fade-in">
      <div className="booth-header">
        <h1 className="booth-title">
          {!hasCleanShave ? (
            <>Step 1: Capture Day 1 Clean Shave Baseline <GiMustache className="title-stache-icon" /></>
          ) : (
            <>Enter the Movember Contest <GiMustache className="title-stache-icon" /></>
          )}
        </h1>
        <p className="booth-subtitle">
          {!hasCleanShave
            ? 'Before entering the contest, snap a fresh clean-shaven photo. This baseline is saved to your profile and used to evaluate your growth over time.'
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
                  {!hasCleanShave ? 'Clean Shave Snapshot Ready' : 'Mustache Snapshot Ready'}
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
                    <span>Center your face within the outline</span>
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
                    {!hasCleanShave ? 'SNAP CLEAN SHAVE' : 'SNAP MUSTACHE'}
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
            {!hasCleanShave ? 'Clean Shave Baseline' : 'Contestant Details'}
          </h2>
          <p className="form-card-desc">
            {!hasCleanShave
              ? 'Record your Day 1 baseline. All future entries are evaluated against this photo.'
              : 'Unlimited submissions allowed. Only your highest scored photo reaches the leaderboard.'}
          </p>

          <form onSubmit={!hasCleanShave ? (e) => { e.preventDefault(); handleSaveCleanShaveBaseline(); } : handleSubmitEntry} className="judge-form">
            <div className="form-group">
              <label htmlFor="contestant-name" className="form-label">
                Contestant Name <span className="required-star">*</span>
              </label>
              <input 
                id="contestant-name"
                type="text" 
                className="form-input" 
                placeholder="e.g. Sipho M. or Bristle Champion"
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
                <li>Facial hair only: Judging focuses strictly on mustache growth and styling.</li>
                <li>Growth evaluated against your Day 1 clean shave photo.</li>
                <li>Submit unlimited attempts — only your top score features on the leaderboard.</li>
              </ul>
            </div>

            {/* Baseline Status Card */}
            {hasCleanShave && user?.cleanShaveImageUrl && (
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
              className={`submit-judge-btn ${!capturedBlob ? 'disabled' : ''} ${!hasCleanShave ? 'save-baseline-btn' : ''}`}
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
                  <span>Submitting for Judging...</span>
                </span>
              ) : !hasCleanShave ? (
                <>
                  <FaCamera className="btn-icon" />
                  <span>SAVE DAY 1 CLEAN SHAVE BASELINE</span>
                </>
              ) : (
                <>
                  <span>SUBMIT FOR JUDGING</span>
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
