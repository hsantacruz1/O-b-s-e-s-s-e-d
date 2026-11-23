import { useEffect } from 'react';
import { Moments } from './components/Moments';
import { TabBar } from './components/TabBar';
import { EntryDetailSheet } from './components/EntryCard';
import { requestPersistence } from './lib/db';
import { useProfile } from './lib/hooks';
import { navigate, useRoute } from './lib/router';
import { BoardEditor } from './screens/BoardEditor';
import { LockIn } from './screens/LockIn';
import { LogSheet } from './screens/LogSheet';
import { ObsessionDetail } from './screens/ObsessionDetail';
import { ObsessionForm } from './screens/ObsessionForm';
import { Onboarding } from './screens/Onboarding';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Tape } from './screens/Tape';
import { Today } from './screens/Today';
import { Vision } from './screens/Vision';

export function App() {
  const profile = useProfile();
  const { path, parts } = useRoute();

  useEffect(() => {
    requestPersistence();
  }, []);

  // Still loading from IndexedDB.
  if (!profile) return <div className="boot" />;

  if (!profile.onboardedAt) {
    return (
      <>
        <Onboarding onDone={() => navigate('/', { replace: true })} />
        <Moments />
      </>
    );
  }

  let screen: React.ReactNode;
  let tab: string | null = null;
  switch (parts[0]) {
    case undefined:
      screen = <Today />;
      tab = '/';
      break;
    case 'tape':
      screen = <Tape />;
      tab = '/tape';
      break;
    case 'vision':
      if (parts[1]) screen = <BoardEditor key={parts[1]} id={parts[1]} />;
      else {
        screen = <Vision />;
        tab = '/vision';
      }
      break;
    case 'progress':
      screen = <Progress />;
      tab = '/progress';
      break;
    case 'o':
      screen = <ObsessionDetail key={parts[1]} id={parts[1]} />;
      break;
    case 'lockin':
      screen = <LockIn />;
      break;
    case 'settings':
      screen = <Settings />;
      break;
    default:
      screen = <Today />;
      tab = '/';
  }

  const showTabs = tab !== null || parts[0] === 'o' || parts[0] === 'settings';

  return (
    <div className={`app ${showTabs ? 'has-tabs' : ''}`}>
      <main key={path} className="route">
        {screen}
      </main>
      {showTabs && <TabBar active={tab ?? ''} />}
      <LogSheet />
      <EntryDetailSheet />
      <ObsessionForm />
      <Moments />
    </div>
  );
}
