// Bottom sheet showing anyone's profile. Opened with `openProfile(userId)` from any username.
import { useAsync } from '../hooks/useAsync';
import { getProfile } from '../services/profileService';
import { useApp } from '../state/AppContext';
import Icon from './Icon';
import ProfilePanel from './ProfilePanel';

export default function ProfileSheet() {
  const { profileId, openProfile, user } = useApp();
  const { data } = useAsync(() => (profileId ? getProfile(profileId) : Promise.resolve(null)), [profileId]);

  if (!profileId) return null;
  const isSelf = profileId === user.id;
  const person = isSelf ? user : data?.id === profileId ? data : null;

  return (
    <div className="sheet-backdrop" onClick={() => openProfile(null)}>
      <aside className="sheet glass" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Profile">
        <button className="sheet-close" onClick={() => openProfile(null)} aria-label="Close"><Icon name="x" /></button>
        {person ? <ProfilePanel person={person} isSelf={isSelf} /> : <p className="empty">Unrolling the scroll…</p>}
      </aside>
    </div>
  );
}
