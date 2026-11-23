import { useSyncExternalStore } from 'react';

/** Global UI state for sheets that can be opened from anywhere. */
export interface UIState {
  log: { open: boolean; obsessionId?: string; entryId?: string };
  entry: { id: string | null };
  obsessionForm: { open: boolean; id?: string };
  confirm: null | {
    title: string;
    body?: string;
    confirmLabel?: string;
    danger?: boolean;
    resolve: (ok: boolean) => void;
  };
}

let state: UIState = {
  log: { open: false },
  entry: { id: null },
  obsessionForm: { open: false },
  confirm: null,
};
const subs = new Set<() => void>();

function set(patch: Partial<UIState>) {
  state = { ...state, ...patch };
  subs.forEach((s) => s());
}

export function useUI(): UIState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
  );
}

export const ui = {
  openLog: (opts: { obsessionId?: string; entryId?: string } = {}) => set({ log: { open: true, ...opts } }),
  closeLog: () => set({ log: { open: false } }),
  openEntry: (id: string) => set({ entry: { id } }),
  closeEntry: () => set({ entry: { id: null } }),
  openObsessionForm: (id?: string) => set({ obsessionForm: { open: true, id } }),
  closeObsessionForm: () => set({ obsessionForm: { open: false } }),
  confirm: (opts: Omit<NonNullable<UIState['confirm']>, 'resolve'>): Promise<boolean> =>
    new Promise((resolve) =>
      set({
        confirm: {
          ...opts,
          resolve: (ok) => {
            set({ confirm: null });
            resolve(ok);
          },
        },
      }),
    ),
};
