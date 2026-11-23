import { Lock, Pencil } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../lib/db';
import { formatDayHeading, formatDuration, formatTime } from '../lib/dates';
import { INTENSITY_LABELS } from '../lib/game';
import { useBackToClose } from '../lib/router';
import { ui, useUI } from '../lib/ui';
import type { Entry, Obsession } from '../lib/types';
import { Photo } from './Bits';
import { Sheet } from './Sheet';
import { Intensity } from './Viz';

export function EntryCard({ entry, obsession, compact }: { entry: Entry; obsession?: Obsession; compact?: boolean }) {
  const color = obsession?.color ?? '#888';
  const shown = entry.photoIds.slice(0, 3);
  const extra = entry.photoIds.length - shown.length;
  return (
    <button className={`entry ${compact ? 'entry--compact' : ''}`} onClick={() => ui.openEntry(entry.id)} style={{ ['--oc' as string]: color }}>
      <div className="entry-top">
        <span className="entry-obsession">
          <span className="entry-emoji">{obsession?.emoji ?? '•'}</span>
          {obsession?.name ?? 'Archived'}
        </span>
        <span className="entry-time">
          {entry.lockIn && <Lock size={11} />}
          {formatTime(entry.createdAt)}
        </span>
      </div>
      <div className="entry-main">
        {entry.durationMin > 0 && <span className="entry-duration">{formatDuration(entry.durationMin)}</span>}
        <Intensity value={entry.intensity} />
        <span className="entry-xp">+{entry.xp} XP</span>
      </div>
      {entry.note && !compact && <p className="entry-note">{entry.note}</p>}
      {shown.length > 0 && !compact && (
        <div className={`entry-photos entry-photos--${shown.length}`}>
          {shown.map((id, i) => (
            <div key={id} className="entry-photo">
              <Photo id={id} />
              {i === shown.length - 1 && extra > 0 && <span className="entry-photo-more">+{extra}</span>}
            </div>
          ))}
        </div>
      )}
      {entry.metrics.length > 0 && !compact && (
        <div className="entry-metrics">
          {entry.metrics.map((m) => {
            const def = obsession?.metrics.find((d) => d.id === m.metricId);
            if (!def) return null;
            return (
              <span key={m.metricId} className="metric-chip">
                {def.name} <b>{m.value}</b> {def.unit}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}

/** Full view of one rep, opened from anywhere. */
export function EntryDetailSheet() {
  const { entry: state } = useUI();
  const entry = useLiveQuery(async () => (state.id ? (await db.entries.get(state.id)) ?? null : null), [state.id]);
  const obsession = useLiveQuery(async () => (entry ? await db.obsessions.get(entry.obsessionId) : undefined), [entry?.obsessionId]);
  const [viewer, setViewer] = useState<string | null>(null);

  return (
    <>
      <Sheet
        open={!!state.id}
        onClose={ui.closeEntry}
        eyebrow={entry ? `${formatDayHeading(entry.date)} · ${formatTime(entry.createdAt)}` : ''}
        title={
          entry ? (
            <>
              {obsession?.emoji} {obsession?.name ?? 'Rep'}
            </>
          ) : (
            ''
          )
        }
        footer={
          entry && (
            <button className="btn btn--ghost btn--block" onClick={() => ui.openLog({ entryId: entry.id })}>
              <Pencil size={16} /> Edit
            </button>
          )
        }
      >
        {entry && (
          <div className="entry-detail">
            <div className="entry-detail-stats">
              <div>
                <b>{entry.durationMin ? formatDuration(entry.durationMin) : '—'}</b>
                <span>Time</span>
              </div>
              <div>
                <b>+{entry.xp}</b>
                <span>XP</span>
              </div>
              <div>
                <b>{entry.intensity ? <Intensity value={entry.intensity} size={14} /> : '—'}</b>
                <span>{INTENSITY_LABELS[entry.intensity] || 'Intensity'}</span>
              </div>
            </div>
            {entry.lockIn && (
              <div className="tag">
                <Lock size={12} /> Logged in Lock In mode
              </div>
            )}
            {entry.note && <p className="entry-detail-note">{entry.note}</p>}
            {entry.metrics.length > 0 && (
              <div className="entry-metrics">
                {entry.metrics.map((m) => {
                  const def = obsession?.metrics.find((d) => d.id === m.metricId);
                  return def ? (
                    <span key={m.metricId} className="metric-chip metric-chip--big">
                      {def.name} <b>{m.value}</b> {def.unit}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {entry.photoIds.length > 0 && (
              <div className="entry-detail-photos">
                {entry.photoIds.map((id) => (
                  <button key={id} onClick={() => setViewer(id)}>
                    <Photo id={id} size="full" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>
      {viewer && <PhotoViewer id={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

export function PhotoViewer({ id, onClose }: { id: string; onClose: () => void }) {
  useBackToClose(true, onClose);
  return createPortal(
    <div className="photo-viewer" onClick={onClose}>
      <Photo id={id} size="full" />
    </div>,
    document.body,
  );
}
