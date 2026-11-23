export interface MetricDef {
  id: string;
  name: string; // e.g. "Bench press", "Songs finished", "BPM"
  unit: string; // e.g. "lbs", "songs", "bpm"
  lowerIsBetter?: boolean; // e.g. mile time
  /** 'count' values add up over time (songs written, pages read); 'measure' values are readings (bench press, body weight). */
  kind?: 'count' | 'measure';
}

export interface Obsession {
  id: string;
  name: string;
  emoji: string;
  color: string;
  why: string;
  dailyTargetMin: number; // 0 = no daily target
  metrics: MetricDef[];
  createdAt: number;
  archived: boolean;
  order: number;
}

export interface MetricValue {
  metricId: string;
  value: number;
}

/** A "rep": one logged piece of work. Every field beyond the basics is optional. */
export interface Entry {
  id: string;
  obsessionId: string;
  createdAt: number; // ms timestamp of when the work happened
  date: string; // local YYYY-MM-DD, for fast day lookups
  durationMin: number; // 0 if not a timed session
  note: string;
  photoIds: string[];
  metrics: MetricValue[];
  intensity: number; // 0 (unset) or 1–5 "how locked in"
  xp: number;
  lockIn?: boolean; // logged through Lock In mode
}

export interface Photo {
  id: string;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
  createdAt: number;
}

export type BoardAspect = '9:19.5' | '4:5' | '1:1';

export interface BoardImageItem {
  id: string;
  type: 'image';
  photoId: string;
  x: number; // all geometry is relative to board width (0–1), y included
  y: number;
  w: number;
  h: number;
  r: number; // degrees
  z: number;
  frame?: 'none' | 'polaroid';
}

export type TextStyle = 'display' | 'serif' | 'script' | 'sans';

export interface BoardTextItem {
  id: string;
  type: 'text';
  text: string;
  style: TextStyle;
  color: string;
  bg: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number; // font size relative to board width
  r: number;
  z: number;
}

export type BoardItem = BoardImageItem | BoardTextItem;

export interface Board {
  id: string;
  title: string;
  aspect: BoardAspect;
  background: string; // id from BOARD_BACKGROUNDS
  items: BoardItem[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface Profile {
  name: string;
  onboardedAt: number | null;
  customMantras: string[];
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

export interface KV {
  key: string;
  value: unknown;
}
