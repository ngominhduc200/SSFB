'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { stages } from '@/data/stages';
import VenueMap, { type PreviewData } from '@/components/VenueMap/VenueMap';
import { playClickSound } from '@/utils/playClickSound';

const NDSM = { lat: 52.39954835689703, lng: 4.896741011546972 };
const FOOD = ['VEBAN', 'IJVER', 'NDSM WERF'];
const CULTURE = ['NDSM WERF', 'FLOCK THEATER'];

// Maps each hotspot preview name → which bottom-nav items it highlights
const HOTSPOT_HIGHLIGHTS: Record<string, string[]> = {
  'STAGE':         ['THE REST IS NOISE', 'RED LIGHT RADIO', 'TENT'],
  'VEBAN':         ['VEBAN'],
  'IJVER':         ['IJVER'],
  'NDSM WERF':     ['NDSM WERF'],
  'FLOCK THEATER': ['FLOCK THEATER'],
};

const CARD_W = 220;
const CARD_H = 280;

export default function ExplorePage() {
  const router = useRouter();
  const [center, setCenter] = useState(NDSM);
  const [activePreview, setActivePreview] = useState<PreviewData | null>(null);
  const [introOpaque, setIntroOpaque] = useState(false);
  const [introGone, setIntroGone] = useState(false);
  const [zooming, setZooming] = useState(false);

  // Smooth custom cursor — lerps toward real mouse position each RAF tick
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorSquareRef = useRef<HTMLDivElement>(null);
  const topLineRef = useRef<HTMLDivElement>(null);
  const bottomLineRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const hotspotMarkerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -100, y: -100 });
  const displayRef = useRef({ x: -100, y: -100 });
  const hoverProgressRef = useRef(0); // drives line height
  const colorProgressRef = useRef(0); // drives cursor color — stays at 1 until lines are gone
  const isHoveringRef = useRef(false);
  const prevMouseVelRef = useRef({ x: 0, y: 0 }); // for velocity-based intro dismiss

  useEffect(() => {
    let mounted = true;

    // Cursor starts offset to match VenueMap's initial position (startLat/startLng, 0.0005° S + 0.0008° E of NDSM)
    // offsetX = 0.0008 / PAN_SCALE(0.000012) = 67px east, offsetY = 0.0005 / 0.000012 = 42px south
    const cx0 = window.innerWidth / 2 + 67;
    const cy0 = window.innerHeight / 2 + 42;
    mouseRef.current = { x: cx0, y: cy0 };
    displayRef.current = { x: cx0, y: cy0 };
    prevMouseVelRef.current = { x: cx0, y: cy0 };

    // Intro label — fade in next frame, dismiss after 5s or on vigorous movement
    let introDismissed = false;
    const dismissIntro = () => {
      if (introDismissed) return;
      introDismissed = true;
      setIntroOpaque(false);
      setTimeout(() => { if (mounted) setIntroGone(true); }, 450);
    };

    // Trigger fade-in after one paint
    const fadeInRaf = requestAnimationFrame(() => { if (mounted) setIntroOpaque(true); });
    const autoDismiss = setTimeout(dismissIntro, 5000);

    const LERP = 0.12;
    const HOVER_LERP = 0.07;
    const LINE_MAX = 700;
    const VELOCITY_DISMISS = 10; // px/frame — vigorous movement threshold
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      displayRef.current.x += (mouseRef.current.x - displayRef.current.x) * LERP;
      displayRef.current.y += (mouseRef.current.y - displayRef.current.y) * LERP;
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${displayRef.current.x - 12}px, ${displayRef.current.y - 12}px)`;
      }
      if (previewCardRef.current) {
        const cx = displayRef.current.x;
        const cy = displayRef.current.y;
        const margin = 28;
        let px = cx + margin;
        let py = cy - CARD_H / 2;
        if (px + CARD_W > window.innerWidth - 8) px = cx - margin - CARD_W;
        py = Math.max(80, Math.min(py, window.innerHeight - CARD_H - 8));
        previewCardRef.current.style.transform = `translate(${px}px, ${py}px)`;
      }

      // Velocity-based intro dismiss
      if (!introDismissed) {
        const dx = mouseRef.current.x - prevMouseVelRef.current.x;
        const dy = mouseRef.current.y - prevMouseVelRef.current.y;
        if (dx * dx + dy * dy > VELOCITY_DISMISS * VELOCITY_DISMISS) dismissIntro();
      }
      prevMouseVelRef.current = { x: mouseRef.current.x, y: mouseRef.current.y };

      // Cursor hotspot microinteraction
      hoverProgressRef.current +=
        ((isHoveringRef.current ? 1 : 0) - hoverProgressRef.current) * HOVER_LERP;
      const colorTarget = isHoveringRef.current || hoverProgressRef.current > 0.03 ? 1 : 0;
      colorProgressRef.current += (colorTarget - colorProgressRef.current) * HOVER_LERP;
      const r = Math.round(colorProgressRef.current * 255);
      const lineH = Math.round(hoverProgressRef.current * LINE_MAX);
      if (cursorSquareRef.current)
        cursorSquareRef.current.style.backgroundColor = `rgb(${r},0,0)`;
      if (topLineRef.current) topLineRef.current.style.height = `${lineH}px`;
      if (bottomLineRef.current) bottomLineRef.current.style.height = `${lineH}px`;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    window.addEventListener('mousemove', onMove);
    return () => {
      mounted = false;
      cancelAnimationFrame(fadeInRaf);
      clearTimeout(autoDismiss);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleHotspotClick = (name: string) => {
    if (name !== 'STAGE' || zooming) return;
    setZooming(true);
    setTimeout(() => router.push('/home?from=explore'), 650);
  };

  const highlightedItems = activePreview ? (HOTSPOT_HIGHLIGHTS[activePreview.name] ?? []) : [];

  return (
    <main className="relative flex-1 overflow-hidden cursor-none">
      {/* Interactive Google Map — fills viewport; scales out on STAGE click */}
      <div
        style={{
          position: 'absolute', inset: 0,
          transformOrigin: 'center center',
          animation: zooming ? 'zoom-to-3d 0.65s ease-in forwards' : undefined,
        }}
      >
        <VenueMap
          onCenterChange={(lat, lng) => setCenter({ lat, lng })}
          onActivePreview={(data) => {
            setActivePreview(data);
            isHoveringRef.current = data !== null;
          }}
          onHotspotClick={handleHotspotClick}
          onHotspotPosition={(pos) => {
            const el = hotspotMarkerRef.current;
            if (!el) return;
            if (pos) {
              el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
              el.style.opacity = '1';
            } else {
              el.style.opacity = '0';
            }
          }}
        />
      </div>

      {/* Hotspot marker — red square + name label, position driven by VenueMap via direct DOM update */}
      <div
        ref={hotspotMarkerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          zIndex: 70,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div style={{ width: 12, height: 12, backgroundColor: '#FF0000', flexShrink: 0 }} />
        <div style={{
          backgroundColor: '#000',
          padding: '4px 8px',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '-0.48px',
          color: '#FF0000',
          whiteSpace: 'nowrap',
        }}>
          {activePreview?.name ?? ''}
        </div>
      </div>

      {/* Red logo — replaces the plain Nav link on this page */}
      <Link
        href="/home"
        onClick={playClickSound}
        style={{ position: 'fixed', top: 18, left: 24, zIndex: 60, display: 'block', lineHeight: 0, backgroundColor: '#000', padding: '8px 10px' }}
      >
        <img src="/images/logored.svg" alt="SSFB" style={{ width: 90, height: 'auto', display: 'block' }} />
      </Link>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end px-6 pb-6 h-55 z-10">
        {/* Directory listing */}
        <nav className="flex gap-4">
          {/* STAGE column */}
          <div className="w-50">
            <div className="font-ui font-semibold text-[16px] uppercase tracking-[-0.64px] text-red mb-3.5" style={{ backgroundColor: '#000', padding: '2px 8px', width: 'fit-content' }}>
              STAGE
            </div>
            <ul className="flex flex-col gap-3.5">
              {stages.map((stage) => (
                <li key={stage.id} style={{ position: 'relative', overflow: 'hidden' }}>
                  <Link
                    href={`/stage/${stage.id}`}
                    className="font-ui text-[16px] uppercase tracking-[-0.64px] hover:opacity-60 transition-opacity"
                    style={{ color: '#FF0000', backgroundColor: '#000', padding: '2px 8px', display: 'inline-block' }}
                  >
                    {stage.name}
                  </Link>
                  {highlightedItems.includes(stage.name) && (
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        pointerEvents: 'none',
                        display: 'flex', alignItems: 'center',
                        animation: 'nav-highlight-sweep 0.65s ease-out forwards',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '-0.64px', color: '#000' }}>
                        {stage.name}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* FOOD column */}
          <div className="w-50">
            <div className="font-ui font-semibold text-[16px] uppercase tracking-[-0.64px] text-red mb-3.5" style={{ backgroundColor: '#000', padding: '2px 8px', width: 'fit-content' }}>
              FOOD
            </div>
            <ul className="flex flex-col gap-3.5">
              {FOOD.map((item) => (
                <li key={item} style={{ position: 'relative', overflow: 'hidden' }}>
                  <span className="font-ui text-[16px] uppercase tracking-[-0.64px] text-red" style={{ backgroundColor: '#000', padding: '2px 8px', display: 'inline-block' }}>
                    {item}
                  </span>
                  {highlightedItems.includes(item) && (
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        pointerEvents: 'none',
                        display: 'flex', alignItems: 'center',
                        animation: 'nav-highlight-sweep 0.65s ease-out forwards',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '-0.64px', color: '#000' }}>
                        {item}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* CULTURE column */}
          <div className="w-50">
            <div className="font-ui font-semibold text-[16px] uppercase tracking-[-0.64px] text-red mb-3.5" style={{ backgroundColor: '#000', padding: '2px 8px', width: 'fit-content' }}>
              CULTURE
            </div>
            <ul className="flex flex-col gap-3.5">
              {CULTURE.map((item) => (
                <li key={item} style={{ position: 'relative', overflow: 'hidden' }}>
                  <span className="font-ui text-[16px] uppercase tracking-[-0.64px] text-red" style={{ backgroundColor: '#000', padding: '2px 8px', display: 'inline-block' }}>
                    {item}
                  </span>
                  {highlightedItems.includes(item) && (
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        pointerEvents: 'none',
                        display: 'flex', alignItems: 'center',
                        animation: 'nav-highlight-sweep 0.65s ease-out forwards',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '-0.64px', color: '#000' }}>
                        {item}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Right: live lat/lng — updates as the map is panned */}
        <div className="ml-auto flex flex-col items-end gap-1.5 mb-2">
          <span className="font-ui font-semibold text-[16px] uppercase tracking-[-0.64px] text-red" style={{ backgroundColor: '#000', padding: '2px 8px' }}>
            LATITUDE · LONGITUDE
          </span>
          <span className="font-ui text-[14px] tabular-nums tracking-[-0.56px] text-red" style={{ backgroundColor: '#000', padding: '2px 8px' }}>
            {center.lat.toFixed(4)}° N
          </span>
          <span className="font-ui text-[14px] tabular-nums tracking-[-0.56px] text-red" style={{ backgroundColor: '#000', padding: '2px 8px' }}>
            {center.lng.toFixed(4)}° E
          </span>
        </div>
      </div>
      {/* Hotspot preview card — follows cursor, fades in when near a sound zone */}
      <div
        ref={previewCardRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: CARD_W,
          height: CARD_H,
          backgroundColor: '#000',
          border: '2px solid #1a1a1a',
          overflow: 'hidden',
          opacity: activePreview && !activePreview.hintText ? 1 : 0,
          transition: 'opacity 0.35s ease',
          pointerEvents: 'none',
          zIndex: 80,
        }}
      >
        {/* B&W background image (when provided) */}
        {activePreview?.image && (
          <img
            src={activePreview.image}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: activePreview?.objectPosition ?? 'center',
              filter: 'grayscale(1)',
            }}
          />
        )}

        {/* Large venue / location label — Flama Condensed, red, top-left */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            fontFamily: 'var(--font-display)',
            fontSize: 52,
            lineHeight: 1,
            color: '#FF0000',
            textTransform: 'uppercase',
            zIndex: 1,
          }}
        >
          {activePreview?.name}
        </div>

        {/* Scrolling PLAYING NOW text — Azeret Mono, red, solid black bg for readability */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            overflow: 'hidden',
            padding: '7px 0',
            zIndex: 1,
            backgroundColor: '#000',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-ui)',
              fontSize: 10,
              letterSpacing: '-0.3px',
              textTransform: 'uppercase',
              color: '#FF0000',
              animation: 'explore-marquee 10s linear infinite',
            }}
          >
            {activePreview
              ? `PLAYING NOW: ${activePreview.nowPlaying}  ·  PLAYING NOW: ${activePreview.nowPlaying}  ·  `
              : ''}
          </div>
        </div>
      </div>

      {/* Smooth custom cursor — 24×24 square + hotspot lines */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-100"
        style={{ width: 24, height: 24, position: 'relative' }}
      >
        {/* Colored square — interpolates black → red on hotspot enter */}
        <div
          ref={cursorSquareRef}
          style={{ width: 24, height: 24, backgroundColor: '#000' }}
        />

        {/* Intro label — fades in on load, dismisses after 5s or on vigorous movement */}
        {!introGone && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 26,
              backgroundColor: '#000',
              padding: '9px 11px',
              opacity: introOpaque ? 1 : 0,
              transition: 'opacity 0.45s ease',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 20,
                fontWeight: 400,
                color: '#FF2200',
                textTransform: 'uppercase',
                letterSpacing: '-0.8px',
                lineHeight: 0.855,
              }}
            >
              EXPLORE NDSM
            </span>
          </div>
        )}
        {/* Hotspot hint box — fades in for stage/special hotspots instead of preview card */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 26,
            backgroundColor: '#000',
            padding: '9px 11px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: activePreview?.hintText ? 1 : 0,
            transition: 'opacity 0.35s ease',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 20,
              fontWeight: 400,
              color: '#FF2200',
              textTransform: 'uppercase',
              letterSpacing: '-0.8px',
              lineHeight: 0.855,
            }}
          >
            {activePreview?.hintText ?? ''}
          </span>
        </div>

        {/* Top vertical line — grows upward from cursor's top edge */}
        <div
          ref={topLineRef}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 2,
            height: 0,
            backgroundColor: '#FF0000',
          }}
        />
        {/* Bottom vertical line — grows downward from cursor's bottom edge */}
        <div
          ref={bottomLineRef}
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 2,
            height: 0,
            backgroundColor: '#FF0000',
          }}
        />
      </div>
    </main>
  );
}
