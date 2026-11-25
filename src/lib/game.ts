/**
 * The quiet game layer: experience, levels, the ascent through ranks, and mastery milestones.
 * Kept simple and transparent. The work is the point; this only marks the path.
 */

export interface XpInput {
  durationMin: number;
  photos: number;
  hasNote: boolean;
  metrics: number;
  intensity: number;
  streakDays: number; // streak length *including* this entry's day
}

export interface XpBreakdown {
  total: number;
  lines: { label: string; xp: number }[];
}

export function computeXp(i: XpInput): XpBreakdown {
  const lines: { label: string; xp: number }[] = [{ label: 'Presence', xp: 10 }];
  if (i.durationMin > 0) lines.push({ label: `${Math.round(i.durationMin)} minutes of practice`, xp: Math.min(240, Math.round(i.durationMin)) });
  if (i.photos > 0) lines.push({ label: 'Photographs', xp: Math.min(3, i.photos) * 5 });
  if (i.hasNote) lines.push({ label: 'Reflection', xp: 5 });
  if (i.metrics > 0) lines.push({ label: 'Measurements', xp: i.metrics * 5 });
  if (i.intensity >= 5) lines.push({ label: 'Deep focus', xp: 10 });
  const base = lines.reduce((s, l) => s + l.xp, 0);
  const streakPct = Math.min(50, Math.max(0, (i.streakDays - 1) * 5));
  if (streakPct > 0) lines.push({ label: `Consistency +${streakPct}%`, xp: Math.round((base * streakPct) / 100) });
  return { total: lines.reduce((s, l) => s + l.xp, 0), lines };
}

/** Cumulative XP needed to *reach* a level. Level 1 = 0 XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.7));
}

export function levelFromXp(xp: number): { level: number; into: number; span: number; progress: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, into: xp - floor, span: ceil - floor, progress: (xp - floor) / (ceil - floor) };
}

export interface Rank {
  title: string;
  minLevel: number;
  line: string;
}

export const RANKS: Rank[] = [
  { title: 'Initiate', minLevel: 1, line: 'Every ascent begins with a single step.' },
  { title: 'Apprentice', minLevel: 3, line: 'You keep returning. That is the whole secret.' },
  { title: 'Student', minLevel: 6, line: 'Now you study the work, not only do it.' },
  { title: 'Practitioner', minLevel: 10, line: 'The details have started to matter to you.' },
  { title: 'Artisan', minLevel: 15, line: 'You show up when you don’t feel like it.' },
  { title: 'Adept', minLevel: 20, line: 'What once took effort now takes attention.' },
  { title: 'Master', minLevel: 28, line: 'Your standard quietly raises every room.' },
  { title: 'Virtuoso', minLevel: 36, line: 'The work and the person have become one.' },
  { title: 'Legend', minLevel: 50, line: 'Obsessed, permanently.' },
];

export function rankForLevel(level: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank;
  return r;
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}

/** Mastery milestones in hours, on the road to 10,000. */
export const MASTERY_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function masteryProgress(totalMin: number) {
  const hours = totalMin / 60;
  const next = MASTERY_MILESTONES.find((m) => m > hours) ?? 10000;
  const prevIdx = MASTERY_MILESTONES.indexOf(next) - 1;
  const prev = prevIdx >= 0 ? MASTERY_MILESTONES[prevIdx] : 0;
  return {
    hours,
    next,
    prev,
    progress: Math.min(1, (hours - prev) / (next - prev)),
    toMastery: Math.min(1, hours / 10000),
  };
}

export const INTENSITY_LABELS = ['', 'Scattered', 'Present', 'Steady', 'Focused', 'Deep'];
