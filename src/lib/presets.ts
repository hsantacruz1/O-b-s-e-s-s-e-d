import type { MetricDef } from './types';

export const OBSESSION_COLORS = [
  '#FF3347', // obsession red
  '#FF7A1A', // ember
  '#F7C548', // ring gold
  '#B8F23A', // volt
  '#2EE6C5', // mint
  '#3AA8FF', // electric blue
  '#9B6BFF', // violet
  '#FF5FA2', // hot pink
];

export interface Preset {
  name: string;
  emoji: string;
  color: string;
  target: number;
  metrics: Omit<MetricDef, 'id'>[];
  why: string;
}

export const PRESETS: Preset[] = [
  { name: 'Music', emoji: '🎤', color: '#FF3347', target: 60, why: 'I want to make music that outlives me.', metrics: [{ kind: 'count', name: 'Songs written', unit: 'songs' }, { kind: 'count', name: 'Beats made', unit: 'beats' }] },
  { name: 'Fitness', emoji: '🏋️', color: '#FF7A1A', target: 60, why: 'My body is the instrument. I’m building it.', metrics: [{ name: 'Bench press', unit: 'lbs' }, { name: 'Squat', unit: 'lbs' }, { name: 'Body weight', unit: 'lbs' }] },
  { name: 'Business', emoji: '💼', color: '#F7C548', target: 90, why: 'I’m building something that’s mine.', metrics: [{ kind: 'count', name: 'Revenue', unit: '$' }, { kind: 'count', name: 'Outreach', unit: 'msgs' }] },
  { name: 'Art', emoji: '🎨', color: '#FF5FA2', target: 45, why: 'I see things nobody else sees. Time to show them.', metrics: [{ kind: 'count', name: 'Pieces finished', unit: 'pieces' }] },
  { name: 'Writing', emoji: '✍️', color: '#9B6BFF', target: 45, why: 'Words are how I leave a mark.', metrics: [{ kind: 'count', name: 'Words written', unit: 'words' }] },
  { name: 'Coding', emoji: '💻', color: '#2EE6C5', target: 90, why: 'I build the future one commit at a time.', metrics: [{ kind: 'count', name: 'Commits', unit: 'commits' }] },
  { name: 'Basketball', emoji: '🏀', color: '#FF7A1A', target: 60, why: 'Every shot in an empty gym counts.', metrics: [{ kind: 'count', name: 'Shots made', unit: 'shots' }, { name: 'Free throw %', unit: '%' }] },
  { name: 'Running', emoji: '🏃', color: '#B8F23A', target: 30, why: 'Me versus me. Every single mile.', metrics: [{ kind: 'count', name: 'Distance', unit: 'mi' }, { name: 'Mile time', unit: 'min', lowerIsBetter: true }] },
  { name: 'Study', emoji: '📚', color: '#3AA8FF', target: 60, why: 'Knowledge compounds. I’m investing.', metrics: [{ kind: 'count', name: 'Pages read', unit: 'pages' }] },
  { name: 'Language', emoji: '🗣️', color: '#2EE6C5', target: 20, why: 'A new language is a new life.', metrics: [{ kind: 'count', name: 'New words', unit: 'words' }] },
  { name: 'Film', emoji: '🎬', color: '#F7C548', target: 60, why: 'I want to make people feel something.', metrics: [{ kind: 'count', name: 'Scenes shot', unit: 'scenes' }] },
  { name: 'Dance', emoji: '🕺', color: '#FF5FA2', target: 45, why: 'Rhythm is in me. Discipline will let it out.', metrics: [{ kind: 'count', name: 'Routines learned', unit: 'routines' }] },
];

export const EMOJI_CHOICES = [
  '🎤', '🎧', '🎹', '🎸', '🥁', '🎙️', '🏋️', '🏃', '🏀', '⚽', '🥊', '🧘', '🚴', '🏊',
  '💼', '💻', '📚', '✍️', '🎨', '📷', '🎬', '🕺', '🗣️', '🧠', '♟️', '🍳', '💰', '🔥', '⚡', '👑', '🐍', '🦁',
];

export interface BoardBackground {
  id: string;
  label: string;
  css: string;
  /** Stops for canvas export: [offset, color][]; a single stop means a flat color. */
  stops: [number, string][];
  angle: number; // degrees, CSS convention
  ink: string; // default text color on this background
}

export const BOARD_BACKGROUNDS: BoardBackground[] = [
  { id: 'ink', label: 'Ink', css: '#0B0B0C', stops: [[0, '#0B0B0C']], angle: 180, ink: '#F4F1EA' },
  { id: 'bone', label: 'Bone', css: '#EFEAE0', stops: [[0, '#EFEAE0']], angle: 180, ink: '#121212' },
  { id: 'blood', label: 'Blood', css: 'linear-gradient(180deg, #2A0006 0%, #0B0B0C 100%)', stops: [[0, '#2A0006'], [1, '#0B0B0C']], angle: 180, ink: '#F4F1EA' },
  { id: 'ember', label: 'Ember', css: 'linear-gradient(160deg, #FF3347 0%, #FF7A1A 55%, #F7C548 100%)', stops: [[0, '#FF3347'], [0.55, '#FF7A1A'], [1, '#F7C548']], angle: 160, ink: '#0B0B0C' },
  { id: 'gold', label: 'Trophy', css: 'linear-gradient(180deg, #1A1406 0%, #3D2E0A 100%)', stops: [[0, '#1A1406'], [1, '#3D2E0A']], angle: 180, ink: '#F7C548' },
  { id: 'midnight', label: 'Midnight', css: 'linear-gradient(180deg, #060B1F 0%, #1B1040 100%)', stops: [[0, '#060B1F'], [1, '#1B1040']], angle: 180, ink: '#F4F1EA' },
  { id: 'sage', label: 'Sage', css: 'linear-gradient(180deg, #DCE3D3 0%, #B9C4AE 100%)', stops: [[0, '#DCE3D3'], [1, '#B9C4AE']], angle: 180, ink: '#1A2016' },
  { id: 'blush', label: 'Blush', css: 'linear-gradient(180deg, #F7E1DC 0%, #E9B8B0 100%)', stops: [[0, '#F7E1DC'], [1, '#E9B8B0']], angle: 180, ink: '#3A1410' },
];

export const BOARD_BG_MAP = new Map(BOARD_BACKGROUNDS.map((b) => [b.id, b]));

export const TEXT_COLORS = ['#F4F1EA', '#0B0B0C', '#FF3347', '#F7C548', '#FF7A1A', '#2EE6C5', '#9B6BFF', '#FF5FA2'];

export const BOARD_TEMPLATES = ['Dream Life', 'The Sound', 'The Body', '2027 Vision', 'Mood', 'Who I’m Becoming'];

export const VISION_WORDS = ['OBSESSED', 'LOCKED IN', 'NO DAYS OFF', 'BECOMING', 'MAIN CHARACTER', 'DISCIPLINE', 'LEGACY', 'PLATINUM', 'STRONGER', 'SOLD OUT', 'GOAT', 'Trust the process', 'It’s already mine'];
