export interface Mantra {
  text: string;
  by?: string;
}

/** House mantras: the voice of OBSESSED. Calm, certain, unhurried. */
const HOUSE: Mantra[] = [
  { text: 'Obsession is love that refuses to clock out.' },
  { text: 'One step, then the next. The staircase takes care of itself.' },
  { text: 'Mastery is a quiet conversation, repeated every day.' },
  { text: 'Do the work slowly enough to do it well.' },
  { text: 'Devotion is attention that never leaves.' },
  { text: 'Greatness is a pile of ordinary days you refused to skip.' },
  { text: 'Fall in love with the unglamorous parts.' },
  { text: 'Be where your hands are.' },
  { text: 'The summit is built from steps no one sees.' },
  { text: 'Breathe in. Begin again.' },
  { text: 'What you repeat, you become.' },
  { text: 'Talent gets you noticed. Devotion gets you remembered.' },
  { text: 'Stay with the work until the work begins to speak.' },
  { text: 'Quiet work. Lasting results.' },
  { text: 'Your craft deserves your best hour, not your leftover one.' },
  { text: 'Motivation visits. Obsession stays.' },
  { text: 'The obsessed don’t have off days. They have slow days.' },
  { text: 'Return to the work the way you return to your breath.' },
  { text: 'Patience is a form of ambition.' },
  { text: 'Every master was once a beginner who kept going.' },
  { text: 'Build the thing they will study.' },
  { text: 'Hype fades. Habits compound.' },
  { text: 'You are not behind. You are simply not done.' },
  { text: 'Choose the long way. It is where the craft lives.' },
  { text: 'Be the calmest, hardest-working person in the room.' },
  { text: 'Discipline is a gift you give your future self.' },
  { text: 'Climb slowly. Arrive completely.' },
  { text: 'Excellence is a habit practiced in silence.' },
  { text: 'Small steps, taken daily, become something no one can explain.' },
  { text: 'Let the work be your meditation.' },
];

/** A few words from people who lived it. */
const LEGENDS: Mantra[] = [
  { text: 'Rest at the end, not in the middle.', by: 'Kobe Bryant' },
  { text: 'Everything negative — pressure, challenges — is all an opportunity for me to rise.', by: 'Kobe Bryant' },
  { text: 'I’ve failed over and over and over again in my life. And that is why I succeed.', by: 'Michael Jordan' },
  { text: 'Don’t quit. Suffer now and live the rest of your life as a champion.', by: 'Muhammad Ali' },
  { text: 'Be so good they can’t ignore you.', by: 'Steve Martin' },
  { text: 'Amateurs sit and wait for inspiration. The rest of us just get up and go to work.', by: 'Stephen King' },
  { text: 'Hard work beats talent when talent doesn’t work hard.', by: 'Tim Notke' },
];

export const ALL_MANTRAS: Mantra[] = [...HOUSE, ...LEGENDS];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same mantra all day; your own mantras are mixed in at double weight. */
export function mantraForDay(day: string, custom: string[] = [], offset = 0): Mantra {
  const mine = custom.filter(Boolean).map((text) => ({ text, by: 'You' }));
  const pool = [...ALL_MANTRAS, ...mine, ...mine];
  return pool[(hash(day) + offset) % pool.length];
}

export const OATH = 'I’m not interested. I’m obsessed.';
