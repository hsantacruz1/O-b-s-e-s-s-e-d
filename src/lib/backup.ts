import { db } from './db';
import type { Board, Entry, KV, Obsession, Photo, UnlockedAchievement } from './types';

interface BackupPhoto {
  id: string;
  width: number;
  height: number;
  createdAt: number;
  full: string; // data URL
  thumb: string;
}

interface Backup {
  app: 'obsessed';
  version: 1;
  exportedAt: number;
  obsessions: Obsession[];
  entries: Entry[];
  boards: Board[];
  achievements: UnlockedAchievement[];
  kv: KV[];
  photos: BackupPhoto[];
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob();

export async function exportBackup(): Promise<File> {
  const [obsessions, entries, boards, achievements, kv, photos] = await Promise.all([
    db.obsessions.toArray(),
    db.entries.toArray(),
    db.boards.toArray(),
    db.achievements.toArray(),
    db.kv.toArray(),
    db.photos.toArray(),
  ]);
  const packed: BackupPhoto[] = [];
  for (const p of photos) {
    packed.push({ id: p.id, width: p.width, height: p.height, createdAt: p.createdAt, full: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) });
  }
  const data: Backup = { app: 'obsessed', version: 1, exportedAt: Date.now(), obsessions, entries, boards, achievements, kv, photos: packed };
  const stamp = new Date().toISOString().slice(0, 10);
  return new File([JSON.stringify(data)], `obsessed-backup-${stamp}.json`, { type: 'application/json' });
}

export async function importBackup(file: File): Promise<{ entries: number; photos: number }> {
  const data = JSON.parse(await file.text()) as Backup;
  if (data.app !== 'obsessed' || !Array.isArray(data.entries)) throw new Error('That file isn’t an OBSESSED backup.');
  const photos: Photo[] = [];
  for (const p of data.photos ?? []) {
    photos.push({ id: p.id, width: p.width, height: p.height, createdAt: p.createdAt, blob: await dataUrlToBlob(p.full), thumb: await dataUrlToBlob(p.thumb) });
  }
  await db.transaction('rw', [db.obsessions, db.entries, db.boards, db.achievements, db.kv, db.photos], async () => {
    await Promise.all([db.obsessions.clear(), db.entries.clear(), db.boards.clear(), db.achievements.clear(), db.kv.clear(), db.photos.clear()]);
    await db.obsessions.bulkPut(data.obsessions ?? []);
    await db.entries.bulkPut(data.entries);
    await db.boards.bulkPut(data.boards ?? []);
    await db.achievements.bulkPut(data.achievements ?? []);
    await db.kv.bulkPut(data.kv ?? []);
    await db.photos.bulkPut(photos);
  });
  return { entries: data.entries.length, photos: photos.length };
}

export async function wipeEverything(): Promise<void> {
  await db.delete();
  try {
    localStorage.removeItem('obsessed.lockin');
  } catch {
    /* ignore */
  }
}

export async function storageEstimate(): Promise<string | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.usage) return null;
    const mb = est.usage / (1024 * 1024);
    return mb < 1 ? `${Math.round(est.usage / 1024)} KB` : `${mb.toFixed(1)} MB`;
  } catch {
    return null;
  }
}
