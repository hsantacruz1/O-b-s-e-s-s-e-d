/** Tiny pub/sub for app-wide moments: toasts, XP pops, level-ups, unlocked badges. */
export type Moment =
  | { kind: 'toast'; text: string; tone?: 'default' | 'error' }
  | { kind: 'xp'; xp: number; lines: { label: string; xp: number }[]; prs: string[] }
  | { kind: 'levelup'; level: number; rank: string; rankUp: boolean }
  | { kind: 'achievement'; id: string };

type Listener = (m: Moment) => void;
const listeners = new Set<Listener>();

export function emit(m: Moment): void {
  listeners.forEach((l) => l(m));
}

export function onMoment(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const toast = (text: string, tone: 'default' | 'error' = 'default') => emit({ kind: 'toast', text, tone });
