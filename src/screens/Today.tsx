import { ChevronRight, Play, Plus, RefreshCw, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Empty, SectionHead, Wordmark } from '../components/Bits';
import { BoardView } from '../components/BoardView';
import { EntryCard } from '../components/EntryCard';
import { Bar, Flame, Ring } from '../components/Viz';
import { addDays, daysBetween, dayKey, formatDuration, greeting, parseDayKey } from '../lib/dates';
import { levelFromXp, rankForLevel } from '../lib/game';
import { buzz } from '../lib/haptics';
import { useBoards, useEntries, useObsessions, useProfileOrDefault, useToday } from '../lib/hooks';
import { mantraForDay } from '../lib/mantras';
import { navigate } from '../lib/router';
import { currentStreak, daySet, totalXp } from '../lib/stats';
import { ui } from '../lib/ui';

export function Today() {
  const today = useToday();
  const profile = useProfileOrDefault();
  const obsessions = useObsessions();
  const entries = useEntries() ?? [];
  const boards = useBoards() ?? [];
  const [mantraOffset, setMantraOffset] = useState(0);

  const days = useMemo(() => daySet(entries), [entries]);
  const streak = currentStreak(days, today);
  const xp = totalXp(entries);
  const lvl = levelFromXp(xp);
  const rank = rankForLevel(lvl.level);
  const mantra = mantraForDay(today, profile.customMantras, mantraOffset);
  const dayNumber = profile.onboardedAt ? daysBetween(dayKey(profile.onboardedAt), today) + 1 : 1;

  const todayEntries = entries.filter((e) => e.date === today);
  const minutesToday = (id: string) => todayEntries.filter((e) => e.obsessionId === id).reduce((s, e) => s + e.durationMin, 0);
  const repsToday = (id: string) => todayEntries.filter((e) => e.obsessionId === id).length;
  const doneCount = obsessions.filter((o) => (o.dailyTargetMin ? minutesToday(o.id) >= o.dailyTargetMin : repsToday(o.id) > 0)).length;

  const week = useMemo(() => {
    const out: { key: string; label: string; active: boolean; isToday: boolean; future: boolean }[] = [];
    const d = parseDayKey(today);
    const monday = addDays(today, -((d.getDay() + 6) % 7));
    for (let i = 0; i < 7; i++) {
      const key = addDays(monday, i);
      out.push({
        key,
        label: parseDayKey(key).toLocaleDateString(undefined, { weekday: 'narrow' }),
        active: days.has(key),
        isToday: key === today,
        future: key > today,
      });
    }
    return out;
  }, [today, days]);

  const pinned = boards.find((b) => b.pinned) ?? boards[0];
  const obsessionMap = new Map(obsessions.map((o) => [o.id, o]));

  return (
    <div className="screen today">
      <header className="topbar">
        <Wordmark size={20} />
        <div className="row gap-s">
          <Flame count={streak.length} alive={streak.loggedToday} />
          <button className="icon-btn" aria-label="Settings" onClick={() => navigate('/settings')}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <section className="hello">
        <h1>
          {greeting()}
          {profile.name ? `, ${profile.name}` : ''}.
        </h1>
        <p>
          Day <b>{dayNumber}</b> of being obsessed.
        </p>
      </section>

      <button className="rank-card" onClick={() => navigate('/progress')}>
        <div className="rank-card-level">
          <span>LV</span>
          <b>{lvl.level}</b>
        </div>
        <div className="rank-card-body">
          <div className="rank-card-title">{rank.title}</div>
          <Bar value={lvl.progress} color="linear-gradient(90deg, #F7C548, #FF7A1A)" />
          <div className="rank-card-meta">
            <span>{lvl.into.toLocaleString()} / {lvl.span.toLocaleString()} XP</span>
            <span>Lv {lvl.level + 1} →</span>
          </div>
        </div>
      </button>

      {streak.length > 0 && !streak.loggedToday && (
        <div className="alert">
          <Flame count={streak.length} alive />
          <span>
            Your <b>{streak.length}-day streak</b> ends at midnight. One rep keeps it alive.
          </span>
        </div>
      )}

      <section className="mantra" onClick={() => { buzz(6); setMantraOffset((o) => o + 1); }}>
        <div className="eyebrow row-between">
          <span>Today’s mantra</span>
          <RefreshCw size={13} />
        </div>
        <blockquote>{mantra.text}</blockquote>
        {mantra.by && <cite>{mantra.by}</cite>}
      </section>

      <SectionHead
        title="Today’s work"
        action={obsessions.length > 0 && <span className="section-meta">{doneCount}/{obsessions.length} done</span>}
      />
      {obsessions.length === 0 ? (
        <Empty emoji="🎯" title="Nothing to be obsessed with yet" body="Add the craft you’re chasing." action={<button className="btn btn--primary" onClick={() => ui.openObsessionForm()}>Add an obsession</button>} />
      ) : (
        <div className="work-list">
          {obsessions.map((o) => {
            const min = minutesToday(o.id);
            const reps = repsToday(o.id);
            const target = o.dailyTargetMin;
            const progress = target ? min / target : reps > 0 ? 1 : 0;
            const oStreak = currentStreak(daySet(entries, o.id), today);
            const done = progress >= 1;
            return (
              <div className={`work ${done ? 'is-done' : ''}`} key={o.id} style={{ ['--oc' as string]: o.color }}>
                <button className="work-main" onClick={() => navigate(`/o/${o.id}`)}>
                  <Ring value={progress} size={54} stroke={5} color={o.color}>
                    <span className="work-emoji">{done ? '✓' : o.emoji}</span>
                  </Ring>
                  <div className="work-text">
                    <div className="work-name">{o.name}</div>
                    <div className="work-meta">
                      {target ? `${formatDuration(min)} / ${formatDuration(target)}` : reps ? `${reps} rep${reps > 1 ? 's' : ''} today` : 'No reps yet'}
                      {oStreak.length > 0 && <span className="work-streak"> · 🔥 {oStreak.length}</span>}
                    </div>
                  </div>
                </button>
                <button className="icon-btn icon-btn--solid" aria-label={`Log ${o.name}`} onClick={() => ui.openLog({ obsessionId: o.id })}>
                  <Plus size={20} />
                </button>
                <button className="btn btn--primary btn--small work-lock" onClick={() => navigate(`/lockin?o=${o.id}`)}>
                  <Play size={14} fill="currentColor" /> Lock in
                </button>
              </div>
            );
          })}
        </div>
      )}

      <SectionHead title="This week" />
      <div className="week">
        {week.map((d) => (
          <div key={d.key} className={`week-day ${d.active ? 'is-active' : ''} ${d.isToday ? 'is-today' : ''} ${d.future ? 'is-future' : ''}`}>
            <span className="week-dot">{d.active ? '🔥' : ''}</span>
            <span className="week-label">{d.label}</span>
          </div>
        ))}
      </div>

      <SectionHead title="The vision" action={<button className="link-btn" onClick={() => navigate('/vision')}>All boards <ChevronRight size={14} /></button>} />
      {pinned ? (
        <button className="vision-teaser" onClick={() => navigate(`/vision/${pinned.id}`)}>
          <div className="vision-teaser-board">
            <BoardView board={pinned} />
          </div>
          <div className="vision-teaser-text">
            <div className="eyebrow">Remember why</div>
            <div className="vision-teaser-title">{pinned.title}</div>
            <p>Look at it every day until it’s real.</p>
          </div>
        </button>
      ) : (
        <button className="vision-cta" onClick={() => navigate('/vision?new=1')}>
          <div className="vision-cta-art">
            <span />
            <span />
            <span />
          </div>
          <div>
            <b>Build your vision board</b>
            <p>Photos of the life you’re working toward. Set it as your wallpaper.</p>
          </div>
          <ChevronRight size={18} />
        </button>
      )}

      {entries.length > 0 && (
        <>
          <SectionHead title="Latest tape" action={<button className="link-btn" onClick={() => navigate('/tape')}>See all <ChevronRight size={14} /></button>} />
          <div className="entry-list">
            {entries.slice(0, 3).map((e) => (
              <EntryCard key={e.id} entry={e} obsession={obsessionMap.get(e.obsessionId)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
