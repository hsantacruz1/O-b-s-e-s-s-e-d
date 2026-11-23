import { useSyncExternalStore } from 'react';

/** A running Lock In session. Stored as timestamps so it survives the app being closed. */
export interface LockInSession {
  obsessionId: string;
  startedAt: number;
  pausedMs: number; // total paused time so far
  pausedAt: number | null; // set while paused
  goalMin: number; // 0 = open-ended
  goalCelebrated?: boolean;
}

const KEY = 'obsessed.lockin';
const subs = new Set<() => void>();
let cache: LockInSession | null | undefined;

function read(): LockInSession | null {
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as LockInSession) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function write(s: LockInSession | null) {
  cache = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: session lives in memory only */
  }
  subs.forEach((cb) => cb());
}

export function useLockIn(): LockInSession | null {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    read,
  );
}

export function elapsedSeconds(s: LockInSession, now = Date.now()): number {
  const pausedNow = s.pausedAt ? now - s.pausedAt : 0;
  return Math.max(0, (now - s.startedAt - s.pausedMs - pausedNow) / 1000);
}

export const lockIn = {
  start(obsessionId: string, goalMin: number) {
    write({ obsessionId, startedAt: Date.now(), pausedMs: 0, pausedAt: null, goalMin });
  },
  pause() {
    const s = read();
    if (s && !s.pausedAt) write({ ...s, pausedAt: Date.now() });
  },
  resume() {
    const s = read();
    if (s?.pausedAt) write({ ...s, pausedMs: s.pausedMs + (Date.now() - s.pausedAt), pausedAt: null });
  },
  markGoalCelebrated() {
    const s = read();
    if (s) write({ ...s, goalCelebrated: true });
  },
  clear() {
    write(null);
  },
  get: read,
};
