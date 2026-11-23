import { Grid3x3, List } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Empty, Photo, Segmented } from '../components/Bits';
import { EntryCard } from '../components/EntryCard';
import { formatDayHeading, formatDuration } from '../lib/dates';
import { useEntries, useObsessions } from '../lib/hooks';
import { ui } from '../lib/ui';
import type { Entry } from '../lib/types';

const PAGE = 40;

export function Tape() {
  const entries = useEntries();
  const obsessions = useObsessions(true);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'photos'>('list');
  const [limit, setLimit] = useState(PAGE);
  const map = useMemo(() => new Map(obsessions.map((o) => [o.id, o])), [obsessions]);

  const filtered = useMemo(() => (entries ?? []).filter((e) => filter === 'all' || e.obsessionId === filter), [entries, filter]);

  const groups = useMemo(() => {
    const out: { date: string; items: Entry[]; minutes: number }[] = [];
    for (const e of filtered.slice(0, limit)) {
      const last = out[out.length - 1];
      if (last && last.date === e.date) {
        last.items.push(e);
        last.minutes += e.durationMin;
      } else out.push({ date: e.date, items: [e], minutes: e.durationMin });
    }
    return out;
  }, [filtered, limit]);

  const photos = useMemo(() => filtered.flatMap((e) => e.photoIds.map((pid) => ({ pid, entry: e }))), [filtered]);

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="display">THE TAPE</h1>
        <p>Every rep, on record. Study your own film.</p>
      </header>

      <div className="tape-controls">
        <div className="chip-scroll">
          <button className={`chip ${filter === 'all' ? 'is-on' : ''}`} onClick={() => setFilter('all')}>
            All
          </button>
          {obsessions.filter((o) => !o.archived || entries?.some((e) => e.obsessionId === o.id)).map((o) => (
            <button
              key={o.id}
              className={`chip ${filter === o.id ? 'is-on' : ''}`}
              style={filter === o.id ? { borderColor: o.color, background: `${o.color}22` } : undefined}
              onClick={() => setFilter(o.id)}
            >
              {o.emoji} {o.name}
            </button>
          ))}
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: <List size={16} aria-label="List" /> },
            { value: 'photos', label: <Grid3x3 size={16} aria-label="Photos" /> },
          ]}
        />
      </div>

      {entries && filtered.length === 0 ? (
        <Empty
          emoji="🎞️"
          title="No tape yet"
          body="Every session, every note, every progress pic lands here. Go get the first one."
          action={<button className="btn btn--primary" onClick={() => ui.openLog(filter !== 'all' ? { obsessionId: filter } : {})}>Log a rep</button>}
        />
      ) : view === 'photos' ? (
        photos.length === 0 ? (
          <Empty emoji="📸" title="No photos yet" body="Add receipts to your reps: progress pics, the studio setup, the notebook page." />
        ) : (
          <div className="photo-wall">
            {photos.map(({ pid, entry }) => (
              <button key={pid} className="photo-wall-item" onClick={() => ui.openEntry(entry.id)}>
                <Photo id={pid} />
                <span>{map.get(entry.obsessionId)?.emoji}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.date} className="day-group">
              <div className="day-head">
                <h3>{formatDayHeading(g.date)}</h3>
                <span>{g.minutes > 0 ? formatDuration(g.minutes) : `${g.items.length} rep${g.items.length > 1 ? 's' : ''}`}</span>
              </div>
              <div className="entry-list">
                {g.items.map((e) => (
                  <EntryCard key={e.id} entry={e} obsession={map.get(e.obsessionId)} />
                ))}
              </div>
            </section>
          ))}
          {filtered.length > limit && (
            <button className="btn btn--ghost btn--block" onClick={() => setLimit((l) => l + PAGE)}>
              Load older tape
            </button>
          )}
        </>
      )}
    </div>
  );
}
