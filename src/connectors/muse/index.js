// Muse connector — Meta's Muse models.
//  analyzeScan(payload)    : Muse Spark (Personal AI Agent) identifies a scanned specimen from the
//                            Google Lens data, rates its hazard and writes the warning script.
//  narrate(event, context) : Muse Agent turns an app event into an in-character line.
//  transcribe(audioBlob)   : Muse Voice Transcribe turns recorded audio into text.
//  speak(text)             : plays a line through the device speakers/headphones.
import { CONFIG, isConfigured } from '../../config/env';
import { http } from '../_shared/http';
import { withFallback } from '../_shared/withFallback';
import { analyzeScanMock, narrateMock, transcribeMock } from './mock';

const authHeaders = { Authorization: `Bearer ${CONFIG.muse.apiKey}` };

export const SCAN_SYSTEM_PROMPT =
  'You are the Wanderlust Personal AI Agent. Analyze the incoming SerpAPI Google Lens data array. ' +
  'Determine the exact biological specimen identity, assign a hazard level (0-5), check for malicious or ' +
  'AI-generated visual inconsistencies, and compile an immersive, potion-themed text and real-time audio ' +
  'script warning the explorer of any toxicity.\n' +
  'Reply with JSON only: {"identified_object": string, "hazard_level": 0-5, "audio_narrative_script": string, ' +
  '"muse_image_prompt": string, "scientific_name": string, "category": "flora"|"fauna"|"wonder"|"ghost"|"sound", ' +
  '"confidence": 0-1, "summary": string, "dangers": string, "lookalikes": string[], ' +
  '"looks_ai_generated": boolean, "authenticity_note": string}';

/** Muse may answer with the object itself, or wrap it (e.g. { message: "<json>" } / { output: {...} }). */
function unwrapJson(reply) {
  const candidate = reply?.identified_object ? reply : reply?.output ?? reply?.result ?? reply?.message ?? reply?.text ?? reply;
  if (typeof candidate === 'string') {
    const json = candidate.match(/\{[\s\S]*\}/); // tolerate prose or ``` fences around the JSON
    return JSON.parse(json ? json[0] : candidate);
  }
  return candidate;
}

/**
 * Sent as { event: 'scan_analysis', system_prompt, ...payload } so a single Muse endpoint can tell scans
 * apart from narration requests ({ event, context }).
 * analyzeScan({ raw_visual_matches, environmental_infrasound_hz, location_context, user_stats, lens_text })
 *   -> { identified_object, hazard_level, audio_narrative_script, muse_image_prompt, scientific_name,
 *        category, confidence, summary, dangers, lookalikes, looks_ai_generated, authenticity_note }
 */
export const analyzeScan = withFallback(
  'muse-scan',
  () => isConfigured(CONFIG.muse.scanUrl),
  async (payload) => {
    const body = { event: 'scan_analysis', system_prompt: SCAN_SYSTEM_PROMPT, ...payload };
    const reply = await http.post(CONFIG.muse.scanUrl, body, { headers: authHeaders, timeoutMs: 30000 });
    const analysis = unwrapJson(reply);
    if (!analysis?.identified_object) throw new Error('Muse reply has no identified_object');
    return analysis;
  },
  analyzeScanMock,
);

/** Events: infrasound_spike | scan_result | poison_alert | verification_request | profile_bio | investigator_reply */
export const narrate = withFallback(
  'muse-agent',
  () => isConfigured(CONFIG.muse.agentUrl),
  async (event, context) => (await http.post(CONFIG.muse.agentUrl, { event, context }, { headers: authHeaders })).message,
  narrateMock,
);

export const transcribe = withFallback(
  'muse-transcribe',
  () => isConfigured(CONFIG.muse.transcribeUrl),
  async (audioBlob) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'clip.webm');
    return (await http.post(CONFIG.muse.transcribeUrl, form, { headers: authHeaders })).text;
  },
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
