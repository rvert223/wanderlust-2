// Me: the user's profile — photo, level, stats, badges and every sighting they posted.
import GlassCard from '../components/GlassCard';
import ProfilePanel from '../components/ProfilePanel';
import ScreenHeader from '../components/ScreenHeader';
import SightingCard from '../components/SightingCard';
import { useApp } from '../state/AppContext';

export default function ProfileScreen() {
  const { user, sightings, setSelectedId, navigate } = useApp();
  const mine = sightings.filter((s) => s.reporter.id === user.id);

  return (
    <>
      <ScreenHeader title="Profile" />
      <GlassCard><ProfilePanel person={user} isSelf /></GlassCard>

      <h3 className="section-title">My sightings</h3>
      {mine.length === 0 && <p className="empty">Nothing yet.</p>}
      {mine.map((sighting) => (
        <SightingCard key={sighting.id} sighting={sighting} onSelect={(id) => { setSelectedId(id); navigate('realm'); }} />
      ))}
    </>
  );
}
