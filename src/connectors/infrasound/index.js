// Infrasound connector — listens for the 18.9 Hz "Fear Frequency".
// Muse can't hear infrasound itself, so we run the FFT locally (Web Audio AnalyserNode),
// and only when the band spikes do we trigger Muse (see GhostScreen). Phone mics often
// high-pass filter this range, so the test tone feeds a synthetic 18.9 Hz sine into the SAME
// analyser for demos/tests — the detection path is identical to real microphone input.
import { CONFIG, isConfigured } from '../../config/env';
import { http } from '../_shared/http';
import { InfrasoundAnalyzer } from './analyzer';

const FRAME_MS = 50;

/**
 * Starts listening. Calls `onFrame(analysis)` ~20x/second.
 * Resolves with { stop, injectTone(ms), injectTestTone(), stopTestTone(), micAvailable };
 * falls back to tone-only if the mic is denied.
 */
export async function startListening(onFrame) {
  const context = new AudioContext();
  const analyzer = new InfrasoundAnalyzer(context);

  let stream = null;
  try {
    // Disable voice processing: it would filter out exactly the frequencies we want.
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    context.createMediaStreamSource(stream).connect(analyzer.input);
  } catch (error) {
    console.warn('[infrasound] microphone unavailable, tone-only mode', error);
  }

  const timer = setInterval(() => onFrame(analyzer.read()), FRAME_MS);
  let toneTimer = null;

  return {
    micAvailable: Boolean(stream),
    injectTestTone: () => analyzer.injectTestTone(context),
    stopTestTone: () => analyzer.stopTestTone(),
    /** Plays the test tone for `ms`, then stops it. */
    injectTone(ms = 3000) {
      clearTimeout(toneTimer);
      analyzer.injectTestTone(context);
      toneTimer = setTimeout(() => analyzer.stopTestTone(), ms);
    },
    stop() {
      clearInterval(timer);
      clearTimeout(toneTimer);
      analyzer.stopTestTone();
      stream?.getTracks().forEach((track) => track.stop());
      context.close();
    },
  };
}

/** Optionally forwards a spike to the Python (scipy/librosa) service for a second opinion. */
export async function reportSpike(payload) {
  if (!isConfigured(CONFIG.infrasound.backendUrl)) return;
  try {
    await http.post(CONFIG.infrasound.backendUrl, payload);
  } catch (error) {
    console.warn('[infrasound] backend report failed', error);
  }
}
