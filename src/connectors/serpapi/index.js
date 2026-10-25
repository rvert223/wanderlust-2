// SerpAPI connector — Google Lens visual search, the app's only bridge to live web data.
// SerpAPI Lens only accepts an image URL, so the photo goes to our own server
// (server/index.js, POST /api/serp/lens), which hosts it for a moment, calls SerpAPI with the key
// it keeps privately, and returns the trimmed results. No SerpAPI key ever reaches the browser.
import { CONFIG, isConfigured } from '../../config/env';
import { http } from '../_shared/http';
import { withFallback } from '../_shared/withFallback';
import { consolidateLens } from './lens';
import { visualSearchMock } from './mock';

const LENS_TIMEOUT_MS = 50000; // the server answers within ~35 s (its own Lens time budget)
// Answers that mean "there is no Lens server here at all" (no API route / not configured) — only these
// may fall back to demo data.
const NO_LENS_SERVER = /-> (404|405|503)$/;

const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

/** visualSearch(photo) -> consolidated Lens result (see consolidateLens). `photo` = a capture with `blob` or `dataUrl`. */
export const visualSearch = withFallback(
  'serpapi-lens',
  () => isConfigured(CONFIG.serpapi.lensUrl),
  async (photo) => {
    const blob = photo.blob ?? (await dataUrlToBlob(photo.dataUrl));
    try {
      return consolidateLens(await http.post(CONFIG.serpapi.lensUrl, blob, { timeoutMs: LENS_TIMEOUT_MS }));
    } catch (error) {
      // No Lens server at all (static hosting, local dev, not configured): the demo fallback applies.
      if (NO_LENS_SERVER.test(error.message)) throw error;
      // Anything else — SerpAPI error, rate limit, slow answer, dropped connection — happened on a real
      // scan: continue with no matches so Muse says it can't identify it. Never a demo species.
      console.warn('[serpapi-lens] Lens failed; continuing with no matches', error);
      return consolidateLens({});
    }
  },
  visualSearchMock,
);
