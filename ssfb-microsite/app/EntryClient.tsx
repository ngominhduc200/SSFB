'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import StippleText from '@/components/StippleText/StippleText';
import { playClickSound } from '@/utils/playClickSound';

const HIDDEN_MASK = 'radial-gradient(ellipse 0px 0px at 50% 50%, transparent 100%, transparent 100%)';

const BLACK_MATRIX = '0.801 0.801 0.801 0 -1.404  0.801 0.801 0.801 0 -1.404  0.801 0.801 0.801 0 -1.404  0 0 0 1 0';

const GLITCH_CHARS  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#!|/\\><^';
const GLITCH_FRAMES = 12;
const CTA_PHRASES   = ["[WHAT'S YOUR SOUND?]", '[CLICK TO ENTER SITE]'] as const;

const ZONE_CENTERS = [1 / 6, 1 / 2, 5 / 6] as const;
const ZONE_FALLOFF = 1 / 3;
const ZONE_MAX_VOL = 0.75;
const ZONE_SRCS    = [
  '/audio/Nihiloxica.mp3',
  '/audio/Vladimir.mp3',
  '/audio/Alessandro.mp3',
] as const;

export default function EntryClient() {
  const greyVideoRef   = useRef<HTMLVideoElement>(null);
  const redVideoRef    = useRef<HTMLVideoElement>(null);
  const overlayWrapRef = useRef<HTMLDivElement>(null);
  const zoneRefs        = useRef<(HTMLAudioElement | null)[]>([null, null, null]);
  const ctaRef          = useRef<HTMLAnchorElement>(null);
  const ctaTextRef      = useRef<HTMLSpanElement>(null);
  const scrambleRafRef  = useRef<number | null>(null);
  const scrambleFrameRef = useRef(0);
  const ctaPhraseIdxRef = useRef(0);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const grey = greyVideoRef.current;
    const red  = redVideoRef.current;
    if (!grey || !red) return;

    const onReady = () => {
      grey.playbackRate = 0.6;
      grey.play().catch(() => {});
      try {
        const captureStream = (grey as HTMLVideoElement & {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        });
        const stream = captureStream.captureStream?.() ?? captureStream.mozCaptureStream?.();
        if (stream) {
          red.srcObject = stream;
          red.play().catch(() => {});
          return;
        }
      } catch { /* not supported */ }
      red.src = '/videos/entry-grey.mp4';
      red.currentTime = 0;
      red.play().catch(() => {});
    };

    grey.addEventListener('canplaythrough', onReady, { once: true });
    return () => grey.removeEventListener('canplaythrough', onReady);
  }, []);

  useEffect(() => {
    const scrambleTo = (target: string) => {
      if (scrambleRafRef.current) cancelAnimationFrame(scrambleRafRef.current);
      scrambleFrameRef.current = 0;
      const tick = () => {
        scrambleFrameRef.current++;
        const progress = Math.min(scrambleFrameRef.current / GLITCH_FRAMES, 1);
        const resolved = Math.floor(progress * target.length);
        const result = target.split('').map((char, i) => {
          if (i < resolved) return char;
          if (char === ' ') return ' ';
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }).join('');
        if (ctaTextRef.current) ctaTextRef.current.textContent = result;
        if (scrambleFrameRef.current < GLITCH_FRAMES) {
          scrambleRafRef.current = requestAnimationFrame(tick);
        } else {
          if (ctaTextRef.current) ctaTextRef.current.textContent = target;
          scrambleRafRef.current = null;
        }
      };
      scrambleRafRef.current = requestAnimationFrame(tick);
    };

    const interval = setInterval(() => {
      ctaPhraseIdxRef.current = (ctaPhraseIdxRef.current + 1) % CTA_PHRASES.length;
      scrambleTo(CTA_PHRASES[ctaPhraseIdxRef.current]);
    }, 3000);

    return () => {
      clearInterval(interval);
      if (scrambleRafRef.current) cancelAnimationFrame(scrambleRafRef.current);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX;

    if (overlayWrapRef.current) {
      const mask = `linear-gradient(to right, transparent calc(${x}px - 30px), black calc(${x}px - 30px), black calc(${x}px + 30px), transparent calc(${x}px + 30px))`;
      overlayWrapRef.current.style.maskImage = mask;
      (overlayWrapRef.current.style as unknown as { webkitMaskImage: string }).webkitMaskImage = mask;
    }

    if (ctaRef.current) {
      ctaRef.current.style.transform = `translate(calc(${x}px - 50%), calc(${e.clientY}px - 50%))`;
      ctaRef.current.style.opacity   = '1';
    }

    const xNorm = x / window.innerWidth;
    zoneRefs.current.forEach((audio, i) => {
      if (!audio) return;
      const dist   = Math.abs(xNorm - ZONE_CENTERS[i]);
      const linear = Math.max(0, 1 - dist / ZONE_FALLOFF);
      const vol    = linear * linear * ZONE_MAX_VOL;
      audio.volume = vol;
      if (vol > 0 && audio.paused) audio.play().catch(() => {});
      else if (vol === 0 && !audio.paused) audio.pause();
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (overlayWrapRef.current) {
      overlayWrapRef.current.style.maskImage = HIDDEN_MASK;
      (overlayWrapRef.current.style as unknown as { webkitMaskImage: string }).webkitMaskImage = HIDDEN_MASK;
    }
    zoneRefs.current.forEach(audio => audio?.pause());
    if (ctaRef.current) ctaRef.current.style.opacity = '0';
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      zoneRefs.current.forEach(audio => { if (audio) audio.muted = next; });
      return next;
    });
  }, []);

  return (
    <div className="contents">
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden>
        <defs>
          <filter id="grey-to-black" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={BLACK_MATRIX} />
          </filter>
          <filter id="grey-to-red" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" result="grey"/>
            <feComponentTransfer in="grey" result="bw">
              <feFuncR type="linear" slope="100" intercept="-80"/>
              <feFuncG type="linear" slope="100" intercept="-80"/>
              <feFuncB type="linear" slope="100" intercept="-80"/>
            </feComponentTransfer>
            <feColorMatrix type="matrix" in="bw"
              values="0 0 0 0 1  1 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
          </filter>
        </defs>
      </svg>

      <div
        className="fixed inset-0 z-[200] bg-white overflow-hidden"
        style={{ cursor: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {ZONE_SRCS.map((src, i) => (
          <audio
            key={src}
            ref={el => { zoneRefs.current[i] = el; }}
            src={src}
            loop
            preload="auto"
          />
        ))}

        <video
          ref={greyVideoRef}
          src="/videos/entry-grey.mp4"
          className="absolute inset-0 w-full h-full object-cover"
          muted loop playsInline preload="auto"
          style={{ filter: 'url(#grey-to-black)' }}
        />

        <div
          ref={overlayWrapRef}
          className="absolute inset-0 pointer-events-none"
          style={{ maskImage: HIDDEN_MASK, WebkitMaskImage: HIDDEN_MASK }}
        >
          <video
            ref={redVideoRef}
            className="absolute inset-0 w-full h-full object-cover"
            muted playsInline
            style={{ filter: 'url(#grey-to-red)' }}
          />
        </div>

        <StippleText
          text="Strange"
          dotColor="#FF0000"
          canvasWidth={1400}
          align="left"
          style={{ position: 'absolute', pointerEvents: 'none', left: '10.12%', top: 'calc(17.82% - 4vw)', width: '106vw', maxWidth: 'none', height: 'auto' }}
        />
        <StippleText
          text="Sounds"
          dotColor="#FF0000"
          canvasWidth={1400}
          align="left"
          style={{ position: 'absolute', pointerEvents: 'none', left: '56.9%', top: 'calc(38.7% - 4vw)', width: '106vw', maxWidth: 'none', height: 'auto' }}
        />
        <StippleText
          text="From Beyond"
          dotColor="#FF0000"
          canvasWidth={1400}
          align="left"
          style={{ position: 'absolute', pointerEvents: 'none', left: '20.43%', top: 'calc(62.6% - 4vw)', width: '106vw', maxWidth: 'none', height: 'auto' }}
        />

        <span className="absolute pointer-events-none uppercase" style={{ fontFamily: 'var(--font-ui)', fontSize: 16, color: '#000000', top: 24, left: 24, backgroundColor: '#ffffff', lineHeight: 1, display: 'inline-block' }}>[Amsterdam]</span>
        <span className="absolute pointer-events-none uppercase" style={{ fontFamily: 'var(--font-ui)', fontSize: 16, color: '#000000', bottom: 24, left: 24, backgroundColor: '#ffffff', lineHeight: 1, display: 'inline-block' }}>[strangesoundsfrombeyond.com]</span>

        <Link
          ref={ctaRef}
          href="/home"
          className="label entry-cta"
          style={{ position: 'fixed', top: 0, left: 0, transform: 'translate(-9999px, -9999px)', opacity: 0, pointerEvents: 'auto', cursor: 'none', padding: 0, lineHeight: 1, textAlign: 'center', backgroundColor: '#FF0000', color: '#ffffff' }}
          onClick={playClickSound}
        >
          <span ref={ctaTextRef}>{CTA_PHRASES[0]}</span>
        </Link>

        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="absolute"
          style={{ top: 24, right: 24, background: 'black', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>

        <div className="absolute flex items-center gap-6" style={{ bottom: 24, right: 24 }}>
          <span className="pointer-events-none uppercase" style={{ fontFamily: 'var(--font-ui)', fontSize: 16, color: '#000000', backgroundColor: '#ffffff', lineHeight: 1, display: 'inline-block' }}>[2018]</span>
          <span className="pointer-events-none uppercase" style={{ fontFamily: 'var(--font-ui)', fontSize: 16, color: '#000000', backgroundColor: '#ffffff', lineHeight: 1, display: 'inline-block' }}>[23-24.06]</span>
        </div>
      </div>

    </div>
  );
}
