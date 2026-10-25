// Scan service: the identification pipeline behind the Scan screen. No third-party vision model:
//   1. SerpAPI Google Lens finds visual matches for the live photo (via our server's /api/serp/lens)
//   2. Muse Spark reads those matches + the surroundings and identifies the specimen, rates the
//      hazard, checks for AI-generated inconsistencies and writes the spoken warning
// `onStep(i)` lets the UI show progress using SCAN_STEPS labels.
import { analyzeScan } from '../connectors/muse';
import { visualSearch } from '../connectors/serpapi';
import { CATEGORIES } from '../config/categories';
import { clamp } from '../utils/format';
import { rankFor } from './profileService';

export const SCAN_STEPS = ['Searching the web with Google Lens…', 'Asking Muse what it is…'];

/** Muse's answer, reshaped into the result the Scan screen and posting already use. */
function toScanResult(analysis, lens, photo) {
  const hazard = clamp(Math.round(Number(analysis.hazard_level) || 0), 0, 5);
  const looksSynthetic = Boolean(analysis.looks_ai_generated);
  return {
    name: analysis.identified_object,
    scientificName: analysis.scientific_name || '',
    category: CATEGORIES[analysis.category] ? analysis.category : 'flora',
    hazard,
    confidence: clamp(Number(analysis.confidence) || 0.5, 0, 1),
    summary: analysis.summary || '',
    dangers: analysis.dangers || '',
    lookalikes: Array.isArray(analysis.lookalikes) ? analysis.lookalikes : [],
    looksSynthetic,
    authenticityNote: analysis.authenticity_note || '',
    narration: analysis.audio_narrative_script || '',
    museImagePrompt: analysis.muse_image_prompt || '',
    research: {
      summary: lens.matches[0]?.snippet || `Google Lens found ${lens.matches.length} close visual match${lens.matches.length === 1 ? '' : 'es'}.`,
      sources: lens.matches.filter((m) => m.link).map(({ title, link }) => ({ title, link })),
      images: lens.matches.map((m) => m.thumbnail).filter(Boolean),
    },
    // Only a live camera frame that Muse also believes is natural counts as authentic.
    authentic: photo.proof.live && !looksSynthetic,
  };
}

/**
 * @param {{ blob?: Blob, dataUrl: string, proof: object }} photo   the live capture (its image is the "imageBlob")
 * @param {{ placeName: string, currentHz: number|null, userStats: object }} locationPayload
 * @param {(step: number) => void} onStep
 */
export async function executeFullScanPipeline(photo, locationPayload, onStep = () => {}) {
  onStep(0);
  const lens = await visualSearch(photo);

  onStep(1);
  const analysis = await analyzeScan({
    raw_visual_matches: lens.matches,
    environmental_infrasound_hz: locationPayload.currentHz ?? null,
    location_context: locationPayload.placeName,
    user_stats: { rank: rankFor(locationPayload.userStats).name, people_warned: locationPayload.userStats.helped },
    lens_text: lens.footprint, // the consolidated text footprint (suggested titles, snippets, text in photo)
  });

  return toScanResult(analysis, lens, photo);
}
