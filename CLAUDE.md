# SSFB Microsite — Developer Notes

## Project overview

Next.js 14 App Router microsite for the Strange Sounds From Beyond festival.
Two parallel feature tracks were developed and merged — read this before pulling or merging.

The repo root also contains a separate Next.js app (tye's branch) for the Cesium 3D stipple map (`/explore` feature). It lives at the repo root (`app/`, `components/`, `lib/`) and is independent of `ssfb-microsite/`.

---

## Data model — read this first

### `ssfb-microsite/data/artists.ts`

The single source of truth for all artist data is the **`artists`** array. It contains all 48 artists across both days and all 3 stages.

**Time format is `'SAT HH:MM–HH:MM'` or `'SUN HH:MM–HH:MM'` (24-hour, with day prefix and en dash range).**
Do not change this format — the stage page cards, Three.js textures, schedule page parser, and live artist detection all depend on it.

The file also exports:
- `saturdayArtists` — derived filter (`time.startsWith('SAT')`) for the schedule page
- `sundayArtists` — derived filter (`time.startsWith('SUN')`) for the schedule page
- `tracks` — audio track metadata; `artistId` values must match IDs in `artists`

**If you add new artists**, add them to `artists` only. The Saturday/Sunday splits derive automatically.

**If you change an artist `id`**, you must also update:
- Any matching entry in `tracks` (`artistId` field)
- `PLAYABLE_IDS` and `ARTIST_AUDIO` in `app/schedule/page.tsx`
- `ARTIST_AUDIO` in `app/stage/[stageId]/[artistId]/page.tsx`
- Any URL that routes to `/stage/[stageId]/[artistId]`

### `ssfb-microsite/data/stages.ts`

Stage labels use the **full venue name** (`'THE REST IS NOISE'`, `'RED LIGHT RADIO'`, `'TENT'`), not abbreviated labels like `'STAGE A'`. Keep it this way — the stage page hero and NavStrip both display this.

`liveArtist` is **not** on the stage object. The LIVE NOW banner is derived in real time from the current clock in `utils/liveArtist.ts`. Do **not** add a `liveArtist` field back to stages or use `artist.isLive` for the banner — those are stale approaches.

---

## Pages

### `/` — Entry page (`app/page.tsx` + `app/EntryClient.tsx`)
Full-screen interactive entry. Two-layer video (grey base + red hover overlay) rendered through an SVG filter pipeline:
- `grey-to-black` filter converts the base video to pure black output
- `grey-to-red` filter uses a 3-step pipeline (saturate→threshold slope=100→black-to-red matrix) to produce exact `#FF0000` on hover bars
- `captureStream()` pipes grey video frames to the red overlay element for frame-perfect sync (no drift between two decoders)

**StippleText** "Strange Sounds From Beyond" rendered in red (`dotColor="#FF0000"`, `align="left"`, `canvasWidth={1400}`).

**3 horizontal audio zones** (left → centre → right): Nihiloxica / Vladimir / Alessandro. Volume uses `linear²` falloff from each zone centre (`ZONE_CENTERS=[1/6, 1/2, 5/6]`, `ZONE_FALLOFF=1/3`, `ZONE_MAX_VOL=0.75`). Two zones play simultaneously when the cursor is between them.

**CTA**: `[CLICK TO / ENTER SITE]` follows the cursor as a fixed-position red element (`cursor: none`). Plays `click.mp3` via `playClickSound` on click, then navigates to `/home`.

**Corner labels**: black text, white background, `lineHeight: 1`, no padding. Amsterdam top-left, strangesoundsfrombeyond.com bottom-left, date top-right.

Video playback rate: `0.6×`. Main container has `cursor: none` — the global `CustomCursor` is hidden on `/` via `pathname === '/'` check.

### `/home` — Home (`app/home/page.tsx`)
Main navigation hub. All SSFB links site-wide point here — **never to `/`**.

### `/stage/[stageId]` — Stage page (`app/stage/[stageId]/page.tsx`)
Three.js card grid of all artists for that stage. Cards fade in staggered on load and fade out on navigate. Stage name is rendered as a `<StippleText>` canvas (halftone dot effect) and fades out on first scroll. LIVE NOW banner derived from `utils/liveArtist.ts`, refreshed every 60 seconds.

### `/stage/[stageId]/[artistId]` — Setlist page (`app/stage/[stageId]/[artistId]/page.tsx`)
Vinyl disc UI with rotating wheel, audio player, EQ knobs, tempo slider, sound filters. Artist photo appears in an arch cutout at the top of the disc. Prev/next navigation stops the current track and loads the new artist's audio from `ARTIST_AUDIO`.

**Key behaviours:**
- Artist name rendered as `<StippleText canvasWidth={900}>` — same halftone treatment as the stage hero.
- Navigating prev/next updates the URL silently via `window.history.replaceState` (no page transition, no re-render). On refresh, the correct artist loads from the URL.
- LIVE NOW banner shown in the NavStrip, refreshed every 60 seconds via `utils/liveArtist.ts`.

**This page was rewritten by a teammate using a `WhipMixer` component — that version was intentionally reverted in favour of the vinyl disc implementation.** If you pull a commit that restores `WhipMixer`, you will need to revert `app/stage/[stageId]/[artistId]/page.tsx` back to the vinyl disc version manually.

### `/schedule` — Schedule (`app/schedule/page.tsx`)
Horizontal scrollable timeline. Artist positions are computed with `timeToPercent(artist.time)` which parses our `'SAT HH:MM–HH:MM'` format.

**Waveform**: 400 bars span the full 2140px scrollable content width, invisible except near the cursor (Gaussian bell curve). When hovering a live artist, bars pulse with Web Audio analyser data. Radio plays at 0.4 volume on timeline enter (ambient ducks); live artist hover plays the artist track at 0.2 volume; leaving a live artist resumes the radio.

**Audio unlock pattern**: `switchAudio` stores a failed `play()` in `pendingPlayRef`. On the first `pointerdown`, `initCtx` creates the `AudioContext`, calls `ctx.resume()` immediately (new AudioContexts start suspended — skipping resume silences already-playing audio), then retries any pending play. Do not remove the `pendingPlayRef` retry or the `ctx.resume()` call inside `initCtx`.

**On load (Saturday)**: timeline scrolls to horizontally center the 18:30 LIVE marker. Switching back to Saturday also re-centers it. Switching to Sunday scrolls to the start.

**SAT / SUN date buttons** play a click sound via `playClickSound` on click.

**`LIVE_IDS`** — controls which artists trigger audio hover + audio-reactive waveform: `nihiloxica`, `vladimir-ivkovic-2` (18:30 slot only — not `-1`), `alessandro-adriani-the-hacker`.

**`ArtistLabel`** accepts a `lineBreakAfter` prop (word string) to force a line break mid-name. Currently used for `dollkraut-band` to break after "DOLLKRAUT" so "BAND" drops to a second line.

**Playable audio files** (hover-to-play on schedule): `/public/audio/Nihiloxica.mp3`, `/public/audio/Vladimir.mp3`, `/public/audio/Alessandro.mp3`. Radio ambient: `/public/sounds/radio.mp3`.

---

## Components

| Component | Purpose |
|---|---|
| `StageScene` | Three.js card grid — used only on the stage page |
| `StippleText` | Canvas halftone renderer — renders text as stipple dots. Used for stage name hero, setlist artist name, and schedule footer. Props: `canvasWidth` (default 1400; use ~900 for narrower contexts), `dotColor`, `align` (`'center'` default or `'left'`), `anchorBottom` (draws text at canvas bottom edge — use when absolutely positioning with `bottom: N`), `style`. |
| `GrainOverlay` | Animated canvas grain on top of every page (rendered in `layout.tsx`) |
| `AmbientPlayer` | Background ambient audio that ducks when track plays |
| `NavStrip` | Bottom navigation strip on stage + setlist pages. Shows LIVE NOW banner in both modes when `liveInfo` is passed. |
| `Nav` | Top nav (SSFB → `/home`, MAP → `/explore`, SCHEDULE → `/schedule`) |
| `HomeScene` | Home page scene |
| `ArtistCard` | **Not currently rendered anywhere** — was replaced by Three.js canvas cards |
| `CustomCursor` | Global 24×24 red square cursor (`border: 1.5px solid #000`). Rendered in `layout.tsx`. Hidden on `/` (entry page) via `usePathname`. Scales to 90% on `pointerdown`. `cursor: none !important` applied globally in `globals.css`. The schedule page **must not** render its own cursor element — the global one handles everything. |

---

## Live artist detection

**`ssfb-microsite/utils/liveArtist.ts`** — shared utility used by both the stage and setlist pages.

Parses the `'SAT HH:MM–HH:MM'` time range on each artist, checks `new Date()` against it, and returns the currently-playing artist for a given stage. Only matches on Saturdays (`getDay() === 6`) and Sundays (`getDay() === 0`) — returns `undefined` on other days.

Both pages call this on mount and re-call it every 60 seconds via `setInterval`.

**Do not use `artist.isLive` or `stage.liveArtist` for the banner** — those fields are stale and not updated at runtime.

---

## StippleText component

**`ssfb-microsite/components/StippleText/StippleText.tsx`**

Renders text as a halftone dot canvas using the stipple algorithm from `utils/stipple.ts` (ported from tye's Cesium map).

- Text is drawn black-on-white into an offscreen canvas, then `drawStipple` converts it to dots on a transparent canvas.
- Multi-line wrapping is handled automatically: `wrapLines()` measures word widths and splits at `canvasWidth * 0.92`.
- `LINE_H = 220` sets the native font size height. `LINE_GAP = 130` sets the tighter line step for wrapped lines.
- **`canvasWidth`** (default `1400`) controls native canvas width. Use `900` on the setlist page for a bigger-looking font at narrower CSS display widths.
- **`align`** (`'center'` default or `'left'`): sets `textAlign` on the offscreen canvas. Use `'left'` when you want text to start at the left edge of the canvas (no internal whitespace on the left).
- **`anchorBottom`** (boolean, default `false`): draws text with `textBaseline = 'alphabetic'` at `CANVAS_H - 5`, leaving only ~5px of transparent space at the canvas bottom. Use this when absolutely positioning with `bottom: N` so the visible text sits at exactly `N`px from its container bottom (the schedule footer uses this).
- The stipple algorithm lives in `ssfb-microsite/utils/stipple.ts` — a copy of the root-level `lib/stipple.ts` (kept separate since ssfb-microsite is its own Next.js app).

To adjust the stipple appearance, change the params passed to `drawStipple` inside the component's render function.

---

## Merge history & known conflicts resolved

| Date | Merge | Resolution |
|---|---|---|
| 2026-06-16 | Parallel feature branch merge | See table below |
| 2026-06-17 | `tye` branch (Cesium stipple map) | Only conflict: `.gitignore` — combined both rule sets |

### 2026-06-16 conflict resolutions

| File | Conflict | Resolution |
|---|---|---|
| `data/artists.ts` | Teammate split into `saturdayArtists`/`sundayArtists` with empty `coverImage`/`bio` | Kept our full data; added derived exports for their schedule page |
| `data/stages.ts` | Teammate used `'STAGE A'`/`'STAGE B'` labels, removed `liveArtist` | Kept our full stage name labels; removed `liveArtist` (derived at runtime instead) |
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
| Per-artist tracks | `/public/audio/[Stage Name]/[Artist].mp3` | Setlist page — mapped in `ARTIST_AUDIO` in the setlist page. Missing artists fall back to an existing track from the same stage. |
| `ambient.mp3` | `/public/sounds/ambient.mp3` | AmbientPlayer (all pages) |
| `click.mp3` | `/public/sounds/click.mp3` | Nav / card click sound; entry page CTA click |
| `pause-soundeffect.mp3` | `/public/sounds/pause-soundeffect.mp3` | Setlist page pause button |

**Note:** WAV files are gitignored (`*.wav`, `*.WAV`) — they are too large for GitHub. Share locally only.

---

## Fonts

Custom fonts must be present in `/public/fonts/` — they are not in the repo. Required:
- `FlamaCondensedTrial-SemiBold.woff2` — display font (`--font-display`), used by `StippleText` canvas rendering
- `AzeretMono` or similar — loaded via Google Fonts in `globals.css` (`--font-ui`)
