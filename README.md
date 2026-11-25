# OBSESSED.

**Become obsessed. Stay obsessed.**

Jordan, Kobe, MJ, Em: different crafts, same trait. They became obsessed. OBSESSED. is a phone app for becoming that way about your own craft, whether music, fitness, business or anything else, and then staying that way. It is a quiet place to practice: record the work, keep a journal, and hold the vision in front of you.

It's an installable web app (PWA). You add it to your home screen from the browser and it runs full screen and offline, like a native app, on iPhone and Android. No App Store, no account. Your data stays on your phone.

---

## What's inside

| | |
|---|---|
| **Today** | The date and a greeting, your level, today's mantra, a thin progress ring for each obsession against its daily commitment, a gentle note when your streak continues with one session today, the week at a glance, and your pinned vision board. |
| **Focus** | A full-screen session over a quiet mountain horizon. A soft circle breathes behind the timer: four and a half seconds in, four and a half out. Pick an obsession and a duration (25 minutes to 2 hours, or open) and begin. The screen stays awake, and the timer keeps running if you close the app or lock your phone. When you finish, rate your depth of focus, write a reflection, add photographs, and it's recorded. |
| **New entry** | Record any kind of work: a timed session, a reflection, photographs, or measurements (bench press, songs written, words, miles). Each field is optional. |
| **Journal** | Your history, grouped by day and set like a printed journal. Filter by obsession, or switch to a wall of every photograph. |
| **Vision** | Mood board and vision board builder. Add images, then drag, pinch to resize, and rotate. Add words in four styles (Classic, Italic, Gallery, Light). One tap arranges everything as a **Mosaic**, **Gallery** grid or scattered **Prints**, and tapping again offers a new arrangement. **Export a full-resolution phone wallpaper** so you see it every time you reach for your phone. |
| **The Ascent** | Your level shown as a marble staircase, one step per rank, with a point marking where you stand. Total hours, current and longest streak, an 18-week practice calendar, hours per week, the **path to ten thousand hours** for each obsession, milestones, and the ranks. |
| **Obsession pages** | Your *why*, mastery milestones, a practice calendar, and charts for everything you measure. Personal bests are marked, and counts like "songs written" show as running totals. |

### The quiet game layer

- **Experience** for every session: 10 for presence, 1 per minute of practice, and a little more for photographs, reflections, measurements and deep focus. Consistency adds up to **+50%**.
- **Ranks**, climbed like stairs: Initiate → Apprentice → Student → Practitioner → Artisan → Adept → Master → Virtuoso → **Legend**. Reaching Legend takes about a year of real daily work.
- **19 milestones**, drawn as thin medallions in bronze, silver and gold: First Step, One Week, Devotion (30 days), Unbroken (100 days), First Light, Night Watch, Deep Work, The Long Session, Personal Best, The Visionary, A Year of Practice, and more.
- **Mantras**: a new one every day in the house voice, plus a few from legends. Add your own and they come up twice as often.

---

## The design

The feeling to aim for: a deep breath on a mountain, climbing a marble staircase step by step, a quiet modern room with almost nothing in it.

| | |
|---|---|
| **Name** | OBSESSED, set in widely spaced serif capitals. |
| **Tagline** | Become obsessed. Stay obsessed. |
| **Oath** | *I'm not interested. I'm obsessed.* You press and hold a thin circle, one long inhale, to commit to it during onboarding. |
| **Voice** | Calm, certain, unhurried. A mentor rather than a hype man. Sample lines: "One step, then the next. The staircase takes care of itself." "Mastery is a quiet conversation, repeated every day." |
| **Marble** `#F3F2EF` / **Nero** `#121211` | Day and night grounds. The app follows your phone's light or dark setting, or you can choose in Settings. |
| **Ink** `#1C1B19` | Charcoal type and primary buttons. |
| **Stone** `#858079` | Secondary text and hairlines. |
| **Brass** `#8C7650` | The single accent: progress, the current step, a new milestone. |
| **Obsession tones** | Muted mineral colors: clay, brass, sage, moss, mist, slate, dusk, graphite. |
| **Type** | **Cormorant Garamond** for headlines, numbers and reflections. **Jost** for labels, set small with wide tracking. |
| **Structure** | Hairline rules in place of boxes, generous space, line icons and no emoji, slow fades and no bounce. |
| **Icon** | A thin ring holding three ascending steps that lead to a point of brass. |

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

On the first screen, **Just looking? Explore with sample data** (or later, **Settings → Load sample data**) fills in a few weeks of sessions so you can see every screen populated. Remove it with one tap in Settings.

## Android app (APK)

The same app, wrapped as a real Android app with [Capacitor](https://capacitorjs.com): its own icon in the app drawer, its files built in, the screen kept awake during Focus, and saving or sharing through Android's share sheet.

**Install:** on your phone, open **https://github.com/hsantacruz1/O-b-s-e-s-s-e-d/releases/latest/download/obsessed.apk**, then open the downloaded file and allow your browser to install apps when Android asks. To update, install the newer APK the same way; your data stays.

**Build a new APK:** Actions → **Build Android app** → Run workflow. It publishes a new release with `obsessed.apk`.

**One-time setup (already done if releases exist):** the build signs the app with a private key kept in the repository secret `ANDROID_KEYSTORE_BASE64` (Settings → Secrets and variables → Actions). Keep a copy of that key somewhere safe. Every update must be signed with the same key, or Android will refuse to install it over the existing app.

The Android app keeps its own data, separate from the web version. Use Settings → Export backup in one and Restore from backup in the other to move your history.

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
npm run icons       # re-render the web and Android icons from public/favicon.svg
npx cap sync android  # copy the web build into the Android project (CI does this)
```

**Stack:** React 19, TypeScript, Vite, Dexie (IndexedDB) for offline storage of entries and photos, vite-plugin-pwa (Workbox) for offline support and installability, Capacitor for the Android app, and lucide icons. Charts are hand-built SVG, so there's no chart library.

```
src/
  lib/          data (db, types), game rules (experience, ranks, milestones), stats, board layout + export, theme, icons, router
  components/   sheets, charts, rings, entry cards, celebrations
  screens/      Today, Journal, Vision + BoardEditor, Progress, ObsessionDetail, Focus, Settings, Onboarding
  styles/       the whole design system in one stylesheet (Marble and Nero themes)
```

## Your data

Everything is stored locally on your device in IndexedDB. Photos are compressed when you add them. There's no server and no tracking. **Settings → Export backup** saves everything, photos included, to one file you can restore on any device.

## Roadmap ideas

- Native wrapper (Capacitor) for the App Store / Play Store, with **daily reminder notifications** ("A quiet hour for music, whenever you are ready")
- Optional cloud sync across devices
- Shareable streak cards for Instagram stories, in the same editorial style
- Weekly review: what you did, what improved, what's next
- Sessions linked to vision board goals
