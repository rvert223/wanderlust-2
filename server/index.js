// Wanderlust API server — the bridge to SerpAPI Google Lens and Meta's Muse models.
// Keeps every key on the server; the website only ever talks to /api/*.
//
// Google Lens — SerpAPI's Lens engine only accepts an image *URL*, never an upload. So:
//   POST /api/serp/lens        body = the JPEG/PNG/WebP photo (raw bytes)
//     1. saves it under a random, unguessable name
//     2. asks SerpAPI Lens to look at  PUBLIC_BASE_URL/api/serp/uploads/<name> (visual matches, or
//        Google's AI overview of the photo; retried for visual matches if it returns neither)
//     3. deletes the photo and returns the trimmed Lens results
//   GET  /api/serp/uploads/<name>  serves a saved photo (only while a lookup is running)
//
// Muse (Meta Model API, see server/muse.js):
//   POST /api/muse/scan        JSON scan payload        → the specimen analysis
//   POST /api/muse/narrate     { event, context }       → { message }
//   POST /api/muse/transcribe  recorded audio (bytes)   → { text }
//   GET  /api/muse/test        one-word round trip to check the key
//
// Places (OpenStreetMap Nominatim, see server/places.js):
//   GET  /api/place?lat=..&lng=..   → { name } — the real place name for GPS coordinates
//
//   GET  /api/health           { ok, lensConfigured, museConfigured, museModel }
// No dependencies: Node 20+.
//
// Env: SERPAPI_API_KEY, PUBLIC_BASE_URL (e.g. https://66-42-84-210.sslip.io), PORT (default 8787),
//      MUSE_API_KEY (+ optional MUSE_MODEL, MUSE_TRANSCRIBE_MODEL, MUSE_BASE_URL)
// Run: node --env-file=server/.env server/index.js
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as muse from './muse.js';
import * as places from './places.js';

const PORT = Number(process.env.PORT) || 8787;
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY || '';
const SERPAPI_URL = process.env.SERPAPI_URL || 'https://serpapi.com/search.json';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const UPLOAD_DIR = join(dirname(fileURLToPath(import.meta.url)), 'uploads');
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_JSON_BYTES = 64 * 1024;
const UPLOAD_TTL_MS = 10 * 60 * 1000; // safety sweep for photos a crashed lookup left behind
// One scan may make up to three SerpAPI requests (search, AI-overview text, retry). Together they get
// LENS_BUDGET_MS, so the server always answers before the website stops waiting (50 s).
const LENS_BUDGET_MS = 35_000;
const MIN_REQUEST_MS = 3_000; // don't start a request with less time than this left
const TOP_MATCHES = 8;
// Requests per visitor per minute — every call spends paid API credit.
const LIMITS_PER_MINUTE = { lens: 6, muse: 20, transcribe: 10, place: 30 };

const lensConfigured = () => Boolean(SERPAPI_API_KEY && PUBLIC_BASE_URL);

// Tiny in-memory rate limit, keyed by the visitor IP nginx forwards.
const recentLookups = new Map();
function overLimit(request, bucket) {
  const key = `${bucket}:${request.headers['x-real-ip'] || request.socket.remoteAddress}`;
  const now = Date.now();
  const times = (recentLookups.get(key) || []).filter((time) => now - time < 60_000);
  times.push(now);
  recentLookups.set(key, times);
  return times.length > LIMITS_PER_MINUTE[bucket];
}
setInterval(() => recentLookups.clear(), 10 * 60_000).unref();

// Only accept real images: check the file signature, not the declared type.
function imageExtension(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
const CONTENT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function readBody(request, maxBytes = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error(`Upload is larger than ${Math.round(maxBytes / 1024)} KB`), { status: 413, expose: true }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

/** Keeps what the app needs from a Google Lens response. */
function trimLens(result) {
  const matches = (result.visual_matches || []).slice(0, TOP_MATCHES).map(({ position, title, link, source, thumbnail, snippet }) => ({
    position, title, link, source, thumbnail, snippet,
  }));
  const knowledge = (result.knowledge_graph || []).slice(0, 3).map(({ title, subtitle, link, images }) => ({
    title, subtitle, link, image: images?.[0]?.source || images?.[0]?.link,
  }));
  // Google sometimes answers with an "AI overview" (a written summary + source links) instead of
  // visual matches. Keep its text, and use its sources as the matches when there are none.
  const overview = result.ai_overview || {};
  const overviewText = (overview.text_blocks || [])
    .flatMap((block) => [block.snippet, ...(block.list || []).map((item) => [item.title, item.snippet].filter(Boolean).join(': '))])
    .filter(Boolean).join(' ').slice(0, 1500);
  const references = (overview.references || []).slice(0, TOP_MATCHES).map(({ title, link, snippet, source }) => ({ title, link, source, snippet }));
  const bestMatches = matches.length ? matches : references;

  const suggestedTitles = [...new Set([...knowledge.map((k) => k.title), ...bestMatches.map((m) => m.title)].filter(Boolean))].slice(0, 5);
  const textSnippets = (result.text_results || []).slice(0, 5).map((t) => t.text).filter(Boolean);
  return { visual_matches: bestMatches, knowledge_graph: knowledge, suggested_titles: suggestedTitles, text_snippets: textSnippets, ai_overview: overviewText };
}

/**
 * One SerpAPI request within the scan's time budget. "No results" and running out of time are empty
 * answers ({ no_results } / { timed_out }), not errors.
 */
async function serpapi(params, deadline) {
  const remaining = deadline - Date.now();
  if (remaining < MIN_REQUEST_MS) return { timed_out: true };
  const search = new URL(SERPAPI_URL);
  Object.entries({ ...params, api_key: SERPAPI_API_KEY }).forEach(([key, value]) => search.searchParams.set(key, value));
  let serpResponse;
  try {
    serpResponse = await fetch(search, { signal: AbortSignal.timeout(remaining) });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return { timed_out: true };
    throw error;
  }
  const result = await serpResponse.json();
  if (result.error && /hasn't returned any results/i.test(result.error)) return { ...result, error: undefined, no_results: true };
  if (!serpResponse.ok || result.error) throw Object.assign(new Error(result.error || `SerpAPI answered ${serpResponse.status}`), { status: 502, expose: true });
  return result;
}

/** One Google Lens search for a photo URL. `type` narrows it (e.g. 'visual_matches'). */
async function searchLens(imageUrl, type, deadline) {
  // no_cache: Lens may hand back a short-lived AI-overview token that a cached answer would have expired.
  const result = await serpapi({ engine: 'google_lens', url: imageUrl, no_cache: 'true', ...(type && { type }) }, deadline);
  // The overview often arrives as a token only; fetch its text right away (counts as one more search).
  const token = result.ai_overview?.page_token;
  if (token && !result.ai_overview.text_blocks) {
    try {
      const full = await serpapi({ engine: 'google_ai_overview', page_token: token }, deadline);
      if (full.ai_overview) result.ai_overview = full.ai_overview;
    } catch (error) {
      console.warn('[lens] could not fetch the AI overview text:', error.message);
    }
  }
  return result;
}

async function lens(request, response) {
  if (!lensConfigured()) return sendJson(response, 503, { error: 'Lens is not configured: set SERPAPI_API_KEY and PUBLIC_BASE_URL' });
  if (overLimit(request, 'lens')) return sendJson(response, 429, { error: 'Too many scans — wait a minute and try again' });

  const body = await readBody(request);
  const extension = imageExtension(body);
  if (!extension) return sendJson(response, 415, { error: 'Send a JPEG, PNG or WebP photo' });

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${extension}`;
  const file = join(UPLOAD_DIR, name);
  await writeFile(file, body);

  try {
    const imageUrl = `${PUBLIC_BASE_URL}/api/serp/uploads/${name}`;
    const deadline = Date.now() + LENS_BUDGET_MS;
    let result = await searchLens(imageUrl, undefined, deadline);
    let trimmed = trimLens(result);
    // Neither matches nor an overview: ask once more, for visual matches only (one extra search).
    if (!trimmed.visual_matches.length && !trimmed.ai_overview) {
      result = await searchLens(imageUrl, 'visual_matches', deadline);
      trimmed = trimLens(result);
    }
    const overviewKeys = result.ai_overview ? Object.keys(result.ai_overview).join('+') : 'none';
    if (result.timed_out) console.log(`[lens] stopped at the ${LENS_BUDGET_MS / 1000} s limit`);
    console.log(`[lens] ${trimmed.visual_matches.length} matches · top: ${trimmed.visual_matches[0]?.title ?? '—'} · overview: ${trimmed.ai_overview ? `yes (${trimmed.ai_overview.slice(0, 60)}…)` : 'no'} · keys: ${Object.keys(result).join(',')} · ai_overview: ${overviewKeys}`);
    return sendJson(response, 200, trimmed);
  } finally {
    await rm(file, { force: true });
  }
}

async function readJson(request) {
  try {
    return JSON.parse((await readBody(request, MAX_JSON_BYTES)).toString('utf8'));
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('Send a JSON body'), { status: 400, expose: true });
  }
}

/** Muse routes: same guard (configured + rate limit), then the handler's result as JSON. */
async function museRoute(request, response, bucket, handler) {
  if (!muse.museConfigured()) return sendJson(response, 503, { error: 'Muse is not configured: set MUSE_API_KEY' });
  if (overLimit(request, bucket)) return sendJson(response, 429, { error: 'Too many requests — wait a minute and try again' });
  return sendJson(response, 200, await handler());
}

async function serveUpload(name, response) {
  // Names are random UUIDs we generated; reject anything else (no path tricks).
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) return sendJson(response, 404, { error: 'Not found' });
  try {
    const data = await readFile(join(UPLOAD_DIR, name));
    response.writeHead(200, { 'Content-Type': CONTENT_TYPES[name.split('.').pop()], 'Cache-Control': 'no-store' });
    response.end(data);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
  }
}

async function sweepUploads() {
  try {
    for (const name of await readdir(UPLOAD_DIR)) {
      const file = join(UPLOAD_DIR, name);
      if (Date.now() - (await stat(file)).mtimeMs > UPLOAD_TTL_MS) await rm(file, { force: true });
    }
  } catch {
    // folder not created yet
  }
}
setInterval(sweepUploads, UPLOAD_TTL_MS).unref();

createServer(async (request, response) => {
  const { pathname, searchParams } = new URL(request.url, 'http://localhost');
  try {
    if (request.method === 'GET' && pathname === '/api/health') {
      return sendJson(response, 200, { ok: true, lensConfigured: lensConfigured(), museConfigured: muse.museConfigured(), museModel: muse.museModel });
    }
    if (request.method === 'POST' && pathname === '/api/serp/lens') return await lens(request, response);
    if (request.method === 'POST' && pathname === '/api/muse/scan') return await museRoute(request, response, 'muse', async () => muse.analyzeScan(await readJson(request)));
    if (request.method === 'POST' && pathname === '/api/muse/narrate') return await museRoute(request, response, 'muse', async () => muse.narrate(await readJson(request)));
    if (request.method === 'POST' && pathname === '/api/muse/transcribe') {
      return await museRoute(request, response, 'transcribe', async () => muse.transcribe(await readBody(request), request.headers['content-type']));
    }
    if (request.method === 'GET' && pathname === '/api/place') {
      if (overLimit(request, 'place')) return sendJson(response, 429, { error: 'Too many place lookups — wait a minute' });
      return sendJson(response, 200, await places.reverse(Number(searchParams.get('lat')), Number(searchParams.get('lng'))));
    }
    if (request.method === 'GET' && pathname === '/api/muse/test') return await museRoute(request, response, 'muse', () => muse.selfTest());
    if (request.method === 'GET' && pathname.startsWith('/api/serp/uploads/')) return await serveUpload(pathname.split('/').pop(), response);
    return sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    if (!error.expose || (error.status || 500) >= 500) console.error('[api]', error);
    if (!response.headersSent) sendJson(response, error.status || 500, { error: error.expose ? error.message : 'Server error' });
  }
}).listen(PORT, '127.0.0.1', () =>
  console.log(`[api] listening on 127.0.0.1:${PORT} · lens ${lensConfigured() ? 'ready' : 'NOT configured'} · muse ${muse.museConfigured() ? `ready (${muse.museModel})` : 'NOT configured'}`));
