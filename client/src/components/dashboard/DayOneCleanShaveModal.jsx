import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  FaCamera, 
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
      setCameraError('Camera access is required. Please allow camera permissions in your browser to take your photo.');
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Manage camera on modal open
  useEffect(() => {
    if (isOpen && !previewUrl) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, previewUrl, startCamera, stopCamera]);

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

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
    setErrorMessage('');
    startCamera();
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
      subtitle="Snap a photo of your clean-shaven face to start tracking your growth."
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

        {/* Main Camera / Snapshot Area */}
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
          ) : (
            /* 2. LIVE CAMERA VIEW */
            <div className="relative w-full h-[360px] flex items-center justify-center bg-black">
              {cameraError ? (
                <div className="p-6 text-center max-w-md">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl">
                    <FaCamera />
                  </div>
                  <h4 className="text-white font-bold mb-1">Camera Permission Required</h4>
                  <p className="text-slate-400 text-xs mb-4">{cameraError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    icon={FaRotate}
                  >
                    Try Camera Again
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
          )}
        </div>

        {/* Guidance Notice */}
        <div className="flex items-start gap-3 p-3.5 bg-[#131f33]/70 border border-white/5 rounded-xl text-xs text-slate-300">
          <FaCircleInfo className="text-cyan-400 text-base shrink-0 mt-0.5" />
          <p>
            <strong className="text-white font-semibold">Baseline Rule:</strong> Future mustache entries will be compared against this photo to measure your growth.
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
                Retake
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmBaseline}
                icon={FaCheck}
                loading={isSubmitting}
              >
                Save Baseline
              </Button>
            </>
          ) : cameraActive ? (
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
