import { ChevronRight, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SectionHead, Stat } from '../components/Bits';
import { Sheet } from '../components/Sheet';
import { Bar, BarChart, Heatmap, Ring } from '../components/Viz';
import { ACHIEVEMENTS, type AchievementDef } from '../lib/achievements';
import { addDays, formatDuration, formatHours, parseDayKey, startOfWeekKey } from '../lib/dates';
import { RANKS, levelFromXp, masteryProgress, nextRank, rankForLevel, xpForLevel } from '../lib/game';
import { useEntries, useObsessions, useToday, useUnlocked } from '../lib/hooks';
import { navigate } from '../lib/router';
import { bestStreak, currentStreak, daySet, minutesByDay, totalMinutes, totalXp } from '../lib/stats';

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
        <h1 className="display">PROGRESS</h1>
        <p>The scoreboard doesn’t lie.</p>
      </header>

      <section className="rank-hero">
        <div className="rank-hero-glow" />
        <Ring value={lvl.progress} size={132} stroke={8} color="url(#rankgrad)" track="rgba(255,255,255,0.08)">
          <div className="rank-hero-level">
            <span>LEVEL</span>
            <b>{lvl.level}</b>
          </div>
        </Ring>
        <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="rankgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F7C548" />
              <stop offset="1" stopColor="#FF3347" />
            </linearGradient>
          </defs>
        </svg>
        <div className="rank-hero-title">{rank.title}</div>
        <p className="rank-hero-line">{rank.line}</p>
        <div className="rank-hero-xp">
          <b>{xp.toLocaleString()}</b> XP total · {(xpForLevel(lvl.level + 1) - xp).toLocaleString()} to level {lvl.level + 1}
        </div>
        {upcoming && (
          <div className="rank-hero-next">
            Next rank: <b>{upcoming.title}</b> at level {upcoming.minLevel}
          </div>
        )}
      </section>

      <div className="stat-grid">
        <Stat value={formatHours(minutes)} label="Hours put in" />
        <Stat value={entries.length.toLocaleString()} label="Reps logged" />
        <Stat value={streak.length} label="Current streak" accent={streak.length ? '#FF7A1A' : undefined} />
        <Stat value={best} label="Best streak" accent={best ? '#F7C548' : undefined} />
      </div>

      <SectionHead title="The grind map" />
      <div className="card">
        <Heatmap minutes={heat} weeks={18} />
      </div>

      <SectionHead title="Hours per week" />
      <div className="card">
        <BarChart data={weekly} />
      </div>

      {obsessions.length > 0 && (
        <>
          <SectionHead title="Path to mastery" />
          <div className="mastery-list">
            {obsessions.map((o) => {
              const min = totalMinutes(entries, o.id);
              const m = masteryProgress(min);
              return (
                <button key={o.id} className="mastery" onClick={() => navigate(`/o/${o.id}`)} style={{ ['--oc' as string]: o.color }}>
                  <div className="mastery-top">
                    <span className="mastery-name">
                      {o.emoji} {o.name}
                    </span>
                    <span className="mastery-hours">
                      <b>{formatHours(min)}</b> / {m.next.toLocaleString()} hrs
                    </span>
                  </div>
                  <Bar value={m.progress} color={o.color} />
                  <div className="mastery-foot">
                    <span>{(m.toMastery * 100).toFixed(m.toMastery < 0.01 ? 2 : 1)}% of the way to 10,000 hours</span>
                    <ChevronRight size={14} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <SectionHead title="Trophy case" action={<span className="section-meta">{unlocked.length}/{ACHIEVEMENTS.length}</span>} />
      <div className="badges">
        {ACHIEVEMENTS.map((a) => {
          const at = unlockedMap.get(a.id);
          return (
            <button key={a.id} className={`badge ${at ? 'is-unlocked' : ''}`} onClick={() => setBadge(a)}>
              <span className={`badge-medal badge-medal--${a.tier}`}>{at ? a.emoji : <Lock size={18} />}</span>
              <span className="badge-title">{a.title}</span>
            </button>
          );
        })}
      </div>

      <SectionHead title="The ladder" />
      <div className="ladder">
        {RANKS.map((r) => {
          const state = lvl.level >= r.minLevel ? (r.title === rank.title ? 'current' : 'done') : 'locked';
          return (
            <div key={r.title} className={`ladder-row is-${state}`}>
              <span className="ladder-lv">Lv {r.minLevel}</span>
              <span className="ladder-title">{r.title}</span>
              {state === 'current' && <span className="tag tag--gold">You</span>}
            </div>
          );
        })}
      </div>

      <Sheet open={!!badge} onClose={() => setBadge(null)}>
        {badge && (
          <div className="badge-detail">
            <span className={`badge-medal badge-medal--xl badge-medal--${badge.tier} ${unlockedMap.has(badge.id) ? '' : 'is-locked'}`}>{badge.emoji}</span>
            <h2>{badge.title}</h2>
            <p>{badge.desc}</p>
            <div className="tag">
              {unlockedMap.has(badge.id)
                ? `Unlocked ${new Date(unlockedMap.get(badge.id)!).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Locked. Keep going.'}
            </div>
          </div>
        )}
      </Sheet>
      <p className="muted small center pad-top">Total time on record: {formatDuration(minutes)}</p>
    </div>
  );
}
