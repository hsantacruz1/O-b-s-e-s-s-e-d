import { ChevronLeft, Pause, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntryFields, metricsFromInputs, type EntryFieldValues } from '../components/EntryFields';
import { Mountains, Ring } from '../components/Viz';
import { saveEntry } from '../lib/actions';
import { db } from '../lib/db';
import { dayKey, formatClock, formatDuration } from '../lib/dates';
import { toast } from '../lib/events';
import { buzz } from '../lib/haptics';
import { useNow, useObsessions, useProfileOrDefault } from '../lib/hooks';
import { ObsessionIcon } from '../lib/icons';
import { uid } from '../lib/ids';
import { elapsedSeconds, lockIn, useLockIn } from '../lib/lockin';
import { mantraForDay } from '../lib/mantras';
import { goBack, navigate, useRoute } from '../lib/router';
import { ui } from '../lib/ui';

const GOALS = [0, 25, 45, 60, 90, 120];

/** Keep the screen awake during a session (where the browser allows it). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) sentinel.release();
      } catch {
        /* denied or unsupported */
      }
    };
    const onVis = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}

export function Focus() {
  const session = useLockIn();
  const { query } = useRoute();
  const obsessions = useObsessions();
  const [finishing, setFinishing] = useState<null | { seconds: number }>(null);

  if (finishing && session)
    return (
      <Finish
        seconds={finishing.seconds}
        onBack={() => {
          lockIn.resume();
          setFinishing(null);
        }}
      />
    );
  if (session)
    return (
      <Running
        onEnd={(seconds) => {
          lockIn.pause();
          setFinishing({ seconds });
        }}
      />
    );
  return <Setup initial={query.get('o') ?? obsessions[0]?.id ?? ''} />;
}

function Setup({ initial }: { initial: string }) {
  const obsessions = useObsessions();
  const profile = useProfileOrDefault();
  const [oid, setOid] = useState(initial);
  const [goal, setGoal] = useState(45);
  const selected = obsessions.find((o) => o.id === oid) ?? obsessions[0];
  const mantra = mantraForDay(dayKey(), profile.customMantras, 7);

  useEffect(() => {
    if (selected?.dailyTargetMin && GOALS.includes(selected.dailyTargetMin)) setGoal(selected.dailyTargetMin);
  }, [selected?.id]);

  return (
    <div className="focus focus--setup">
      <div className="focus-sky" />
      <Mountains className="focus-mountains" />
      <header className="topbar topbar--clear">
        <button className="icon-btn" onClick={() => goBack('/')} aria-label="Back">
          <ChevronLeft size={24} strokeWidth={1.3} />
        </button>
      </header>
      <div className="focus-setup-body">
        <div className="label">Focus</div>
        <h1 className="focus-title">One thing, fully.</h1>
        <p className="focus-sub">Set the phone down. The clock counts only the time you give.</p>

        <div className="field">
          <label className="field-label">Practice</label>
          <div className="chip-scroll chip-scroll--center">
            {obsessions.map((o) => (
              <button key={o.id} className={`chip chip--big ${o.id === selected?.id ? 'is-on' : ''}`} style={{ ['--oc' as string]: o.color }} onClick={() => setOid(o.id)}>
                <ObsessionIcon o={o} size={16} />
                {o.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Duration</label>
          <div className="chip-row chip-row--center">
            {GOALS.map((g) => (
              <button key={g} className={`chip ${goal === g ? 'is-on' : ''}`} onClick={() => setGoal(g)}>
                {g === 0 ? 'Open' : formatDuration(g)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="focus-setup-foot">
        <blockquote className="focus-quote">
          {mantra.text}
          {mantra.by && <cite>{mantra.by}</cite>}
        </blockquote>
        <button
          className="btn btn--primary btn--block btn--big"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            buzz([10, 40, 10]);
            lockIn.start(selected.id, goal);
          }}
        >
          Begin
        </button>
      </div>
    </div>
  );
}

function Running({ onEnd }: { onEnd: (seconds: number) => void }) {
  const session = useLockIn()!;
  const now = useNow(250);
  const obsessions = useObsessions();
  const profile = useProfileOrDefault();
  const o = obsessions.find((x) => x.id === session.obsessionId);
  const seconds = elapsedSeconds(session, now);
  const goalSec = session.goalMin * 60;
  const progress = goalSec ? Math.min(1, seconds / goalSec) : (seconds % 3600) / 3600;
  const paused = !!session.pausedAt;
  const mantra = mantraForDay(dayKey(), profile.customMantras, Math.floor(seconds / 300));
  const [goalNote, setGoalNote] = useState(false);

  useWakeLock(!paused);

  useEffect(() => {
    if (goalSec && seconds >= goalSec && !session.goalCelebrated) {
      lockIn.markGoalCelebrated();
      buzz([30, 120, 30]);
      setGoalNote(true);
      window.setTimeout(() => setGoalNote(false), 6000);
    }
  }, [seconds, goalSec, session.goalCelebrated]);

  return (
    <div className={`focus focus--running ${paused ? 'is-paused' : ''}`}>
      <div className="focus-sky" />
      <Mountains className="focus-mountains" />
      <header className="topbar topbar--clear">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Minimize">
          <ChevronLeft size={24} strokeWidth={1.3} />
        </button>
        <div className="focus-status">
          <span className={`focus-pill-dot ${paused ? 'is-paused' : ''}`} />
          {paused ? 'Paused' : 'In focus'}
        </div>
        <span style={{ width: 40 }} />
      </header>

      <div className="focus-center">
        <div className="focus-obsession">
          <ObsessionIcon o={o} size={15} />
          {o?.name}
        </div>
        <div className="focus-breath">
          <span className="focus-breath-ring" aria-hidden="true" />
          <Ring value={progress} size={264} stroke={1} color="var(--accent)" track="var(--focus-track)">
            <div className="focus-clock">
              <b>{formatClock(seconds)}</b>
              <span>{goalSec ? (seconds >= goalSec ? 'Complete. Continue if you wish.' : `of ${formatDuration(session.goalMin)}`) : 'Open session'}</span>
            </div>
          </Ring>
        </div>
        <p className={`focus-goal ${goalNote ? 'is-shown' : ''}`}>The time you set is complete.</p>
      </div>

      <blockquote className="focus-quote" key={mantra.text}>
        {mantra.text}
        {mantra.by && <cite>{mantra.by}</cite>}
      </blockquote>

      <div className="focus-controls">
        <button
          className="focus-ctl"
          onClick={() => {
            buzz(6);
            paused ? lockIn.resume() : lockIn.pause();
          }}
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play size={20} strokeWidth={1.3} /> : <Pause size={20} strokeWidth={1.3} />}
          <span>{paused ? 'Resume' : 'Pause'}</span>
        </button>
        <button
          className="focus-ctl focus-ctl--end"
          onClick={() => {
            buzz(8);
            onEnd(seconds);
          }}
          aria-label="End session"
        >
          <Square size={16} strokeWidth={1.3} />
          <span>Finish</span>
        </button>
      </div>
    </div>
  );
}

function Finish({ seconds, onBack }: { seconds: number; onBack: () => void }) {
  const session = useLockIn()!;
  const obsessions = useObsessions();
  const o = useMemo(() => obsessions.find((x) => x.id === session.obsessionId), [obsessions, session.obsessionId]);
  const minutes = Math.max(1, Math.round(seconds / 60));
  const [fields, setFields] = useState<EntryFieldValues>({ intensity: 4, note: '', photoIds: [], metrics: {} });
  const [saving, setSaving] = useState(false);
  const addedPhotos = useRef<string[]>([]);

  const save = async () => {
    if (!o) return;
    setSaving(true);
    try {
      await saveEntry(
        {
          id: uid(),
          obsessionId: o.id,
          createdAt: session.startedAt,
          date: dayKey(session.startedAt),
          durationMin: minutes,
          note: fields.note.trim(),
          photoIds: fields.photoIds,
          metrics: metricsFromInputs(fields.metrics, o),
          intensity: fields.intensity,
          lockIn: true,
        },
        { isNew: true },
      );
      lockIn.clear();
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      toast('Could not save. Please try again.', 'error');
      setSaving(false);
    }
  };

  const discard = async () => {
    const ok = await ui.confirm({ title: 'Discard this session?', body: `${formatDuration(minutes)} will not be recorded.`, confirmLabel: 'Discard', danger: true });
    if (!ok) return;
    if (addedPhotos.current.length) await db.photos.bulkDelete(addedPhotos.current);
    lockIn.clear();
    navigate('/', { replace: true });
  };

  return (
    <div className="focus focus--finish">
      <div className="focus-finish-head">
        <div className="label">Session complete</div>
        <div className="focus-finish-time">{formatDuration(minutes)}</div>
        <p>
          {o?.name}. {minutes >= 60 ? 'A full, deep session.' : 'Time well given.'} Add a few words before you go.
        </p>
      </div>
      <div className="focus-finish-body">
        <EntryFields obsession={o} value={fields} onChange={setFields} onPhotosAdded={(ids) => addedPhotos.current.push(...ids)} />
      </div>
      <div className="focus-finish-foot">
        <button className="btn btn--primary btn--block btn--big" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save entry'}
        </button>
        <div className="row gap">
          <button className="btn btn--ghost btn--block" onClick={onBack}>
            Keep going
          </button>
          <button className="btn btn--ghost btn--block" onClick={discard}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
