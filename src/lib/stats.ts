import { addDays, dayKey, daysBetween } from './dates';
import type { Entry, Obsession } from './types';

/** Current streak: consecutive days with work, ending today — or yesterday if today isn't logged yet. */
export function currentStreak(days: Set<string>, today = dayKey()): { length: number; alive: boolean; loggedToday: boolean } {
  const loggedToday = days.has(today);
  let cursor = loggedToday ? today : addDays(today, -1);
  let length = 0;
  while (days.has(cursor)) {
    length++;
    cursor = addDays(cursor, -1);
  }
  return { length, alive: length > 0, loggedToday };
}

export function bestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function daySet(entries: Entry[], obsessionId?: string): Set<string> {
  const s = new Set<string>();
  for (const e of entries) if (!obsessionId || e.obsessionId === obsessionId) s.add(e.date);
  return s;
}

export function minutesByDay(entries: Entry[], obsessionId?: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    if (obsessionId && e.obsessionId !== obsessionId) continue;
    // A rep without a duration still counts as activity on the heatmap.
    m.set(e.date, (m.get(e.date) ?? 0) + Math.max(e.durationMin, 1));
  }
  return m;
}

export function totalMinutes(entries: Entry[], obsessionId?: string): number {
  let t = 0;
  for (const e of entries) if (!obsessionId || e.obsessionId === obsessionId) t += e.durationMin;
  return t;
}

export function totalXp(entries: Entry[]): number {
  return entries.reduce((s, e) => s + e.xp, 0);
}

export interface MetricPoint {
  ts: number;
  value: number;
  entryId: string;
}

export function metricSeries(entries: Entry[], metricId: string): MetricPoint[] {
  const pts: MetricPoint[] = [];
  for (const e of entries) {
    for (const m of e.metrics) if (m.metricId === metricId) pts.push({ ts: e.createdAt, value: m.value, entryId: e.id });
  }
  return pts.sort((a, b) => a.ts - b.ts);
}

export function personalBest(points: MetricPoint[], lowerIsBetter?: boolean): MetricPoint | null {
  if (!points.length) return null;
  return points.reduce((best, p) => (lowerIsBetter ? p.value < best.value : p.value > best.value) ? p : best);
}

/** Returns metric ids where `entry` set a new personal best versus prior entries. */
export function newPersonalBests(entry: Entry, priorEntries: Entry[], obsession: Obsession | undefined): string[] {
  if (!obsession) return [];
  const prs: string[] = [];
  for (const mv of entry.metrics) {
    const def = obsession.metrics.find((m) => m.id === mv.metricId);
    if (!def) continue;
    const prior = metricSeries(priorEntries.filter((e) => e.id !== entry.id && e.createdAt < entry.createdAt), mv.metricId);
    if (!prior.length) continue;
    const best = personalBest(prior, def.lowerIsBetter)!;
    if (def.lowerIsBetter ? mv.value < best.value : mv.value > best.value) prs.push(mv.metricId);
  }
  return prs;
}

/** Last `n` days ending today, oldest first. */
export function lastNDays(n: number, today = dayKey()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}
