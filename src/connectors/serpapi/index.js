// SerpAPI connector — Google Lens visual search, the app's only bridge to live web data.
// SerpAPI Lens only accepts an image URL, so the photo goes to our own server
// (server/index.js, POST /api/serp/lens), which hosts it for a moment, calls SerpAPI with the key
// it keeps privately, and returns the trimmed results. No SerpAPI key ever reaches the browser.
import { CONFIG, isConfigured } from '../../config/env';
import { http } from '../_shared/http';
import { withFallback } from '../_shared/withFallback';
import { consolidateLens } from './lens';
import { visualSearchMock } from './mock';

const LENS_TIMEOUT_MS = 50000; // the server waits up to 45 s for SerpAPI

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
      // The server is live but Lens itself failed (SerpAPI error / timeout): report "nothing found"
      // so Muse says it can't identify it — never substitute a demo species for a real photo.
      if (/-> 50[24]$/.test(error.message)) {
        console.warn('[serpapi-lens] Lens failed on the server; continuing with no matches', error);
        return consolidateLens({});
      }
      throw error; // server missing / not configured: the demo fallback below applies
    }
  },
  visualSearchMock,
);
