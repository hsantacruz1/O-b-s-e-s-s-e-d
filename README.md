# OBSESSED.

**Become obsessed. Stay obsessed.**

Jordan, Kobe, MJ, Em: different crafts, same trait. They got obsessed. OBSESSED. is a phone app for getting that way about your own craft, whether that's music, fitness, business, or anything else, and then staying that way. Track the work, keep the receipts, chase the vision.

It's an installable web app (PWA). You add it to your home screen from the browser and it runs full screen and offline, like a native app, on iPhone and Android. No App Store, no account. Your data stays on your phone.

---

## What's inside

| | |
|---|---|
| **Today** | Your rank and XP, today's mantra, a progress ring for each obsession against its daily commitment, a streak warning if today isn't logged yet, the week at a glance, and your pinned vision board. |
| **Lock In** | Full-screen focus timer. Pick an obsession and a goal (25 min to 2 h, or open-ended) and go. The screen stays awake, and the timer keeps running if you close the app or lock your phone. When you finish, rate how locked in you were, add notes and photos, and it's logged. |
| **Log a rep** | Log any kind of work: a timed session, a note, progress photos, or numbers (bench press, songs written, words, miles). Each field is optional. |
| **The Tape** | Your history, grouped by day. Filter by obsession, or switch to a photo wall of every progress pic. |
| **Vision** | Mood board / vision board builder. Add photos, then drag, pinch to resize, and rotate. Add words in four fonts. One tap lays everything out as a **Collage**, **Grid** or **Polaroid scatter**, and tapping again shuffles it. **Export a full-resolution phone wallpaper** so you see it every time you pick up your phone. |
| **Progress** | Total hours, current and best streak, an 18-week heatmap ("the grind map"), hours per week, the **path to 10,000 hours** for each obsession, a trophy case, and the rank ladder. |
| **Obsession pages** | Your *why*, mastery milestones, a heatmap, and charts for every number you track. Personal records are marked, and counts like "songs written" show as running totals. |

### The game layer (small, on purpose)

- **XP** for every rep: 10 for showing up, 1 per minute worked, and bonuses for photos, reflections, numbers and full focus. Streaks add up to **+50%**.
- **Ranks** at set levels: Rookie → Grinder → Student of the Game → Craftsman → Pro → All-Star → MVP → Legend → **GOAT**. Reaching GOAT takes about a year of real daily work.
- **19 achievements**, including First Rep, On Fire (7-day streak), Possessed (30), 5AM Club, Night Shift, Locked In (a 60-minute session), Tunnel Vision (3 hours), New PR, Visionary, and Year of the Grind.
- **Mantras**: a new one every day in the house voice, plus a few from legends. Add your own and they come up twice as often.

---

## The brand

| | |
|---|---|
| **Name** | OBSESSED. (the red period is part of the mark) |
| **Tagline** | Become obsessed. Stay obsessed. |
| **Oath** | *I'm not interested. I'm obsessed.* You hold a button to commit to it during onboarding. |
| **Voice** | Short, direct, a little intense. A coach who believes in you and won't accept excuses. Sample lines: "Nobody's coming to save you. Lock in." "They'll call it talent. You'll know it was reps." |
| **Ink** `#0B0B0C` | The background: a gym at 5 AM, the studio at 2 AM. |
| **Bone** `#F4F1EA` | Warm white for type. |
| **Obsession Red** `#FF3347` | Action and intensity. |
| **Ember** `#FF7A1A` → **Trophy Gold** `#F7C548` | Streaks, XP and wins. |
| **Type** | **Anton** for poster-loud headlines and numbers, **Inter** for everything you read. |
| **Icon** | A thick gradient "O" (red to ember to gold) with a bone dot: the ring you close every day. |

---

## Put it on your phone

**Fastest:** open the hosted link (see *Deploy* below) on your phone, then:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Install app**

To try it right now without deploying, run it on your computer and open it from your phone over Wi-Fi:

```bash
npm install
npm run dev        # prints a Network URL like http://192.168.1.20:5173. Open it on your phone.
```

In-app, **Settings → Load sample data** fills in a few weeks of reps so you can see every screen populated. Remove it with one tap.

## Deploy (free, GitHub Pages)

1. In this repo: **Settings → Pages → Source: GitHub Actions**.
2. **Actions → Deploy to GitHub Pages → Run workflow** (it also runs on every push to `main`).
3. Your app goes live at `https://<your-username>.github.io/O-b-s-e-s-s-e-d/`.

## Develop

```bash
npm install
npm run dev         # local dev server
npm run build       # typecheck + production build into dist/
npm run preview     # serve the production build
npm run icons       # re-render PNG app icons from public/favicon.svg
```

**Stack:** React 19, TypeScript, Vite, Dexie (IndexedDB) for offline storage of entries and photos, vite-plugin-pwa (Workbox) for offline support and installability, and lucide icons. Charts are hand-built SVG, so there's no chart library.

```
src/
  lib/          data (db, types), game rules (XP, ranks, achievements), stats, board layout + export, router
  components/   sheets, charts, rings, entry cards, celebrations
  screens/      Today, Tape, Vision + BoardEditor, Progress, ObsessionDetail, LockIn, Settings, Onboarding
  styles/       the whole design system in one stylesheet
```

## Your data

Everything is stored locally on your device in IndexedDB. Photos are compressed when you add them. There's no server and no tracking. **Settings → Export backup** saves everything, photos included, to one file you can restore on any device.

## Roadmap ideas

- Native wrapper (Capacitor) for the App Store / Play Store, with **daily reminder notifications** ("Your streak ends in 3 hours")
- Optional cloud sync across devices
- Shareable "streak cards" for Instagram stories
- Weekly review: what you did, what improved, what's next
- Sessions linked to vision board goals
