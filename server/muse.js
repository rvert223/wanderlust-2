// Meta Model API bridge (Muse Spark + Muse Voice Transcribe), called only from server/index.js.
// Docs: https://dev.meta.ai/docs — base URL https://api.meta.ai/v1, key as a Bearer token,
// Chat Completions for Muse Spark, POST /asr/transcribe for Muse Voice Transcribe.
// The server owns every prompt: visitors send app data, never instructions, so the key can't be
// used as a general-purpose chatbot.
const MUSE_API_KEY = process.env.MUSE_API_KEY || '';
const MUSE_BASE_URL = (process.env.MUSE_BASE_URL || 'https://api.meta.ai/v1').replace(/\/$/, '');
const MUSE_MODEL = process.env.MUSE_MODEL || 'muse-spark-1.3';
const MUSE_TRANSCRIBE_MODEL = process.env.MUSE_TRANSCRIBE_MODEL || 'muse-voice-transcribe-1.0';
const TIMEOUT_MS = 30_000;
const MAX_CONTEXT_CHARS = 4000;
// Muse Spark reasons before it answers, and those reasoning tokens count against max_tokens
// (a one-word "Hello" reply used ~440). Keep these generous or the answer comes back empty.
const MAX_TOKENS = { scan: 6000, narrate: 2000, test: 1500 };

export const museConfigured = () => Boolean(MUSE_API_KEY);
export const museModel = MUSE_MODEL;

const SCAN_SYSTEM_PROMPT =
  'You are the Wanderlust Personal AI Agent. Analyze the incoming SerpAPI Google Lens data array. ' +
  'Determine the exact biological specimen identity, assign a hazard level (0-5), check for malicious or ' +
  'AI-generated visual inconsistencies, and compile an immersive, potion-themed text and real-time audio ' +
  'script warning the explorer of any toxicity.\n' +
  'Reply with JSON only, no markdown: {"identified_object": string, "hazard_level": 0-5, ' +
  '"audio_narrative_script": string, "muse_image_prompt": string, "scientific_name": string, ' +
  '"category": "flora"|"fauna"|"wonder"|"ghost"|"sound", "confidence": 0-1, "summary": string, ' +
  '"dangers": string, "lookalikes": string[], "looks_ai_generated": boolean, "authenticity_note": string}\n' +
  'lens_text may include Google\'s AI overview of the photo; treat it as strong evidence alongside the matches. ' +
  'If the matches disagree or are unclear, lower the confidence and treat the specimen as hazardous. ' +
  'Never call an uncertain plant, fungus or animal safe to touch or eat.';

const NARRATOR_PROMPT =
  'You are the Paranormal Investigator inside Wanderlust, a fairytale field-guide app. Speak to the ' +
  'explorer in one or two short sentences meant to be read aloud: warm, a little theatrical, never ' +
  'markdown, never emoji. Safety first: never suggest touching or eating anything.';

// The narration events the app sends, and what each line should do.
const NARRATION_EVENTS = {
  infrasound_spike: 'The 18.9 Hz "fear frequency" just spiked by deltaDb decibels. Warn the explorer calmly.',
  scan_result: 'Comment on the scanned specimen (name, hazard 0-5).',
  poison_alert: 'A hazardous sighting (title) was pinned distanceKm away. Warn the explorer.',
  verification_request: 'Write a friendly note asking expertName to verify a sighting (title) distanceKm away.',
  profile_bio: 'Write a one-line playful bio from the name, rank and stats.',
  investigator_reply: 'The explorer asked you this question out loud. Answer it in character.',
};

function apiError(message, status = 502) {
  return Object.assign(new Error(message), { status, expose: true });
}

async function callMeta(path, init) {
  const response = await fetch(`${MUSE_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${MUSE_API_KEY}`, ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`[muse] ${path} -> ${response.status}: ${text.slice(0, 500)}`);
    throw apiError(`Muse answered ${response.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw apiError('Muse sent a reply that is not JSON');
  }
}

/** Chat Completions → the assistant's text. */
async function chat(messages, maxTokens) {
  const data = await callMeta('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MUSE_MODEL, messages, max_tokens: maxTokens }),
  });
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  // Some models return content as a list of parts.
  const text = Array.isArray(content) ? content.map((part) => part.text ?? '').join('') : content ?? '';
  if (!text.trim() && choice?.finish_reason === 'length') throw apiError('Muse ran out of tokens before answering (raise MAX_TOKENS in server/muse.js)');
  return text;
}

/** Finds the JSON object in a reply, tolerating ``` fences or a sentence around it. */
function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw apiError('Muse did not return JSON');
  return JSON.parse(match[0]);
}

const clip = (value) => JSON.stringify(value ?? null).slice(0, MAX_CONTEXT_CHARS);

/** POST /api/muse/scan — body: the scan payload from the app. */
export async function analyzeScan(payload) {
  const input = {
    raw_visual_matches: payload.raw_visual_matches,
    environmental_infrasound_hz: payload.environmental_infrasound_hz,
    location_context: payload.location_context,
    user_stats: payload.user_stats,
    lens_text: payload.lens_text,
  };
  const reply = await chat([
    { role: 'system', content: SCAN_SYSTEM_PROMPT },
    { role: 'user', content: clip(input) },
  ], MAX_TOKENS.scan);
  const analysis = extractJson(reply);
  if (!analysis.identified_object) throw apiError('Muse reply has no identified_object');
  console.log(`[muse] scan → ${analysis.identified_object} · hazard ${analysis.hazard_level} · confidence ${analysis.confidence} · from ${input.raw_visual_matches?.length ?? 0} Lens matches`);
  return analysis;
}

/** POST /api/muse/narrate — body: { event, context } → { message }. */
export async function narrate({ event, context }) {
  const instruction = NARRATION_EVENTS[event];
  if (!instruction) throw apiError('Unknown narration event', 400);
  const message = await chat([
    { role: 'system', content: NARRATOR_PROMPT },
    { role: 'user', content: `${instruction}\nDetails: ${clip(context)}` },
  ], MAX_TOKENS.narrate);
  return { message: message.trim() };
}

/** POST /api/muse/transcribe — body: the recorded audio (raw bytes) → { text }. */
export async function transcribe(audio, contentType) {
  const form = new FormData();
  form.append('file', new Blob([audio], { type: contentType || 'audio/webm' }), 'clip.webm');
  form.append('model', MUSE_TRANSCRIBE_MODEL);
  const data = await callMeta('/asr/transcribe', { method: 'POST', body: form });
  const text = data.text ?? data.transcript ?? data.results?.[0]?.text ?? data.segments?.map((s) => s.text).join(' ');
  if (typeof text !== 'string') throw apiError('Muse transcription had no text');
  return { text: text.trim() };
}

/** GET /api/muse/test — a one-word round trip, to check the key, model and address. */
export async function selfTest() {
  const reply = await chat([{ role: 'user', content: 'Reply with exactly one word: ready' }], MAX_TOKENS.test);
  return { ok: true, model: MUSE_MODEL, reply: reply.trim() };
}
