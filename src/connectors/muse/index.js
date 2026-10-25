// Muse connector — Meta's Muse models, reached through our own server (server/muse.js), which
// keeps the Meta Model API key and owns the prompts. The website never holds a Muse key.
//  analyzeScan(payload)    : Muse Spark (Personal AI Agent) identifies a scanned specimen from the
//                            Google Lens data, rates its hazard and writes the warning script.
//  narrate(event, context) : Muse Spark turns an app event into an in-character spoken line.
//  transcribe(audioBlob)   : Muse Voice Transcribe turns recorded audio into text.
//  speak(text)             : plays a line through the device speakers/headphones.
import { CONFIG, isConfigured } from '../../config/env';
import { http } from '../_shared/http';
import { withFallback } from '../_shared/withFallback';
import { analyzeScanMock, narrateMock, transcribeMock } from './mock';

/**
 * analyzeScan({ raw_visual_matches, environmental_infrasound_hz, location_context, user_stats, lens_text })
 *   -> { identified_object, hazard_level, audio_narrative_script, muse_image_prompt, scientific_name,
 *        category, confidence, summary, dangers, lookalikes, looks_ai_generated, authenticity_note }
 * The system prompt lives on the server (server/muse.js → SCAN_SYSTEM_PROMPT).
 */
export const analyzeScan = withFallback(
  'muse-scan',
  () => isConfigured(CONFIG.muse.scanUrl),
  async (payload) => {
    const analysis = await http.post(CONFIG.muse.scanUrl, payload, { timeoutMs: 35000 });
    if (!analysis?.identified_object) throw new Error('Muse reply has no identified_object');
    return analysis;
  },
  analyzeScanMock,
);

/** Events: infrasound_spike | scan_result | poison_alert | verification_request | profile_bio | investigator_reply */
export const narrate = withFallback(
  'muse-narrate',
  () => isConfigured(CONFIG.muse.narrateUrl),
  async (event, context) => (await http.post(CONFIG.muse.narrateUrl, { event, context }, { timeoutMs: 35000 })).message,
  narrateMock,
);

/** Sends the raw recording (its own audio type) to the server, which forwards it to Muse Voice Transcribe. */
export const transcribe = withFallback(
  'muse-transcribe',
  () => isConfigured(CONFIG.muse.transcribeUrl),
  async (audioBlob) => (await http.post(CONFIG.muse.transcribeUrl, audioBlob, { timeoutMs: 35000 })).text,
  transcribeMock,
);

export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 0.8;
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

/** Records `ms` of microphone audio and resolves with a Blob (input for `transcribe`). */
export async function recordClip(ms = 4000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = (event) => chunks.push(event.data);
  const finished = new Promise((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
  });
  recorder.start();
  setTimeout(() => recorder.stop(), ms);
  return finished;
}
