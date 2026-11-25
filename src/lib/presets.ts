import type { MetricDef } from './types';

/** Muted, mineral tones: each reads on marble and on night backgrounds. */
export const OBSESSION_COLORS = [
  '#A86B57', // clay
  '#A8894F', // brass
  '#7A8B6F', // sage
  '#4E5D45', // moss
  '#7E97A6', // mist
  '#4F6475', // slate
  '#6E6283', // dusk
  '#4A4845', // graphite
];

/** v1 used loud neon colors; existing obsessions are moved onto the new tones. */
export const LEGACY_COLORS: Record<string, string> = {
  '#FF3347': '#A86B57',
  '#FF7A1A': '#A8894F',
  '#F7C548': '#7E97A6',
  '#B8F23A': '#7A8B6F',
  '#2EE6C5': '#4E5D45',
  '#3AA8FF': '#4F6475',
  '#9B6BFF': '#6E6283',
  '#FF5FA2': '#4A4845',
};

export interface Preset {
  name: string;
  icon: string;
  color: string;
  target: number;
  metrics: Omit<MetricDef, 'id'>[];
  why: string;
}

export const PRESETS: Preset[] = [
  { name: 'Music', icon: 'mic', color: '#A86B57', target: 60, why: 'To make music that outlives me.', metrics: [{ kind: 'count', name: 'Songs written', unit: 'songs' }, { kind: 'count', name: 'Beats made', unit: 'beats' }] },
  { name: 'Fitness', icon: 'dumbbell', color: '#4F6475', target: 60, why: 'My body is the instrument. I am building it.', metrics: [{ name: 'Bench press', unit: 'lbs' }, { name: 'Squat', unit: 'lbs' }, { name: 'Body weight', unit: 'lbs' }] },
  { name: 'Business', icon: 'briefcase', color: '#A8894F', target: 90, why: 'To build something that is mine.', metrics: [{ kind: 'count', name: 'Revenue', unit: '$' }, { kind: 'count', name: 'Outreach', unit: 'msgs' }] },
  { name: 'Art', icon: 'palette', color: '#6E6283', target: 45, why: 'To show people what I see.', metrics: [{ kind: 'count', name: 'Pieces finished', unit: 'pieces' }] },
  { name: 'Writing', icon: 'feather', color: '#4A4845', target: 45, why: 'Words are how I leave a mark.', metrics: [{ kind: 'count', name: 'Words written', unit: 'words' }] },
  { name: 'Coding', icon: 'code', color: '#4E5D45', target: 90, why: 'To build the future, one commit at a time.', metrics: [{ kind: 'count', name: 'Commits', unit: 'commits' }] },
  { name: 'Basketball', icon: 'circle', color: '#A86B57', target: 60, why: 'Every shot in an empty gym counts.', metrics: [{ kind: 'count', name: 'Shots made', unit: 'shots' }, { name: 'Free throw %', unit: '%' }] },
  { name: 'Running', icon: 'footprints', color: '#7A8B6F', target: 30, why: 'Me against me, one mile at a time.', metrics: [{ kind: 'count', name: 'Distance', unit: 'mi' }, { name: 'Mile time', unit: 'min', lowerIsBetter: true }] },
  { name: 'Study', icon: 'book', color: '#7E97A6', target: 60, why: 'Knowledge compounds. I am investing.', metrics: [{ kind: 'count', name: 'Pages read', unit: 'pages' }] },
  { name: 'Language', icon: 'languages', color: '#4E5D45', target: 20, why: 'A new language is a new life.', metrics: [{ kind: 'count', name: 'New words', unit: 'words' }] },
  { name: 'Film', icon: 'film', color: '#A8894F', target: 60, why: 'To make people feel something.', metrics: [{ kind: 'count', name: 'Scenes shot', unit: 'scenes' }] },
  { name: 'Meditation', icon: 'flower', color: '#7A8B6F', target: 20, why: 'A quiet mind does its best work.', metrics: [] },
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

// Ids are kept from v1 so saved boards keep working; the looks are new.
export const BOARD_BACKGROUNDS: BoardBackground[] = [
  { id: 'bone', label: 'Marble', css: 'linear-gradient(160deg, #F5F4F1 0%, #E6E4DF 100%)', stops: [[0, '#F5F4F1'], [1, '#E6E4DF']], angle: 160, ink: '#1E1D1B' },
  { id: 'gold', label: 'Stone', css: '#D6D2CA', stops: [[0, '#D6D2CA']], angle: 180, ink: '#24221F' },
  { id: 'ember', label: 'Travertine', css: 'linear-gradient(180deg, #E8E0D4 0%, #D7CCBC 100%)', stops: [[0, '#E8E0D4'], [1, '#D7CCBC']], angle: 180, ink: '#2A2520' },
  { id: 'blush', label: 'Mist', css: 'linear-gradient(180deg, #ECEFF1 0%, #CDD6DC 100%)', stops: [[0, '#ECEFF1'], [1, '#CDD6DC']], angle: 180, ink: '#1F2529' },
  { id: 'sage', label: 'Sage', css: 'linear-gradient(180deg, #DDE2D6 0%, #C1CAB7 100%)', stops: [[0, '#DDE2D6'], [1, '#C1CAB7']], angle: 180, ink: '#232A20' },
  { id: 'blood', label: 'Dusk', css: 'linear-gradient(180deg, #2E333D 0%, #7A6E69 100%)', stops: [[0, '#2E333D'], [1, '#7A6E69']], angle: 180, ink: '#F1EEE8' },
  { id: 'midnight', label: 'Night', css: 'linear-gradient(180deg, #0F1216 0%, #262C35 100%)', stops: [[0, '#0F1216'], [1, '#262C35']], angle: 180, ink: '#E9E6E0' },
  { id: 'ink', label: 'Nero', css: '#161615', stops: [[0, '#161615']], angle: 180, ink: '#EDEBE6' },
];

export const BOARD_BG_MAP = new Map(BOARD_BACKGROUNDS.map((b) => [b.id, b]));

export const TEXT_COLORS = ['#1E1D1B', '#F4F3F0', '#8A857C', '#A8894F', '#4F6475', '#7A8B6F', '#A86B57'];

export const BOARD_TEMPLATES = ['The Vision', 'The Sound', 'The Body', '2027', 'Who I’m Becoming', 'The Life'];

export const VISION_WORDS = ['Devotion', 'Become', 'Mastery', 'Stillness', 'Discipline', 'Legacy', 'Step by step', 'The long game', 'Quiet confidence', 'Already mine', 'Obsessed', 'Grace under pressure'];
