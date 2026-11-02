import React, { useRef, useState, useEffect } from 'react';
import { FaCamera, FaXmark, FaDownload, FaCopy, FaCheck, FaShareNodes } from 'react-icons/fa6';

export default function ShareableCanvasCard({ verdict, onClose }) {
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  // Auto-render canvas preview on mount
  useEffect(() => {
    let isMounted = true;
    renderCardToCanvas().then(() => {
      if (isMounted) setCanvasReady(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Generate canvas rendering
  const renderCardToCanvas = () => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);

      const ctx = canvas.getContext('2d');
      const width = 1200;
      const height = 675; // 16:9 aspect ratio
      canvas.width = width;
      canvas.height = height;

      // 1. Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#070c14');
      bgGrad.addColorStop(0.5, '#0d1522');
      bgGrad.addColorStop(1, '#001a33');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Decorative cyan radial glow
      const glowGrad = ctx.createRadialGradient(width - 200, 150, 10, width - 200, 150, 450);
      glowGrad.addColorStop(0, 'rgba(0, 180, 216, 0.25)');
      glowGrad.addColorStop(1, 'rgba(0, 180, 216, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Decorative border
      ctx.strokeStyle = 'rgba(0, 180, 216, 0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // 2. Header
      const isCreative = verdict.competitionType === 'CreativeMustache' || verdict.competitionType === 'CrazyHair';
      const headerTitle = isCreative ? 'CREATIVE MUSTACHE CHALLENGE VERDICT' : 'MOVEMBER 2026 OFFICIAL VERDICT';

      // 3. Load Images
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = verdict.imageUrl || verdict.thumbnailUrl;

      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/dvt-logo.png';

      const drawRemainingContent = () => {
        // Draw Header
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.drawImage(logoImg, 60, 42, 50, 50);
          ctx.fillStyle = '#007FBA';
          ctx.font = 'bold 34px Poppins, system-ui, sans-serif';
          ctx.fillText('DVT', 122, 79);
          ctx.fillStyle = '#ffffff';
          ctx.font = '600 30px Poppins, system-ui, sans-serif';
          ctx.fillText('MUSTACHE JUDGE', 205, 79);
        } else {
          ctx.fillStyle = '#007FBA';
          ctx.font = 'bold 34px Poppins, system-ui, sans-serif';
          ctx.fillText('DVT', 60, 80);
          ctx.fillStyle = '#ffffff';
          ctx.font = '600 30px Poppins, system-ui, sans-serif';
          ctx.fillText('MUSTACHE JUDGE', 150, 80);
        }

        ctx.fillStyle = '#00b4d8';
        ctx.font = '600 18px Poppins, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(headerTitle, width - 60, 80);
        ctx.textAlign = 'left';

        // Divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(60, 110);
        ctx.lineTo(width - 60, 110);
        ctx.stroke();
        const photoX = 60;
        const photoY = 145;
        const photoSize = 420;

        ctx.save();
        ctx.strokeStyle = '#00b4d8';
        ctx.lineWidth = 4;
        ctx.strokeRect(photoX - 2, photoY - 2, photoSize + 4, photoSize + 4);

        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(photoX, photoY, photoSize, photoSize);
          ctx.fillStyle = '#f0f4f8';
          ctx.font = 'bold 36px Poppins';
          ctx.textAlign = 'center';
          ctx.fillText(verdict.contestantName, photoX + photoSize / 2, photoY + photoSize / 2);
          ctx.textAlign = 'left';
        }
        ctx.restore();

        // 4. Right side: Verdict details
        const contentX = 520;
        const maxRightWidth = 600;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px Poppins, system-ui, sans-serif';
        ctx.fillText(truncateText(ctx, verdict.contestantName || 'Contestant', 460), contentX, 188);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 20px Poppins, system-ui, sans-serif';
        const cohortText = isCreative ? 'Creative Mustache Contestant' : 'Movember 2026 Contestant';
        ctx.fillText(cohortText, contentX, 222);

        ctx.fillStyle = '#00b4d8';
        ctx.font = 'bold 26px Poppins, system-ui, sans-serif';
        ctx.fillText(truncateText(ctx, `"${verdict.mustacheTitle || ''}"`, 460), contentX, 272);

        // Style Category pill (dynamically sized to fit any style label without overflow)
        const styleLabel = `Style: ${verdict.styleCategory || 'Other'}`;
        ctx.font = '600 16px Poppins, system-ui, sans-serif';
        const measuredStyleWidth = ctx.measureText(styleLabel).width;
        const pillWidth = Math.min(maxRightWidth, Math.max(150, Math.ceil(measuredStyleWidth + 36)));

        ctx.fillStyle = 'rgba(0, 127, 186, 0.4)';
        ctx.fillRect(contentX, 296, pillWidth, 36);
        ctx.strokeStyle = '#007FBA';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(contentX, 296, pillWidth, 36);

        ctx.fillStyle = '#f0f4f8';
        ctx.fillText(truncateText(ctx, styleLabel, pillWidth - 24), contentX + 16, 320);

        // Subscores
        const scoreY = 366;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 18px Poppins, system-ui, sans-serif';
        const subscoresText = isCreative
          ? `Craft: ${verdict.densityScore || 0}/10   •   Innovation: ${verdict.symmetryScore || 0}/10   •   Humor: ${verdict.swaggerScore || 0}/10`
          : `Density: ${verdict.densityScore}/10   •   Symmetry: ${verdict.symmetryScore}/10   •   Swagger: ${verdict.swaggerScore}/10`;
        ctx.fillText(subscoresText, contentX, scoreY);

        // Official Roast Box (height 140px from Y=388 to Y=528 so 4 wrapped lines fit comfortably inside)
        const roastBoxY = 388;
        const roastBoxHeight = 140;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(contentX, roastBoxY, maxRightWidth, roastBoxHeight);
        ctx.strokeStyle = 'rgba(0, 180, 216, 0.25)';
        ctx.strokeRect(contentX, roastBoxY, maxRightWidth, roastBoxHeight);

        ctx.fillStyle = '#f0f4f8';
        ctx.font = 'italic 17px Poppins, system-ui, sans-serif';
        wrapText(ctx, `"${verdict.roast || ''}"`, contentX + 20, roastBoxY + 32, maxRightWidth - 40, 26, 4);

        // Celebrity Twin (placed cleanly below the Roast Box at Y=560)
        ctx.fillStyle = '#F59E0B';
        ctx.font = '600 18px Poppins, system-ui, sans-serif';
        ctx.fillText(truncateText(ctx, `Celebrity Match: ${verdict.celebrityTwin || 'N/A'}`, maxRightWidth), contentX, 560);

        // Circular Overall Score Ring
        const ringX = width - 130;
        const ringY = 205;
        const ringRadius = 55;

        ctx.beginPath();
        ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0d1522';
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = verdict.overallScore === 0 ? '#EF4444' : (verdict.overallScore >= 80 ? '#F59E0B' : '#00b4d8');
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px Poppins, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${verdict.overallScore}`, ringX, ringY + 12);

        ctx.font = '600 13px Poppins';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('SCORE', ringX, ringY + 34);
        ctx.textAlign = 'left';

        // Footer
        ctx.fillStyle = '#64748b';
        ctx.font = '500 15px Poppins';
        const footerText = isCreative
          ? 'Certified by DVT Creative Mustache Challenge 2026'
          : 'Certified by DVT Movember Mustache Judge 2026';
        ctx.fillText(footerText, 60, height - 35);

        resolve(canvas);
      };

      img.onload = drawRemainingContent;
      img.onerror = drawRemainingContent;

      if (img.complete) {
        drawRemainingContent();
      }
    });
  };

  const truncateText = (ctx, text, maxWidth) => {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
      truncated = truncated.slice(0, -1).trimEnd();
    }
    return truncated + '...';
  };

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    let line = '';
    let lineIndex = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line ? `${line} ${words[n]}` : words[n];
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line) {
        if (lineIndex === maxLines - 1) {
          const remaining = `${line} ${words.slice(n).join(' ')}`;
          ctx.fillText(truncateText(ctx, remaining, maxWidth), x, y + lineIndex * lineHeight);
          return;
        }
        ctx.fillText(line, x, y + lineIndex * lineHeight);
        line = words[n];
        lineIndex++;
      } else {
        line = testLine;
      }
    }

    if (line && lineIndex < maxLines) {
      ctx.fillText(truncateText(ctx, line, maxWidth), x, y + lineIndex * lineHeight);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    await renderCardToCanvas();
    const canvas = canvasRef.current;
    if (!canvas) {
      setDownloading(false);
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `DVT-Mustache-Verdict-${verdict.contestantName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloading(false);
  };

  const handleCopyToClipboard = async () => {
    try {
      await renderCardToCanvas();
      const canvas = canvasRef.current;
      if (!canvas || !navigator.clipboard || !window.ClipboardItem) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      });
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handleNativeShare = async () => {
    try {
      setSharing(true);
      await renderCardToCanvas();
      const canvas = canvasRef.current;
      if (!canvas) {
        setSharing(false);
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setSharing(false);
          return;
        }

        const fileName = `DVT-Mustache-Verdict-${verdict.contestantName.replace(/\s+/g, '_')}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `DVT Mustache Verdict: ${verdict.contestantName}`,
            text: `Check out my official DVT Movember mustache verdict: ${verdict.overallScore}/100 ("${verdict.mustacheTitle}")!`
          });
        } else if (navigator.share) {
          await navigator.share({
            title: `DVT Mustache Verdict: ${verdict.contestantName}`,
            text: `DVT Mustache Verdict: ${verdict.contestantName} scored ${verdict.overallScore}/100 ("${verdict.mustacheTitle}")!`,
            url: window.location.href
          });
        }
        setSharing(false);
      });
    } catch (err) {
      setSharing(false);
      if (err.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <div className="sharecard-modal-backdrop">
      <div className="sharecard-modal">
        <div className="sharecard-header">
          <div className="sharecard-title-wrap">
            <FaCamera className="title-icon" />
            <h3>Export Official DVT Verdict Card</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <FaXmark />
          </button>
        </div>

        <div className="sharecard-preview-container">
          {!canvasReady && (
            <div className="canvas-loading-skeleton skeleton-shimmer">
              <span className="spinner"></span>
              <span className="canvas-loading-text">Rendering Official Verdict Card...</span>
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            className="sharecard-canvas" 
            style={{ display: canvasReady ? 'block' : 'none' }} 
          />
        </div>

        <div className="sharecard-actions">
          {hasNativeShare && (
            <button 
              className="action-btn native-share-btn"
              onClick={handleNativeShare}
              disabled={sharing || !canvasReady}
            >
              {sharing ? (
                <>
                  <span className="btn-spinner"></span> Preparing Share...
                </>
              ) : (
                <>
                  <FaShareNodes className="btn-icon" /> Share to WhatsApp / Apps
                </>
              )}
            </button>
          )}

          <button 
            className="action-btn download-btn" 
            onClick={handleDownload}
            disabled={downloading || !canvasReady}
          >
            {downloading ? (
              <>
                <span className="btn-spinner"></span> Generating Image...
              </>
            ) : (
              <>
                <FaDownload className="btn-icon" /> Download Image
              </>
            )}
          </button>

          {navigator.clipboard && window.ClipboardItem && (
            <button 
              className="action-btn copy-btn"
              onClick={handleCopyToClipboard}
              disabled={!canvasReady}
            >
              {copySuccess ? (
                <>
                  <FaCheck className="btn-icon" /> Copied to Clipboard!
                </>
              ) : (
                <>
                  <FaCopy className="btn-icon" /> Copy for Slack
                </>
              )}
            </button>
          )}

          <button className="action-btn secondary-btn" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
