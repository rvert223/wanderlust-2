// One sighting as a field-guide card: photo (or specimen emoji) with category and distance labels
// over it, then title, place, hazard notice, verification status and a tappable reporter.
// `expanded` also reveals the description.
import { HAZARD_LEVELS } from '../config/app';
import { CATEGORIES, sightingEmoji } from '../config/categories';
import { useApp } from '../state/AppContext';
import { formatDistance } from '../utils/geo';
import { timeAgo } from '../utils/format';
import GlassCard from './GlassCard';
import Icon from './Icon';
import PotionMeter from './PotionMeter';
import VerificationBadge from './VerificationBadge';

export default function SightingCard({ sighting, expanded = false, onSelect }) {
  const { openProfile } = useApp();
  const category = CATEGORIES[sighting.category];

  return (
    <GlassCard tilt className={`sighting ${expanded ? 'expanded' : ''}`} style={{ '--accent-color': category.color }} onClick={() => onSelect?.(sighting.id)}>
      <div className="sighting-art">
        {sighting.photo ? <img src={sighting.photo} alt={sighting.title} /> : <span className="sighting-emoji">{sightingEmoji(sighting)}</span>}
        <span className="photo-pill sighting-cat">{category.label}</span>
        <span className="photo-pill sighting-when">
          <Icon name="arrow" /> {sighting.distanceKm != null && `${formatDistance(sighting.distanceKm)} away · `}{timeAgo(sighting.createdAt)}
        </span>
      </div>
      <div className="sighting-body">
        <h3>{sighting.title}</h3>
        <p className="sighting-place">{sighting.place}</p>
        {expanded && <p className="sighting-desc">{sighting.description}</p>}
        {sighting.hazard > 0 && (
          <div className="hazard-notice">
            <Icon name="alert" />
            <div>
              <b>Hazard notice · {HAZARD_LEVELS[sighting.hazard]}</b>
              <PotionMeter value={sighting.hazard} />
            </div>
          </div>
        )}
        <div className="sighting-foot">
          <VerificationBadge verification={sighting.verification} />
          <button
            className="reporter"
            onClick={(event) => {
              event.stopPropagation();
              openProfile(sighting.reporter.id);
            }}
          >
            {sighting.reporter.emoji} {sighting.reporter.name}
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
