import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Minimal hash router (works on any static host, including GitHub Pages)
 * plus a back-button stack so the phone's back gesture closes sheets first.
 */

type Sub = () => void;
const subs = new Set<Sub>();

function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

function notify() {
  subs.forEach((s) => s());
}

window.addEventListener('hashchange', notify);

export function useRoute(): { path: string; parts: string[]; query: URLSearchParams } {
  const full = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    currentPath,
  );
  const [path, qs = ''] = full.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

interface Overlay {
  id: number;
  close: () => void;
}
const overlays: Overlay[] = [];
let seq = 0;
let ignorePops = 0;

window.addEventListener('popstate', () => {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  overlays.pop()?.close();
});

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  if (overlays.length) {
    // Leaving the screen from inside a sheet: drop the sheets without rewinding history.
    overlays.length = 0;
    history.replaceState(null, '', `#${path}`);
    notify();
    return;
  }
  if (opts.replace) {
    history.replaceState(null, '', `#${path}`);
    notify();
  } else if (currentPath() !== path) {
    window.location.hash = path;
  }
}

export function goBack(fallback = '/'): void {
  if (history.length > 1) history.back();
  else navigate(fallback, { replace: true });
}

/** While `open`, the system back button/gesture calls `close` instead of leaving the screen. */
export function useBackToClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const item: Overlay = { id: ++seq, close: () => closeRef.current() };
    overlays.push(item);
    history.pushState({ overlay: item.id }, '');
    return () => {
      const idx = overlays.indexOf(item);
      if (idx !== -1) {
        overlays.splice(idx, 1);
        ignorePops++;
        history.back();
      }
    };
  }, [open]);
}
