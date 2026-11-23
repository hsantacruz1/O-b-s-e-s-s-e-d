import { ACHIEVEMENTS } from './achievements';
import { addDays } from './dates';
import { db } from './db';
import { emit } from './events';
import { computeXp, levelFromXp, rankForLevel } from './game';
import { collectOrphanPhotos } from './images';
import { metricSeries, newPersonalBests, personalBest, totalXp } from './stats';
import type { Entry, Obsession } from './types';

/** Count every time a metric value beat the best that came before it. */
export function countPersonalBests(entries: Entry[], obsessions: Obsession[]): number {
  let count = 0;
  for (const o of obsessions) {
    const mine = entries.filter((e) => e.obsessionId === o.id);
    for (const m of o.metrics) {
      const series = metricSeries(mine, m.id);
      for (let i = 1; i < series.length; i++) {
        const best = personalBest(series.slice(0, i), m.lowerIsBetter)!;
        if (m.lowerIsBetter ? series[i].value < best.value : series[i].value > best.value) count++;
      }
    }
  }
  return count;
}

/** Check every achievement and announce the ones that are newly earned. */
export async function evaluateAchievements(announce = true): Promise<string[]> {
  const [entries, boards, obsessions, unlocked] = await Promise.all([
    db.entries.toArray(),
    db.boards.toArray(),
    db.obsessions.toArray(),
    db.achievements.toArray(),
  ]);
  const have = new Set(unlocked.map((u) => u.id));
  const ctx = { entries, boards, obsessions, prCount: countPersonalBests(entries, obsessions) };
  const fresh = ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(ctx)).map((a) => a.id);
  if (fresh.length) {
    await db.achievements.bulkPut(fresh.map((id) => ({ id, unlockedAt: Date.now() })));
    if (announce) fresh.forEach((id) => emit({ kind: 'achievement', id }));
  }
  return fresh;
}

function streakLengthIncluding(days: Set<string>, day: string): number {
  let n = 0;
  let cursor = day;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export type EntryDraft = Omit<Entry, 'xp'>;

/** Save a new or edited rep, award XP, and fire the celebrations. */
export async function saveEntry(draft: EntryDraft, opts: { isNew: boolean }): Promise<Entry> {
  const all = await db.entries.toArray();
  const others = all.filter((e) => e.id !== draft.id);
  const days = new Set(others.map((e) => e.date));
  days.add(draft.date);
  const xp = computeXp({
    durationMin: draft.durationMin,
    photos: draft.photoIds.length,
    hasNote: draft.note.trim().length >= 10,
    metrics: draft.metrics.length,
    intensity: draft.intensity,
    streakDays: streakLengthIncluding(days, draft.date),
  });
  const entry: Entry = { ...draft, xp: xp.total };

  const xpBefore = totalXp(others) + (opts.isNew ? 0 : all.find((e) => e.id === draft.id)?.xp ?? 0);
  await db.entries.put(entry);
  const xpAfter = totalXp([...others, entry]);

  if (opts.isNew) {
    const obsession = await db.obsessions.get(entry.obsessionId);
    const prs = newPersonalBests(entry, others, obsession);
    const prNames = prs.map((id) => obsession?.metrics.find((m) => m.id === id)?.name ?? '').filter(Boolean);
    emit({ kind: 'xp', xp: xp.total, lines: xp.lines, prs: prNames });

    const before = levelFromXp(xpBefore).level;
    const after = levelFromXp(xpAfter).level;
    if (after > before) {
      const rankUp = rankForLevel(after).title !== rankForLevel(before).title;
      emit({ kind: 'levelup', level: after, rank: rankForLevel(after).title, rankUp });
    }
  }
  await evaluateAchievements();
  if (!opts.isNew) await collectOrphanPhotos();
  return entry;
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
  await collectOrphanPhotos();
}

export async function deleteObsession(id: string): Promise<void> {
  await db.transaction('rw', db.obsessions, db.entries, async () => {
    await db.entries.where('obsessionId').equals(id).delete();
    await db.obsessions.delete(id);
  });
  await collectOrphanPhotos();
}
