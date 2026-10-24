// App shell: picks the active screen and mounts the always-present layers
// (sparkles, top bar, bottom navigation, toasts and the profile sheet).
import BottomNav from './components/BottomNav';
import ProfileSheet from './components/ProfileSheet';
import SparkleCanvas from './components/SparkleCanvas';
import ToastStack from './components/ToastStack';
import TopBar from './components/TopBar';
import CaptureScreen from './screens/CaptureScreen';
import CommunityScreen from './screens/CommunityScreen';
import GhostScreen from './screens/GhostScreen';
import ProfileScreen from './screens/ProfileScreen';
import RealmScreen from './screens/RealmScreen';
import ScanScreen from './screens/ScanScreen';
import { useApp } from './state/AppContext';

const SCREENS = {
  realm: RealmScreen,
  ghost: GhostScreen,
  capture: CaptureScreen,
  scan: ScanScreen,
  community: CommunityScreen,
  profile: ProfileScreen,
};

export default function App() {
  const { route } = useApp();
  const Screen = SCREENS[route];
  return (
    <div className="app">
      <SparkleCanvas />
      <TopBar />
      {/* `key` remounts the screen so its entrance animation replays on every tab change */}
      <main className="screen" key={route}>
        <Screen />
      </main>
      <BottomNav />
      <ToastStack />
      <ProfileSheet />
    </div>
  );
}
