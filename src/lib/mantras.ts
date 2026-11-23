export interface Mantra {
  text: string;
  by?: string;
}

/** House mantras: the voice of OBSESSED. */
const HOUSE: Mantra[] = [
  { text: 'Obsession is just love that refuses to clock out.' },
  { text: 'They’ll call it talent. You’ll know it was reps.' },
  { text: 'Nobody’s coming to save you. Lock in.' },
  { text: 'The work doesn’t care how you feel. Do it anyway.' },
  { text: 'Fall in love with the boring parts.' },
  { text: 'Be the hardest worker in the room, even when the room is empty.' },
  { text: 'Average is a choice. So is greatness.' },
  { text: 'Motivation leaves. Obsession stays.' },
  { text: 'Your future self is watching. Give them something to thank you for.' },
  { text: 'One more rep. One more take. One more page.' },
  { text: 'Outwork your excuses.' },
  { text: 'Greatness is a pile of ordinary days you refused to skip.' },
  { text: 'The obsessed don’t have off days. They have slow days.' },
  { text: 'You don’t find time. You take it.' },
  { text: 'Every legend was once a beginner who didn’t quit.' },
  { text: 'Quiet work. Loud results.' },
  { text: 'Don’t wish for it. Rehearse it.' },
  { text: 'Comfort is the enemy of the craft.' },
  { text: 'Win the morning. Then win it again tomorrow.' },
  { text: 'Make it so good they have to replay it.' },
  { text: 'Your competition is who you were yesterday.' },
  { text: 'Eat. Sleep. Craft. Repeat.' },
  { text: 'Small reps, stacked daily, become something nobody can explain.' },
  { text: 'Talent gets you noticed. Obsession gets you remembered.' },
  { text: 'Show up ugly. Show up tired. Just show up.' },
  { text: 'The scoreboard always tells the truth eventually.' },
  { text: 'Stay hungry after you eat.' },
  { text: 'Do it for the version of you that’s on the poster.' },
  { text: 'Locked in is a lifestyle, not a mood.' },
  { text: 'Feelings are visitors. Habits live here.' },
  { text: 'Chase the work and the results start chasing you.' },
  { text: 'Somewhere, someone with half your talent is outworking you. Fix that.' },
  { text: 'Your craft deserves your best hour, not your leftover one.' },
  { text: 'Build the thing they’ll study.' },
  { text: 'Hype fades. Habits compound.' },
  { text: 'You’re not behind. You’re just not done.' },
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
