import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ACHIEVEMENT_MAP } from '../lib/achievements';
import { onMoment, type Moment } from '../lib/events';
import { rankForLevel } from '../lib/game';
import { buzz } from '../lib/haptics';
import { useUI } from '../lib/ui';

type Queued = Exclude<Moment, { kind: 'toast' }>;

/** Shows XP pops, level-ups, unlocked badges and toasts. The hype man of the app. */
export function Moments() {
  const [queue, setQueue] = useState<Queued[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string; tone?: string }[]>([]);
  const seq = useRef(0);

  useEffect(
    () =>
      onMoment((m) => {
        if (m.kind === 'toast') {
          const id = ++seq.current;
          setToasts((t) => [...t, { id, text: m.text, tone: m.tone }]);
          window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
        } else {
          setQueue((q) => [...q, m]);
        }
      }),
    [],
  );

  const current = queue[0];
  const next = () => setQueue((q) => q.slice(1));

  useEffect(() => {
    if (!current) return;
    if (current.kind === 'levelup') buzz([30, 60, 30, 60, 120]);
    else buzz([15, 40, 25]);
    const ms = current.kind === 'levelup' ? 4200 : current.kind === 'xp' ? 2600 : 3000;
    const t = window.setTimeout(next, ms);
    return () => window.clearTimeout(t);
  }, [current]);

  return createPortal(
    <>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'error' ? 'toast--error' : ''}`}>
            {t.text}
          </div>
        ))}
      </div>
      {current?.kind === 'xp' && (
        <div className="moment-xp" onClick={next} key={queue.length + 'xp'}>
          <div className="moment-xp-num">+{current.xp} XP</div>
          <ul>
            {current.lines.map((l, i) => (
              <li key={i} style={{ animationDelay: `${120 + i * 70}ms` }}>
                <span>{l.label}</span>
                <b>+{l.xp}</b>
              </li>
            ))}
          </ul>
          {current.prs.length > 0 && <div className="moment-pr">📈 NEW PR · {current.prs.join(', ')}</div>}
        </div>
      )}
      {current?.kind === 'levelup' && (
        <div className="moment-level" onClick={next}>
          <div className="moment-level-burst" />
          <div className="eyebrow">{current.rankUp ? 'New rank unlocked' : 'Level up'}</div>
          <div className="moment-level-num">{current.level}</div>
          <div className="moment-level-rank">{current.rank}</div>
          <p>{rankForLevel(current.level).line}</p>
          <span className="moment-tap">Tap to keep going</span>
        </div>
      )}
      {current?.kind === 'achievement' && <AchievementBanner id={current.id} onClose={next} />}
      <ConfirmDialog />
    </>,
    document.body,
  );
}

function AchievementBanner({ id, onClose }: { id: string; onClose: () => void }) {
  const a = ACHIEVEMENT_MAP.get(id);
  if (!a) return null;
  return (
    <div className="moment-badge" onClick={onClose}>
      <div className={`badge-medal badge-medal--${a.tier}`}>{a.emoji}</div>
      <div>
        <div className="eyebrow">Achievement unlocked</div>
        <div className="moment-badge-title">{a.title}</div>
        <div className="moment-badge-desc">{a.desc}</div>
      </div>
    </div>
  );
}

function ConfirmDialog() {
  const { confirm } = useUI();
  if (!confirm) return null;
  return (
    <div className="dialog-root" role="alertdialog" aria-modal="true">
      <div className="dialog-backdrop" onClick={() => confirm.resolve(false)} />
      <div className="dialog">
        <h3>{confirm.title}</h3>
        {confirm.body && <p>{confirm.body}</p>}
        <div className="dialog-actions">
          <button className="btn btn--ghost" onClick={() => confirm.resolve(false)}>
            Cancel
          </button>
          <button className={`btn ${confirm.danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => confirm.resolve(true)}>
            {confirm.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
