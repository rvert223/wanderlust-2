// A person's profile: photo, level + progress, stat tiles (images posted, people helped, plants
// scanned), badges and background. On your own profile you can change or remove your photo.
// Used by both the Profile tab and the profile sheet opened from any username.
import { useRef } from 'react';
import { badgesFor, rankFor } from '../services/profileService';
import { useApp } from '../state/AppContext';
import { toSquareDataUrl } from '../utils/image';
import Avatar from './Avatar';
import Icon from './Icon';
import MagicButton from './MagicButton';

const STAT_TILES = [
  { key: 'posted', label: 'Images posted' },
  { key: 'helped', label: 'People helped' },
  { key: 'scanned', label: 'Plants scanned' },
];

function PhotoEditor({ photo }) {
  const { updateUser, notify } = useApp();
  const inputRef = useRef(null);

  const pick = async (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    try {
      updateUser({ photo: await toSquareDataUrl(file) });
    } catch {
      notify({ title: 'Photo not updated', body: 'That file could not be read as an image. Try a JPG or PNG.' });
    }
  };

  return (
    <div className="photo-actions">
      <input ref={inputRef} id="profile-photo" type="file" accept="image/*" hidden onChange={pick} />
      <button className="link-btn" onClick={() => inputRef.current.click()}>
        <Icon name="camera" /> {photo ? 'Change photo' : 'Add photo'}
      </button>
      {photo && <button className="link-btn" onClick={() => updateUser({ photo: null })}>Remove</button>}
    </div>
  );
}

export default function ProfilePanel({ person, isSelf }) {
  const { notify } = useApp();
  const rank = rankFor(person.stats);

  return (
    <div className="profile">
      <Avatar name={person.name} photo={person.photo} verified={person.verified} size={84} />
      {isSelf && <PhotoEditor photo={person.photo} />}
      <h2>{person.name}</h2>
      {!isSelf && <p className="handle">{person.handle}</p>}
      {person.verified && <span className="verify-badge verified">Community verified</span>}

      <div className="rank">
        <strong>{rank.name}</strong>
        <div className="rank-bar"><span style={{ width: `${rank.progress * 100}%` }} /></div>
        <small>{rank.points} pts{rank.next && ` · next level: ${rank.next}`}</small>
      </div>

      <div className="stat-tiles">
        {STAT_TILES.map(({ key, label }) => (
          <div className="stat-tile" key={key}>
            <b>{person.stats[key]}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {!isSelf && person.background && <p className="background">{person.background}</p>}

      <div className="tags">{badgesFor(person.stats).map((badge) => <span key={badge.id}>{badge.label}</span>)}</div>

      {!isSelf && (
        <MagicButton onClick={() => notify({ emoji: '🦉', title: 'Owl post sent', body: `${person.name} will be asked to help with your next sighting.` })}>
          <Icon name="send" /> Ask {person.name.split(' ')[0]} for help
        </MagicButton>
      )}
    </div>
  );
}
