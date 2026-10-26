// Web Audio API synthesizer for live quiz countdown and events
// Pure clientside tone synthesis - zero external audio assets required

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Autoplay policy or unsupported audio - ignore silently
  }
}

export function playCountdownTone(step) {
  if (step === 3) {
    playTone(440, 'triangle', 0.18, 0.2); // A4
  } else if (step === 2) {
    playTone(554.37, 'triangle', 0.18, 0.2); // C#5
  } else if (step === 1) {
    playTone(659.25, 'triangle', 0.22, 0.22); // E5
  } else if (step === 'GO!' || step === 0) {
    // Celebratory bright major chord
    playTone(880, 'sine', 0.35, 0.25); // A5
    setTimeout(() => playTone(1108.73, 'sine', 0.3, 0.18), 30); // C#6
  }
}
