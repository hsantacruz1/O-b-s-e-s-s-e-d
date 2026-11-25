import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { deleteObsession } from '../lib/actions';
import { db } from '../lib/db';
import { formatDuration } from '../lib/dates';
import { toast } from '../lib/events';
import { uid } from '../lib/ids';
import { MODE_HINT, MODE_LABEL, metricMode, nextMode } from '../lib/metrics';
import { ICONS, ICON_KEYS, ObsessionIcon, iconKeyFor } from '../lib/icons';
import { OBSESSION_COLORS, PRESETS } from '../lib/presets';
import { navigate } from '../lib/router';
import { ui, useUI } from '../lib/ui';
import type { MetricDef, Obsession } from '../lib/types';

const TARGETS = [0, 15, 30, 45, 60, 90, 120, 180];

export function ObsessionForm() {
  const { obsessionForm } = useUI();
  const [existing, setExisting] = useState<Obsession | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('compass');
  const [color, setColor] = useState(OBSESSION_COLORS[0]);
  const [target, setTarget] = useState(60);
  const [why, setWhy] = useState('');
  const [metrics, setMetrics] = useState<MetricDef[]>([]);

  useEffect(() => {
    if (!obsessionForm.open) return;
    if (obsessionForm.id) {
      db.obsessions.get(obsessionForm.id).then((o) => {
        if (!o) return;
        setExisting(o);
        setName(o.name);
        setIcon(iconKeyFor(o));
        setColor(o.color);
        setTarget(o.dailyTargetMin);
        setWhy(o.why);
        setMetrics(o.metrics);
      });
    } else {
      setExisting(null);
      setName('');
      setIcon('compass');
      setColor(OBSESSION_COLORS[Math.floor(Math.random() * OBSESSION_COLORS.length)]);
      setTarget(60);
      setWhy('');
      setMetrics([]);
    }
  }, [obsessionForm.open, obsessionForm.id]);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setName(p.name);
    setIcon(p.icon);
    setColor(p.color);
    setTarget(p.target);
    setWhy(p.why);
    setMetrics(p.metrics.map((m) => ({ ...m, id: uid() })));
  };

  const save = async () => {
    if (!name.trim()) return;
    const clean = metrics.filter((m) => m.name.trim()).map((m) => ({ ...m, name: m.name.trim(), unit: m.unit.trim() || 'x' }));
    if (existing) {
      await db.obsessions.update(existing.id, { name: name.trim(), icon, color, dailyTargetMin: target, why: why.trim(), metrics: clean });
      toast('Saved');
    } else {
      const order = (await db.obsessions.count()) + 1;
      await db.obsessions.add({ id: uid(), name: name.trim(), icon, color, dailyTargetMin: target, why: why.trim(), metrics: clean, createdAt: Date.now(), archived: false, order });
      toast(`${name.trim()} added`);
    }
    ui.closeObsessionForm();
  };

  const archive = async () => {
    if (!existing) return;
    await db.obsessions.update(existing.id, { archived: !existing.archived });
    toast(existing.archived ? 'Restored' : 'Archived. Your history is kept.');
    ui.closeObsessionForm();
  };

  const remove = async () => {
    if (!existing) return;
    const n = await db.entries.where('obsessionId').equals(existing.id).count();
    const ok = await ui.confirm({
      title: `Delete ${existing.name}?`,
      body: n ? `This permanently deletes ${n} recorded session${n > 1 ? 's' : ''}. Archive it instead to keep your history.` : 'This cannot be undone.',
      confirmLabel: 'Delete forever',
      danger: true,
    });
    if (!ok) return;
    await deleteObsession(existing.id);
    navigate('/', { replace: true });
    ui.closeObsessionForm();
  };

  return (
    <Sheet
      open={obsessionForm.open}
      onClose={ui.closeObsessionForm}
      eyebrow={existing ? 'Edit obsession' : 'New obsession'}
      title={existing ? name || 'Obsession' : 'What are you devoted to?'}
      footer={
        <button className="btn btn--primary btn--block btn--big" onClick={save} disabled={!name.trim()}>
          {existing ? 'Save' : 'Add obsession'}
        </button>
      }
    >
      {!existing && (
        <div className="field">
          <label className="field-label">Start from</label>
          <div className="chip-row">
            {PRESETS.map((p) => (
              <button key={p.name} className={`chip ${name === p.name ? 'is-on' : ''}`} onClick={() => applyPreset(p)}>
                <ObsessionIcon o={{ icon: p.icon }} size={15} /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="o-name">Name</label>
        <input id="o-name" className="input" placeholder="e.g. Music production" value={name} onChange={(e) => setName(e.target.value)} maxLength={28} />
      </div>

      <div className="field">
        <label className="field-label">Icon</label>
        <div className="icon-grid">
          {ICON_KEYS.map((k) => {
            const Icon = ICONS[k];
            return (
              <button key={k} className={icon === k ? 'is-on' : ''} onClick={() => setIcon(k)} aria-label={k}>
                <Icon size={20} strokeWidth={1.3} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label className="field-label">Color</label>
        <div className="swatches">
          {OBSESSION_COLORS.map((c) => (
            <button key={c} className={`swatch ${color === c ? 'is-on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          Daily commitment <span className="field-hint">{target ? formatDuration(target) + ' a day' : 'Simply show up'}</span>
        </label>
        <div className="chip-row">
          {TARGETS.map((t) => (
            <button key={t} className={`chip ${target === t ? 'is-on' : ''}`} onClick={() => setTarget(t)}>
              {t === 0 ? 'Any session' : formatDuration(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="o-why">Your why <span className="field-hint">Returns to you when it gets hard</span></label>
        <textarea id="o-why" className="input textarea" rows={2} placeholder="Why does this matter so much to you?" value={why} onChange={(e) => setWhy(e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label">Measurements <span className="field-hint">Tap the mode to change it</span></label>
        <div className="metric-editor">
          {metrics.map((m, i) => (
            <div key={m.id} className="metric-editor-row">
              <input className="input" placeholder="Name" value={m.name} onChange={(e) => setMetrics(metrics.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input metric-new-unit" placeholder="Unit" value={m.unit} onChange={(e) => setMetrics(metrics.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
              <button
                className="chip chip--tiny"
                onClick={() => setMetrics(metrics.map((x, j) => (j === i ? { ...x, ...nextMode(metricMode(x)) } : x)))}
                title={MODE_HINT[metricMode(m)]}
              >
                {MODE_LABEL[metricMode(m)]}
              </button>
              <button className="icon-btn" onClick={() => setMetrics(metrics.filter((_, j) => j !== i))} aria-label="Remove">
                <X size={15} strokeWidth={1.4} />
              </button>
            </div>
          ))}
          <button className="link-btn" onClick={() => setMetrics([...metrics, { id: uid(), name: '', unit: '' }])}>
            <Plus size={15} strokeWidth={1.5} /> Add a measurement
          </button>
        </div>
      </div>

      {existing && (
        <div className="list">
          <button className="list-row" onClick={archive}>
            <span>{existing.archived ? 'Restore obsession' : 'Archive (hide, keep history)'}</span>
          </button>
          <button className="list-row list-row--danger" onClick={remove}>
            <span>Delete obsession</span>
          </button>
        </div>
      )}
    </Sheet>
  );
}
