// Haunts: the "Fear Frequency" (18.9 Hz) detector. The microphone is analysed locally with an
// FFT; when the 18.9 Hz band spikes, Muse (the Paranormal Investigator) warns the user out loud.
// Also: voice questions via Muse Voice Transcribe, and nearby haunted places.
import { useEffect, useRef, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Icon from '../components/Icon';
import MagicButton from '../components/MagicButton';
import ScreenHeader from '../components/ScreenHeader';
import SightingCard from '../components/SightingCard';
import SpectrumGauge from '../components/SpectrumGauge';
import { INFRASOUND } from '../config/app';
import { reportSpike } from '../connectors/infrasound';
import { narrate, recordClip, speak, transcribe } from '../connectors/muse';
import { useInfrasound } from '../hooks/useInfrasound';
import { nearbySightings } from '../services/sightingsService';
import { useApp } from '../state/AppContext';
import { clamp } from '../utils/format';
import { celebrate } from '../utils/sparkle';

const HAUNT_RADIUS_KM = 250;
const LOG_LIMIT = 20;
const VOICE_CLIP_MS = 4000;

export default function GhostScreen() {
  const { sightings, location, notify, postSighting, setSelectedId, navigate } = useApp();
  const { frame, listening, micAvailable, start, stop, injectTone } = useInfrasound();
  const [log, setLog] = useState([{ id: 0, who: 'investigator', text: 'Light a candle and press Listen. I will tell you when the veil grows thin.' }]);
  const [lastSpike, setLastSpike] = useState(null);
  const [asking, setAsking] = useState(false);
  const lastWarning = useRef(0);

  const addLog = (who, text) => setLog((current) => [{ id: `${Date.now()}-${Math.random()}`, who, text }, ...current].slice(0, LOG_LIMIT));
  const say = (text) => {
    addLog('investigator', text);
    speak(text);
  };

  // On each spike (rate-limited) Muse warns the user and the optional backend gets a report.
  const spiking = frame?.spiking ?? false;
  useEffect(() => {
    if (!spiking || Date.now() - lastWarning.current < INFRASOUND.cooldownMs) return;
    lastWarning.current = Date.now();
    setLastSpike({ deltaDb: frame.deltaDb });
    narrate('infrasound_spike', { deltaDb: frame.deltaDb }).then(say);
    navigator.vibrate?.([200, 100, 200]);
    reportSpike({ coords: location.coords, hz: INFRASOUND.targetHz, deltaDb: frame.deltaDb });
  }, [spiking]);

  const ask = async () => {
    setAsking(true);
    try {
      const question = await transcribe(await recordClip(VOICE_CLIP_MS));
      addLog('you', question);
      say(await narrate('investigator_reply', { question }));
    } catch {
      notify({ emoji: '🎙️', title: 'The spirits heard nothing', body: 'Microphone unavailable or blocked.' });
    } finally {
      setAsking(false);
    }
  };

  const markHaunted = async () => {
    await postSighting({
      category: 'ghost',
      title: `Haunting near ${location.placeName}`,
      place: location.placeName,
      description: `Infrasound peaked ${lastSpike.deltaDb.toFixed(0)} dB above the noise floor in the 18.9 Hz fear band.`,
      hazard: 0,
      coords: location.coords,
    });
    celebrate();
    notify({ emoji: '👻', title: 'Haunting recorded', body: 'Fellow ghost hunters can now find this place.' });
  };

  const fear = clamp(((frame?.deltaDb ?? 0) / (INFRASOUND.spikeDeltaDb * 2)) * 100, 0, 100);
  const hauntedPlaces = nearbySightings(sightings, location.coords, HAUNT_RADIUS_KM).filter((s) => s.category === 'ghost' || s.category === 'sound').slice(0, 4);

  return (
    <>
      <ScreenHeader title="Haunts" subtitle={`Fear frequency · ${INFRASOUND.targetHz} Hz`} />

      <GlassCard className={`ghost-panel ${spiking ? 'haunted' : ''}`}>
        <SpectrumGauge analysis={frame} />
        <div className="fear-track">
          <div className="fear-fill" style={{ width: `${fear}%` }} />
          <span className="fear-ghost" style={{ left: `${fear}%` }}><Icon name="ghost" /></span>
        </div>
        <p className="fear-readout">
          {listening ? `+${(frame?.deltaDb ?? 0).toFixed(1)} dB above the noise floor` : 'Silent. The veil is closed.'}
        </p>
        {listening && !micAvailable && <p className="note">No microphone found — use the test tone to try the detector.</p>}
        <div className="actions wrap">
          {listening ? <MagicButton variant="ghost" onClick={stop}><Icon name="stop" /> Stop</MagicButton> : <MagicButton onClick={start}><Icon name="audio" /> Listen</MagicButton>}
          <MagicButton variant="ghost" onClick={injectTone} disabled={!listening}><Icon name="bell" /> Test tone</MagicButton>
          <MagicButton variant="ghost" onClick={ask} disabled={asking}><Icon name="mic" /> {asking ? 'Listening…' : 'Ask'}</MagicButton>
          <MagicButton variant="ghost" onClick={markHaunted} disabled={!lastSpike}><Icon name="ghost" /> Mark haunted</MagicButton>
        </div>
      </GlassCard>

      <h3 className="section-title">The Investigator&rsquo;s log</h3>
      {log.map(({ id, who, text }) => (
        <p key={id} className={`log-line ${who}`}><b>{who === 'you' ? 'You' : 'Investigator'}</b> {text}</p>
      ))}

      <h3 className="section-title">Haunted places nearby</h3>
      {hauntedPlaces.map((sighting) => (
        <SightingCard key={sighting.id} sighting={sighting} onSelect={(id) => { setSelectedId(id); navigate('realm'); }} />
      ))}
    </>
  );
}
