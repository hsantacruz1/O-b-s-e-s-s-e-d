import { ChevronLeft, Pencil, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Empty, SectionHead, Stat } from '../components/Bits';
import { EntryCard } from '../components/EntryCard';
import { Bar, Heatmap, LineChart } from '../components/Viz';
import { formatDuration, formatHours } from '../lib/dates';
import { MASTERY_MILESTONES, masteryProgress } from '../lib/game';
import { useEntries, useObsession, useToday } from '../lib/hooks';
import { ObsessionIcon } from '../lib/icons';
import { goBack, navigate } from '../lib/router';
import { bestStreak, currentStreak, daySet, metricSeries, minutesByDay, personalBest, totalMinutes } from '../lib/stats';
import { ui } from '../lib/ui';

export function ObsessionDetail({ id }: { id: string }) {
  const o = useObsession(id);
  const all = useEntries() ?? [];
  const today = useToday();
  const entries = useMemo(() => all.filter((e) => e.obsessionId === id), [all, id]);
  const heat = useMemo(() => minutesByDay(entries), [entries]);

  if (o === null) {
    return (
      <div className="screen">
        <Empty title="This obsession no longer exists" action={<button className="btn btn--primary" onClick={() => navigate('/', { replace: true })}>Home</button>} />
      </div>
    );
  }
  if (!o) return <div className="screen" />;

  const days = daySet(entries);
  const streak = currentStreak(days, today);
  const minutes = totalMinutes(entries);
  const m = masteryProgress(minutes);
  const avgIntensity = entries.filter((e) => e.intensity).reduce((s, e, _, arr) => s + e.intensity / arr.length, 0);

  return (
    <div className="screen obsession" style={{ ['--oc' as string]: o.color }}>
      <div className="obsession-glow" />
      <header className="topbar topbar--clear">
        <button className="icon-btn" onClick={() => goBack('/')} aria-label="Back">
          <ChevronLeft size={24} strokeWidth={1.3} />
        </button>
        <button className="icon-btn" onClick={() => ui.openObsessionForm(o.id)} aria-label="Edit obsession">
          <Pencil size={17} strokeWidth={1.3} />
        </button>
      </header>

      <section className="obsession-hero">
        <div className="obsession-icon">
          <ObsessionIcon o={o} size={26} strokeWidth={1.1} />
        </div>
        <h1 className="display">{o.name}</h1>
        {o.why && <blockquote className="obsession-why">{o.why}</blockquote>}
        <div className="row gap center-row">
          <button className="btn btn--primary" onClick={() => navigate(`/focus?o=${o.id}`)}>
            Begin a session
          </button>
          <button className="btn btn--ghost" onClick={() => ui.openLog({ obsessionId: o.id })}>
            <Plus size={15} strokeWidth={1.5} /> Entry
          </button>
        </div>
      </section>

      <div className="stat-grid">
        <Stat value={formatHours(minutes)} label="Hours" />
        <Stat value={entries.length} label="Sessions" />
        <Stat value={streak.length} label="Current streak" />
        <Stat value={bestStreak(days)} label="Longest streak" />
      </div>

      <SectionHead title="The path to mastery" />
      <div className="card mastery-card">
        <div className="mastery-big">
          <b>{formatHours(minutes)}</b>
          <span>of {m.next.toLocaleString()} hours, the next milestone</span>
        </div>
        <Bar value={m.progress} color="var(--oc-ink)" />
        <div className="milestones">
          {MASTERY_MILESTONES.map((ms) => (
            <span key={ms} className={m.hours >= ms ? 'is-hit' : ms === m.next ? 'is-next' : ''}>
              {ms >= 1000 ? `${ms / 1000}k` : ms}
            </span>
          ))}
        </div>
        <p className="muted small">
          {(m.toMastery * 100).toFixed(2)}% of ten thousand hours. {o.dailyTargetMin ? `At ${formatDuration(o.dailyTargetMin)} a day, the next milestone is ${Math.ceil(((m.next - m.hours) * 60) / o.dailyTargetMin)} days away.` : ''}
        </p>
      </div>

      <SectionHead title="Practice calendar" />
      <Heatmap minutes={heat} weeks={18} color="var(--oc-ink)" />
      {avgIntensity > 0 && <p className="muted small pad-x">Average depth of focus: {avgIntensity.toFixed(1)} of 5</p>}

      <SectionHead title="Measurements" action={<button className="link-btn" onClick={() => ui.openObsessionForm(o.id)}>Manage</button>} />
      {o.metrics.length === 0 ? (
        <p className="muted small pad-x">Track what matters: weight lifted, songs finished, words written. Add a measurement when you record an entry, or tap Manage.</p>
      ) : (
        <div className="metric-cards">
          {o.metrics.map((md) => {
            const series = metricSeries(entries, md.id);
            const isCount = md.kind === 'count';
            const pb = personalBest(series, md.lowerIsBetter);
            const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString();
            // Counts are charted as a running total; readings as they were logged.
            let running = 0;
            const chart = isCount ? series.map((p) => ({ ts: p.ts, value: Number((running += p.value).toFixed(2)) })) : series;
            const bestIndex = isCount ? -1 : pb ? series.indexOf(pb) : -1;
            const first = series[0];
            const last = series[series.length - 1];
            const delta = first && last && series.length > 1 ? last.value - first.value : 0;
            return (
              <div className="card metric-card" key={md.id}>
                <div className="metric-card-head">
                  <span>{md.name}</span>
                  {pb && (
                    <span className="tag tag--accent">
                      {isCount ? 'Best session' : 'Personal best'} {fmt(pb.value)} {md.unit}
                    </span>
                  )}
                </div>
                {isCount && series.length > 0 && (
                  <div className="metric-total">
                    <b>{fmt(running)}</b> {md.unit} in total
                  </div>
                )}
                {series.length === 0 ? (
                  <p className="muted small">Nothing recorded yet. Add a value with your next entry.</p>
                ) : (
                  <>
                    <LineChart points={chart} color="var(--oc-ink)" unit={md.unit} bestIndex={bestIndex} />
                    {series.length > 1 && (
                      <p className="muted small">
                        {isCount
                          ? `${series.length} sessions · ${fmt(running / series.length)} ${md.unit} per session`
                          : `${delta >= 0 ? '+' : ''}${fmt(delta)} ${md.unit} since you started tracking · ${series.length} entries`}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SectionHead title="Journal" />
      {entries.length === 0 ? (
        <Empty title="No sessions yet" body="Begin a focus session or record your first entry." />
      ) : (
        <div className="entry-list">
          {entries.slice(0, 20).map((e) => (
            <EntryCard key={e.id} entry={e} obsession={o} />
          ))}
        </div>
      )}
    </div>
  );
}
