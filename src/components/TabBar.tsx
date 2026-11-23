import { Eye, Film, Flame, Plus, Trophy } from 'lucide-react';
import { buzz } from '../lib/haptics';
import { elapsedSeconds, useLockIn } from '../lib/lockin';
import { useNow } from '../lib/hooks';
import { navigate } from '../lib/router';
import { ui } from '../lib/ui';
import { formatClock } from '../lib/dates';

const TABS = [
  { path: '/', label: 'Today', Icon: Flame },
  { path: '/tape', label: 'Tape', Icon: Film },
  { path: '/vision', label: 'Vision', Icon: Eye },
  { path: '/progress', label: 'Progress', Icon: Trophy },
];

export function TabBar({ active }: { active: string }) {
  const tab = (t: (typeof TABS)[number]) => (
    <button
      key={t.path}
      className={`tab ${active === t.path ? 'is-active' : ''}`}
      onClick={() => {
        buzz(6);
        navigate(t.path);
        window.scrollTo({ top: 0 });
      }}
      aria-current={active === t.path ? 'page' : undefined}
    >
      <t.Icon size={22} strokeWidth={active === t.path ? 2.4 : 1.8} />
      <span>{t.label}</span>
    </button>
  );

  return (
    <nav className="tabbar" aria-label="Main">
      <LockInPill />
      <div className="tabbar-inner">
        {tab(TABS[0])}
        {tab(TABS[1])}
        <button
          className="tab-fab"
          aria-label="Log a rep"
          onClick={() => {
            buzz(12);
            ui.openLog();
          }}
        >
          <Plus size={28} strokeWidth={2.6} />
        </button>
        {tab(TABS[2])}
        {tab(TABS[3])}
      </div>
    </nav>
  );
}

/** Floating reminder that a Lock In session is running. */
function LockInPill() {
  const session = useLockIn();
  const now = useNow(1000);
  if (!session) return null;
  return (
    <button className="lockin-pill" onClick={() => navigate('/lockin')}>
      <span className={`lockin-pill-dot ${session.pausedAt ? 'is-paused' : ''}`} />
      {session.pausedAt ? 'PAUSED' : 'LOCKED IN'}
      <b>{formatClock(elapsedSeconds(session, now))}</b>
    </button>
  );
}
