// Capture (screen 1 of 2): hold up the phone and take a LIVE photo. The frame is stamped with
// time, GPS and a fingerprint, stored as the draft, and the user flows on to the Scan screen.
import { useState } from 'react';
import Icon from '../components/Icon';
import LiveCamera from '../components/LiveCamera';
import ScreenHeader from '../components/ScreenHeader';
import { captureDemoFrame, captureLivePhoto } from '../connectors/camera';
import { CONFIG } from '../config/env';
import { useCamera } from '../hooks/useCamera';
import { useApp } from '../state/AppContext';
import { burstAt } from '../utils/sparkle';

const FLASH_MS = 450;

export default function CaptureScreen() {
  const { location, setDraft, navigate } = useApp();
  const { videoRef, status } = useCamera();
  const [flashing, setFlashing] = useState(false);
  const canSnap = status === 'ready' || (status === 'unavailable' && CONFIG.allowDemoCapture);

  const snap = async () => {
    if (!canSnap || flashing) return;
    setFlashing(true);
    burstAt(innerWidth / 2, innerHeight / 2, 70);
    const frame = status === 'ready' ? await captureLivePhoto(videoRef.current, location.coords) : await captureDemoFrame(location.coords);
    setDraft(frame);
    setTimeout(() => navigate('scan'), FLASH_MS);
  };

  return (
    <>
      <ScreenHeader title="Capture" subtitle="Only live magic is trusted — no uploads, no fakes." />
      <LiveCamera videoRef={videoRef} status={status} placeName={location.placeName} />
      <div className="capture-controls">
        <button className="side-btn" onClick={() => navigate('ghost')}>
          <span className="side-icon"><Icon name="audio" /></span>
          <small>Haunts</small>
        </button>
        <button className="shutter" onClick={snap} disabled={!canSnap} aria-label="Capture a live photo"><span className="shutter-core" /></button>
        <button className="side-btn" onClick={() => navigate('profile')}>
          <span className="side-icon"><Icon name="notebook" /></span>
          <small>Journal</small>
        </button>
      </div>
      <p className="map-caption">Time, GPS &amp; a fingerprint are sealed into every photo</p>
      {flashing && <div className="flash" />}
    </>
  );
}
