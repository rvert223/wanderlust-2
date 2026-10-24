// Scan (screen 2 of 2): runs the identification pipeline on the captured photo (Gemini ->
// SerpAPI -> Muse), shows the result, and lets the user post it to the Realm — which pings
// nearby verifiers for anything risky.
import { useEffect, useRef, useState } from 'react';
import GlassCard from '../components/GlassCard';
import MagicButton from '../components/MagicButton';
import ScanResultCard from '../components/ScanResultCard';
import ScreenHeader from '../components/ScreenHeader';
import { CATEGORIES } from '../config/categories';
import { askVerifiers } from '../services/communityService';
import { SCAN_STEPS, scanPhoto } from '../services/scanService';
import { useApp } from '../state/AppContext';
import { celebrate } from '../utils/sparkle';

const RISKY_HAZARD = 2; // posts at or above this ask nearby experts to verify

export default function ScanScreen() {
  const { draft, setDraft, navigate, bumpStat, postSighting, notify, location } = useApp();
  const [step, setStep] = useState(0);
  const [posting, setPosting] = useState(false);
  const startedFor = useRef(null); // guards against StrictMode double-running the pipeline

  useEffect(() => {
    if (!draft || draft.result || startedFor.current === draft.id) return;
    startedFor.current = draft.id;
    scanPhoto(draft, setStep)
      .then((result) => {
        setDraft((current) => (current?.id === draft.id ? { ...current, result } : current));
        bumpStat('scanned');
      })
      .catch(() => {
        notify({ emoji: '🌫️', title: 'The mirror clouded over', body: 'Please capture again.' });
        navigate('capture');
      });
  }, [draft]);

  const post = async () => {
    setPosting(true);
    const { result, dataUrl, proof } = draft;
    const sighting = await postSighting({
      category: result.category,
      emoji: result.emoji,
      title: result.name,
      place: location.placeName,
      description: result.summary,
      hazard: result.hazard,
      coords: proof.coords,
      photo: dataUrl,
      verification: { status: 'pending', aiScore: result.authentic ? result.confidence : result.confidence * 0.4, votes: [] },
    });
    celebrate();
    setDraft(null);
    navigate('realm');
    notify({ emoji: '🌟', title: 'Posted to the Realm', body: `${CATEGORIES[sighting.category].label} nearby are being alerted.` });
    if (result.hazard >= RISKY_HAZARD) {
      const { verifiers, message } = await askVerifiers(sighting);
      if (verifiers.length) notify({ emoji: '📜', title: `${verifiers.length} verifiers pinged`, body: message });
    }
  };

  if (!draft) {
    return (
      <>
        <ScreenHeader title="Scan" />
        <GlassCard className="empty-card">
          <p>Nothing to scan yet. Wave your wand at something wondrous first.</p>
          <MagicButton onClick={() => navigate('capture')}>Open the camera</MagicButton>
        </GlassCard>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Scan" />
      {draft.result ? (
        <ScanResultCard photo={draft} result={draft.result} posting={posting} onPost={post} onRescan={() => { setDraft(null); navigate('capture'); }} />
      ) : (
        <GlassCard className="scanning">
          <div className="scan-photo">
            <img src={draft.dataUrl} alt="Your live capture" />
            <span className="scan-beam" />
          </div>
          <ul className="scan-steps">
            {SCAN_STEPS.map((label, index) => (
              <li key={label} className={index < step ? 'done' : index === step ? 'active' : ''}>{label}</li>
            ))}
          </ul>
        </GlassCard>
      )}
    </>
  );
}
