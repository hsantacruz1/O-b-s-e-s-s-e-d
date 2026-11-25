import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ACHIEVEMENT_MAP } from '../lib/achievements';
import { onMoment, type Moment } from '../lib/events';
import { rankForLevel } from '../lib/game';
import { buzz } from '../lib/haptics';
import { ICONS } from '../lib/icons';
import { useUI } from '../lib/ui';

type Queued = Exclude<Moment, { kind: 'toast' }>;

/** Acknowledges progress: experience earned, a new level, a milestone. Quietly. */
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
    buzz(current.kind === 'levelup' ? [20, 80, 20] : 10);
    const ms = current.kind === 'levelup' ? 4800 : current.kind === 'xp' ? 3000 : 3400;
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
        <div className="moment-xp" onClick={next} key={queue.length + 'xp'} role="status">
          <div className="moment-xp-head">
            <span className="label">Recorded</span>
            <b>+{current.xp}</b>
          </div>
          <ul>
            {current.lines.map((l, i) => (
              <li key={i} style={{ animationDelay: `${160 + i * 90}ms` }}>
                <span>{l.label}</span>
                <span>+{l.xp}</span>
              </li>
            ))}
          </ul>
          {current.prs.length > 0 && <div className="moment-pr">New personal best · {current.prs.join(', ')}</div>}
        </div>
      )}
      {current?.kind === 'levelup' && (
        <div className="moment-level" onClick={next} role="status">
          <span className="moment-level-rule" />
          <div className="label">{current.rankUp ? 'A new rank' : 'You have reached'}</div>
          <div className="moment-level-num">{current.level}</div>
          <div className="moment-level-rank">{current.rank}</div>
          <p>{rankForLevel(current.level).line}</p>
          <span className="moment-tap">Tap to continue</span>
        </div>
      )}
      {current?.kind === 'achievement' && <MilestoneBanner id={current.id} onClose={next} />}
      <ConfirmDialog />
    </>,
    document.body,
  );
}

function MilestoneBanner({ id, onClose }: { id: string; onClose: () => void }) {
  const a = ACHIEVEMENT_MAP.get(id);
  if (!a) return null;
  const Icon = ICONS[a.icon];
  return (
    <div className="moment-badge" onClick={onClose} role="status">
      <span className={`medal medal--${a.tier} is-earned`}>
        <Icon size={20} strokeWidth={1.3} />
      </span>
      <div>
        <div className="label">Milestone</div>
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
