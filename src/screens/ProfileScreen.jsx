// Me: the user's profile — photo, level, stats, badges, every sighting they posted, and log out.
import GlassCard from '../components/GlassCard';
import MagicButton from '../components/MagicButton';
import ProfilePanel from '../components/ProfilePanel';
import ScreenHeader from '../components/ScreenHeader';
import SightingCard from '../components/SightingCard';
import { useApp } from '../state/AppContext';

export default function ProfileScreen() {
  const { user, sightings, setSelectedId, navigate, signOut } = useApp();
  const mine = sightings.filter((s) => s.reporter.id === user.id);

  return (
    <>
      <ScreenHeader title="Profile" />
      <GlassCard className="profile-card"><ProfilePanel person={user} isSelf /></GlassCard>

      <h3 className="section-title">My sightings</h3>
      {mine.length === 0 && <p className="empty">Nothing yet.</p>}
      {mine.map((sighting) => (
        <SightingCard key={sighting.id} sighting={sighting} onSelect={(id) => { setSelectedId(id); navigate('realm'); }} />
      ))}

      <MagicButton variant="ghost" className="sign-out" onClick={signOut}>Log out</MagicButton>
    </>
  );
}
