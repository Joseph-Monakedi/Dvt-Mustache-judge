import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GiMustache } from 'react-icons/gi';
import { 
  FaCamera, 
  FaRotate, 
  FaUpload, 
  FaScaleBalanced, 
  FaArrowRight, 
  FaArrowDown, 
  FaCircleCheck, 
  FaLock, 
  FaHandHoldingDollar,
  FaClock,
  FaUserCheck
} from 'react-icons/fa6';
import { MdOutlineWarningAmber } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

export default function WebcamBooth({ onJudgeSubmit, isSubmitting }) {
  const { user, token, refreshUser, openAuthModal } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState('user');
  const [useUploadFallback, setUseUploadFallback] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [savingCleanShave, setSavingCleanShave] = useState(false);
  const [cleanShaveSuccess, setCleanShaveSuccess] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);
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
      setUseUploadFallback(false);
    } catch (err) {
      console.warn('Camera access issue:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions or upload a photo.');
      setCameraActive(false);
      setUseUploadFallback(true);
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

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setValidationError('File size exceeds the 8MB limit.');
      return;
    }

    setCapturedBlob(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setValidationError('');
    scrollToDetails();
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
    setValidationError('');
    if (!useUploadFallback && !cameraActive) {
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
      setValidationError('Please snap a photo or upload an image of your mustache.');
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
            Enter the Movember Court <GiMustache className="title-stache-icon" />
          </h1>
          <p className="booth-subtitle">
            Open to all contestants worldwide! Sign in or register to join the competition.
          </p>
        </div>

        <div className="quiz-paywall-container fade-in">
          <div className="quiz-paywall-card">
            <div className="paywall-icon-wrap">
              <FaLock className="paywall-lock-icon" />
            </div>
            <span className="paywall-pill">Contestant Registration</span>
            <h2>Sign In Required to Enter</h2>
            <p>
              To enter the DVT Movember mustache competition, record your Day 1 clean shave baseline photo, and submit entries for AI judging, please sign in or register with your email.
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
            <h2>Contest Pass Pending Approval</h2>
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
                Make your payment to the Movember coordinator with payment reference:
                <div style={{ marginTop: '6px', fontWeight: 'bold', color: '#00b4d8', fontSize: '15px' }}>
                  MOVEM-{(user.fullName || '').replace(/\s+/g, '').toUpperCase()}
                </div>
                Once confirmed, an admin will activate your pass in the Admin Portal!
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
            <>Enter the Movember Court <GiMustache className="title-stache-icon" /></>
          )}
        </h1>
        <p className="booth-subtitle">
          {!hasCleanShave
            ? 'Before entering the contest, snap a fresh clean-shaven photo. This baseline is saved to your profile and used by the AI Judge to evaluate your growth over time.'
            : 'Submit as many photos as you want! The AI Judge evaluates growth alongside your clean-shave baseline, and only your single highest score is featured on the leaderboard.'}
        </p>
      </div>

      <div className="booth-layout">
        {/* Left: Camera / Optical HUD Viewport */}
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
            ) : useUploadFallback ? (
              <div className="upload-dropzone">
                <div className="dropzone-icon">
                  <FaUpload />
                </div>
                <h3>
                  {!hasCleanShave ? 'Upload Day 1 Clean Shave Photo' : 'Upload Your Mustache Photo'}
                </h3>
                <p>Drag & drop or choose an option below (JPEG, PNG, WebP up to 8MB)</p>
                {cameraError && (
                  <div className="camera-notice">
                    Note: Camera unavailable or permission denied. Direct file upload active.
                  </div>
                )}
                
                <div className="upload-buttons-group">
                  <button 
                    type="button" 
                    className="browse-button native-cam-btn"
                    onClick={() => nativeCameraInputRef.current?.click()}
                  >
                    <FaCamera className="btn-icon" /> Take Photo
                  </button>
                  <button 
                    type="button" 
                    className="browse-button photo-lib-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload className="btn-icon" /> Choose from Gallery
                  </button>
                </div>

                {/* Direct native camera capture for mobile browsers */}
                <input 
                  type="file" 
                  ref={nativeCameraInputRef} 
                  accept="image/*" 
                  capture="user"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {/* Standard file picker */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/jpeg,image/png,image/webp" 
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
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
                    <div className="camera-init-title">Calibrating Optical Sensor</div>
                    <p className="camera-init-desc">
                      Initializing camera lens stream for supreme Movember inspection...
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

                {/* Optical HUD Overlay */}
                <div className="optical-hud-overlay">
                  <svg className="hud-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="hudCyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#007FBA" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>

                    <ellipse 
                      cx="200" 
                      cy="190" 
                      rx="125" 
                      ry="160" 
                      fill="none" 
                      stroke="rgba(255, 255, 255, 0.35)" 
                      strokeWidth="2.5" 
                      strokeDasharray="6,8" 
                    />

                    <line x1="200" y1="30" x2="200" y2="70" stroke="#00b4d8" strokeWidth="2" opacity="0.6" />
                    <line x1="200" y1="330" x2="200" y2="370" stroke="#00b4d8" strokeWidth="2" opacity="0.6" />

                    <g className="mustache-reticle-group">
                      <path d="M 125,230 L 110,230 L 110,270 L 125,270" fill="none" stroke="#00b4d8" strokeWidth="3" strokeLinecap="round" />
                      <path d="M 275,230 L 290,230 L 290,270 L 275,270" fill="none" stroke="#00b4d8" strokeWidth="3" strokeLinecap="round" />
                      <line x1="180" y1="250" x2="220" y2="250" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3,3" opacity="0.85" />
                      <path d="M 160,248 Q 180,242 200,246 Q 220,242 240,248 Q 200,258 160,248 Z" fill="rgba(0, 180, 216, 0.25)" stroke="#00b4d8" strokeWidth="1.5" />
                    </g>
                  </svg>

                  <div className="hud-guidance-banner">
                    <span className="guidance-pulse"></span>
                    <span>
                      {!hasCleanShave ? 'Align clean-shaven face in optical HUD' : 'Align upper lip in cyan reticle'}
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
                    <button 
                      type="button" 
                      className="hud-control-btn"
                      onClick={() => setUseUploadFallback(true)}
                      title="Switch to File Upload"
                      aria-label="Upload Photo"
                    >
                      <FaUpload className="btn-icon" /> Upload
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!previewUrl && !useUploadFallback && (
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
                <button 
                  type="button" 
                  className="mobile-secondary-control"
                  onClick={() => setUseUploadFallback(true)}
                >
                  <FaUpload className="btn-icon" /> Upload File
                </button>
              </div>
            </div>
          )}

          {useUploadFallback && !previewUrl && (
            <div className="shutter-bar">
              <button 
                type="button" 
                className="secondary-btn try-cam-btn"
                onClick={() => {
                  setUseUploadFallback(false);
                  startCamera();
                }}
              >
                <FaCamera className="btn-icon" /> Try Live Camera Again
              </button>
            </div>
          )}
        </div>

        {/* Right: Submission Form */}
        <div className="details-card" ref={detailsCardRef}>
          <h2 className="form-card-title">
            {!hasCleanShave ? 'Clean Shave Baseline' : 'Contestant Dossier'}
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
                <FaScaleBalanced className="rules-icon" /> Judicial Invariants
              </div>
              <ul className="rules-list">
                <li>Facial hair only: Zero body or skin remarks (Kindness Invariant).</li>
                <li>Growth evaluated against your Day 1 Clean Shave baseline photo.</li>
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
                  <span>Summoning AI Judge...</span>
                </span>
              ) : !hasCleanShave ? (
                <>
                  <FaCamera className="btn-icon" />
                  <span>SAVE DAY 1 CLEAN SHAVE BASELINE</span>
                </>
              ) : (
                <>
                  <span>DELIBERATE & JUDGE</span>
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
