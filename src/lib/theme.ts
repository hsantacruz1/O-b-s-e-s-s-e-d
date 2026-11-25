import { useSyncExternalStore } from 'react';

/** Day (marble) or Night (nero). "system" follows the phone. */
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'obsessed.theme';
const subs = new Set<() => void>();

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let current: ThemePref = read();

function isDark(pref: ThemePref): boolean {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

// Only remove a data-theme we set ourselves; a host page may set its own.
let owned = false;

/** Apply the preference to <html> and the browser chrome color. */
export function applyTheme(pref: ThemePref = current): void {
  const root = document.documentElement;
  if (pref === 'system') {
    if (owned) delete root.dataset.theme;
    owned = false;
  } else {
    root.dataset.theme = pref;
    owned = true;
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', isDark(pref) ? '#121211' : '#F3F2EF');
}

export function setTheme(pref: ThemePref): void {
  current = pref;
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable: applies for this visit only */
  }
  applyTheme(pref);
  subs.forEach((s) => s());
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current,
  );
}

window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());
