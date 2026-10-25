// Offline stand-in for Muse: one in-character template per event, a canned transcript, and a scan
// analysis that recognises the demo specimens (anything else is treated as unknown and risky).
import { DEMO_SPECIMENS } from '../../data/specimens';
const TEMPLATES = {
  infrasound_spike: ({ deltaDb }) =>
    `The ambient infrasound just spiked ${Math.round(deltaDb)} dB near the fear frequency. Stay alert — you're entering a highly active zone.`,
  scan_result: ({ name, hazard }) =>
    hazard >= 3
      ? `Careful, traveller. That ${name} brews a ${hazard >= 5 ? 'draught of doom' : 'bitter draught'}. Keep your hands in your pockets and warn the others.`
      : `A gentle find! ${name} is little danger to a wanderer — but a true alchemist still washes their hands.`,
  poison_alert: ({ title, distanceKm }) =>
    `A potion peril was just pinned ${distanceKm.toFixed(1)} km from you: ${title}. Watch your step, and keep pets close.`,
  verification_request: ({ expertName, title, distanceKm }) =>
    `Hey ${expertName}, a wanderer just pinned a possible ${title} about ${distanceKm.toFixed(1)} km from your trail. Could you verify this sighting?`,
  profile_bio: ({ name, rank, stats }) =>
    `${name}, ${rank} of the Wanderlust Guild — ${stats.scanned} plants scanned, ${stats.helped} wanderers warned, and a cauldron that never boils over.`,
  investigator_reply: ({ question }) =>
    `I heard you say "${question}". The veil is thin here — keep listening to the low hum, and tell me when it changes.`,
};

export async function narrateMock(event, context) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return TEMPLATES[event](context);
}

export async function transcribeMock() {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return 'is somebody there';
}

const hazardLine = (name, hazard) =>
  hazard >= 3
    ? `Careful, traveller. That ${name} brews a ${hazard >= 5 ? 'draught of doom' : 'bitter draught'}. Keep your hands in your pockets and warn the others.`
    : `A gentle find! ${name} is little danger to a wanderer — but a true alchemist still washes their hands.`;

export async function analyzeScanMock({ raw_visual_matches: matches = [], lens_text: lensText = '' }) {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const haystack = `${lensText}\n${matches.map((m) => m.title).join('\n')}`.toLowerCase();
  const known = DEMO_SPECIMENS.find((s) => haystack.includes(s.name.toLowerCase()) || haystack.includes(s.scientificName.toLowerCase()));

  if (known) {
    return {
      identified_object: known.name,
      scientific_name: known.scientificName,
      category: known.category,
      hazard_level: known.hazard,
      confidence: known.confidence,
      summary: known.summary,
      dangers: known.dangers,
      lookalikes: known.lookalikes,
      looks_ai_generated: false,
      authenticity_note: 'Natural lighting, sensor noise and depth of field are consistent with a real live capture.',
      audio_narrative_script: hazardLine(known.name, known.hazard),
      muse_image_prompt: `A field-guide plate of ${known.name} (${known.scientificName}), ink and watercolour, potion-label border`,
    };
  }

  // Muse is offline and Lens found something we don't know: never call it safe.
  const best = matches[0]?.title || 'Unknown specimen';
  return {
    identified_object: best,
    scientific_name: '',
    category: 'flora',
    hazard_level: 3,
    confidence: 0.3,
    summary: `Google Lens's closest match is "${best}". Muse is offline, so this identification has not been checked.`,
    dangers: 'Hazard not assessed. Treat it as dangerous until an expert confirms.',
    lookalikes: matches.slice(1, 3).map((m) => m.title).filter(Boolean),
    looks_ai_generated: false,
    authenticity_note: 'Authenticity not checked (Muse offline).',
    audio_narrative_script: `I can't be sure what this is, traveller. Until a guide confirms it, keep your hands to yourself.`,
    muse_image_prompt: '',
  };
}
