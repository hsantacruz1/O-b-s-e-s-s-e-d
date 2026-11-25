import { BookOpen, Image, Mountain, Plus, Sun } from 'lucide-react';
import { formatClock } from '../lib/dates';
import { buzz } from '../lib/haptics';
import { useNow } from '../lib/hooks';
import { elapsedSeconds, useLockIn } from '../lib/lockin';
import { navigate } from '../lib/router';
import { ui } from '../lib/ui';

const TABS = [
  { path: '/', label: 'Today', Icon: Sun },
  { path: '/journal', label: 'Journal', Icon: BookOpen },
  { path: '/vision', label: 'Vision', Icon: Image },
  { path: '/progress', label: 'Ascent', Icon: Mountain },
];

export function TabBar({ active }: { active: string }) {
  const tab = (t: (typeof TABS)[number]) => (
    <button
      key={t.path}
      className={`tab ${active === t.path ? 'is-active' : ''}`}
      onClick={() => {
        buzz(4);
        navigate(t.path);
        window.scrollTo({ top: 0 });
      }}
      aria-current={active === t.path ? 'page' : undefined}
    >
      <t.Icon size={21} strokeWidth={1.3} />
      <span>{t.label}</span>
    </button>
  );

  return (
    <nav className="tabbar" aria-label="Main">
      <FocusPill />
      <div className="tabbar-inner">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <button
          className="tab-add"
          aria-label="New entry"
          onClick={() => {
            buzz(8);
            ui.openLog();
          }}
        >
          <Plus size={22} strokeWidth={1.4} />
        </button>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  );
}

/** A quiet reminder that a focus session is still running. */
function FocusPill() {
  const session = useLockIn();
  const now = useNow(1000);
  if (!session) return null;
  return (
    <button className="focus-pill" onClick={() => navigate('/focus')}>
      <span className={`focus-pill-dot ${session.pausedAt ? 'is-paused' : ''}`} />
      {session.pausedAt ? 'Paused' : 'In focus'}
      <b>{formatClock(elapsedSeconds(session, now))}</b>
    </button>
  );
}
