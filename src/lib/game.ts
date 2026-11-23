/**
 * The small game layer: XP, levels, ranks and mastery milestones.
 * Kept deliberately simple and transparent — the work is the point, the game is the hype man.
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
  const lines: { label: string; xp: number }[] = [{ label: 'Showed up', xp: 10 }];
  if (i.durationMin > 0) lines.push({ label: `${Math.round(i.durationMin)} min of work`, xp: Math.min(240, Math.round(i.durationMin)) });
  if (i.photos > 0) lines.push({ label: 'Receipts (photos)', xp: Math.min(3, i.photos) * 5 });
  if (i.hasNote) lines.push({ label: 'Reflection', xp: 5 });
  if (i.metrics > 0) lines.push({ label: 'Tracked numbers', xp: i.metrics * 5 });
  if (i.intensity >= 5) lines.push({ label: 'Fully locked in', xp: 10 });
  const base = lines.reduce((s, l) => s + l.xp, 0);
  const streakPct = Math.min(50, Math.max(0, (i.streakDays - 1) * 5));
  if (streakPct > 0) lines.push({ label: `Streak bonus +${streakPct}%`, xp: Math.round((base * streakPct) / 100) });
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
  { title: 'Rookie', minLevel: 1, line: 'Everybody starts here. Not everybody stays.' },
  { title: 'Grinder', minLevel: 3, line: 'You keep coming back. That’s the whole secret.' },
  { title: 'Student of the Game', minLevel: 6, line: 'Now you’re studying, not just doing.' },
  { title: 'Craftsman', minLevel: 10, line: 'The details are starting to matter to you.' },
  { title: 'Pro', minLevel: 15, line: 'You show up when you don’t feel like it.' },
  { title: 'All-Star', minLevel: 20, line: 'People are starting to notice.' },
  { title: 'MVP', minLevel: 28, line: 'The standard in every room you walk into.' },
  { title: 'Legend', minLevel: 36, line: 'They’ll tell stories about your work ethic.' },
  { title: 'GOAT', minLevel: 50, line: 'Obsessed. Permanently.' },
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

export const INTENSITY_LABELS = ['', 'Distracted', 'Going through it', 'Solid', 'Dialed in', 'Locked in'];
