import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { EntryFields, metricsFromInputs, type EntryFieldValues } from '../components/EntryFields';
import { deleteEntry, saveEntry } from '../lib/actions';
import { db } from '../lib/db';
import { dayKey, formatDuration, toLocalInputValue } from '../lib/dates';
import { toast } from '../lib/events';
import { buzz } from '../lib/haptics';
import { useObsessions } from '../lib/hooks';
import { uid } from '../lib/ids';
import { ui, useUI } from '../lib/ui';
import type { Entry } from '../lib/types';

const QUICK_DURATIONS = [0, 15, 30, 45, 60, 90, 120];

const EMPTY_FIELDS: EntryFieldValues = { intensity: 0, note: '', photoIds: [], metrics: {} };

export function LogSheet() {
  const { log } = useUI();
  const obsessions = useObsessions();
  const [existing, setExisting] = useState<Entry | null>(null);
  const [obsessionId, setObsessionId] = useState<string>('');
  const [duration, setDuration] = useState(30);
  const [when, setWhen] = useState<number>(Date.now());
  const [earlier, setEarlier] = useState(false);
  const [fields, setFields] = useState<EntryFieldValues>(EMPTY_FIELDS);
  const [saving, setSaving] = useState(false);
  const addedPhotos = useRef<string[]>([]);
  const saved = useRef(false);

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!log.open) return;
    saved.current = false;
    addedPhotos.current = [];
    if (log.entryId) {
      db.entries.get(log.entryId).then((e) => {
        if (!e) return;
        setExisting(e);
        setObsessionId(e.obsessionId);
        setDuration(e.durationMin);
        setWhen(e.createdAt);
        setEarlier(true);
        setFields({
          intensity: e.intensity,
          note: e.note,
          photoIds: e.photoIds,
          metrics: Object.fromEntries(e.metrics.map((m) => [m.metricId, String(m.value)])),
        });
      });
    } else {
      setExisting(null);
      setObsessionId(log.obsessionId ?? '');
      setWhen(Date.now());
      setEarlier(false);
      setFields(EMPTY_FIELDS);
    }
  }, [log.open, log.entryId, log.obsessionId]);

  // Default to the first obsession, and to its daily target as the duration.
  useEffect(() => {
    if (!log.open || log.entryId) return;
    const id = obsessionId || obsessions[0]?.id || '';
    if (id !== obsessionId) setObsessionId(id);
    const o = obsessions.find((x) => x.id === id);
    if (o && !existing) setDuration(o.dailyTargetMin ? Math.min(o.dailyTargetMin, 60) : 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.open, obsessions.length, obsessionId]);

  const obsession = useMemo(() => obsessions.find((o) => o.id === obsessionId), [obsessions, obsessionId]);

  const close = () => {
    if (!saved.current && addedPhotos.current.length) {
      // Photos picked for a rep that was never saved.
      db.photos.bulkDelete(addedPhotos.current);
    }
    ui.closeLog();
  };

  const submit = async () => {
    if (!obsession || saving) return;
    setSaving(true);
    try {
      const createdAt = earlier ? when : Date.now();
      await saveEntry(
        {
          id: existing?.id ?? uid(),
          obsessionId: obsession.id,
          createdAt,
          date: dayKey(createdAt),
          durationMin: duration,
          note: fields.note.trim(),
          photoIds: fields.photoIds,
          metrics: metricsFromInputs(fields.metrics, obsession),
          intensity: fields.intensity,
          lockIn: existing?.lockIn,
        },
        { isNew: !existing },
      );
      saved.current = true;
      buzz([10, 30, 10]);
      if (existing) toast('Saved');
      ui.closeLog();
    } catch (err) {
      console.error(err);
      toast('Could not save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await ui.confirm({ title: 'Delete this rep?', body: 'The XP and photos attached to it go too.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await deleteEntry(existing.id);
    saved.current = true;
    ui.closeLog();
    ui.closeEntry();
    toast('Deleted');
  };

  return (
    <Sheet
      open={log.open}
      onClose={close}
      eyebrow={existing ? 'Edit' : 'On the record'}
      title={existing ? 'EDIT REP' : 'LOG A REP'}
      footer={
        <div className="row gap">
          {existing && (
            <button className="btn btn--ghost btn--icon" onClick={remove} aria-label="Delete rep">
              <Trash2 size={20} />
            </button>
          )}
          <button className="btn btn--primary btn--block btn--big" onClick={submit} disabled={!obsession || saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Log it'}
          </button>
        </div>
      }
    >
      {obsessions.length === 0 ? (
        <p className="muted">Add an obsession first (Settings → Obsessions).</p>
      ) : (
        <>
          <div className="field">
            <label className="field-label">Obsession</label>
            <div className="chip-scroll">
              {obsessions.map((o) => (
                <button
                  key={o.id}
                  className={`chip chip--big ${o.id === obsessionId ? 'is-on' : ''}`}
                  style={o.id === obsessionId ? { borderColor: o.color, background: `${o.color}22` } : undefined}
                  onClick={() => {
                    buzz(6);
                    setObsessionId(o.id);
                  }}
                >
                  <span className="chip-emoji">{o.emoji}</span>
                  {o.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">
              Time put in <span className="field-hint">{duration ? formatDuration(duration) : 'Not timed'}</span>
            </label>
            <div className="duration">
              <button className="icon-btn icon-btn--solid" onClick={() => setDuration((d) => Math.max(0, d - 5))} aria-label="5 minutes less">
                <Minus size={18} />
              </button>
              <div className="duration-value">
                <b>{duration}</b>
                <span>min</span>
              </div>
              <button className="icon-btn icon-btn--solid" onClick={() => setDuration((d) => Math.min(24 * 60, d + 5))} aria-label="5 minutes more">
                <Plus size={18} />
              </button>
            </div>
            <div className="chip-row">
              {QUICK_DURATIONS.map((d) => (
                <button key={d} className={`chip ${duration === d ? 'is-on' : ''}`} onClick={() => setDuration(d)}>
                  {d === 0 ? 'No timer' : formatDuration(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">When</label>
            <div className="chip-row">
              <button className={`chip ${!earlier ? 'is-on' : ''}`} onClick={() => setEarlier(false)}>
                Just now
              </button>
              <button className={`chip ${earlier ? 'is-on' : ''}`} onClick={() => setEarlier(true)}>
                Earlier
              </button>
            </div>
            {earlier && (
              <input
                type="datetime-local"
                className="input"
                value={toLocalInputValue(when)}
                max={toLocalInputValue(Date.now())}
                onChange={(e) => e.target.value && setWhen(new Date(e.target.value).getTime())}
              />
            )}
          </div>

          <EntryFields obsession={obsession} value={fields} onChange={setFields} onPhotosAdded={(ids) => addedPhotos.current.push(...ids)} />
        </>
      )}
    </Sheet>
  );
}
