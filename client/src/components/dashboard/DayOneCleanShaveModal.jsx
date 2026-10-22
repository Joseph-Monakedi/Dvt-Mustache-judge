import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  FaCamera, 
  FaUpload, 
  FaRotate, 
  FaCheck, 
  FaXmark, 
  FaCircleInfo, 
  FaArrowRotateLeft, 
  FaCircleCheck 
} from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { apiUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function DayOneCleanShaveModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { token, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload'
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera helper
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser or connection.');
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
        await videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.warn('Autoplay prevented:', e);
        });
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions or switch to File Upload.');
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Manage camera on modal open / tab switch
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !previewUrl) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, previewUrl, startCamera, stopCamera]);

  // Handle countdown & capture
  const handleStartCaptureCountdown = () => {
    if (countdown !== null) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 8MB limit.');
      return;
    }

    setErrorMessage('');
    setCapturedBlob(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleConfirmBaseline = async () => {
    if (!capturedBlob) {
      setErrorMessage('Please capture or upload a clean shave photo first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

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
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const result = await res.json();
      setSuccessMessage(result.message || 'Day 1 Clean Shave Baseline registered successfully!');

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore confetti errors
      }

      await refreshUser();
      onSuccess?.();

      setTimeout(() => {
        handleModalClose();
      }, 1400);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit Day 1 clean shave photo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    setErrorMessage('');
    setSuccessMessage('');
    setCountdown(null);
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Day 1 Clean Shave Baseline"
      subtitle="Required before contest entries to calculate your Follicle Growth Score"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Success or Error Banners */}
        {successMessage && (
          <div className="flex items-center gap-3 p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm font-medium animate-in fade-in">
            <FaCircleCheck className="text-lg shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-3 p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-sm font-medium animate-in fade-in">
            <FaXmark className="text-lg shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Selector (Camera vs Upload) */}
        {!previewUrl && (
          <div className="grid grid-cols-2 p-1.5 bg-[#070c14] border border-white/10 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'camera'
                  ? 'bg-gradient-to-r from-[#007FBA] to-[#00b4d8] text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FaCamera className="text-base" />
              <span>Capture via Webcam</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-[#007FBA] to-[#00b4d8] text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FaUpload className="text-base" />
              <span>Upload Photo File</span>
            </button>
          </div>
        )}

        {/* Main View Area */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 min-h-[340px] flex items-center justify-center">
          {/* 1. PREVIEW MODE */}
          {previewUrl ? (
            <div className="relative w-full h-[360px] flex items-center justify-center bg-black/90">
              <img
                src={previewUrl}
                alt="Clean Shave Baseline Preview"
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-emerald-400/40">
                <FaCircleCheck className="text-sm" /> Baseline Ready
              </div>
            </div>
          ) : activeTab === 'camera' ? (
            /* 2. LIVE CAMERA VIEW */
            <div className="relative w-full h-[360px] flex items-center justify-center bg-black">
              {cameraError ? (
                <div className="p-6 text-center max-w-md">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl">
                    <FaCamera />
                  </div>
                  <h4 className="text-white font-bold mb-1">Camera Unavailable</h4>
                  <p className="text-slate-400 text-xs mb-4">{cameraError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('upload')}
                    icon={FaUpload}
                  >
                    Switch to Photo Upload
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />

                  {/* Dotted Head Outline Guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-72 border-2 border-dashed border-white/50 rounded-[50%]" />
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                      className="p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-white border border-white/10 shadow-lg hover:bg-slate-800 transition-colors"
                      title="Flip Camera"
                    >
                      <FaRotate className="text-sm" />
                    </button>
                  </div>

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <span className="text-7xl font-black text-white animate-ping">
                        {countdown}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* 3. FILE UPLOAD VIEW */
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-[360px] flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 bg-gradient-to-b from-[#0d1522]/50 to-[#070c14] cursor-pointer transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 group-hover:scale-110 group-hover:border-cyan-400 flex items-center justify-center text-cyan-400 text-2xl mb-4 transition-all shadow-lg shadow-cyan-950/50">
                <FaUpload />
              </div>

              <h4 className="text-base font-bold text-white mb-1">
                Choose Day 1 Clean Shave Photo
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Click to browse or drag & drop. High-resolution portrait showing full face with clean-shaven chin and upper lip.
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">JPEG</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">PNG</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">WebP</span>
                <span>• Max 8MB</span>
              </div>
            </div>
          )}
        </div>

        {/* Guidance Notice */}
        <div className="flex items-start gap-3 p-3.5 bg-[#131f33]/70 border border-white/5 rounded-xl text-xs text-slate-300">
          <FaCircleInfo className="text-cyan-400 text-base shrink-0 mt-0.5" />
          <p>
            <strong className="text-white font-semibold">Growth Scoring Rule:</strong> All your subsequent mustache entries throughout Movember will be compared against this baseline to track follicle density evolution and determine your transformation score.
          </p>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {previewUrl ? (
            <>
              <Button
                variant="secondary"
                onClick={handleRetake}
                icon={FaArrowRotateLeft}
                disabled={isSubmitting}
              >
                Retake / Change
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmBaseline}
                icon={FaCheck}
                loading={isSubmitting}
              >
                Confirm & Lock In Baseline
              </Button>
            </>
          ) : activeTab === 'camera' && cameraActive ? (
            <>
              <Button
                variant="secondary"
                onClick={handleModalClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStartCaptureCountdown}
                icon={FaCamera}
                disabled={countdown !== null}
              >
                {countdown !== null ? `Snapping in ${countdown}...` : 'Capture Baseline Photo'}
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={handleModalClose}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
