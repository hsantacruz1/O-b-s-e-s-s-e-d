import { useEffect, useState } from 'react';
import { db } from './db';
import { uid } from './ids';
import type { Photo } from './types';

async function loadBitmap(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall through to <img> (e.g. HEIC on some browsers) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, quality),
  );
}

async function resize(src: { source: CanvasImageSource; width: number; height: number }, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.source, 0, 0, w, h);
  return { blob: await toBlob(canvas, 'image/jpeg', quality), width: w, height: h };
}

/** Compress a picked file and store it. Returns the stored photo id. */
export async function savePhoto(file: Blob): Promise<string> {
  const bmp = await loadBitmap(file);
  try {
    const full = await resize(bmp, 1800, 0.86);
    const thumb = await resize(bmp, 480, 0.8);
    const photo: Photo = { id: uid(), blob: full.blob, thumb: thumb.blob, width: full.width, height: full.height, createdAt: Date.now() };
    await db.photos.add(photo);
    return photo.id;
  } finally {
    bmp.close();
  }
}

export async function savePhotos(files: FileList | File[]): Promise<string[]> {
  const ids: string[] = [];
  for (const f of Array.from(files)) {
    try {
      ids.push(await savePhoto(f));
    } catch (err) {
      console.warn('Skipped a photo that could not be read', err);
    }
  }
  return ids;
}

// Small cache so the same photo isn't turned into many object URLs.
const urlCache = new Map<string, { url: string; refs: number }>();

function acquire(key: string, blob: Blob): string {
  const hit = urlCache.get(key);
  if (hit) {
    hit.refs++;
    return hit.url;
  }
  const url = URL.createObjectURL(blob);
  urlCache.set(key, { url, refs: 1 });
  return url;
}

function release(key: string) {
  const hit = urlCache.get(key);
  if (!hit) return;
  hit.refs--;
  if (hit.refs <= 0) {
    // Delay so quick re-mounts (list re-renders) reuse the URL.
    setTimeout(() => {
      const again = urlCache.get(key);
      if (again && again.refs <= 0) {
        URL.revokeObjectURL(again.url);
        urlCache.delete(key);
      }
    }, 4000);
  }
}

export function usePhotoUrl(photoId: string | undefined, size: 'thumb' | 'full' = 'full'): string | null {
  const [url, setUrl] = useState<string | null>(() => (photoId ? urlCache.get(`${photoId}:${size}`)?.url ?? null : null));
  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }
    const key = `${photoId}:${size}`;
    let cancelled = false;
    let acquired = false;
    db.photos.get(photoId).then((p) => {
      if (cancelled || !p) return;
      setUrl(acquire(key, size === 'thumb' ? p.thumb : p.blob));
      acquired = true;
    });
    return () => {
      cancelled = true;
      if (acquired) release(key);
    };
  }, [photoId, size]);
  return url;
}

export async function loadPhotoImage(photoId: string): Promise<HTMLImageElement | null> {
  const p = await db.photos.get(photoId);
  if (!p) return null;
  const url = URL.createObjectURL(p.blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    // Safe to revoke after decode; the decoded image stays drawable.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Delete photos that no entry or board references any more. */
export async function collectOrphanPhotos(): Promise<number> {
  const used = new Set<string>();
  await db.entries.each((e) => e.photoIds.forEach((id) => used.add(id)));
  await db.boards.each((b) => b.items.forEach((i) => i.type === 'image' && used.add(i.photoId)));
  const orphans = (await db.photos.toCollection().primaryKeys()).filter((id) => !used.has(id));
  if (orphans.length) await db.photos.bulkDelete(orphans);
  return orphans.length;
}
