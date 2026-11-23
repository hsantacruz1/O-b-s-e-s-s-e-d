import { ChevronLeft, Pencil, Play, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Empty, SectionHead, Stat } from '../components/Bits';
import { EntryCard } from '../components/EntryCard';
import { Bar, Heatmap, LineChart } from '../components/Viz';
import { formatDuration, formatHours } from '../lib/dates';
import { MASTERY_MILESTONES, masteryProgress } from '../lib/game';
import { useEntries, useObsession, useToday } from '../lib/hooks';
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
        <Empty emoji="🕳️" title="Obsession not found" action={<button className="btn btn--primary" onClick={() => navigate('/', { replace: true })}>Home</button>} />
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
          <ChevronLeft size={24} />
        </button>
        <button className="icon-btn" onClick={() => ui.openObsessionForm(o.id)} aria-label="Edit obsession">
          <Pencil size={18} />
        </button>
      </header>

      <section className="obsession-hero">
        <div className="obsession-emoji">{o.emoji}</div>
        <h1 className="display">{o.name.toUpperCase()}</h1>
        {o.why && <blockquote className="obsession-why">“{o.why}”</blockquote>}
        <div className="row gap center-row">
          <button className="btn btn--primary" onClick={() => navigate(`/lockin?o=${o.id}`)}>
            <Play size={16} fill="currentColor" /> Lock in
          </button>
          <button className="btn btn--ghost" onClick={() => ui.openLog({ obsessionId: o.id })}>
            <Plus size={16} /> Log
          </button>
        </div>
      </section>

      <div className="stat-grid">
        <Stat value={formatHours(minutes)} label="Hours" accent={o.color} />
        <Stat value={entries.length} label="Reps" />
        <Stat value={streak.length} label="Streak" />
        <Stat value={bestStreak(days)} label="Best streak" />
      </div>

      <SectionHead title="Path to mastery" />
      <div className="card mastery-card">
        <div className="mastery-big">
          <b>{formatHours(minutes)}</b>
          <span>of {m.next.toLocaleString()} hours · next milestone</span>
        </div>
        <Bar value={m.progress} color={o.color} tall />
        <div className="milestones">
          {MASTERY_MILESTONES.map((ms) => (
            <span key={ms} className={m.hours >= ms ? 'is-hit' : ms === m.next ? 'is-next' : ''}>
              {ms >= 1000 ? `${ms / 1000}k` : ms}
            </span>
          ))}
        </div>
        <p className="muted small">
          {(m.toMastery * 100).toFixed(2)}% of 10,000 hours. {o.dailyTargetMin ? `At ${formatDuration(o.dailyTargetMin)} a day, your next milestone is ${Math.ceil(((m.next - m.hours) * 60) / o.dailyTargetMin)} days out.` : ''}
        </p>
      </div>

      <SectionHead title="Grind map" />
      <div className="card">
        <Heatmap minutes={heat} weeks={18} color={o.color} />
        {avgIntensity > 0 && <p className="muted small">Average focus: {avgIntensity.toFixed(1)} / 5 🔥</p>}
      </div>

      <SectionHead title="The numbers" action={<button className="link-btn" onClick={() => ui.openObsessionForm(o.id)}>Manage</button>} />
      {o.metrics.length === 0 ? (
        <div className="card muted small">Track numbers like weight lifted, songs finished or words written. Add them when you log, or tap Manage.</div>
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
                    <span className="tag tag--gold">
                      {isCount ? 'Best session' : 'PR'} {fmt(pb.value)} {md.unit}
                    </span>
                  )}
                </div>
                {isCount && series.length > 0 && (
                  <div className="metric-total">
                    <b style={{ color: o.color }}>{fmt(running)}</b> {md.unit} total
                  </div>
                )}
                {series.length === 0 ? (
                  <p className="muted small">No data yet. Add a value next time you log.</p>
                ) : (
                  <>
                    <LineChart points={chart} color={o.color} unit={md.unit} bestIndex={bestIndex} />
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

      <SectionHead title="Tape" />
      {entries.length === 0 ? (
        <Empty emoji="🎞️" title="No reps yet" body="Lock in or log your first session." />
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
