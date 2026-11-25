import {
  Award,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  ChefHat,
  CircleDollarSign,
  CircleDot,
  Clapperboard,
  Code,
  Compass,
  Crown,
  Drum,
  Dumbbell,
  Feather,
  Flower2,
  Footprints,
  Gem,
  Globe,
  Guitar,
  Headphones,
  Heart,
  Hourglass,
  Landmark,
  Languages,
  Leaf,
  Medal,
  Mic,
  Moon,
  Mountain,
  Music,
  Palette,
  PenLine,
  PersonStanding,
  Piano,
  Sparkles,
  Sprout,
  Sun,
  Sunrise,
  Target,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { Obsession } from './types';

/** The line-icon set used for obsessions. Keys are stored in the database. */
export const ICONS: Record<string, LucideIcon> = {
  mic: Mic,
  music: Music,
  headphones: Headphones,
  piano: Piano,
  guitar: Guitar,
  drum: Drum,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  waves: Waves,
  mountain: Mountain,
  flower: Flower2,
  standing: PersonStanding,
  circle: CircleDot,
  briefcase: Briefcase,
  dollar: CircleDollarSign,
  code: Code,
  book: BookOpen,
  pen: PenLine,
  feather: Feather,
  palette: Palette,
  camera: Camera,
  film: Clapperboard,
  languages: Languages,
  brain: Brain,
  globe: Globe,
  chef: ChefHat,
  compass: Compass,
  target: Target,
  heart: Heart,
  leaf: Leaf,
  sprout: Sprout,
  sun: Sun,
  sunrise: Sunrise,
  moon: Moon,
  wind: Wind,
  hourglass: Hourglass,
  landmark: Landmark,
  gem: Gem,
  crown: Crown,
  medal: Medal,
  award: Award,
  sparkles: Sparkles,
};

export const ICON_KEYS = Object.keys(ICONS);

/** Earlier versions stored an emoji; map those onto the line icons. */
const FROM_EMOJI: Record<string, string> = {
  '🎤': 'mic', '🎧': 'headphones', '🎹': 'piano', '🎸': 'guitar', '🥁': 'drum', '🎙️': 'mic',
  '🏋️': 'dumbbell', '🏃': 'footprints', '🏀': 'circle', '⚽': 'circle', '🥊': 'target', '🧘': 'flower',
  '🚴': 'bike', '🏊': 'waves', '💼': 'briefcase', '💻': 'code', '📚': 'book', '✍️': 'pen', '🎨': 'palette',
  '📷': 'camera', '🎬': 'film', '🕺': 'standing', '🗣️': 'languages', '🧠': 'brain', '♟️': 'crown',
  '🍳': 'chef', '💰': 'dollar', '🔥': 'sunrise', '⚡': 'wind', '👑': 'crown', '🐍': 'leaf', '🦁': 'mountain',
};

export function iconKeyFor(o: Pick<Obsession, 'icon' | 'emoji'>): string {
  if (o.icon && ICONS[o.icon]) return o.icon;
  return (o.emoji && FROM_EMOJI[o.emoji]) || 'compass';
}

export function ObsessionIcon({ o, size = 20, strokeWidth = 1.4 }: { o: Pick<Obsession, 'icon' | 'emoji'> | undefined; size?: number; strokeWidth?: number }) {
  const Icon = o ? ICONS[iconKeyFor(o)] : Compass;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export function emojiToIcon(emoji: string | undefined): string {
  return (emoji && FROM_EMOJI[emoji]) || 'compass';
}
