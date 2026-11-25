import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SectionHead, Stat } from '../components/Bits';
import { Sheet } from '../components/Sheet';
import { Bar, BarChart, Heatmap } from '../components/Viz';
import { ACHIEVEMENTS, type AchievementDef } from '../lib/achievements';
import { addDays, formatDuration, formatHours, parseDayKey, startOfWeekKey } from '../lib/dates';
import { RANKS, levelFromXp, masteryProgress, nextRank, rankForLevel, xpForLevel } from '../lib/game';
import { useEntries, useObsessions, useToday, useUnlocked } from '../lib/hooks';
import { ICONS, ObsessionIcon } from '../lib/icons';
import { navigate } from '../lib/router';
import { bestStreak, currentStreak, daySet, minutesByDay, totalMinutes, totalXp } from '../lib/stats';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

/** The ranks drawn as a marble staircase; you stand on the step you have reached. */
function Staircase({ level }: { level: number }) {
  const current = RANKS.reduce((idx, r, i) => (level >= r.minLevel ? i : idx), 0);
  return (
    <div className="stairs" role="img" aria-label={`Rank ${current + 1} of ${RANKS.length}: ${RANKS[current].title}`}>
      {RANKS.map((r, i) => (
        <div key={r.title} className={`stair ${i < current ? 'is-past' : ''} ${i === current ? 'is-here' : ''}`} style={{ height: `${22 + i * 9.5}%` }}>
          {i === current && <span className="stair-marker" />}
          <span className="stair-num">{ROMAN[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function Progress() {
  const today = useToday();
  const entries = useEntries() ?? [];
  const obsessions = useObsessions();
  const unlocked = useUnlocked();
  const [badge, setBadge] = useState<AchievementDef | null>(null);

  const days = useMemo(() => daySet(entries), [entries]);
  const streak = currentStreak(days, today);
  const best = bestStreak(days);
  const xp = totalXp(entries);
  const lvl = levelFromXp(xp);
  const rank = rankForLevel(lvl.level);
  const upcoming = nextRank(lvl.level);
  const minutes = totalMinutes(entries);
  const heat = useMemo(() => minutesByDay(entries), [entries]);
  const unlockedMap = new Map(unlocked.map((u) => [u.id, u.unlockedAt]));

  const weekly = useMemo(() => {
    const thisWeek = startOfWeekKey(today);
    const out: { label: string; value: number; highlight?: boolean }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = addDays(thisWeek, -w * 7);
      const end = addDays(start, 7);
      const value = entries.filter((e) => e.date >= start && e.date < end).reduce((s, e) => s + e.durationMin, 0);
      const d = parseDayKey(start);
      out.push({ label: w === 0 ? 'Now' : `${d.getMonth() + 1}/${d.getDate()}`, value, highlight: w === 0 });
    }
    return out;
  }, [entries, today]);

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="display">The Ascent</h1>
        <p>Progress, one step at a time.</p>
      </header>

      <section className="ascent">
        <Staircase level={lvl.level} />
        <div className="ascent-text">
          <div className="label">Level {lvl.level}</div>
          <div className="ascent-rank">{rank.title}</div>
          <p className="ascent-line">{rank.line}</p>
          <Bar value={lvl.progress} color="var(--accent)" />
          <div className="ascent-meta">
            <span>{xp.toLocaleString()} experience</span>
            <span>{(xpForLevel(lvl.level + 1) - xp).toLocaleString()} to level {lvl.level + 1}</span>
          </div>
          {upcoming && (
            <p className="ascent-next">
              Next step: <b>{upcoming.title}</b>, at level {upcoming.minLevel}
            </p>
          )}
        </div>
      </section>

      <div className="stat-grid">
        <Stat value={formatHours(minutes)} label="Hours of practice" />
        <Stat value={entries.length.toLocaleString()} label="Sessions recorded" />
        <Stat value={streak.length} label="Current streak" />
        <Stat value={best} label="Longest streak" />
      </div>

      <SectionHead title="Practice calendar" />
      <Heatmap minutes={heat} weeks={18} />

      <SectionHead title="Hours per week" />
      <BarChart data={weekly} />

      {obsessions.length > 0 && (
        <>
          <SectionHead title="The path to mastery" />
          <div className="mastery-list">
            {obsessions.map((o) => {
              const min = totalMinutes(entries, o.id);
              const m = masteryProgress(min);
              return (
                <button key={o.id} className="mastery" onClick={() => navigate(`/o/${o.id}`)} style={{ ['--oc' as string]: o.color }}>
                  <div className="mastery-top">
                    <span className="mastery-name">
                      <ObsessionIcon o={o} size={16} />
                      {o.name}
                    </span>
                    <span className="mastery-hours">
                      <b>{formatHours(min)}</b> of {m.next.toLocaleString()} hours
                    </span>
                  </div>
                  <Bar value={m.progress} color="var(--oc-ink)" />
                  <div className="mastery-foot">
                    <span>{(m.toMastery * 100).toFixed(m.toMastery < 0.01 ? 2 : 1)}% of the way to ten thousand hours</span>
                    <ChevronRight size={14} strokeWidth={1.3} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <SectionHead title="Milestones" action={<span className="section-meta">{unlocked.length} of {ACHIEVEMENTS.length}</span>} />
      <div className="medals">
        {ACHIEVEMENTS.map((a) => {
          const at = unlockedMap.get(a.id);
          const Icon = ICONS[a.icon];
          return (
            <button key={a.id} className={`medal-cell ${at ? 'is-earned' : ''}`} onClick={() => setBadge(a)}>
              <span className={`medal medal--${a.tier} ${at ? 'is-earned' : ''}`}>
                <Icon size={18} strokeWidth={1.25} />
              </span>
              <span className="medal-title">{a.title}</span>
            </button>
          );
        })}
      </div>

      <SectionHead title="The ranks" />
      <ol className="ranks">
        {RANKS.map((r, i) => {
          const state = lvl.level >= r.minLevel ? (r.title === rank.title ? 'current' : 'done') : 'locked';
          return (
            <li key={r.title} className={`rank-row is-${state}`}>
              <span className="rank-num">{ROMAN[i]}</span>
              <span className="rank-title">{r.title}</span>
              <span className="rank-lv">{state === 'current' ? 'You are here' : `Level ${r.minLevel}`}</span>
            </li>
          );
        })}
      </ol>

      <Sheet open={!!badge} onClose={() => setBadge(null)}>
        {badge && (
          <div className="badge-detail">
            {(() => {
              const Icon = ICONS[badge.icon];
              return (
                <span className={`medal medal--xl medal--${badge.tier} ${unlockedMap.has(badge.id) ? 'is-earned' : ''}`}>
                  <Icon size={34} strokeWidth={1} />
                </span>
              );
            })()}
            <h2>{badge.title}</h2>
            <p>{badge.desc}</p>
            <div className="label">
              {unlockedMap.has(badge.id)
                ? `Reached ${new Date(unlockedMap.get(badge.id)!).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Not yet reached'}
            </div>
          </div>
        )}
      </Sheet>
      <p className="muted small center pad-top">Total time on record: {formatDuration(minutes)}</p>
    </div>
  );
}
