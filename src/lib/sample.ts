import { evaluateAchievements } from './actions';
import { addDays, dayKey, parseDayKey } from './dates';
import { db } from './db';
import { computeXp } from './game';
import { uid } from './ids';
import type { Entry, Obsession } from './types';

const NOTES: Record<string, string[]> = {
  Music: [
    'Finished the hook. Bridge still needs work.',
    'Recorded 3 takes of verse 2. The third one was it.',
    'Mixing session. Vocals finally sit right in the beat.',
    'Wrote 16 bars on the train. Rough, but the flow is there.',
    'Studied the arrangement of a classic record for an hour. Stole two ideas.',
    'Beat from scratch. Drums hit different today.',
  ],
  Fitness: [
    'Push day. Bench felt heavy but it moved.',
    'Legs. Squat up 10 lbs. Walked out like a newborn deer.',
    '5 miles, negative splits.',
    'Pull day + core. Grip is getting stronger.',
    'Active recovery. Mobility and a long walk.',
    'Hit a PR on bench and screamed a little.',
  ],
};

const SAMPLE_PREFIX = 'sample-';

/** Fill the last few weeks with believable reps so every screen has something to show. */
export async function loadSampleData(): Promise<number> {
  let obsessions = await db.obsessions.filter((o) => !o.archived).toArray();
  if (obsessions.length === 0) {
    const make = (name: string, emoji: string, color: string, order: number, metrics: Obsession['metrics']): Obsession => ({
      id: uid(), name, emoji, color, why: '', dailyTargetMin: 60, metrics, createdAt: Date.now(), archived: false, order,
    });
    obsessions = [
      make('Music', '🎤', '#FF3347', 1, [{ id: uid(), name: 'Songs written', unit: 'songs', kind: 'count' }]),
      make('Fitness', '🏋️', '#FF7A1A', 2, [{ id: uid(), name: 'Bench press', unit: 'lbs' }]),
    ];
    await db.obsessions.bulkAdd(obsessions);
  }

  const today = dayKey();
  const entries: Entry[] = [];
  const running = new Map<string, number>();
  let streak = 0;
  for (let back = 26; back >= 1; back--) {
    const date = addDays(today, -back);
    if (back > 3 && Math.random() < 0.14) {
      streak = 0;
      continue;
    }
    streak++;
    obsessions.forEach((o, idx) => {
      if (idx > 0 && Math.random() < 0.35) return;
      const d = parseDayKey(date);
      d.setHours(idx === 0 ? 19 + Math.floor(Math.random() * 4) : 6 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
      const durationMin = [25, 30, 45, 45, 60, 60, 75, 90, 120][Math.floor(Math.random() * 9)];
      const intensity = 2 + Math.floor(Math.random() * 4);
      const pool = NOTES[o.name] ?? ['Put the work in. Small progress, still progress.', 'Rough start, strong finish.', 'Locked in for real today.'];
      const note = Math.random() < 0.6 ? pool[Math.floor(Math.random() * pool.length)] : '';
      const metrics = o.metrics.slice(0, 1).flatMap((m) => {
        if (Math.random() < 0.45) return [];
        if (m.kind === 'count') return [{ metricId: m.id, value: 1 + Math.floor(Math.random() * 3) }];
        const base = running.get(m.id) ?? 185;
        const next = base + (Math.random() < 0.5 ? 5 : 0);
        running.set(m.id, next);
        return [{ metricId: m.id, value: next }];
      });
      const xp = computeXp({ durationMin, photos: 0, hasNote: note.length >= 10, metrics: metrics.length, intensity, streakDays: streak }).total;
      entries.push({
        id: SAMPLE_PREFIX + uid(),
        obsessionId: o.id,
        createdAt: d.getTime(),
        date,
        durationMin,
        note,
        photoIds: [],
        metrics,
        intensity,
        xp,
        lockIn: Math.random() < 0.4,
      });
    });
  }
  await db.entries.bulkAdd(entries);
  await evaluateAchievements(false);
  return entries.length;
}

export async function removeSampleData(): Promise<number> {
  const keys = (await db.entries.toCollection().primaryKeys()).filter((k) => String(k).startsWith(SAMPLE_PREFIX));
  await db.entries.bulkDelete(keys);
  return keys.length;
}

export async function hasSampleData(): Promise<boolean> {
  return (await db.entries.filter((e) => e.id.startsWith(SAMPLE_PREFIX)).count()) > 0;
}
