import { Camera, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { db } from '../lib/db';
import { INTENSITY_LABELS } from '../lib/game';
import { buzz } from '../lib/haptics';
import { uid } from '../lib/ids';
import { savePhotos } from '../lib/images';
import { MODE_HINT, MODE_LABEL, metricMode, nextMode, type MetricMode } from '../lib/metrics';
import type { Obsession } from '../lib/types';
import { Photo } from './Bits';

export interface EntryFieldValues {
  intensity: number;
  note: string;
  photoIds: string[];
  metrics: Record<string, string>; // metricId -> raw input
}

const NOTE_PROMPTS = [
  'What did you work on? What clicked? What’s next?',
  'What would the best version of you do differently tomorrow?',
  'One thing you learned. One thing you’ll fix.',
  'Where did it feel easy? Where did it fight back?',
];

export function IntensityPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label className="field-label">
        How locked in? <span className="field-hint">{INTENSITY_LABELS[value] || 'Tap to rate'}</span>
      </label>
      <div className="intensity-picker">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            className={i <= value ? 'on' : ''}
            aria-label={`${i} — ${INTENSITY_LABELS[i]}`}
            onClick={() => {
              buzz(i * 6);
              onChange(i === value ? 0 : i);
            }}
          >
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path d="M12 2c.5 3.2 2.4 5 4.2 7 1.6 1.8 2.8 3.7 2.8 6.3A7 7 0 0 1 12 22a7 7 0 0 1-7-6.7c0-2.3 1-4 2.4-5.4.3 1.7 1.2 2.8 2.4 3.3-.6-3.9.6-8 2.2-11.2Z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PhotoPicker({ ids, onChange, onAdded }: { ids: string[]; onChange: (ids: string[]) => void; onAdded?: (ids: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="field">
      <label className="field-label">Receipts <span className="field-hint">Progress pics, the studio, the sheet music</span></label>
      <div className="photo-picker">
        {ids.map((id) => (
          <div className="photo-picker-item" key={id}>
            <Photo id={id} />
            <button type="button" aria-label="Remove photo" onClick={() => onChange(ids.filter((x) => x !== id))}>
              <X size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="photo-picker-add" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <span className="spinner" /> : <Camera size={22} />}
          <span>{busy ? 'Saving' : 'Add'}</span>
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = e.target.files;
          if (!files?.length) return;
          setBusy(true);
          const added = await savePhotos(files);
          setBusy(false);
          e.target.value = '';
          onAdded?.(added);
          onChange([...ids, ...added]);
        }}
      />
    </div>
  );
}

export function EntryFields({
  obsession,
  value,
  onChange,
  onPhotosAdded,
}: {
  obsession: Obsession | undefined;
  value: EntryFieldValues;
  onChange: (v: EntryFieldValues) => void;
  onPhotosAdded?: (ids: string[]) => void;
}) {
  const [prompt] = useState(() => NOTE_PROMPTS[Math.floor(Math.random() * NOTE_PROMPTS.length)]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newMode, setNewMode] = useState<MetricMode>('higher');

  const addMetric = async () => {
    if (!obsession || !newName.trim()) return;
    const metric = { id: uid(), name: newName.trim(), unit: newUnit.trim() || 'x', kind: newMode === 'total' ? ('count' as const) : ('measure' as const), lowerIsBetter: newMode === 'lower' };
    await db.obsessions.update(obsession.id, { metrics: [...obsession.metrics, metric] });
    setNewName('');
    setNewUnit('');
    setAdding(false);
  };

  return (
    <>
      <IntensityPicker value={value.intensity} onChange={(intensity) => onChange({ ...value, intensity })} />

      <div className="field">
        <label className="field-label" htmlFor="entry-note">Notes</label>
        <textarea
          id="entry-note"
          className="input textarea"
          rows={3}
          placeholder={prompt}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </div>

      <PhotoPicker ids={value.photoIds} onChange={(photoIds) => onChange({ ...value, photoIds })} onAdded={onPhotosAdded} />

      {obsession && (
        <div className="field">
          <label className="field-label">Numbers <span className="field-hint">Optional. Track what matters.</span></label>
          <div className="metric-inputs">
            {obsession.metrics.map((m) => (
              <label className="metric-input" key={m.id}>
                <span>{m.name}</span>
                <div>
                  <input
                    className="input"
                    inputMode="decimal"
                    type="number"
                    step="any"
                    placeholder="—"
                    value={value.metrics[m.id] ?? ''}
                    onChange={(e) => onChange({ ...value, metrics: { ...value.metrics, [m.id]: e.target.value } })}
                  />
                  <em>{m.unit}</em>
                </div>
              </label>
            ))}
          </div>
          {adding ? (
            <div className="metric-new-wrap">
              <div className="metric-new">
                <input className="input" placeholder="What to track (e.g. Deadlift)" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                <input className="input metric-new-unit" placeholder="Unit" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
              </div>
              <div className="metric-new">
                <button type="button" className="chip chip--tiny" onClick={() => setNewMode((m) => metricMode(nextMode(m)))} title={MODE_HINT[newMode]}>
                  {MODE_LABEL[newMode]}
                </button>
                <span className="field-hint metric-new-hint">{MODE_HINT[newMode]}</span>
                <button type="button" className="btn btn--small btn--primary" onClick={addMetric} disabled={!newName.trim()}>
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="link-btn" onClick={() => setAdding(true)}>
              <Plus size={16} /> Track a new number
            </button>
          )}
        </div>
      )}
    </>
  );
}

export function metricsFromInputs(raw: Record<string, string>, obsession: Obsession | undefined) {
  if (!obsession) return [];
  return obsession.metrics
    .filter((m) => raw[m.id] !== undefined && raw[m.id].trim() !== '' && !Number.isNaN(Number(raw[m.id])))
    .map((m) => ({ metricId: m.id, value: Number(raw[m.id]) }));
}
