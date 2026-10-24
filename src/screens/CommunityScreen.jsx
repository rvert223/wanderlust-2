// Community: anonymous feed. Top — recent posts grouped by place (e.g. "Barton Springs
// Pool Posts"), nearest place first, with each place's distance from the user. No names shown.
// Bottom — a collapsed "Needs verification" dropdown where the user votes on pending sightings.
import CategoryIcon from '../components/CategoryIcon';
import GlassCard from '../components/GlassCard';
import Icon from '../components/Icon';
import MagicButton from '../components/MagicButton';
import ScreenHeader from '../components/ScreenHeader';
import VerificationBadge from '../components/VerificationBadge';
import { CATEGORIES } from '../config/categories';
import { nearbySightings } from '../services/sightingsService';
import { useApp } from '../state/AppContext';
import { timeAgo } from '../utils/format';
import { formatDistance } from '../utils/geo';

const MAX_GROUPS = 6;

/** Groups sightings by place: newest post first inside a group, nearest group first overall. */
function groupByPlace(sightings) {
  const groups = new Map();
  sightings.forEach((s) => groups.set(s.place, [...(groups.get(s.place) || []), s]));
  return [...groups.entries()]
    .map(([place, posts]) => ({
      place,
      category: posts[0].category,
      distanceKm: Math.min(...posts.map((p) => p.distanceKm)),
      posts: posts.sort((a, b) => b.createdAt - a.createdAt),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_GROUPS);
}

function PlaceGroup({ group, onOpen }) {
  const { label } = CATEGORIES[group.category];
  return (
    <GlassCard className="place-group">
      <header className="group-head">
        <h3>{group.place} Posts</h3>
        <small>{label} · {formatDistance(group.distanceKm)} from you</small>
      </header>
      {group.posts.map((post) => (
        <button key={post.id} className="post" onClick={() => onOpen(post.id)}>
          <span className="post-art">{post.photo ? <img src={post.photo} alt="" /> : <CategoryIcon category={post.category} />}</span>
          <span className="post-body">
            <b>{post.title}</b>
            <small>{timeAgo(post.createdAt)}</small>
            <VerificationBadge verification={post.verification} />
          </span>
        </button>
      ))}
    </GlassCard>
  );
}

function VerifyCard({ sighting, user, onVote }) {
  const { verification, reporter } = sighting;
  const mine = reporter.id === user.id;
  const voted = verification.votes.some((v) => v.userId === user.id);
  return (
    <GlassCard className="verify-card">
      <div className="verify-head">
        <span className="verify-emoji">{sighting.photo ? <img src={sighting.photo} alt="" /> : <CategoryIcon category={sighting.category} />}</span>
        <div>
          <h4>{sighting.title}</h4>
          <small>{sighting.place} · {verification.votes.length} vote{verification.votes.length === 1 ? '' : 's'}</small>
        </div>
      </div>
      <div className="confidence"><span style={{ width: `${verification.aiScore * 100}%` }} /><em>AI check {Math.round(verification.aiScore * 100)}%</em></div>
      {mine || voted ? (
        <p className="note">{mine ? 'Your own sighting — the council decides.' : 'Your vote is cast. Thank you, helper!'}</p>
      ) : (
        <div className="actions">
          <MagicButton onClick={() => onVote(sighting.id, true)}><Icon name="check" /> Looks real</MagicButton>
          <MagicButton variant="ghost" onClick={() => onVote(sighting.id, false)}><Icon name="x" /> Doubtful</MagicButton>
        </div>
      )}
    </GlassCard>
  );
}

export default function CommunityScreen() {
  const { location, sightings, user, vote, setSelectedId, navigate } = useApp();
  const pending = sightings.filter((s) => s.verification.status === 'pending');
  const groups = groupByPlace(nearbySightings(sightings, location.coords, Infinity));

  return (
    <>
      <ScreenHeader title="Community" />

      {groups.length === 0 && <p className="empty">No posts yet. Be the first to wave your wand.</p>}
      {groups.map((group) => (
        <PlaceGroup key={group.place} group={group} onOpen={(id) => { setSelectedId(id); navigate('realm'); }} />
      ))}

      <details className="dropdown">
        <summary>
          <span>Needs verification</span>
          <span className="count-pill">{pending.length}</span>
          <Icon name="chevron" />
        </summary>
        <div className="dropdown-body">
          {pending.length === 0 && <p className="empty">Nothing waiting for verification.</p>}
          {pending.map((sighting) => <VerifyCard key={sighting.id} sighting={sighting} user={user} onVote={vote} />)}
        </div>
      </details>
    </>
  );
}
