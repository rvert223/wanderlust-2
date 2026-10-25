// Wanderlust API server — the Google Lens bridge.
// SerpAPI's Google Lens engine only accepts an image *URL*, never an upload. So:
//   POST /api/serp/lens        body = the JPEG/PNG/WebP photo (raw bytes)
//     1. saves it under a random, unguessable name
//     2. asks SerpAPI Lens to look at  PUBLIC_BASE_URL/api/serp/uploads/<name>
//     3. deletes the photo and returns the trimmed Lens results
//   GET  /api/serp/uploads/<name>  serves a saved photo (only while a lookup is running)
//   GET  /api/health               { ok, lensConfigured }
// The SerpAPI key lives only here (never in the website). No dependencies: Node 20+.
//
// Env: SERPAPI_API_KEY, PUBLIC_BASE_URL (e.g. https://66-42-84-210.sslip.io), PORT (default 8787)
// Run: node --env-file=server/.env server/index.js
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 8787;
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const UPLOAD_DIR = join(dirname(fileURLToPath(import.meta.url)), 'uploads');
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const UPLOAD_TTL_MS = 10 * 60 * 1000; // safety sweep for photos a crashed lookup left behind
const LENS_TIMEOUT_MS = 45_000;
const TOP_MATCHES = 8;
const LENS_LIMIT_PER_MINUTE = 6; // per visitor — every lookup spends a SerpAPI credit

const lensConfigured = () => Boolean(SERPAPI_API_KEY && PUBLIC_BASE_URL);

// Tiny in-memory rate limit, keyed by the visitor IP nginx forwards.
const recentLookups = new Map();
function overLimit(request) {
  const ip = request.headers['x-real-ip'] || request.socket.remoteAddress;
  const now = Date.now();
  const times = (recentLookups.get(ip) || []).filter((time) => now - time < 60_000);
  times.push(now);
  recentLookups.set(ip, times);
  return times.length > LENS_LIMIT_PER_MINUTE;
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

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) {
        reject(Object.assign(new Error('Photo is larger than 6 MB'), { status: 413 }));
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
  const suggestedTitles = [...new Set([...knowledge.map((k) => k.title), ...matches.map((m) => m.title)].filter(Boolean))].slice(0, 5);
  const textSnippets = (result.text_results || []).slice(0, 5).map((t) => t.text).filter(Boolean);
  return { visual_matches: matches, knowledge_graph: knowledge, suggested_titles: suggestedTitles, text_snippets: textSnippets };
}

async function lens(request, response) {
  if (!lensConfigured()) return sendJson(response, 503, { error: 'Lens is not configured: set SERPAPI_API_KEY and PUBLIC_BASE_URL' });
  if (overLimit(request)) return sendJson(response, 429, { error: 'Too many scans — wait a minute and try again' });

  const body = await readBody(request);
  const extension = imageExtension(body);
  if (!extension) return sendJson(response, 415, { error: 'Send a JPEG, PNG or WebP photo' });

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${extension}`;
  const file = join(UPLOAD_DIR, name);
  await writeFile(file, body);

  try {
    const search = new URL('https://serpapi.com/search.json');
    search.searchParams.set('engine', 'google_lens');
    search.searchParams.set('url', `${PUBLIC_BASE_URL}/api/serp/uploads/${name}`);
    search.searchParams.set('api_key', SERPAPI_API_KEY);
    const lensResponse = await fetch(search, { signal: AbortSignal.timeout(LENS_TIMEOUT_MS) });
    const result = await lensResponse.json();
    if (!lensResponse.ok || result.error) return sendJson(response, 502, { error: result.error || `SerpAPI answered ${lensResponse.status}` });
    return sendJson(response, 200, trimLens(result));
  } finally {
    await rm(file, { force: true });
  }
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
  const { pathname } = new URL(request.url, 'http://localhost');
  try {
    if (request.method === 'GET' && pathname === '/api/health') return sendJson(response, 200, { ok: true, lensConfigured: lensConfigured() });
    if (request.method === 'POST' && pathname === '/api/serp/lens') return await lens(request, response);
    if (request.method === 'GET' && pathname.startsWith('/api/serp/uploads/')) return await serveUpload(pathname.split('/').pop(), response);
    return sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[api]', error);
    if (!response.headersSent) sendJson(response, error.status || 500, { error: error.status ? error.message : 'Server error' });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`[api] listening on 127.0.0.1:${PORT} · lens ${lensConfigured() ? 'ready' : 'NOT configured'}`));
