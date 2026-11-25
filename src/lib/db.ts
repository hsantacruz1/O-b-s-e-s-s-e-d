import Dexie, { type EntityTable } from 'dexie';
import { emojiToIcon } from './icons';
import { LEGACY_COLORS } from './presets';
import type { Board, Entry, KV, Obsession, Photo, Profile, UnlockedAchievement } from './types';

export class ObsessedDB extends Dexie {
  obsessions!: EntityTable<Obsession, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  boards!: EntityTable<Board, 'id'>;
  achievements!: EntityTable<UnlockedAchievement, 'id'>;
  kv!: EntityTable<KV, 'key'>;

  constructor() {
    super('obsessed');
    this.version(1).stores({
      obsessions: 'id, order, archived',
      entries: 'id, obsessionId, date, createdAt, [obsessionId+date]',
      photos: 'id, createdAt',
      boards: 'id, updatedAt',
      achievements: 'id',
      kv: 'key',
    });
    // v2: the calmer redesign. Emoji become line icons and vivid colors become muted tones.
    this.version(2).stores({}).upgrade(async (tx) => {
      await tx.table('obsessions').toCollection().modify((o: Obsession) => {
        if (!o.icon) o.icon = emojiToIcon(o.emoji);
        o.color = LEGACY_COLORS[o.color.toUpperCase()] ?? o.color;
      });
    });
  }
}

export const db = new ObsessedDB();

export const DEFAULT_PROFILE: Profile = { name: '', onboardedAt: null, customMantras: [] };

export async function getProfile(): Promise<Profile> {
  const row = await db.kv.get('profile');
  return { ...DEFAULT_PROFILE, ...((row?.value as Partial<Profile>) ?? {}) };
}

export async function saveProfile(patch: Partial<Profile>): Promise<void> {
  const current = await getProfile();
  await db.kv.put({ key: 'profile', value: { ...current, ...patch } });
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* not supported — fine */
  }
}
