// Me: the user's profile — photo, level, stats, badges, where the app thinks you are (live GPS or a
// demo location), every sighting they posted, and log out.
import GlassCard from '../components/GlassCard';
import Icon from '../components/Icon';
import MagicButton from '../components/MagicButton';
import ProfilePanel from '../components/ProfilePanel';
import ScreenHeader from '../components/ScreenHeader';
import SightingCard from '../components/SightingCard';
import { DEMO_LOCATIONS, DEMO_WALK_STEP_MS } from '../data/demoLocations';
import { useApp } from '../state/AppContext';

function LocationPicker() {
  const { location, locationMode, setLocationMode } = useApp();
  const status = locationMode === 'live'
    ? (location.approximate ? 'Location is off or unavailable, so the map uses downtown Austin.' : `Following your GPS · ${location.placeName}`)
    : locationMode === 'walk'
      ? `Demo walk · now at ${location.placeName} · moves every ${DEMO_WALK_STEP_MS / 1000} s`
      : `Demo location · ${location.placeName}`;
  return (
    <section className="location-picker">
      <label className="place-picker" htmlFor="location-mode">
        <Icon name="target" />
        <select id="location-mode" value={locationMode} onChange={(event) => setLocationMode(event.target.value)} aria-label="Location source">
          <option value="live">Live GPS</option>
          <option value="walk">Demo walk around Austin</option>
          <optgroup label="Demo locations">
            {DEMO_LOCATIONS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </optgroup>
        </select>
        <Icon name="chevron" />
      </label>
      <p className="note">{status}</p>
    </section>
  );
}

export default function ProfileScreen() {
  const { user, sightings, setSelectedId, navigate, signOut } = useApp();
  const mine = sightings.filter((s) => s.reporter.id === user.id);

  return (
    <>
      <ScreenHeader title="Profile" />
      <GlassCard className="profile-card"><ProfilePanel person={user} isSelf /></GlassCard>

      <h3 className="section-title">Location</h3>
      <LocationPicker />

      <h3 className="section-title">My sightings</h3>
      {mine.length === 0 && <p className="empty">Nothing yet.</p>}
      {mine.map((sighting) => (
        <SightingCard key={sighting.id} sighting={sighting} onSelect={(id) => { setSelectedId(id); navigate('realm'); }} />
      ))}

      <MagicButton variant="ghost" className="sign-out" onClick={signOut}>Log out</MagicButton>
    </>
  );
}
