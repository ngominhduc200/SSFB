'use client';

import { useEffect, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import { stages } from '@/data/stages';
import { artists } from '@/data/artists';
import NavStrip from '@/components/NavStrip/NavStrip';
import StippleText from '@/components/StippleText/StippleText';
import { playClickSound } from '@/utils/playClickSound';

const IMG_STAR      = '/images/vinyl-disc.svg';
const IMG_RED       = '/images/vinyl-red.svg';
const PAUSE_SOUND_SRC = '/sounds/pause-soundeffect.mp3';

// Per-artist audio. Missing tracks use a thematically close fallback from the same stage.
const ARTIST_AUDIO: Record<string, string> = {
  // ── The Rest Is Noise ──────────────────────────────────────────────────────
  'tala-drum-corps':             '/audio/The Rest Is Noise/Tala Drum Corps - Refraction-S - Parade EP - [BAKK014] - 2019.mp3',
  'dj-kampire':                  '/audio/The Rest Is Noise/DJ Kampire - Gatluak (Gan Gah, Cardi Monáe & Kampire Remix).mp3',
  'equiknoxx':                   '/audio/The Rest Is Noise/Equiknoxx - Fly Away.mp3',
  'oceanic':                     '/audio/The Rest Is Noise/Oceanic - Even If I lose Everything (DJ Version).mp3',
  'nihiloxica':                  '/audio/The Rest Is Noise/Nihiloxica - Bwola.mp3',
  'dj-marfox':                   '/audio/The Rest Is Noise/DR Marfox - Subliminar.mp3',
  'mykki-blanco':                '/audio/The Rest Is Noise/Mykki Blanco - The Plug Won_t.mp3',
  'deena-abdelwahed':            '/audio/The Rest Is Noise/Deena Abdelwahed - Lila Fi Tounes.mp3',
  'lanark-artefax':              '/audio/The Rest Is Noise/Lanark Artefax - Touch Absence WHYT011.mp3',
  'osdorp-tapes':                '/audio/The Rest Is Noise/Osdorp_Tapes_Durma_Dans_Et_III_recorded_live_KLICKAUD.mp3',
  'izabel':                      '/audio/The Rest Is Noise/Izabel Caligiore - Geoffrey Landers - Breedlove.mp3',
  'strange-boutique':            '/audio/The Rest Is Noise/Strange Boutique - Drown 4.mp3',
  'letta-mbulu':                 '/audio/The Rest Is Noise/Letta Mbulu - Nomalizo Official Audio.mp3',
  'african-acid-is-the-future':  '/audio/The Rest Is Noise/African Acid Is The Future - Okana Tali (Living Room Session).mp3',
  'shanbehzadeh-ensemble':       '/audio/The Rest Is Noise/Shanbehzadeh Ensemble - Couleurs du monde.mp3',
  'rabih-beaini':                '/audio/The Rest Is Noise/rabih beaini - Song of Extreme Happiness.mp3',
  'ammar-808':                   '/audio/The Rest Is Noise/AMMAR 808 Featuring Brahim Riahi _ Douri Douri _ عمار 808 & براهيم الرياحي "دوري دوري".mp3',

  // ── Red Light Radio ────────────────────────────────────────────────────────
  'merel':                       '/audio/Red Light Radio/Merel (1).mp3',
  'les-filles-de-illighadad':    '/audio/Red Light Radio/Les Filles de Illighadad (1).mp3',
  'lulu-and-mata-hari':          '/audio/Red Light Radio/Fenna.mp3',                     // fallback
  'vladimir-ivkovic-1':          '/audio/Vladimir.mp3',
  'nurse-with-wound':            '/audio/Red Light Radio/Identified Patient - 5th December 2025.mp3', // fallback
  'vladimir-ivkovic-2':          '/audio/Vladimir.mp3',
  'zozo':                        '/audio/Red Light Radio/Die Orangen - Krautback (Full Circle_s Fail We May Sail We Must Remix).mp3', // fallback
  'orpheu-the-wizard':           '/audio/Red Light Radio/Merel (1).mp3',                 // fallback
  'fenna-fiction':               '/audio/Red Light Radio/Fenna.mp3',
  'dollkraut-band':              '/audio/Red Light Radio/Dollkraut.mp3',
  'twice-upon-a-time':           '/audio/Red Light Radio/Fenna.mp3',                     // fallback
  'ramzi-djfati':                '/audio/Red Light Radio/DJFati.mp3',
  'die-orangen':                 '/audio/Red Light Radio/Die Orangen - Krautback (Full Circle_s Fail We May Sail We Must Remix).mp3',
  'man-miran':                   '/audio/Red Light Radio/Dollkraut.mp3',                 // fallback
  'dj-marcelle':                 '/audio/Red Light Radio/Die Orangen - Krautback (Full Circle_s Fail We May Sail We Must Remix).mp3', // fallback
  'identified-patient':          '/audio/Red Light Radio/Identified Patient - 5th December 2025.mp3',

  // ── Tent ───────────────────────────────────────────────────────────────────
  'randstad':                    '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3', // fallback
  'job-sifre':                   '/audio/Tent/Young Marco.mp3',                          // fallback
  'die-wilde-jago':              '/audio/Alessandro.mp3',                                // fallback
  'dopplereffekt':               '/audio/Nihiloxica.mp3',                               // fallback
  'jasss':                       '/audio/Alessandro.mp3',                                // fallback
  'alessandro-adriani-the-hacker': '/audio/Alessandro.mp3',
  'giant-swan':                  '/audio/Alessandro.mp3',                                // fallback
  'i-f':                         '/audio/Tent/Young Marco.mp3',                          // fallback
  'satoshi':                     '/audio/Tent/Satoshi.mp3',
  'margie':                      '/audio/Tent/Satoshi.mp3',                             // fallback
  'dj-paulao':                   '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3', // fallback
  'young-marco':                 '/audio/Tent/Young Marco.mp3',
  'leroy-burgess':               '/audio/Tent/Satoshi.mp3',                             // fallback
  'antal':                       '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3',
  'hunee':                       '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3', // fallback
};

// Wheel → audio mapping: rotation maps directly to playback position
const SCRUB_SECONDS_PER_DEGREE = 10 / 360;
// While playing, spin speed (angular velocity, not raw per-event delta —
// that made the effect depend on how often pointermove happened to fire)
// bends playback rate, in octaves so it feels even in both directions
// (pitch is perceived logarithmically, not linearly). A moderate drag
// (~125deg/sec) bends about a third of an octave; a brisk flick
// (~375deg/sec) pushes over a full octave, capped at ±1.5 octaves.
const PITCH_BEND_OCTAVES_PER_DEG_PER_SEC = 0.003;
const PITCH_BEND_MAX_OCTAVES = 1.5;
// Auto-spin speed once playing and not being dragged
const WHEEL_AUTO_DEG_PER_SEC = 12;
// Scale range for the red ring's audio-reactive pulse. The ring breathes
// between MIN (silent) and MAX (peak volume) so it keeps pulsing even when
// the track is loud and the analyser is saturated.
const RING_SCALE_MIN = 0.95;
const RING_SCALE_MAX = 1.01;
// How slowly the ring eases back to its original size once paused
const RING_PULSE_RELEASE_SECONDS = 0.6;

// EQ knob travel — a 270deg sweep like a real knob, not a free 360deg spin.
// Pointing straight up (0deg) is flat (0dB); the ±135deg end stops are ±24dB.
const EQ_KNOB_MAX_ANGLE = 135;
const EQ_GAIN_DB_MAX = 24;
function angleToGainDb(angleDeg: number) {
  return (angleDeg / EQ_KNOB_MAX_ANGLE) * EQ_GAIN_DB_MAX;
}

// Tempo slider — top is faster, bottom is slower, center is normal speed.
// True reverse playback isn't possible with <audio> (browsers don't honor
// negative playbackRate), so the range bottoms out at 0x (stopped) rather
// than going negative.
const TEMPO_MIN = 0.0625; // browser minimum playbackRate (Chrome enforces ≥ 0.0625)
const TEMPO_MAX = 2;
const TEMPO_DEFAULT = 1;
const TEMPO_THUMB_H = 44;   // thumb height in vertical orientation
const TEMPO_TRACK_H = 191;  // full slider height, matches EQ section

const VOLUME_MIN = 0;
const VOLUME_MAX = 1;
const VOLUME_DEFAULT = 1;

// Wheel group (disc + red circle + photo window) — scales with viewport width
// but is capped at its native Figma frame size (1728×1728) on large screens.
const WHEEL_SIZE = 'min(100vw, 1728px)';
const RED_SIZE   = `calc(${WHEEL_SIZE} * 0.8368)`;   // 1446/1728
const PHOTO_W    = `calc(${WHEEL_SIZE} * 0.27)`;
const PHOTO_H    = `calc(${WHEEL_SIZE} * 0.135)`;
const PHOTO_TOP  = '0px'; // fixed flush to the top of the wheel/viewport

// EQ knobs, top to bottom: high, mid, low frequency
const EQ_BANDS: ('High' | 'Mid' | 'Low')[] = ['High', 'Mid', 'Low'];

// Sound filter toggles, top to bottom — each is independent and stackable
const SOUND_FILTERS: { key: 'radio' | 'highBoost' | 'lowBoost'; label: string }[] = [
  { key: 'radio', label: 'Radio filter' },
  { key: 'highBoost', label: 'High boost' },
  { key: 'lowBoost', label: 'Low boost' },
];

// Play/pause toggle for the track transport
function PlayPauseButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={playing ? 'Pause' : 'Play'}
      aria-pressed={playing}
      onClick={onToggle}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '56px',
      }}
    >
      {playing ? (
        <svg width="38" height="56" viewBox="0 0 38 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 7.5C0 3.35787 3.35786 0 7.5 0C11.6421 0 15 3.35786 15 7.5V48.5C15 52.6421 11.6421 56 7.5 56C3.35786 56 0 52.6421 0 48.5V7.5Z" fill="black"/>
          <path d="M23 7.5C23 3.35787 26.3579 0 30.5 0C34.6421 0 38 3.35786 38 7.5V48.5C38 52.6421 34.6421 56 30.5 56C26.3579 56 23 52.6421 23 48.5V7.5Z" fill="black"/>
        </svg>
      ) : (
        <svg width="46" height="50" viewBox="0 0 46 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M41.2676 17.9814C46.6009 21.0606 46.6009 28.7586 41.2676 31.8378L12 48.7355C6.66666 51.8147 -2.69192e-07 47.9657 0 41.8072L1.47724e-06 8.01192C1.74643e-06 1.85352 6.66667 -1.99547 12 1.08373L41.2676 17.9814Z" fill="black"/>
        </svg>
      )}
    </button>
  );
}

// Shared vertical slider — tick rack + sliding red thumb.
// Top = max value, bottom = min value.
function VerticalSlider({
  value, min, max, label, onChange,
}: {
  value: number; min: number; max: number; label: string;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function valueFromClientY(clientY: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const usable = rect.height - TEMPO_THUMB_H;
    const y = Math.max(0, Math.min(usable, clientY - rect.top - TEMPO_THUMB_H / 2));
    const fraction = usable > 0 ? y / usable : 0.5;
    return max - fraction * (max - min);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromClientY(e.clientY));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onChange(valueFromClientY(e.clientY));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  const fraction = (max - value) / (max - min);

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'relative',
        width: '33px',
        height: `${TEMPO_TRACK_H}px`,
        cursor: dragging ? 'grabbing' : 'pointer',
        touchAction: 'none',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            width: `${TEMPO_TRACK_H}px`,
            height: '23px',
            top: 0,
            left: '5px',
            transform: 'translateX(23px) rotate(90deg)',
            transformOrigin: '0 0',
          }}
        >
          <svg
            width="100%"
            height="23"
            viewBox="0 0 816 23"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="12" height="23" fill="#454545"/>
            <rect x="12" width="12" height="23" fill="#1E1E1E"/>
            <rect x="192" width="12" height="23" fill="#454545"/>
            <rect x="204" width="12" height="23" fill="#1E1E1E"/>
            <rect x="384" width="12" height="23" fill="#454545"/>
            <rect x="396" width="12" height="23" fill="#1E1E1E"/>
            <rect x="576" width="12" height="23" fill="#454545"/>
            <rect x="588" width="12" height="23" fill="#1E1E1E"/>
            <rect x="96" width="12" height="23" fill="#454545"/>
            <rect x="108" width="12" height="23" fill="#1E1E1E"/>
            <rect x="288" width="12" height="23" fill="#454545"/>
            <rect x="300" width="12" height="23" fill="#1E1E1E"/>
            <rect x="480" width="12" height="23" fill="#454545"/>
            <rect x="492" width="12" height="23" fill="#1E1E1E"/>
            <rect x="672" width="12" height="23" fill="#454545"/>
            <rect x="684" width="12" height="23" fill="#1E1E1E"/>
            <rect x="48" width="12" height="23" fill="#454545"/>
            <rect x="60" width="12" height="23" fill="#1E1E1E"/>
            <rect x="240" width="12" height="23" fill="#454545"/>
            <rect x="252" width="12" height="23" fill="#1E1E1E"/>
            <rect x="432" width="12" height="23" fill="#454545"/>
            <rect x="444" width="12" height="23" fill="#1E1E1E"/>
            <rect x="624" width="12" height="23" fill="#454545"/>
            <rect x="636" width="12" height="23" fill="#1E1E1E"/>
            <rect x="144" width="12" height="23" fill="#454545"/>
            <rect x="156" width="12" height="23" fill="#1E1E1E"/>
            <rect x="336" width="12" height="23" fill="#454545"/>
            <rect x="348" width="12" height="23" fill="#1E1E1E"/>
            <rect x="528" width="12" height="23" fill="#454545"/>
            <rect x="540" width="12" height="23" fill="#1E1E1E"/>
            <rect x="720" width="12" height="23" fill="#454545"/>
            <rect x="732" width="12" height="23" fill="#1E1E1E"/>
            <rect x="24" width="12" height="23" fill="#454545"/>
            <rect x="36" width="12" height="23" fill="#1E1E1E"/>
            <rect x="216" width="12" height="23" fill="#454545"/>
            <rect x="228" width="12" height="23" fill="#1E1E1E"/>
            <rect x="408" width="12" height="23" fill="#454545"/>
            <rect x="420" width="12" height="23" fill="#1E1E1E"/>
            <rect x="600" width="12" height="23" fill="#454545"/>
            <rect x="612" width="12" height="23" fill="#1E1E1E"/>
            <rect x="120" width="12" height="23" fill="#454545"/>
            <rect x="132" width="12" height="23" fill="#1E1E1E"/>
            <rect x="312" width="12" height="23" fill="#454545"/>
            <rect x="324" width="12" height="23" fill="#1E1E1E"/>
            <rect x="504" width="12" height="23" fill="#454545"/>
            <rect x="516" width="12" height="23" fill="#1E1E1E"/>
            <rect x="696" width="12" height="23" fill="#454545"/>
            <rect x="708" width="12" height="23" fill="#1E1E1E"/>
            <rect x="72" width="12" height="23" fill="#454545"/>
            <rect x="84" width="12" height="23" fill="#1E1E1E"/>
            <rect x="264" width="12" height="23" fill="#454545"/>
            <rect x="276" width="12" height="23" fill="#1E1E1E"/>
            <rect x="456" width="12" height="23" fill="#454545"/>
            <rect x="468" width="12" height="23" fill="#1E1E1E"/>
            <rect x="648" width="12" height="23" fill="#454545"/>
            <rect x="660" width="12" height="23" fill="#1E1E1E"/>
            <rect x="168" width="12" height="23" fill="#454545"/>
            <rect x="180" width="12" height="23" fill="#1E1E1E"/>
            <rect x="360" width="12" height="23" fill="#454545"/>
            <rect x="372" width="12" height="23" fill="#1E1E1E"/>
            <rect x="552" width="12" height="23" fill="#454545"/>
            <rect x="564" width="12" height="23" fill="#1E1E1E"/>
            <rect x="744" width="12" height="23" fill="#454545"/>
            <rect x="756" width="12" height="23" fill="#1E1E1E"/>
            <rect x="768" width="12" height="23" fill="#454545"/>
            <rect x="780" width="12" height="23" fill="#1E1E1E"/>
            <rect x="792" width="12" height="23" fill="#454545"/>
            <rect x="804" width="12" height="23" fill="#1E1E1E"/>
          </svg>
        </div>
      </div>
      <svg
        width="33"
        height={TEMPO_THUMB_H}
        viewBox="0 0 33 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          left: 0,
          top: `calc((100% - ${TEMPO_THUMB_H}px) * ${fraction})`,
          pointerEvents: 'none',
        }}
      >
        <rect x="0.5" y="0.5" width="32" height="43" fill="#FF0000" stroke="black"/>
      </svg>
    </div>
  );
}

// EQ knob — rotates around its own center within a ±135deg sweep (like a
// real knob's end stops, not a free 360deg spin), tracking the cursor while dragged
function EQKnob({
  label,
  onAngleChange,
}: {
  label: string;
  onAngleChange?: (angle: number) => void;
}) {
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  function angleFromPointer(clientX: number, clientY: number) {
    const rect = knobRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let deg = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (deg > 180) deg -= 360;
    return Math.max(-EQ_KNOB_MAX_ANGLE, Math.min(EQ_KNOB_MAX_ANGLE, deg));
  }

  function updateAngle(deg: number) {
    setAngle(deg);
    onAngleChange?.(deg);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    updateAngle(angleFromPointer(e.clientX, e.clientY));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    updateAngle(angleFromPointer(e.clientX, e.clientY));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  return (
    <div
      ref={knobRef}
      role="slider"
      aria-label={`${label} frequency`}
      aria-valuemin={-EQ_KNOB_MAX_ANGLE}
      aria-valuemax={EQ_KNOB_MAX_ANGLE}
      aria-valuenow={Math.round(angle)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        width: '46px',
        height: '53px',
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      <svg
        width="46"
        height="53"
        viewBox="0 0 46 53"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '23px 30.0078px',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <circle cx="23" cy="30.0078" r="22.5" fill="#818181" stroke="black" />
        <rect x="28" width="36" height="10" rx="5" transform="rotate(90 28 0)" fill="black" />
      </svg>
    </div>
  );
}

export default function SetlistPage({
  params,
}: {
  params: { stageId: string; artistId: string };
}) {
  const stage = stages.find((s) => s.id === params.stageId);
  const artist = artists.find((a) => a.id === params.artistId);
  if (!stage || !artist) notFound();

  const stageArtists = artists.filter((a) => a.stageId === params.stageId);
  const initialIndex = stageArtists.findIndex((a) => a.id === params.artistId);
  const n = stageArtists.length;
  const otherStages = stages.filter((s) => s.id !== params.stageId);

  const [displayIndex, setDisplayIndex] = useState(initialIndex);
  const displayArtist = stageArtists[displayIndex];
  const prevArtist = stageArtists[(displayIndex - 1 + n) % n];
  const nextArtist = stageArtists[(displayIndex + 1) % n];

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    window.history.replaceState(null, '', `/stage/${params.stageId}/${displayArtist.id}`);
  }, [displayIndex]);

  // Nav link color — black when over the red ring, red otherwise.
  // mix-blend-mode: difference can't cross GPU compositor layers (the animated
  // wheel forces a separate layer), so we compute it geometrically instead.
  const ssfbRef    = useRef<HTMLAnchorElement>(null);
  const mapRef     = useRef<HTMLAnchorElement>(null);
  const scheduleRef = useRef<HTMLAnchorElement>(null);
  const [navColors, setNavColors] = useState({ ssfb: '#FF0000', map: '#FF0000', schedule: '#FF0000' });

  useEffect(() => {
    function update() {
      const ringRadius = Math.min(window.innerWidth, 1728) * 0.8368 / 2;
      const cx = window.innerWidth / 2;
      function overRing(el: HTMLAnchorElement | null) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2) < ringRadius;
      }
      setNavColors({
        ssfb:     overRing(ssfbRef.current)     ? '#000000' : '#FF0000',
        map:      overRing(mapRef.current)      ? '#000000' : '#FF0000',
        schedule: overRing(scheduleRef.current) ? '#000000' : '#FF0000',
      });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const [liveInfoVisible, setLiveInfoVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLiveInfoVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const STAGE_LIVE: Record<string, string> = {
    'stage-a': 'nihiloxica',
    'stage-b': 'vladimir-ivkovic-2',
    'stage-c': 'alessandro-adriani-the-hacker',
  };
  const liveArtist = artists.find(a => a.id === STAGE_LIVE[params.stageId]);

  // Entrance animation states
  const [wheelIn, setWheelIn] = useState(false);
  const [controlsIn, setControlsIn] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setWheelIn(true), 50);
    const t2 = setTimeout(() => setControlsIn(true), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pauseSoundRef = useRef<HTMLAudioElement>(null);

  function handlePlayPauseToggle() {
    const next = !isPlaying;
    if (!next && pauseSoundRef.current) {
      pauseSoundRef.current.currentTime = 0;
      pauseSoundRef.current.volume = 0.12;
      pauseSoundRef.current.play();
    }
    document.dispatchEvent(new CustomEvent(next ? 'ambient-duck' : 'ambient-restore'));
    setIsPlaying(next);
  }

  // Restore ambient when leaving the setlist page while track is playing
  useEffect(() => {
    return () => { document.dispatchEvent(new CustomEvent('ambient-restore')); };
  }, []);

  // Pause wheel and restore ambient when track reaches the end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      setIsPlaying(false);
      document.dispatchEvent(new CustomEvent('ambient-restore'));
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play();
    else audio.pause();
  }, [isPlaying]);

  // Stop playback and load the correct track when switching artists
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = encodeURI(ARTIST_AUDIO[displayArtist.id] ?? '/audio/Nihiloxica.mp3');
      audio.load();
    }
    setIsPlaying(false);
    document.dispatchEvent(new CustomEvent('ambient-restore'));
  }, [displayIndex]);

  // Tempo — base playback speed set by the slider. The wheel's auto-spin and
  // pitch-bend are both relative to this, not a hardcoded 1x.
  const [tempoRate, setTempoRate] = useState(TEMPO_DEFAULT);
  // Mirrors tempoRate for the auto-spin rAF loop below, so a tempo change
  // mid-drag doesn't restart that effect (and drop a frame of rotation) —
  // it's read fresh each frame instead.
  const tempoRateRef = useRef(tempoRate);
  tempoRateRef.current = tempoRate;

  function handleTempoChange(rate: number) {
    setTempoRate(rate);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = Math.max(TEMPO_MIN, rate);
  }

  const [volume, setVolume] = useState(VOLUME_DEFAULT);

  function handleVolumeChange(v: number) {
    setVolume(v);
    const audio = audioRef.current;
    if (audio) audio.volume = v;
  }

  // EQ — a 3-band Web Audio filter chain wired to the <audio> element. Built
  // lazily on first interaction (knob drag or play), since both
  // AudioContext and createMediaElementSource require a user gesture and
  // createMediaElementSource can only ever be called once per element.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const eqFilterRefs = { High: highFilterRef, Mid: midFilterRef, Low: lowFilterRef };

  // Sound filter toggles — independent on/off effects, stacked after the EQ
  // band filters. The radio filter has no "zero" gain value to fall back to
  // (bandpass has no neutral gain), so it's toggled by switching the
  // filter's type between bandpass (on) and allpass — i.e. inaudible — (off).
  const radioFilterRef = useRef<BiquadFilterNode | null>(null);
  const highBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const lowBoostFilterRef = useRef<BiquadFilterNode | null>(null);
  const [activeFilters, setActiveFilters] = useState({
    radio: false,
    highBoost: false,
    lowBoost: false,
  });

  // Analyser tap for the red ring's audio-reactive pulse — a passthrough
  // node, doesn't affect what's heard.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const redRingRef = useRef<HTMLDivElement>(null);

  function ensureAudioGraph() {
    if (audioCtxRef.current || !audioRef.current) return;
    const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(audioRef.current);
    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'highshelf';
    highFilter.frequency.value = 2500;
    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 0.7;
    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.value = 250;

    const radioFilter = ctx.createBiquadFilter();
    radioFilter.type = 'allpass';
    const highBoostFilter = ctx.createBiquadFilter();
    highBoostFilter.type = 'highshelf';
    highBoostFilter.frequency.value = 3000;
    highBoostFilter.gain.value = 0;
    const lowBoostFilter = ctx.createBiquadFilter();
    lowBoostFilter.type = 'lowshelf';
    lowBoostFilter.frequency.value = 150;
    lowBoostFilter.gain.value = 0;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    source
      .connect(highFilter)
      .connect(midFilter)
      .connect(lowFilter)
      .connect(radioFilter)
      .connect(highBoostFilter)
      .connect(lowBoostFilter)
      .connect(analyser)
      .connect(ctx.destination);

    audioCtxRef.current = ctx;
    highFilterRef.current = highFilter;
    midFilterRef.current = midFilter;
    lowFilterRef.current = lowFilter;
    radioFilterRef.current = radioFilter;
    highBoostFilterRef.current = highBoostFilter;
    lowBoostFilterRef.current = lowBoostFilter;
    analyserRef.current = analyser;
  }

  function onEqChange(filterRef: React.RefObject<BiquadFilterNode | null>, angleDeg: number) {
    ensureAudioGraph();
    audioCtxRef.current?.resume();
    if (filterRef.current) filterRef.current.gain.value = angleToGainDb(angleDeg);
  }

  function toggleSoundFilter(key: keyof typeof activeFilters) {
    ensureAudioGraph();
    audioCtxRef.current?.resume();
    // Toggling the already-active filter turns it off; selecting a new one
    // deactivates all others first (mutually exclusive).
    const turningOn = activeFilters[key] === false;
    const next = { radio: false, highBoost: false, lowBoost: false, [key]: turningOn };
    setActiveFilters(next);

    // Sync all filter nodes to the new state
    if (radioFilterRef.current) {
      if (next.radio) {
        radioFilterRef.current.type = 'bandpass';
        radioFilterRef.current.frequency.value = 1500;
        radioFilterRef.current.Q.value = 2.5;
      } else {
        radioFilterRef.current.type = 'allpass';
      }
    }
    if (highBoostFilterRef.current) highBoostFilterRef.current.gain.value = next.highBoost ? 12 : 0;
    if (lowBoostFilterRef.current)  lowBoostFilterRef.current.gain.value  = next.lowBoost  ? 12 : 0;
  }

  useEffect(() => {
    if (isPlaying) {
      ensureAudioGraph();
      audioCtxRef.current?.resume();
    }
  }, [isPlaying]);

  // Red ring pulse — scales with the track's live volume, like it's
  // vibrating with the sound. Mutates the DOM directly via a ref instead of
  // React state, since this updates every animation frame.
  useEffect(() => {
    const ring = redRingRef.current;
    if (!isPlaying) {
      if (ring) {
        ring.style.transition = `transform ${RING_PULSE_RELEASE_SECONDS}s ease-out`;
        ring.style.transform = 'translate(-50%, -50%) scale(1)';
      }
      return;
    }
    // Resuming — smoothly expand the ring to peak scale first, then hand
    // control to the audio-reactive rAF loop once the expand settles.
    if (ring) {
      ring.style.transition = `transform ${RING_PULSE_RELEASE_SECONDS}s ease-out`;
      ring.style.transform = `translate(-50%, -50%) scale(${RING_SCALE_MAX})`;
    }

    let rafId: number;
    const settleTimeout = setTimeout(() => {
      if (redRingRef.current) redRingRef.current.style.transition = 'none';
      // Normalize against a slowly-decaying peak so loud passages still pulse
      // (absolute average saturates at high volume; relative level always varies)
      let smoothedPeak = 0.01;
      function tick() {
        const analyser = analyserRef.current;
        const ring = redRingRef.current;
        if (analyser && ring) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const average = sum / data.length / 255;
          smoothedPeak = Math.max(average, smoothedPeak * 0.995);
          const normalized = smoothedPeak > 0.001 ? average / smoothedPeak : 0;
          const scale = RING_SCALE_MIN + normalized * (RING_SCALE_MAX - RING_SCALE_MIN);
          ring.style.transform = `translate(-50%, -50%) scale(${scale})`;
        }
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }, RING_PULSE_RELEASE_SECONDS * 1000);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(settleTimeout);
    };
  }, [isPlaying]);

  // Wheel rotation — drag anywhere on the disc to spin it around the anchor
  // point (50vw, 0). Tracks angle deltas (not absolute angle) so grabbing the
  // disc never causes it to jump to face the cursor.
  const wheelAnchorRef = useRef<HTMLDivElement>(null);
  const lastPointerAngleRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelDragging, setWheelDragging] = useState(false);

  // Auto-spin — once playing, the disc turns on its own like a real
  // platter. Dragging takes manual control (handled in onWheelPointerMove);
  // releasing it hands control back to this loop from wherever it left off.
  useEffect(() => {
    if (!isPlaying || wheelDragging) return;
    let rafId: number;
    let lastTime: number | null = null;
    function tick(time: number) {
      if (lastTime !== null) {
        const deltaSeconds = (time - lastTime) / 1000;
        setWheelAngle((a) => a + WHEEL_AUTO_DEG_PER_SEC * tempoRateRef.current * deltaSeconds);
      }
      lastTime = time;
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, wheelDragging]);

  function wheelPointerAngle(clientX: number, clientY: number) {
    const rect = wheelAnchorRef.current!.getBoundingClientRect();
    return Math.atan2(clientY - rect.top, clientX - rect.left) * (180 / Math.PI);
  }

  function onWheelPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    lastPointerAngleRef.current = wheelPointerAngle(e.clientX, e.clientY);
    lastPointerTimeRef.current = e.timeStamp;
    setWheelDragging(true);
  }

  function onWheelPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!wheelDragging) return;
    const angle = wheelPointerAngle(e.clientX, e.clientY);
    let delta = angle - lastPointerAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    // Floored to suppress spurious velocity spikes from sub-frame gaps
    // (e.g. the first move right after pointerdown can land just a couple
    // of milliseconds later, which would otherwise blow up delta/deltaSeconds).
    const deltaSeconds = Math.max((e.timeStamp - lastPointerTimeRef.current) / 1000, 1 / 120);
    lastPointerAngleRef.current = angle;
    lastPointerTimeRef.current = e.timeStamp;
    setWheelAngle((a) => a + delta);

    // Track navigation: rotation maps directly to playback position,
    // forward or backward, whether the track is playing or paused.
    const audio = audioRef.current;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.min(
      duration,
      Math.max(0, audio.currentTime + delta * SCRUB_SECONDS_PER_DEGREE)
    );

    // Pitch-bend: while playing, angular velocity (not raw per-event delta)
    // nudges playback rate, so the effect doesn't depend on how often
    // pointermove happens to fire.
    if (isPlaying && deltaSeconds > 0) {
      const angularVelocity = delta / deltaSeconds; // deg/sec
      const octaves = Math.max(
        -PITCH_BEND_MAX_OCTAVES,
        Math.min(PITCH_BEND_MAX_OCTAVES, angularVelocity * PITCH_BEND_OCTAVES_PER_DEG_PER_SEC)
      );
      audio.playbackRate = Math.max(TEMPO_MIN, tempoRate * Math.pow(2, octaves));
    }
  }

  function onWheelPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = Math.max(TEMPO_MIN, tempoRate);
    setWheelDragging(false);
  }

  const navLinkStyle: React.CSSProperties = {
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: '16px',
    textTransform: 'uppercase',
    letterSpacing: '-0.64px',
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 60 }}>

      {/* ── Nav — rendered inside this stacking context so mix-blend-mode: difference
          composites against the disc and red ring pixels, not a separate GPU layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', zIndex: 200, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
        <a ref={ssfbRef} href="/home" style={{ display: 'block', lineHeight: 0, pointerEvents: 'auto' }}>
          <img src="/images/logored.svg" alt="SSFB" style={{ width: 70, height: 'auto', display: 'block' }} />
        </a>
        <div style={{ marginLeft: 'auto', width: '240px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a ref={mapRef} href="/explore" style={{ ...navLinkStyle, color: navColors.map, pointerEvents: 'auto' }}>MAP</a>
          <a ref={scheduleRef} href="/schedule" style={{ ...navLinkStyle, color: navColors.schedule, pointerEvents: 'auto' }}>SCHEDULE</a>
        </div>
      </div>

      {/* ── Vinyl record ─────────────────────────────────────────────── */}
      {/* Wheel anchor — single source of truth for the disc's center point (50vw, 0) */}
      <div ref={wheelAnchorRef} className="absolute" style={{ left: '50%', top: 0, width: 0, height: 0, transform: wheelIn ? 'translateY(0)' : 'translateY(-100vh)', transition: wheelIn ? 'transform 1.9s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}>

        {/* Rotating group — disc + red circle spin together around the anchor.
            The photo window below is deliberately outside this group, like a
            tonearm that stays fixed while the platter turns. */}
        <div
          role="slider"
          aria-label="Wheel — drag to pitch-bend or scrub the track"
          aria-valuenow={Math.round(wheelAngle)}
          onPointerDown={onWheelPointerDown}
          onPointerMove={onWheelPointerMove}
          onPointerUp={onWheelPointerUp}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            transform: `rotate(${wheelAngle}deg)`,
          }}
        >
          {/* Disc */}
          <div
            className="absolute"
            style={{
              width: WHEEL_SIZE,
              height: WHEEL_SIZE,
              left: 0,
              top: 0,
              transform: 'translate(-50%, -50%)',
              cursor: wheelDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <img alt="" src={IMG_STAR} draggable={false} className="absolute inset-0 w-full h-full" style={{ objectFit: 'fill', pointerEvents: 'none' }} />
          </div>

          {/* Red inner circle — anchored to the same center point as the disc */}
          {/* Source SVG is a 1446px circle → 1446/1728 of the disc diameter */}
          <div
            ref={redRingRef}
            className="absolute"
            style={{
              width: RED_SIZE,
              height: RED_SIZE,
              left: 0,
              top: 0,
              transform: 'translate(-50%, -50%)',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <img alt="" src={IMG_RED} draggable={false} className="w-full h-full" style={{ objectFit: 'fill', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Artist photo window — anchored to the same wheel center point */}
        {/* "Subtract" arch is 510×255 px, offset 65px below center in the 1728 px frame */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: PHOTO_W,
            height: PHOTO_H,
            left: 0,
            top: PHOTO_TOP,
            transform: 'translateX(-50%)',
            overflow: 'hidden',
            borderRadius: '0 0 50% 50% / 0 0 100% 100%',
            mixBlendMode: 'multiply',
          }}
        >
          <img alt={displayArtist.name} src={displayArtist.coverImage} className="w-full h-full" style={{ objectFit: 'cover' }} />
        </div>

        {/* Inner ring — small half-ellipse in page background color, sits on top of the image arch */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: `calc(${PHOTO_W} * 0.18)`,
            height: `calc(${PHOTO_H} * 0.18)`,
            left: 0,
            top: PHOTO_TOP,
            transform: 'translateX(-50%)',
            borderRadius: '0 0 50% 50% / 0 0 100% 100%',
            background: '#808080',
            mixBlendMode: 'multiply',
          }}
        />
      </div>

      {/* ── Center content ───────────────────────────────────────────── */}
      <div
        className="absolute left-1/2 flex flex-col items-center"
        style={{ top: '46%', transform: 'translate(-50%, -50%)', gap: '3vw', opacity: controlsIn ? 1 : 0, transition: 'opacity 0.8s ease', pointerEvents: 'none' }}
      >
        {/* Prev / current / next artist row — fixed grid so layout never shifts with name length */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36vw 1fr', gridTemplateRows: 'clamp(100px, 14vw, 220px)', width: '90vw', alignItems: 'center', overflow: 'visible', transform: 'translateY(4px)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="uppercase text-black"
              style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', letterSpacing: '-0.64px', width: '13vw', textAlign: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1.3, pointerEvents: 'auto' }}
              onClick={() => { playClickSound(); setDisplayIndex((i) => (i - 1 + n) % n); }}
            >
              {prevArtist.name}
            </button>
          </div>

          <StippleText
            text={displayArtist.name}
            canvasWidth={900}
            style={{ width: '100%', height: 'auto' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              className="uppercase text-black"
              style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', letterSpacing: '-0.64px', width: '13vw', textAlign: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1.3, pointerEvents: 'auto' }}
              onClick={() => { playClickSound(); setDisplayIndex((i) => (i + 1) % n); }}
            >
              {nextArtist.name}
            </button>
          </div>
        </div>

        {/* Play/pause */}
        <div style={{ pointerEvents: 'auto' }}><PlayPauseButton playing={isPlaying} onToggle={handlePlayPauseToggle} /></div>
        <audio ref={audioRef} preload="none" />
        <audio ref={pauseSoundRef} src={PAUSE_SOUND_SRC} preload="auto" />
      </div>

      {/* ── SOUND FILTER (left) ──────────────────────────────────────── */}
      <div
        className="absolute flex flex-col items-start"
        style={{ left: '98px', bottom: '14%', gap: '24px', opacity: controlsIn ? 1 : 0, transition: 'opacity 0.8s ease 0.2s' }}
      >
        <div className="flex flex-col" style={{ gap: '17px' }}>
          {SOUND_FILTERS.map(({ key, label }) => {
            const active = activeFilters[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={label}
                onClick={() => toggleSoundFilter(key)}
                className="flex items-center justify-center"
                style={{ width: '80px', height: '52px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '22px',
                    background: active ? '#FF0000' : '#000',
                    borderRadius: '999px',
                    transform: 'rotate(23.38deg)',
                    transition: 'background 0.15s ease',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── EQ CONTROL (left, beside sound filter) ──────────────────── */}
      <div
        className="absolute flex flex-col items-center"
        style={{ right: '98px', bottom: '14%', gap: '24px', opacity: controlsIn ? 1 : 0, transition: 'opacity 0.8s ease 0.4s' }}
      >
        <div className="flex flex-col" style={{ gap: '16px' }}>
          {EQ_BANDS.map((band) => (
            <EQKnob
              key={band}
              label={band}
              onAngleChange={(angle) => onEqChange(eqFilterRefs[band], angle)}
            />
          ))}
        </div>
      </div>

      {/* ── TEMPO section ────────────────────────────────────────────── */}
      <div className="absolute" style={{ right: '35px', bottom: '14%', opacity: controlsIn ? 1 : 0, transition: 'opacity 0.8s ease 0.6s' }}>
        <VerticalSlider value={tempoRate} min={TEMPO_MIN} max={TEMPO_MAX} label="Tempo" onChange={handleTempoChange} />
      </div>

      {/* ── VOLUME section (left of sound filter) ────────────────────── */}
      <div className="absolute" style={{ left: '35px', bottom: '14%', opacity: controlsIn ? 1 : 0, transition: 'opacity 0.8s ease 0s' }}>
        <VerticalSlider value={volume} min={VOLUME_MIN} max={VOLUME_MAX} label="Volume" onChange={handleVolumeChange} />
      </div>

      {/* ── NavStrip ─────────────────────────────────────────────────── */}
      <NavStrip
        currentStage={stage.name}
        currentStageId={stage.id}
        liveInfo={liveArtist ? `LIVE NOW: ${liveArtist.name}` : undefined}
        liveInfoVisible={liveInfoVisible}
        otherStages={otherStages.map((s) => ({ label: s.name, id: s.id }))}
      />
    </div>
  );
}
