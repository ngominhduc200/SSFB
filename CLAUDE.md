# SSFB Microsite — Developer Notes

## Project overview

Next.js 14 App Router microsite for the Strange Sounds From Beyond festival.
Two parallel feature tracks were developed and merged — read this before pulling or merging.

---

## Data model — read this first

### `ssfb-microsite/data/artists.ts`

The single source of truth for all artist data is the **`artists`** array. It contains all 48 artists across both days and all 3 stages.

**Time format is `'SAT HH:MM–HH:MM'` or `'SUN HH:MM–HH:MM'` (24-hour, with day prefix and em dash range).**
Do not change this format — the stage page cards, Three.js textures, and schedule page parser all depend on it.

The file also exports:
- `saturdayArtists` — derived filter (`time.startsWith('SAT')`) for the schedule page
- `sundayArtists` — derived filter (`time.startsWith('SUN')`) for the schedule page
- `tracks` — audio track metadata; `artistId` values must match IDs in `artists`

**If you add new artists**, add them to `artists` only. The Saturday/Sunday splits derive automatically.

**If you change an artist `id`**, you must also update:
- Any matching entry in `tracks` (`artistId` field)
- `PLAYABLE_IDS` and `ARTIST_AUDIO` in `app/schedule/page.tsx`
- Any URL that routes to `/stage/[stageId]/[artistId]`

### `ssfb-microsite/data/stages.ts`

Stage labels use the **full venue name** (`'THE REST IS NOISE'`, `'RED LIGHT RADIO'`, `'TENT'`), not abbreviated labels like `'STAGE A'`. Keep it this way — the stage page hero and NavStrip both display this.

`liveArtist` is **not** on the stage object. The LIVE NOW banner is derived from `artist.isLive` at runtime in `app/stage/[stageId]/page.tsx`. To mark an artist as currently live, set `isLive: true` on their entry in `artists`.

---

## Pages

### `/` — Splash screen (`app/page.tsx`)
Dark splash with festival name and ENTER → button linking to `/home`.

### `/home` — Home (`app/home/page.tsx`)
Main navigation hub added by teammate. Nav component SSFB link points here.

### `/stage/[stageId]` — Stage page (`app/stage/[stageId]/page.tsx`)
Three.js card grid of all artists for that stage. Cards fade in staggered on load and fade out on navigate. Stage name fades out on first scroll (DOM ref, not React state — avoids scroll interruption).

### `/stage/[stageId]/[artistId]` — Setlist page (`app/stage/[stageId]/[artistId]/page.tsx`)
Vinyl disc UI with rotating wheel, audio player, EQ knobs, tempo slider, sound filters. Artist photo appears in an arch cutout at the top of the disc. Prev/next artist navigation stops the current track.

**This page was rewritten by a teammate using a `WhipMixer` component — that version was intentionally reverted in favour of the vinyl disc implementation.** If you pull a commit that restores `WhipMixer`, you will need to revert `app/stage/[stageId]/[artistId]/page.tsx` back to the vinyl disc version manually.

### `/schedule` — Schedule (`app/schedule/page.tsx`)
Horizontal scrollable timeline. Artist positions are computed with `timeToPercent(artist.time)` which parses our `'SAT HH:MM–HH:MM'` format. The waveform animation at the 18:00 LIVE marker is driven by Web Audio analyser data when a playable artist is clicked.

**Playable artists** (click-to-play on schedule): `nihiloxica`, `vladimir-ivkovic-1`, `alessandro-adriani-the-hacker`. Audio files are in `/public/audio/` with capitalised names (`Nihiloxica.mp3`, `Vladimir.mp3`, `Alessandro.mp3`).

---

## Components

| Component | Purpose |
|---|---|
| `StageScene` | Three.js card grid — used only on the stage page |
| `GrainOverlay` | Animated canvas grain on top of every page (rendered in `layout.tsx`) |
| `AmbientPlayer` | Background ambient audio that ducks when track plays |
| `NavStrip` | Bottom stage/artist navigation strip on stage + setlist pages |
| `Nav` | Top nav (SSFB → `/home`, MAP → `/explore`, SCHEDULE → `/schedule`) |
| `HomeScene` | Home page scene |
| `ArtistCard` | **Not currently rendered anywhere** — was replaced by Three.js canvas cards |

---

## Merge history & known conflicts resolved

A merge was performed on 2026-06-16 between two parallel feature branches. Conflicts and their resolutions:

| File | Conflict | Resolution |
|---|---|---|
| `data/artists.ts` | Teammate split into `saturdayArtists`/`sundayArtists` with empty `coverImage`/`bio` | Kept our full data; added derived exports for their schedule page |
| `data/stages.ts` | Teammate used `'STAGE A'`/`'STAGE B'` labels, removed `liveArtist` | Kept our full stage name labels; removed `liveArtist` (derived from `artist.isLive` instead) |
| `app/stage/[stageId]/[artistId]/page.tsx` | Teammate replaced with `WhipMixer` component | Reverted to vinyl disc implementation |
| `app/page.tsx` | Different landing page designs | Took teammate's splash screen (`/` → ENTER → `/home`) |
| `components/Nav/Nav.tsx` | Different styling and SSFB link target | Kept our inline styles + click sounds; updated SSFB link to `/home` |
| `app/globals.css` | Different utility additions | Kept both: teammate's `.no-scrollbar` + our `@keyframes card-appear` |
| `app/schedule/page.tsx` | `timeToPercent` / `to24h` only parsed `'1:00PM'` format | Updated parsers to handle our `'SAT HH:MM–HH:MM'` format |

---

## Audio files

| File | Path | Used by |
|---|---|---|
| `Nihiloxica.mp3` | `/public/audio/Nihiloxica.mp3` | Schedule click-to-play |
| `Vladimir.mp3` | `/public/audio/Vladimir.mp3` | Schedule click-to-play |
| `Alessandro.mp3` | `/public/audio/Alessandro.mp3` | Schedule click-to-play |
| `ambient.mp3` | `/public/sounds/ambient.mp3` | AmbientPlayer (all pages) |
| `click.mp3` | `/public/sounds/click.mp3` | Nav / card click sound |
| `pause-soundeffect.mp3` | `/public/sounds/pause-soundeffect.mp3` | Setlist page pause button |
| Vladimir WAV | `/public/sounds/Vladimir Ivkovic at Strange Sounds From Beyond 2018.wav` | Setlist page main track |
| Alessandro WAV | `/public/sounds/Alessandro Adriani & The Hacker at Strange Sounds From Beyond 2018.wav` | Placeholder |

---

## Fonts

Custom fonts must be present in `/public/fonts/` — they are not in the repo. Required:
- `FlamaCondensedTrial-SemiBold.woff2` — display font (`--font-display`)
- `AzeretMono` or similar — loaded via Google Fonts in `globals.css` (`--font-ui`)
