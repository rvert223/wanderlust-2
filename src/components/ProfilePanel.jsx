// A wanderer's profile: avatar, alchemy rank + progress, stat tiles (images posted, people
// helped, plants scanned), badges, real background and a Muse-written potion bio.
// Used by both the Profile tab and the profile sheet opened from any username.
import { useAsync } from '../hooks/useAsync';
import { badgesFor, getPotionBio, rankFor } from '../services/profileService';
import { useApp } from '../state/AppContext';
import Icon from './Icon';
import Avatar from './Avatar';
import MagicButton from './MagicButton';

const STAT_TILES = [
  { key: 'posted', label: 'Images posted' },
  { key: 'helped', label: 'People helped' },
  { key: 'scanned', label: 'Plants scanned' },
];

export default function ProfilePanel({ person, isSelf }) {
  const { notify } = useApp();
  const rank = rankFor(person.stats);
  const { data: bio } = useAsync(() => getPotionBio(person), [person.id, JSON.stringify(person.stats)]);

  return (
    <div className="profile">
      <Avatar name={person.name} verified={person.verified} size={84} />
      <h2>{person.name}</h2>
      <p className="handle">{person.handle} · {person.title}</p>
      {person.verified && <span className="verify-badge verified">Community verified</span>}

      <div className="rank">
        <strong>{rank.name}</strong>
        <div className="rank-bar"><span style={{ width: `${rank.progress * 100}%` }} /></div>
        <small>{rank.points} pts{rank.next && ` · on the way to ${rank.next}`}</small>
      </div>

      <div className="stat-tiles">
        {STAT_TILES.map(({ key, label }) => (
          <div className="stat-tile" key={key}>
            <b>{person.stats[key]}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <blockquote className="potion-bio">{bio ?? '…the cauldron is brewing a bio…'}</blockquote>
      <p className="background">{person.background}</p>

      <div className="tags">{badgesFor(person.stats).map((badge) => <span key={badge.id}>{badge.label}</span>)}</div>

      {!isSelf && (
        <MagicButton onClick={() => notify({ emoji: '🦉', title: 'Owl post sent', body: `${person.name} will be asked to help with your next sighting.` })}>
          <Icon name="send" /> Ask {person.name.split(' ')[0]} for help
        </MagicButton>
      )}
    </div>
  );
}
