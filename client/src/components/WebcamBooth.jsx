import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GiMustache } from 'react-icons/gi';
import { FaCamera, FaRotate, FaUpload, FaScaleBalanced, FaArrowRight, FaArrowDown, FaCircleCheck } from 'react-icons/fa6';
import { MdOutlineWarningAmber } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

const OFFICE_LOCATIONS = [
  'Johannesburg',
  'Cape Town',
  'Durban',
  'Gqeberha',
  'London',
  'Waterford',
  'Amsterdam',
  'Baar',
  'Nairobi',
  'Dubai',
  'West Perth',
  'REMOTE'
];

export default function WebcamBooth({ onJudgeSubmit, isSubmitting }) {
  const { user, token, refreshUser } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [officeLocation, setOfficeLocation] = useState(user?.officeLocation || 'Johannesburg');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState('user');
  const [useUploadFallback, setUseUploadFallback] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [saveAsCleanShave, setSaveAsCleanShave] = useState(false);
  const [savingCleanShave, setSavingCleanShave] = useState(false);
  const [cleanShaveSuccess, setCleanShaveSuccess] = useState('');
  const [cleanShaveBlob, setCleanShaveBlob] = useState(null);
  const [cleanShavePreview, setCleanShavePreview] = useState(null);

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
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [startCamera]);

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
      0.82
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

  useEffect(() => {
    if (user) {
      if (!name) setName(user.fullName || '');
      if (user.officeLocation) setOfficeLocation(user.officeLocation);
    }
  }, [user]);

  const handleCleanShaveFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setValidationError('Please select an image file for clean shave baseline.');
      return;
    }
    setCleanShaveBlob(file);
    setCleanShavePreview(URL.createObjectURL(file));
  };

  const handleSaveCleanShaveBaseline = async () => {
    if (!capturedBlob) {
      setValidationError('Please snap a photo first to save as your Day 1 Clean Shave baseline.');
      return;
    }
    if (!token) {
      setValidationError('Please sign in or create an account to save your permanent clean shave baseline.');
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

      setCleanShaveSuccess('Day 1 Clean Shave baseline saved! All subsequent entries will be evaluated against it.');
      setSaveAsCleanShave(false);
      await refreshUser();
    } catch (err) {
      setValidationError(err.message || 'Error uploading clean shave baseline.');
    } finally {
      setSavingCleanShave(false);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (saveAsCleanShave) {
      handleSaveCleanShaveBaseline();
      return;
    }

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
      officeLocation,
      imageBlob: capturedBlob,
      cleanShaveBlob: cleanShaveBlob
    });
  };

  return (
    <div className="booth-container fade-in">
      <div className="booth-header">
        <h1 className="booth-title">
          Enter the Movember Court <GiMustache className="title-stache-icon" />
        </h1>
        <p className="booth-subtitle">
          Align your upper lip in the optical reticle. The AI Judge evaluates density, symmetry, curvature & swagger.
        </p>
      </div>

      <div className="booth-layout">
        {/* Left: Camera / Optical HUD Viewport */}
        <div className="viewport-card">
          <div className="viewport-screen">
            {previewUrl ? (
              <div className="snapshot-preview">
                <img src={previewUrl} alt="Contestant Preview" className="preview-image" />
                <div className="preview-badge">Snapshot Ready</div>
                <div className="snapshot-overlay-actions">
                  <button 
                    type="button" 
                    className="retake-button" 
                    onClick={handleRetake}
                    disabled={isSubmitting}
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
                <h3>Upload Your Mustache Photo</h3>
                <p>Drag & drop or tap an option below (JPEG, PNG, WebP up to 8MB)</p>
                {cameraError && (
                  <div className="camera-notice">
                    Note: Camera unavailable or permission denied. Direct upload active.
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
                      Initializing camera lens stream for supreme Movember mustache inspection...
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
                    <span>Align upper lip in cyan reticle</span>
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
                aria-label="Snap Mustache Photo"
              >
                <div className="shutter-inner">
                  <FaCamera className="shutter-icon" />
                  <span className="shutter-text">SNAP MUSTACHE</span>
                </div>
              </button>

              {/* Mobile quick secondary controls right below shutter */}
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

        {/* Right: Contestant Details Form */}
        <div className="details-card" ref={detailsCardRef}>
          <h2 className="form-card-title">Contestant Dossier</h2>
          <p className="form-card-desc">Zero sign-in required. Pure frictionless Movember glory.</p>

          <form onSubmit={handleSubmit} className="judge-form">
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
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contestant-location" className="form-label">
                Office Location
              </label>
              <select 
                id="contestant-location"
                className="form-select"
                value={officeLocation}
                onChange={e => setOfficeLocation(e.target.value)}
                disabled={isSubmitting}
              >
                {OFFICE_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="rules-box">
              <div className="rules-title">
                <FaScaleBalanced className="rules-icon" /> Judicial Invariants
              </div>
              <ul className="rules-list">
                <li>Strict Kindness & Safety: Facial hair only (zero body/skin remarks).</li>
                <li>Growth evaluated alongside your Day 1 Clean Shave baseline photo.</li>
                <li>Real-time sync with the DVT Office Live Leaderboard.</li>
              </ul>
            </div>

            {/* Baseline Status / Clean Shave Prompt */}
            {user?.cleanShaveImageUrl ? (
              <div className="booth-baseline-card active fade-in">
                <div className="booth-baseline-left">
                  <img src={user.cleanShaveImageUrl} alt="Baseline" className="booth-baseline-thumb" />
                  <div>
                    <span className="booth-baseline-tag"><FaCircleCheck /> Day 1 Baseline Active</span>
                    <p className="booth-baseline-desc">Your growth is judged alongside this clean shave photo.</p>
                  </div>
                </div>
              </div>
            ) : token ? (
              <div className="booth-baseline-card prompt fade-in">
                <div className="booth-prompt-content">
                  <span className="booth-baseline-tag pending"><FaCamera /> Clean Shave Baseline</span>
                  <p className="booth-baseline-desc">
                    No Day 1 baseline on file yet. Is this a fresh clean-shave photo?
                  </p>
                  <label className="baseline-toggle-label">
                    <input 
                      type="checkbox"
                      checked={saveAsCleanShave}
                      onChange={e => setSaveAsCleanShave(e.target.checked)}
                    />
                    <span>Set this photo as my Day 1 Clean Shave baseline</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="booth-baseline-card optional fade-in">
                <label className="form-label" style={{ marginBottom: '4px' }}>
                  Day 1 Clean Shave Photo (Optional)
                </label>
                <p className="booth-baseline-desc" style={{ marginBottom: '8px' }}>
                  Attach a clean shave photo so the AI Judge can evaluate growth alongside it!
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleCleanShaveFileChange}
                    className="form-input"
                    style={{ fontSize: '12px', padding: '6px' }}
                  />
                  {cleanShavePreview && (
                    <img src={cleanShavePreview} alt="Baseline Preview" className="booth-baseline-thumb" />
                  )}
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
              className={`submit-judge-btn ${!capturedBlob ? 'disabled' : ''} ${saveAsCleanShave ? 'save-baseline-btn' : ''}`}
              disabled={!capturedBlob || isSubmitting || savingCleanShave}
            >
              {isSubmitting || savingCleanShave ? (
                <span className="btn-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="btn-spinner"></span>
                  <span>{savingCleanShave ? 'Saving Clean Shave Baseline...' : 'Summoning AI Judge...'}</span>
                </span>
              ) : saveAsCleanShave ? (
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
