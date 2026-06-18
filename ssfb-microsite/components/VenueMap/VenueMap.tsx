'use client';

import { useEffect, useRef } from 'react';
import { drawStipple, StippleParams } from '@/utils/stipple';

const NDSM = { lat: 52.39954835689703, lng: 4.896741011546972 };

const MAP_STIPPLE: StippleParams = {
  ySquares: 180,
  xSquares: 260,
  minDotSize: 0.2,
  maxDotSize: 7,
  angle: 0,
  gridType: 'Regular',
  threshold: 220,
  bgColor: '#e8e8e8',
  dotColor: '#1a1a18',
};
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

const PAN_SCALE = 0.000012;
const ZOOM_DEFAULT = 17;
const ZOOM_MIN = 14;
const ZOOM_MAX = 20;
const LERP = 0.07;
const BOUND_LAT = 0.002;
const BOUND_LNG = 0.003;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// Haversine distance in metres
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 1 within innerR, linear fade to 0 at outerR
function proximityGain(dist: number, innerR: number, outerR: number): number {
  if (dist <= innerR) return 1;
  if (dist >= outerR) return 0;
  return 1 - (dist - innerR) / (outerR - innerR);
}

export interface PreviewData {
  name: string;            // Large label shown top-left of card
  nowPlaying?: string;     // Scrolling text content (omit when using hintText)
  image?: string;          // Optional path under /public — grayscale B&W treatment applied
  objectPosition?: string; // CSS objectPosition override, e.g. '70% center'
  hintText?: string;       // If set, show cursor hint box instead of preview card
}

interface Hotspot {
  lat: number;
  lng: number;
  src: string;   // path under /public
  innerR: number; // metres — full volume
  outerR: number; // metres — silence
  preview?: PreviewData; // omit for ocean/ambient spots that get no card
}

// Add more hotspots here as new sounds arrive.
// Multiple hotspots can share the same src — one audio player is created per unique src.
const HOTSPOTS: Hotspot[] = [
  {
    lat: 52.3995,
    lng: 4.8948,
    src: '/audio/map/how-improvisers-warmup.mp3',
    innerR: 15,
    outerR: 50,
    preview: { name: 'FLOCK THEATER', nowPlaying: 'An amazing place to learn all sorts of improv, ambitious and lovely people. 8 mins from venue.', image: '/images/flock.png', objectPosition: '70% center' },
  },
  {
    lat: 52.3996,
    lng: 4.8968,
    src: '/audio/Alessandro.mp3',
    innerR: 15,
    outerR: 50,
    // preview assigned here — Nihiloxica + Vladimir at same coords get no card (one card per location)
    preview: { name: 'STAGE', hintText: 'WHATS YOUR SOUND? CLICK TO EXPLORE SSFB' },
  },
  {
    lat: 52.3996,
    lng: 4.8968,
    src: '/audio/Nihiloxica.mp3',
    innerR: 15,
    outerR: 50,
  },
  {
    lat: 52.3996,
    lng: 4.8968,
    src: '/audio/Vladimir.mp3',
    innerR: 15,
    outerR: 50,
  },
  {
    lat: 52.4001,
    lng: 4.8962,
    src: '/audio/map/immersed-in-harmony.mp3',
    innerR: 15,
    outerR: 50,
    preview: { name: 'NDSM WERF', nowPlaying: 'Live music performances & other cultural events in an industrial setting with an eatery. 2 mins from venue.', image: '/images/ndsm%20cultural.jpg' },
  },
  {
    lat: 52.4003,
    lng: 4.8952,
    src: '/audio/map/Coffee Shop Ambience - Study Ambience - No Music - Drink in the Ambience (128k).mp3',
    innerR: 15,
    outerR: 50,
    preview: { name: 'VEBAN', nowPlaying: 'Chill spot to get drinks, hang out, and drink. Did I mention drink? 7 mins from Venue.', image: '/images/pub.png' },
  },
  {
    lat: 52.4007,
    lng: 4.8959,
    src: '/audio/map/Coffee Shop Ambience - Study Ambience - No Music - Drink in the Ambience (128k).mp3',
    innerR: 15,
    outerR: 50,
    preview: { name: 'IJVER', nowPlaying: 'Massive restaurant located in the shipbuilding warehouse, 4 mins from venue', image: '/audio/map/IVJER.png' },
  },

  // IJ river waterfront — southern edge of NDSM peninsula
  { lat: 52.3977, lng: 4.8940, src: '/audio/map/ocean.mp3', innerR: 25, outerR: 80 },
  { lat: 52.3977, lng: 4.8955, src: '/audio/map/ocean.mp3', innerR: 25, outerR: 80 },
  { lat: 52.3977, lng: 4.8968, src: '/audio/map/ocean.mp3', innerR: 25, outerR: 80 },
  { lat: 52.3977, lng: 4.8982, src: '/audio/map/ocean.mp3', innerR: 25, outerR: 80 },
  { lat: 52.3977, lng: 4.8995, src: '/audio/map/ocean.mp3', innerR: 25, outerR: 80 },
  // Western harbour basin
  { lat: 52.3982, lng: 4.8938, src: '/audio/map/ocean.mp3', innerR: 25, outerR: 80 },
  { lat: 52.3988, lng: 4.8937, src: '/audio/map/ocean.mp3', innerR: 25, outerR: 80 },
];

// Group hotspot list by audio src so each file gets exactly one player
function groupBySrc(spots: Hotspot[]): Map<string, Hotspot[]> {
  const m = new Map<string, Hotspot[]>();
  for (const s of spots) {
    if (!m.has(s.src)) m.set(s.src, []);
    m.get(s.src)!.push(s);
  }
  return m;
}

async function createSession(): Promise<string> {
  const res = await fetch(
    `https://tile.googleapis.com/v1/createSession?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapType: 'satellite', language: 'en-US', region: 'NL' }),
    }
  );
  if (!res.ok) throw new Error(`Map Tiles session failed (${res.status}): ${await res.text()}`);
  const { session } = await res.json();
  return session;
}

interface VenueMapProps {
  onCenterChange?: (lat: number, lng: number) => void;
  onActivePreview?: (data: PreviewData | null) => void;
  onHotspotClick?: (name: string) => void;
  onHotspotPosition?: (pos: { x: number; y: number } | null) => void;
}

export default function VenueMap({ onCenterChange, onActivePreview, onHotspotClick, onHotspotPosition }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stippleRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(onCenterChange);
  cbRef.current = onCenterChange;
  const previewCbRef = useRef(onActivePreview);
  previewCbRef.current = onActivePreview;
  const clickCbRef = useRef(onHotspotClick);
  clickCbRef.current = onHotspotClick;
  const hotspotPosCbRef = useRef(onHotspotPosition);
  hotspotPosCbRef.current = onHotspotPosition;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let leafletMap: any = null;
    let cancelled = false;
    let rafId = 0;

    // Start slightly SE of NDSM center over the harbor — keeps all hotspots out of proximity on load
    const startLat = NDSM.lat - 0.0005;
    const startLng = NDSM.lng + 0.0008;
    let targetLat = startLat;
    let targetLng = startLng;
    let currentLat = startLat;
    let currentLng = startLng;
    let targetZoom = ZOOM_DEFAULT;
    let currentZoom = ZOOM_DEFAULT;

    let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    let wheelHandler: ((e: WheelEvent) => void) | null = null;
    let clickHandler: (() => void) | null = null;

    // Stipple overlay setup
    const composeCanvas = document.createElement('canvas');
    const resizeStipple = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (stippleRef.current) { stippleRef.current.width = W; stippleRef.current.height = H; }
      composeCanvas.width = W;
      composeCanvas.height = H;
    };
    resizeStipple();
    window.addEventListener('resize', resizeStipple);

    // --- Spatial audio ---
    const audioCtx = new AudioContext();
    const hotspotGroups = groupBySrc(HOTSPOTS);

    // src → { gainNode, audioEl }
    const players = new Map<string, { gainNode: GainNode; audioEl: HTMLAudioElement }>();

    for (const [src] of hotspotGroups) {
      const audioEl = new Audio(src);
      audioEl.loop = true;
      const source = audioCtx.createMediaElementSource(audioEl);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      players.set(src, { gainNode, audioEl });
    }

    // Passive port ambient — fixed low gain, always on
    const portEl = new Audio('/audio/map/port.mp3');
    portEl.loop = true;
    const portSource = audioCtx.createMediaElementSource(portEl);
    const portGain = audioCtx.createGain();
    portGain.gain.value = 0.15;
    portSource.connect(portGain);
    portGain.connect(audioCtx.destination);

    // Browsers block AudioContext until a real user gesture (pointerdown/mousedown)
    const startAudio = () => {
      audioCtx.resume().then(() => {
        for (const { audioEl } of players.values()) audioEl.play().catch(() => {});
        portEl.play().catch(() => {});
      });
    };
    document.addEventListener('pointerdown', startAudio, { once: true });

    // --- Map ---
    (async () => {
      try {
        const [{ default: L }, session] = await Promise.all([
          import('leaflet'),
          createSession(),
        ]);

        if (cancelled) return;

        leafletMap = L.map(el, {
          center: [startLat, startLng],
          zoom: ZOOM_DEFAULT,
          zoomControl: false,
          zoomSnap: 0.1,
          zoomDelta: 1,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          keyboard: false,
          boxZoom: false,
        });

        leafletMap.invalidateSize();

        L.tileLayer(
          `/api/map-tile?z={z}&x={x}&y={y}&session=${session}&key=${API_KEY}`,
          { attribution: '© Google', maxZoom: 20, updateWhenZooming: false, keepBuffer: 4 }
        ).addTo(leafletMap);

        leafletMap.setView([startLat, startLng], ZOOM_DEFAULT);
        (leafletMap.getPanes().tilePane as HTMLElement).style.filter = 'grayscale(1)';

        // RAF loop — lerps position/zoom and updates audio gains + preview state
        let prevPreviewKey: string | null = null;
        let currentPreviewName: string | null = null; // read by click handler

        const tick = () => {
          if (!leafletMap) return;

          currentLat += (targetLat - currentLat) * LERP;
          currentLng += (targetLng - currentLng) * LERP;
          currentZoom += (targetZoom - currentZoom) * LERP;

          leafletMap.setView([currentLat, currentLng], currentZoom, { animate: false });
          cbRef.current?.(currentLat, currentLng);

          // Update each audio source's gain from the lerped map position
          if (audioCtx.state === 'running') {
            for (const [src, spots] of hotspotGroups) {
              const player = players.get(src);
              if (!player) continue;
              const gain = spots.reduce((max, spot) => {
                const d = haversine(currentLat, currentLng, spot.lat, spot.lng);
                return Math.max(max, proximityGain(d, spot.innerR, spot.outerR));
              }, 0);
              // Smooth ramp — time constant 0.3 s avoids clicks
              player.gainNode.gain.setTargetAtTime(gain, audioCtx.currentTime, 0.3);
            }
          }

          // Preview detection — find the closest non-ocean hotspot in range
          let bestPreview: PreviewData | null = null;
          let bestGain = 0;
          let bestSpot: Hotspot | null = null;
          for (const spot of HOTSPOTS) {
            if (!spot.preview) continue;
            const d = haversine(currentLat, currentLng, spot.lat, spot.lng);
            const g = proximityGain(d, spot.innerR, spot.outerR);
            if (g > bestGain) { bestGain = g; bestPreview = spot.preview; bestSpot = spot; }
          }
          const previewKey = bestGain > 0.05 ? (bestPreview?.name ?? null) : null;
          if (previewKey !== prevPreviewKey) {
            prevPreviewKey = previewKey;
            previewCbRef.current?.(previewKey ? bestPreview : null);
          }
          currentPreviewName = previewKey;

          // Emit screen-space position of the active hotspot for the marker overlay
          if (previewKey && bestSpot && leafletMap) {
            const pt   = leafletMap.latLngToContainerPoint([bestSpot.lat, bestSpot.lng]);
            const rect = el.getBoundingClientRect();
            hotspotPosCbRef.current?.({ x: pt.x + rect.left, y: pt.y + rect.top });
          } else if (!previewKey) {
            hotspotPosCbRef.current?.(null);
          }

          // Stipple overlay — composite visible tile images then draw halftone pass
          const stippleCanvas = stippleRef.current;
          if (stippleCanvas && stippleCanvas.width > 0) {
            const stippleCtx = stippleCanvas.getContext('2d');
            const composeCtx = composeCanvas.getContext('2d', { willReadFrequently: true });
            if (stippleCtx && composeCtx) {
              composeCtx.clearRect(0, 0, composeCanvas.width, composeCanvas.height);
              const containerRect = el.getBoundingClientRect();
              el.querySelectorAll('img.leaflet-tile').forEach((tile) => {
                const img = tile as HTMLImageElement;
                if (!img.complete || !img.naturalWidth) return;
                const r = img.getBoundingClientRect();
                try {
                  composeCtx.drawImage(img, r.left - containerRect.left, r.top - containerRect.top, r.width, r.height);
                } catch { /* cross-origin taint — skip tile */ }
              });
              drawStipple(stippleCtx, composeCanvas, MAP_STIPPLE);
            }
          }

          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        mouseMoveHandler = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const offsetX = e.clientX - rect.left - rect.width / 2;
          const offsetY = e.clientY - rect.top - rect.height / 2;
          targetLat = clamp(NDSM.lat - offsetY * PAN_SCALE, NDSM.lat - BOUND_LAT, NDSM.lat + BOUND_LAT);
          targetLng = clamp(NDSM.lng + offsetX * PAN_SCALE, NDSM.lng - BOUND_LNG, NDSM.lng + BOUND_LNG);
        };

        wheelHandler = (e: WheelEvent) => {
          e.preventDefault();
          targetZoom = clamp(targetZoom + (e.deltaY < 0 ? 1 : -1) * 0.8, ZOOM_MIN, ZOOM_MAX);
        };

        clickHandler = () => {
          if (currentPreviewName) clickCbRef.current?.(currentPreviewName);
        };
        el.addEventListener('mousemove', mouseMoveHandler);
        el.addEventListener('wheel', wheelHandler, { passive: false });
        el.addEventListener('click', clickHandler);
      } catch (err) {
        console.error('[VenueMap]', err);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeStipple);
      document.removeEventListener('pointerdown', startAudio);
      if (mouseMoveHandler) el.removeEventListener('mousemove', mouseMoveHandler);
      if (wheelHandler) el.removeEventListener('wheel', wheelHandler);
      if (clickHandler) el.removeEventListener('click', clickHandler);
      leafletMap?.remove();
      for (const { audioEl } of players.values()) { audioEl.pause(); audioEl.src = ''; }
      portEl.pause(); portEl.src = '';
      audioCtx.close();
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      {/* zIndex: 0 creates a stacking context, containing Leaflet's internal z-indexes */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      {/* zIndex: 1 paints above the Leaflet container's stacking context */}
      <canvas
        ref={stippleRef}
        style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none', zIndex: 1 }}
      />
    </div>
  );
}
