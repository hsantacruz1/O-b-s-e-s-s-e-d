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
  icon: string; // key into ICONS
  tier: 'bronze' | 'silver' | 'gold';
  check: (c: AchievementContext) => boolean;
}

const hourOf = (ts: number) => new Date(ts).getHours();

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_rep', title: 'First Step', desc: 'Record your first session.', icon: 'footprints', tier: 'bronze', check: (c) => c.entries.length >= 1 },
  { id: 'streak_3', title: 'Three Days', desc: 'Practice three days in a row.', icon: 'sprout', tier: 'bronze', check: (c) => bestStreak(daySet(c.entries)) >= 3 },
  { id: 'streak_7', title: 'One Week', desc: 'Practice seven days in a row.', icon: 'leaf', tier: 'silver', check: (c) => bestStreak(daySet(c.entries)) >= 7 },
  { id: 'streak_30', title: 'Devotion', desc: 'Practice thirty days in a row.', icon: 'flower', tier: 'gold', check: (c) => bestStreak(daySet(c.entries)) >= 30 },
  { id: 'streak_100', title: 'Unbroken', desc: 'Practice one hundred days in a row.', icon: 'mountain', tier: 'gold', check: (c) => bestStreak(daySet(c.entries)) >= 100 },
  { id: 'hours_10', title: 'Ten Hours', desc: 'Ten hours of practice on record.', icon: 'hourglass', tier: 'bronze', check: (c) => totalMinutes(c.entries) >= 600 },
  { id: 'hours_100', title: 'One Hundred Hours', desc: 'One hundred hours of practice on record.', icon: 'landmark', tier: 'silver', check: (c) => totalMinutes(c.entries) >= 6000 },
  { id: 'hours_1000', title: 'One Thousand Hours', desc: 'One thousand hours of practice on record.', icon: 'gem', tier: 'gold', check: (c) => totalMinutes(c.entries) >= 60000 },
  { id: 'lockin_60', title: 'Deep Work', desc: 'Complete a focus session of an hour or more.', icon: 'target', tier: 'silver', check: (c) => c.entries.some((e) => e.lockIn && e.durationMin >= 60) },
  { id: 'lockin_180', title: 'The Long Session', desc: 'One session of three hours or more.', icon: 'compass', tier: 'gold', check: (c) => c.entries.some((e) => e.durationMin >= 180) },
  { id: 'early', title: 'First Light', desc: 'Practice between 4 and 6 in the morning.', icon: 'sunrise', tier: 'silver', check: (c) => c.entries.some((e) => hourOf(e.createdAt) >= 4 && hourOf(e.createdAt) < 6) },
  { id: 'late', title: 'Night Watch', desc: 'Practice between midnight and 4 in the morning.', icon: 'moon', tier: 'silver', check: (c) => c.entries.some((e) => hourOf(e.createdAt) < 4) },
  { id: 'two_way', title: 'Two Disciplines', desc: 'Practice two obsessions on the same day.', icon: 'wind', tier: 'bronze', check: (c) => {
    const byDay = new Map<string, Set<string>>();
    for (const e of c.entries) {
      const s = byDay.get(e.date) ?? new Set();
      s.add(e.obsessionId);
      byDay.set(e.date, s);
      if (s.size >= 2) return true;
    }
    return false;
  } },
  { id: 'film_room', title: 'The Archive', desc: 'Keep ten photographs of your work.', icon: 'camera', tier: 'bronze', check: (c) => c.entries.reduce((s, e) => s + e.photoIds.length, 0) >= 10 },
  { id: 'author', title: 'Reflections', desc: 'Write ten reflections.', icon: 'feather', tier: 'bronze', check: (c) => c.entries.filter((e) => e.note.trim().length >= 20).length >= 10 },
  { id: 'visionary', title: 'The Visionary', desc: 'Compose a vision board with six or more photos.', icon: 'sparkles', tier: 'silver', check: (c) => c.boards.some((b) => b.items.filter((i) => i.type === 'image').length >= 6) },
  { id: 'pr', title: 'Personal Best', desc: 'Surpass one of your own records.', icon: 'award', tier: 'silver', check: (c) => c.prCount >= 1 },
  { id: 'reps_50', title: 'Fifty Sessions', desc: 'Record fifty sessions.', icon: 'medal', tier: 'silver', check: (c) => c.entries.length >= 50 },
  { id: 'reps_365', title: 'A Year of Practice', desc: 'Record three hundred and sixty-five sessions.', icon: 'crown', tier: 'gold', check: (c) => c.entries.length >= 365 },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
