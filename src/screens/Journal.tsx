import { BookOpen, Camera, Grid3x3, List } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Empty, Photo, Segmented } from '../components/Bits';
import { EntryCard } from '../components/EntryCard';
import { formatDayHeading, formatDuration } from '../lib/dates';
import { useEntries, useObsessions } from '../lib/hooks';
import { ui } from '../lib/ui';
import type { Entry } from '../lib/types';

const PAGE = 40;

export function Journal() {
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
        <h1 className="display">Journal</h1>
        <p>Every session, on the record. Study your own work.</p>
      </header>

      <div className="journal-controls">
        <div className="chip-scroll">
          <button className={`chip ${filter === 'all' ? 'is-on' : ''}`} onClick={() => setFilter('all')}>
            All
          </button>
          {obsessions.filter((o) => !o.archived || entries?.some((e) => e.obsessionId === o.id)).map((o) => (
            <button key={o.id} className={`chip ${filter === o.id ? 'is-on' : ''}`} style={{ ['--oc' as string]: o.color }} onClick={() => setFilter(o.id)}>
              <span className="dot" />
              {o.name}
            </button>
          ))}
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: <List size={15} strokeWidth={1.5} aria-label="List" /> },
            { value: 'photos', label: <Grid3x3 size={15} strokeWidth={1.5} aria-label="Photographs" /> },
          ]}
        />
      </div>

      {entries && filtered.length === 0 ? (
        <Empty
          icon={<BookOpen size={26} strokeWidth={1.1} />}
          title="The first page is blank"
          body="Every session, reflection and photograph is kept here."
          action={<button className="btn btn--primary" onClick={() => ui.openLog(filter !== 'all' ? { obsessionId: filter } : {})}>New entry</button>}
        />
      ) : view === 'photos' ? (
        photos.length === 0 ? (
          <Empty icon={<Camera size={26} strokeWidth={1.1} />} title="No photographs yet" body="Add photographs to your entries: progress, the studio, the notebook page." />
        ) : (
          <div className="photo-wall">
            {photos.map(({ pid, entry }) => (
              <button key={pid} className="photo-wall-item" onClick={() => ui.openEntry(entry.id)}>
                <Photo id={pid} />
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
                <span>{g.minutes > 0 ? formatDuration(g.minutes) : `${g.items.length} entr${g.items.length > 1 ? 'ies' : 'y'}`}</span>
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
              Earlier entries
            </button>
          )}
        </>
      )}
    </div>
  );
}
