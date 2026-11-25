import { ArrowRight, ChevronRight, Plus, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Empty, SectionHead, Wordmark } from '../components/Bits';
import { BoardView } from '../components/BoardView';
import { EntryCard } from '../components/EntryCard';
import { Bar, Ring, Streak } from '../components/Viz';
import { addDays, daysBetween, dayKey, formatDuration, parseDayKey } from '../lib/dates';
import { levelFromXp, rankForLevel } from '../lib/game';
import { buzz } from '../lib/haptics';
import { useBoards, useEntries, useObsessions, useProfileOrDefault, useToday } from '../lib/hooks';
import { ObsessionIcon } from '../lib/icons';
import { mantraForDay } from '../lib/mantras';
import { navigate } from '../lib/router';
import { currentStreak, daySet, totalXp } from '../lib/stats';
import { ui } from '../lib/ui';

function salutation(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

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
  const dateLine = parseDayKey(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const todayEntries = entries.filter((e) => e.date === today);
  const minutesToday = (id: string) => todayEntries.filter((e) => e.obsessionId === id).reduce((s, e) => s + e.durationMin, 0);
  const sessionsToday = (id: string) => todayEntries.filter((e) => e.obsessionId === id).length;
  const doneCount = obsessions.filter((o) => (o.dailyTargetMin ? minutesToday(o.id) >= o.dailyTargetMin : sessionsToday(o.id) > 0)).length;

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
        <Wordmark />
        <div className="row gap-s">
          <Streak count={streak.length} alive={streak.loggedToday} />
          <button className="icon-btn" aria-label="Settings" onClick={() => navigate('/settings')}>
            <Settings size={19} strokeWidth={1.3} />
          </button>
        </div>
      </header>

      <section className="hello">
        <div className="label">{dateLine}</div>
        <h1>
          {salutation()}
          {profile.name ? `, ${profile.name}` : ''}.
        </h1>
        <p>Day {dayNumber} of the ascent.</p>
      </section>

      <button className="level-line" onClick={() => navigate('/progress')}>
        <div className="level-line-top">
          <span>
            Level <b>{lvl.level}</b> <em>{rank.title}</em>
          </span>
          <span className="level-line-xp">
            {lvl.into.toLocaleString()} / {lvl.span.toLocaleString()}
          </span>
        </div>
        <Bar value={lvl.progress} color="var(--accent)" />
      </button>

      {streak.length > 0 && !streak.loggedToday && (
        <p className="notice">
          Your {streak.length}-day streak continues with one session today.
        </p>
      )}

      <figure
        className="mantra"
        onClick={() => {
          buzz(4);
          setMantraOffset((o) => o + 1);
        }}
      >
        <div className="label">Today’s mantra</div>
        <blockquote>{mantra.text}</blockquote>
        {mantra.by && <figcaption>{mantra.by}</figcaption>}
      </figure>

      <SectionHead title="Today’s practice" action={obsessions.length > 0 && <span className="section-meta">{doneCount} of {obsessions.length} complete</span>} />
      {obsessions.length === 0 ? (
        <Empty title="Nothing to practice yet" body="Add the craft you are devoted to." action={<button className="btn btn--primary" onClick={() => ui.openObsessionForm()}>Add an obsession</button>} />
      ) : (
        <div className="practice">
          {obsessions.map((o) => {
            const min = minutesToday(o.id);
            const count = sessionsToday(o.id);
            const target = o.dailyTargetMin;
            const progress = target ? min / target : count > 0 ? 1 : 0;
            const oStreak = currentStreak(daySet(entries, o.id), today);
            const done = progress >= 1;
            return (
              <div className={`practice-row ${done ? 'is-done' : ''}`} key={o.id} style={{ ['--oc' as string]: o.color }}>
                <button className="practice-main" onClick={() => navigate(`/o/${o.id}`)}>
                  <Ring value={progress} size={48} color="var(--oc-ink)">
                    <ObsessionIcon o={o} size={19} />
                  </Ring>
                  <div className="practice-text">
                    <div className="practice-name">{o.name}</div>
                    <div className="practice-meta">
                      {target ? `${formatDuration(min)} of ${formatDuration(target)}` : count ? `${count} session${count > 1 ? 's' : ''} today` : 'Not yet today'}
                      {oStreak.length > 1 && ` · ${oStreak.length}-day streak`}
                    </div>
                  </div>
                </button>
                <button className="icon-btn icon-btn--line" aria-label={`New entry for ${o.name}`} onClick={() => ui.openLog({ obsessionId: o.id })}>
                  <Plus size={17} strokeWidth={1.4} />
                </button>
                <button className="btn btn--small btn--primary" onClick={() => navigate(`/focus?o=${o.id}`)}>
                  Begin
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
            <span className="week-label">{d.label}</span>
            <span className="week-dot" />
          </div>
        ))}
      </div>

      <SectionHead title="The vision" action={<button className="link-btn" onClick={() => navigate('/vision')}>All boards <ChevronRight size={14} strokeWidth={1.5} /></button>} />
      {pinned ? (
        <button className="vision-teaser" onClick={() => navigate(`/vision/${pinned.id}`)}>
          <div className="mat">
            <BoardView board={pinned} />
          </div>
          <div className="vision-teaser-text">
            <div className="vision-teaser-title">{pinned.title}</div>
            <p>Look at it every day, until it is real.</p>
            <span className="link-btn">
              Open <ArrowRight size={14} strokeWidth={1.5} />
            </span>
          </div>
        </button>
      ) : (
        <button className="vision-cta" onClick={() => navigate('/vision?new=1')}>
          <div className="vision-cta-art" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <b>Compose your vision board</b>
            <p>Images of the life you are working toward, arranged with care. Keep it as your wallpaper.</p>
          </div>
          <ChevronRight size={18} strokeWidth={1.3} />
        </button>
      )}

      {entries.length > 0 && (
        <>
          <SectionHead title="Recent entries" action={<button className="link-btn" onClick={() => navigate('/journal')}>Journal <ChevronRight size={14} strokeWidth={1.5} /></button>} />
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
