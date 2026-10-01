import React, { useRef, useState } from 'react';
import { FaCamera, FaXmark, FaDownload, FaCopy, FaCheck } from 'react-icons/fa6';

export default function ShareableCanvasCard({ verdict, onClose }) {
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
      ctx.fillStyle = '#007FBA';
      ctx.font = 'bold 34px Poppins, system-ui, sans-serif';
      ctx.fillText('DVT', 60, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 30px Poppins, system-ui, sans-serif';
      ctx.fillText('MUSTACHE JUDGE', 150, 80);

      ctx.fillStyle = '#00b4d8';
      ctx.font = '500 20px Poppins, system-ui, sans-serif';
      ctx.fillText('MOVEMBER 2026 OFFICIAL VERDICT', width - 460, 80);

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60, 110);
      ctx.lineTo(width - 60, 110);
      ctx.stroke();

      // 3. Load Contestant Photo
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = verdict.imageUrl || verdict.thumbnailUrl;

      const drawRemainingContent = () => {
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

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px Poppins, system-ui, sans-serif';
        ctx.fillText(verdict.contestantName, contentX, 190);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 22px Poppins, system-ui, sans-serif';
        ctx.fillText(verdict.officeLocation || 'DVT Team', contentX, 225);

        ctx.fillStyle = '#00b4d8';
        ctx.font = 'bold 28px Poppins, system-ui, sans-serif';
        ctx.fillText(`"${verdict.mustacheTitle}"`, contentX, 280);

        // Style Category pill
        ctx.fillStyle = 'rgba(0, 127, 186, 0.4)';
        ctx.fillRect(contentX, 305, 180, 36);
        ctx.strokeStyle = '#007FBA';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(contentX, 305, 180, 36);

        ctx.fillStyle = '#f0f4f8';
        ctx.font = '600 16px Poppins, system-ui, sans-serif';
        ctx.fillText(`Style: ${verdict.styleCategory}`, contentX + 16, 329);

        // Subscores
        const scoreY = 375;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 18px Poppins';
        ctx.fillText(`Density: ${verdict.densityScore}/10   •   Symmetry: ${verdict.symmetryScore}/10   •   Swagger: ${verdict.swaggerScore}/10`, contentX, scoreY);

        // Official Roast Box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(contentX, 405, 600, 110);
        ctx.strokeStyle = 'rgba(0, 180, 216, 0.25)';
        ctx.strokeRect(contentX, 405, 600, 110);

        ctx.fillStyle = '#f0f4f8';
        ctx.font = 'italic 18px Poppins, system-ui, sans-serif';
        wrapText(ctx, `"${verdict.roast}"`, contentX + 20, 440, 560, 26);

        // Celebrity Twin
        ctx.fillStyle = '#F59E0B';
        ctx.font = '600 18px Poppins, system-ui, sans-serif';
        ctx.fillText(`Celebrity Match: ${verdict.celebrityTwin}`, contentX, 550);

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
        ctx.fillText('Certified by DVT Movember AI Judge • Zero Auth • Kindness Invariant Verified', 60, height - 35);

        resolve(canvas);
      };

      img.onload = drawRemainingContent;
      img.onerror = drawRemainingContent;

      if (img.complete) {
        drawRemainingContent();
      }
    });
  };

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        if (currentY > y + 60) {
          ctx.fillText(line + '...', x, currentY);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
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

  return (
    <div className="sharecard-modal-backdrop">
      <div className="sharecard-modal">
        <div className="sharecard-header">
          <div className="sharecard-title-wrap">
            <FaCamera className="title-icon" />
            <h3>Export Official DVT Verdict Card</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaXmark />
          </button>
        </div>

        <div className="sharecard-preview-container">
          <canvas ref={canvasRef} className="sharecard-canvas" />
        </div>

        <div className="sharecard-actions">
          <button 
            className="action-btn download-btn" 
            onClick={handleDownload}
            disabled={downloading}
          >
            <FaDownload className="btn-icon" /> {downloading ? 'Rendering...' : 'Download High-Res PNG'}
          </button>

          {navigator.clipboard && window.ClipboardItem && (
            <button 
              className="action-btn copy-btn"
              onClick={handleCopyToClipboard}
            >
              {copySuccess ? (
                <>
                  <FaCheck className="btn-icon" /> Copied to Clipboard!
                </>
              ) : (
                <>
                  <FaCopy className="btn-icon" /> Copy Image for Slack
                </>
              )}
            </button>
          )}

          <button className="action-btn secondary-btn" onClick={onClose}>
            Back to Verdict
          </button>
        </div>
      </div>
    </div>
  );
}
