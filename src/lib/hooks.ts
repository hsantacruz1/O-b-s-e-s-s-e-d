import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { DEFAULT_PROFILE, db, getProfile } from './db';
import { dayKey } from './dates';
import type { Board, Entry, Obsession, Profile, UnlockedAchievement } from './types';

const EMPTY: never[] = [];

export function useObsessions(includeArchived = false): Obsession[] {
  return (
    useLiveQuery(async () => {
      const all = await db.obsessions.orderBy('order').toArray();
      return includeArchived ? all : all.filter((o) => !o.archived);
    }, [includeArchived]) ?? EMPTY
  );
}

export function useObsession(id: string | undefined): Obsession | undefined | null {
  // null = loaded but missing
  return useLiveQuery(async () => (id ? (await db.obsessions.get(id)) ?? null : null), [id]);
}

export function useEntries(): Entry[] | undefined {
  return useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray(), []);
}

export function useProfile(): Profile | undefined {
  return useLiveQuery(getProfile, []);
}

export function useProfileOrDefault(): Profile {
  return useProfile() ?? DEFAULT_PROFILE;
}

export function useBoards(): Board[] | undefined {
  return useLiveQuery(() => db.boards.orderBy('updatedAt').reverse().toArray(), []);
}

export function useUnlocked(): UnlockedAchievement[] {
  return useLiveQuery(() => db.achievements.toArray(), []) ?? EMPTY;
}

/** Re-renders when the calendar day changes (e.g. app left open past midnight). */
export function useToday(): string {
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    const check = () => setToday(dayKey());
    const t = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

/** Ticks every `ms` while mounted. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
