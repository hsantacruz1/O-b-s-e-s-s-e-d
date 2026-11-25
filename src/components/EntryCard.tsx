import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../lib/db';
import { formatDayHeading, formatDuration, formatTime } from '../lib/dates';
import { INTENSITY_LABELS } from '../lib/game';
import { ObsessionIcon } from '../lib/icons';
import { useBackToClose } from '../lib/router';
import { ui, useUI } from '../lib/ui';
import type { Entry, Obsession } from '../lib/types';
import { Photo } from './Bits';
import { Sheet } from './Sheet';
import { FocusDots } from './Viz';

export function EntryCard({ entry, obsession }: { entry: Entry; obsession?: Obsession }) {
  const shown = entry.photoIds.slice(0, 3);
  const extra = entry.photoIds.length - shown.length;
  return (
    <button className="entry" onClick={() => ui.openEntry(entry.id)} style={{ ['--oc' as string]: obsession?.color ?? '#86817A' }}>
      <div className="entry-top">
        <span className="entry-obsession">
          <span className="dot" />
          {obsession?.name ?? 'Archived'}
          {entry.lockIn && <em> · focus session</em>}
        </span>
        <span className="entry-time">{formatTime(entry.createdAt)}</span>
      </div>
      <div className="entry-main">
        {entry.durationMin > 0 && <span className="entry-duration">{formatDuration(entry.durationMin)}</span>}
        <FocusDots value={entry.intensity} />
        <span className="entry-xp">+{entry.xp}</span>
      </div>
      {entry.note && <p className="entry-note">{entry.note}</p>}
      {shown.length > 0 && (
        <div className={`entry-photos entry-photos--${shown.length}`}>
          {shown.map((id, i) => (
            <div key={id} className="entry-photo">
              <Photo id={id} />
              {i === shown.length - 1 && extra > 0 && <span className="entry-photo-more">+{extra}</span>}
            </div>
          ))}
        </div>
      )}
      {entry.metrics.length > 0 && (
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

/** Full view of one entry, opened from anywhere. */
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
            <span className="title-with-icon" style={{ ['--oc' as string]: obsession?.color }}>
              <ObsessionIcon o={obsession} size={22} />
              {obsession?.name ?? 'Entry'}
            </span>
          ) : (
            ''
          )
        }
        footer={
          entry && (
            <button className="btn btn--ghost btn--block" onClick={() => ui.openLog({ entryId: entry.id })}>
              <Pencil size={15} strokeWidth={1.5} /> Edit entry
            </button>
          )
        }
      >
        {entry && (
          <div className="entry-detail">
            <div className="facts">
              <div>
                <b>{entry.durationMin ? formatDuration(entry.durationMin) : '—'}</b>
                <span>Duration</span>
              </div>
              <div>
                <b>{entry.intensity ? INTENSITY_LABELS[entry.intensity] : '—'}</b>
                <span>Focus</span>
              </div>
              <div>
                <b>+{entry.xp}</b>
                <span>Experience</span>
              </div>
            </div>
            {entry.lockIn && <p className="label">Recorded in a focus session</p>}
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
