// Live viewfinder with a focus reticle and field labels over the picture. There is intentionally no
// gallery/upload picker: only what the camera sees right now can be scanned. Shows a hint when the
// camera is unavailable.
import { CONFIG } from '../config/env';
import Icon from './Icon';

const STATUS_LABELS = { ready: 'Live · focus locked', starting: 'Waking the lens' };

export default function LiveCamera({ videoRef, status, placeName }) {
  return (
    <div className="camera">
      <video ref={videoRef} autoPlay playsInline muted />
      <span className="camera-place"><Icon name="arrow" /> {placeName}</span>
      <div className="reticle">
        <i /><i /><i /><i />
        <span className="reticle-beam" />
      </div>
      {status !== 'ready' && (
        <p className="camera-note">
          {status === 'starting'
            ? 'Waking the mirror…'
            : `The mirror can't see — camera blocked or unavailable. ${CONFIG.allowDemoCapture ? 'Tap the shutter to conjure a demo vision.' : 'Allow camera access and use HTTPS or localhost.'}`}
        </p>
      )}
      <div className="camera-strip">
        <span className="mono"><i className={`dot ${status === 'ready' ? 'live' : ''}`} /> {STATUS_LABELS[status] ?? 'No signal'}</span>
      </div>
    </div>
  );
}
