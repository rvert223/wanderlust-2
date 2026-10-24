// Floating notifications (hazard alerts, verifications, rank-ups). Tapping a toast
// dismisses it, and jumps to the sighting on the map if it carries a `sightingId`.
import { useApp } from '../state/AppContext';
import GlassCard from './GlassCard';
import Icon from './Icon';

export default function ToastStack() {
  const { toasts, dismissToast, setSelectedId, navigate } = useApp();

  const open = (toast) => {
    dismissToast(toast.id);
    if (!toast.sightingId) return;
    setSelectedId(toast.sightingId);
    navigate('realm');
  };

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <GlassCard key={toast.id} className={`toast ${toast.tone || ''}`} onClick={() => open(toast)}>
          <span className="toast-icon"><Icon name={toast.tone === 'danger' ? 'alert' : 'bell'} /></span>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
            {toast.tone === 'danger' && <small>Do not touch or taste it. Reports can be wrong — this is not medical advice.</small>}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
