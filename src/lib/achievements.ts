import { bestStreak, daySet, totalMinutes } from './stats';
import type { Board, Entry, Obsession } from './types';

export interface AchievementContext {
  entries: Entry[];
  boards: Board[];
  obsessions: Obsession[];
  prCount: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  tier: 'bronze' | 'silver' | 'gold';
  check: (c: AchievementContext) => boolean;
}

const hourOf = (ts: number) => new Date(ts).getHours();

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_rep', title: 'First Rep', desc: 'Log your first piece of work.', emoji: '👟', tier: 'bronze', check: (c) => c.entries.length >= 1 },
  { id: 'streak_3', title: 'Heating Up', desc: 'Hit a 3-day streak.', emoji: '🔥', tier: 'bronze', check: (c) => bestStreak(daySet(c.entries)) >= 3 },
  { id: 'streak_7', title: 'On Fire', desc: 'Hit a 7-day streak.', emoji: '☄️', tier: 'silver', check: (c) => bestStreak(daySet(c.entries)) >= 7 },
  { id: 'streak_30', title: 'Possessed', desc: 'Hit a 30-day streak.', emoji: '👁️', tier: 'gold', check: (c) => bestStreak(daySet(c.entries)) >= 30 },
  { id: 'streak_100', title: 'Unstoppable', desc: 'Hit a 100-day streak.', emoji: '🚂', tier: 'gold', check: (c) => bestStreak(daySet(c.entries)) >= 100 },
  { id: 'hours_10', title: 'Ten Deep', desc: 'Put in 10 total hours.', emoji: '⏱️', tier: 'bronze', check: (c) => totalMinutes(c.entries) >= 600 },
  { id: 'hours_100', title: 'Century', desc: 'Put in 100 total hours.', emoji: '💯', tier: 'silver', check: (c) => totalMinutes(c.entries) >= 6000 },
  { id: 'hours_1000', title: 'The Thousand', desc: 'Put in 1,000 total hours.', emoji: '🏛️', tier: 'gold', check: (c) => totalMinutes(c.entries) >= 60000 },
  { id: 'lockin_60', title: 'Locked In', desc: 'Finish a Lock In session of 60+ minutes.', emoji: '🔒', tier: 'silver', check: (c) => c.entries.some((e) => e.lockIn && e.durationMin >= 60) },
  { id: 'lockin_180', title: 'Tunnel Vision', desc: 'One session. Three hours. No breaks in focus.', emoji: '🕳️', tier: 'gold', check: (c) => c.entries.some((e) => e.durationMin >= 180) },
  { id: 'early', title: '5AM Club', desc: 'Get work in before 6 AM.', emoji: '🌅', tier: 'silver', check: (c) => c.entries.some((e) => hourOf(e.createdAt) >= 4 && hourOf(e.createdAt) < 6) },
  { id: 'late', title: 'Night Shift', desc: 'Get work in between midnight and 4 AM.', emoji: '🌙', tier: 'silver', check: (c) => c.entries.some((e) => hourOf(e.createdAt) < 4) },
  { id: 'two_way', title: 'Two-Way Player', desc: 'Work on two different obsessions in one day.', emoji: '♊', tier: 'bronze', check: (c) => {
    const byDay = new Map<string, Set<string>>();
    for (const e of c.entries) {
      const s = byDay.get(e.date) ?? new Set();
      s.add(e.obsessionId);
      byDay.set(e.date, s);
      if (s.size >= 2) return true;
    }
    return false;
  } },
  { id: 'film_room', title: 'Film Room', desc: 'Log 10 photos of your work.', emoji: '🎞️', tier: 'bronze', check: (c) => c.entries.reduce((s, e) => s + e.photoIds.length, 0) >= 10 },
  { id: 'author', title: 'The Author', desc: 'Write 10 reflections.', emoji: '✍️', tier: 'bronze', check: (c) => c.entries.filter((e) => e.note.trim().length >= 20).length >= 10 },
  { id: 'visionary', title: 'Visionary', desc: 'Build a vision board with 6+ photos.', emoji: '🖼️', tier: 'silver', check: (c) => c.boards.some((b) => b.items.filter((i) => i.type === 'image').length >= 6) },
  { id: 'pr', title: 'New PR', desc: 'Beat one of your personal bests.', emoji: '📈', tier: 'silver', check: (c) => c.prCount >= 1 },
  { id: 'reps_50', title: 'Fifty Reps', desc: 'Log 50 entries.', emoji: '🧱', tier: 'silver', check: (c) => c.entries.length >= 50 },
  { id: 'reps_365', title: 'Year of the Grind', desc: 'Log 365 entries.', emoji: '🏆', tier: 'gold', check: (c) => c.entries.length >= 365 },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
