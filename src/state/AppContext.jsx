// Global app state + actions, shared through React context (`useApp()`).
// Screens read state and call actions; all network/storage work is delegated to services.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ALERT_RADIUS_KM, DEFAULT_CENTER, LOCATION } from '../config/app';
import { placeAt } from '../connectors/facebookGraph';
import { narrate } from '../connectors/muse';
import { subscribeToAlerts } from '../services/alertService';
import * as auth from '../services/authService';
import { loadLocationMode, saveLocationMode, startLocationSource } from '../services/locationService';
import { loadUser, rankFor, saveUser } from '../services/profileService';
import { createSighting, listSightings, voteOnSighting } from '../services/sightingsService';
import { distanceKm } from '../utils/geo';
import { asReporter } from '../utils/people';
import { celebrate } from '../utils/sparkle';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const TOAST_MS = 7000;

export function AppProvider({ children }) {
  const [route, setRoute] = useState('realm');
  const [location, setLocation] = useState({ coords: DEFAULT_CENTER, placeName: 'Finding your glade…', approximate: true });
  const [sightings, setSightings] = useState([]);
  const [user, setUser] = useState(loadUser);
  const [draft, setDraft] = useState(null); // latest live capture: { id, dataUrl, proof, result? }
  const [selectedId, setSelectedId] = useState(null); // sighting highlighted on the Realm map
  const [profileId, setProfileId] = useState(null); // person shown in the profile sheet
  const [toasts, setToasts] = useState([]);
  const [session, setSession] = useState(auth.loadSession); // signed-in account, or null
  const [lastInfrasound, setLastInfrasound] = useState(null); // latest 18.9 Hz spike: { hz, deltaDb, at }
  const [locationMode, setLocationModeState] = useState(loadLocationMode); // 'live' | 'walk' | demo location id

  // ---- UI actions -------------------------------------------------------
  const navigate = (next) => {
    setRoute(next);
    window.scrollTo({ top: 0 });
  };

  const dismissToast = (id) => setToasts((current) => current.filter((toast) => toast.id !== id));
  const notify = (toast) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, emoji: '✨', ...toast }]);
    setTimeout(() => dismissToast(id), TOAST_MS);
  };

  // ---- Account actions --------------------------------------------------
  const startSession = (next) => {
    setSession(next);
    setUser((current) => ({ ...current, name: next.user.name, email: next.user.email }));
    setRoute('realm');
  };
  const signUp = async (fields) => startSession(await auth.signUp(fields));
  const logIn = async (fields) => startSession(await auth.logIn(fields));
  const signOut = () => {
    auth.signOut();
    setSession(null);
  };

  // ---- Domain actions ---------------------------------------------------
  const updateUser = (fields) => setUser((current) => ({ ...current, ...fields }));
  const bumpStat = (key) => setUser((current) => ({ ...current, stats: { ...current.stats, [key]: current.stats[key] + 1 } }));

  const postSighting = async (fields) => {
    const created = await createSighting({ reporter: asReporter(user), ...fields });
    setSightings((current) => [created, ...current]);
    setSelectedId(created.id);
    bumpStat('posted');
    return created;
  };

  const vote = async (id, agree) => {
    const wasVerified = sightings.find((s) => s.id === id).verification.status === 'verified';
    const updated = await voteOnSighting(id, { userId: user.id, agree });
    setSightings((current) => current.map((s) => (s.id === id ? updated : s)));
    bumpStat('helped');
    if (!wasVerified && updated.verification.status === 'verified') {
      celebrate();
      notify({ emoji: '✅', title: 'Sighting verified!', body: updated.title });
    }
  };

  const setLocationMode = (mode) => {
    saveLocationMode(mode);
    setLocationModeState(mode);
  };

  // ---- Boot: sightings ---------------------------------------------------
  useEffect(() => {
    listSightings().then(setSightings);
  }, []);

  // ---- Location: followed continuously from the chosen source -------------
  // Small GPS jitter is ignored (LOCATION.minMoveM) and the place name is only looked up again
  // after a real move (LOCATION.placeRefreshM). Demo locations carry their own place name.
  useEffect(() => {
    let cancelled = false;
    let last = null; // { coords, approximate } last applied
    let lastPlaceCoords = null;
    let placeLookup = 0; // only the newest place-name lookup may write its answer
    const metersBetween = (a, b) => distanceKm(a, b) * 1000;

    const stop = startLocationSource(locationMode, async (reading) => {
      const moved = last ? metersBetween(last.coords, reading.coords) : Infinity;
      if (moved < LOCATION.minMoveM && last.approximate === reading.approximate) return;
      last = reading;
      setLocation((current) => ({
        ...current,
        coords: reading.coords,
        approximate: reading.approximate,
        demo: Boolean(reading.demo),
        ...(reading.placeName && { placeName: reading.placeName }),
      }));

      if (reading.placeName) {
        lastPlaceCoords = reading.coords;
        placeLookup += 1; // a demo name beats any lookup still in flight
        return;
      }
      if (lastPlaceCoords && metersBetween(lastPlaceCoords, reading.coords) < LOCATION.placeRefreshM) return;
      lastPlaceCoords = reading.coords;
      const lookup = ++placeLookup;
      const placeName = await placeAt(reading.coords.lat, reading.coords.lng);
      if (!cancelled && lookup === placeLookup) setLocation((current) => ({ ...current, placeName }));
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [locationMode]);

  // ---- Nearby hazard alerts (re-subscribes when the user's position changes) ----
  useEffect(
    () =>
      subscribeToAlerts({
        center: location.coords,
        radiusKm: ALERT_RADIUS_KM,
        onAlert: async (sighting) => {
          setSightings((current) => (current.some((s) => s.id === sighting.id) ? current : [sighting, ...current]));
          const body = await narrate('poison_alert', { title: sighting.title, distanceKm: distanceKm(location.coords, sighting.coords) });
          notify({ emoji: '☠️', tone: 'danger', title: 'Potion peril nearby!', body, sightingId: sighting.id });
        },
      }),
    [location.coords],
  );

  // ---- Persist the user and celebrate rank-ups --------------------------
  const rankName = rankFor(user.stats).name;
  const previousRank = useRef(rankName);
  useEffect(() => {
    saveUser(user);
    if (previousRank.current === rankName) return;
    previousRank.current = rankName;
    celebrate();
    notify({ emoji: '👑', title: `You are now ${rankName}!`, body: 'Keep exploring.' });
  }, [user, rankName]);

  const value = {
    route, navigate, location, sightings, user, draft, setDraft, selectedId, setSelectedId,
    profileId, openProfile: setProfileId, toasts, notify, dismissToast, updateUser, bumpStat, postSighting, vote,
    session, signUp, logIn, signOut, lastInfrasound, recordInfrasound: setLastInfrasound, locationMode, setLocationMode,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
