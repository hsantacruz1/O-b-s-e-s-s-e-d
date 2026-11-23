import { ChevronLeft, Pause, Play, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntryFields, metricsFromInputs, type EntryFieldValues } from '../components/EntryFields';
import { Ring } from '../components/Viz';
import { saveEntry } from '../lib/actions';
import { db } from '../lib/db';
import { dayKey, formatClock, formatDuration } from '../lib/dates';
import { toast } from '../lib/events';
import { buzz } from '../lib/haptics';
import { useNow, useObsessions, useProfileOrDefault } from '../lib/hooks';
import { uid } from '../lib/ids';
import { elapsedSeconds, lockIn, useLockIn } from '../lib/lockin';
import { mantraForDay } from '../lib/mantras';
import { goBack, navigate, useRoute } from '../lib/router';
import { ui } from '../lib/ui';

const GOALS = [0, 25, 45, 60, 90, 120];

/** Keep the screen awake while locked in (where the browser allows it). */
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

export function LockIn() {
  const session = useLockIn();
  const { query } = useRoute();
  const obsessions = useObsessions();
  const [finishing, setFinishing] = useState<null | { seconds: number }>(null);

  if (finishing && session) return <Finish seconds={finishing.seconds} onBack={() => { lockIn.resume(); setFinishing(null); }} />;
  if (session) return <Running onEnd={(seconds) => { lockIn.pause(); setFinishing({ seconds }); }} />;
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
    <div className="lockin lockin--setup" style={{ ['--oc' as string]: selected?.color ?? '#FF3347' }}>
      <header className="topbar topbar--clear">
        <button className="icon-btn" onClick={() => goBack('/')} aria-label="Back">
          <ChevronLeft size={24} />
        </button>
      </header>
      <div className="lockin-glow" />
      <div className="lockin-setup-body">
        <div className="eyebrow">Focus mode</div>
        <h1 className="lockin-title">LOCK IN.</h1>
        <p className="lockin-sub">Phone face up, world on mute. The clock only counts real work.</p>

        <div className="field">
          <label className="field-label">On what?</label>
          <div className="chip-scroll chip-scroll--center">
            {obsessions.map((o) => (
              <button
                key={o.id}
                className={`chip chip--big ${o.id === selected?.id ? 'is-on' : ''}`}
                style={o.id === selected?.id ? { borderColor: o.color, background: `${o.color}22` } : undefined}
                onClick={() => setOid(o.id)}
              >
                <span className="chip-emoji">{o.emoji}</span>
                {o.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">For how long?</label>
          <div className="chip-row chip-row--center">
            {GOALS.map((g) => (
              <button key={g} className={`chip ${goal === g ? 'is-on' : ''}`} onClick={() => setGoal(g)}>
                {g === 0 ? 'Open' : formatDuration(g)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lockin-setup-foot">
        <blockquote className="lockin-quote">“{mantra.text}”{mantra.by && <cite> {mantra.by}</cite>}</blockquote>
        <button
          className="btn btn--primary btn--block btn--huge"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            buzz([20, 50, 80]);
            lockIn.start(selected.id, goal);
          }}
        >
          <Play size={20} fill="currentColor" /> Lock in
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
  const [goalBanner, setGoalBanner] = useState(false);

  useWakeLock(!paused);

  useEffect(() => {
    if (goalSec && seconds >= goalSec && !session.goalCelebrated) {
      lockIn.markGoalCelebrated();
      buzz([60, 80, 60, 80, 200]);
      setGoalBanner(true);
      window.setTimeout(() => setGoalBanner(false), 5000);
    }
  }, [seconds, goalSec, session.goalCelebrated]);

  return (
    <div className={`lockin lockin--running ${paused ? 'is-paused' : ''}`} style={{ ['--oc' as string]: o?.color ?? '#FF3347' }}>
      <header className="topbar topbar--clear">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Minimize">
          <ChevronLeft size={24} />
        </button>
        <div className="lockin-status">
          <span className={`lockin-pill-dot ${paused ? 'is-paused' : ''}`} />
          {paused ? 'Paused' : 'Locked in'}
        </div>
        <span style={{ width: 40 }} />
      </header>
      <div className="lockin-glow" />

      <div className="lockin-center">
        <div className="lockin-obsession">
          {o?.emoji} {o?.name}
        </div>
        <Ring value={progress} size={280} stroke={10} color={o?.color ?? '#FF3347'} track="rgba(255,255,255,0.07)">
          <div className="lockin-clock">
            <b>{formatClock(seconds)}</b>
            <span>{goalSec ? (seconds >= goalSec ? 'Goal hit. Keep going?' : `of ${formatDuration(session.goalMin)}`) : 'Open session'}</span>
          </div>
        </Ring>
        {goalBanner && <div className="lockin-goal">🏁 GOAL HIT</div>}
      </div>

      <blockquote className="lockin-quote" key={mantra.text}>
        “{mantra.text}”{mantra.by && <cite> {mantra.by}</cite>}
      </blockquote>

      <div className="lockin-controls">
        <button
          className="lockin-ctl"
          onClick={() => {
            buzz(10);
            paused ? lockIn.resume() : lockIn.pause();
          }}
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play size={26} fill="currentColor" /> : <Pause size={26} fill="currentColor" />}
          <span>{paused ? 'Resume' : 'Pause'}</span>
        </button>
        <button className="lockin-ctl lockin-ctl--end" onClick={() => { buzz([10, 30]); onEnd(seconds); }} aria-label="End session">
          <Square size={22} fill="currentColor" />
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
      toast('Could not save. Try again.', 'error');
      setSaving(false);
    }
  };

  const discard = async () => {
    const ok = await ui.confirm({ title: 'Throw this session away?', body: `${formatDuration(minutes)} of work won’t be logged.`, confirmLabel: 'Discard', danger: true });
    if (!ok) return;
    if (addedPhotos.current.length) await db.photos.bulkDelete(addedPhotos.current);
    lockIn.clear();
    navigate('/', { replace: true });
  };

  return (
    <div className="lockin lockin--finish" style={{ ['--oc' as string]: o?.color ?? '#FF3347' }}>
      <div className="lockin-glow" />
      <div className="lockin-finish-head">
        <div className="eyebrow">Session complete</div>
        <div className="lockin-finish-time">{formatDuration(minutes)}</div>
        <p>
          {o?.emoji} {o?.name}. That’s {minutes >= 60 ? 'a real session' : 'work in the bank'}. Put it on the record.
        </p>
      </div>
      <div className="lockin-finish-body">
        <EntryFields obsession={o} value={fields} onChange={setFields} onPhotosAdded={(ids) => addedPhotos.current.push(...ids)} />
      </div>
      <div className="lockin-finish-foot">
        <button className="btn btn--primary btn--block btn--big" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Log it'}
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
