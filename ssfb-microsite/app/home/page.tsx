'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import NoordelichtScene from '@/components/NoordelichtScene/NoordelichtScene';
import { stages } from '@/data/stages';
import { playClickSound } from '@/utils/playClickSound';

const NDSM = { lat: 52.39954835689703, lng: 4.896741011546972 };

// ── Stage definitions ──────────────────────────────────────────────────────
const STAGES = {
  A: {
    nx: 0.38, ny: 0.44,
    src: '/audio/Nihiloxica.mp3',
    stageName: 'THE REST IS NOISE',
    stageId: 'stage-a',
    artist: 'NIHILOXICA',
    image: '/images/artists/Nihiloxica.png',
  },
  B: {
    nx: 0.75, ny: 0.25,
    src: '/audio/Alessandro.mp3',
    stageName: 'TENT',
    stageId: 'stage-c',
    artist: 'ALESSANDRO ADRIANI & THE HACKER',
    image: '/images/artists/Alessandro Adriani & The Hacker.png',
  },
  C: {
    nx: 0.75, ny: 0.75,
    src: '/audio/Vladimir.mp3',
    stageName: 'RED LIGHT RADIO',
    stageId: 'stage-b',
    artist: 'VLADIMIR IVKOVIC',
    image: '/images/artists/Vladimir Ivkovic.png',
  },
} as const;

type StageId = keyof typeof STAGES;
type InfoboxPhase = 'hidden' | 'showing' | 'visible' | 'hiding';

const PROX_RADIUS = 0.20;

function getZone(nx: number, ny: number): StageId {
  if (nx < 0.5)  return 'A';
  if (ny < 0.5)  return 'B';
  return 'C';
}

// ─────────────────────────────────────────────────────────────────────────────

function HomeContent() {
  const searchParams = useSearchParams();
  const flyIn = searchParams.get('from') === 'explore';
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [center, setCenter]           = useState(NDSM);
  const [introOpaque, setIntroOpaque] = useState(false);
  const [introGone, setIntroGone]     = useState(false);
  const [activeStage, setActiveStage] = useState<StageId | null>(null);
  const [infoboxPhase, setInfoboxPhase] = useState<InfoboxPhase>('hidden');
  const [animKey, setAnimKey]         = useState(0);

  const cursorRef       = useRef<HTMLDivElement>(null);
  const mouseRef        = useRef({ x: -200, y: -200 });
  const displayRef      = useRef({ x: -200, y: -200 });
  const prevMouseRef    = useRef({ x: -200, y: -200 });
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const freqDataRef     = useRef(new Uint8Array(128));
  const vizCanvasRef    = useRef<HTMLCanvasElement | null>(null);
  const activeStageRef  = useRef<StageId | null>(null);
  const infoboxPhaseRef = useRef<InfoboxPhase>('hidden');
  const infoboxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animKeyRef      = useRef(0);

  useEffect(() => { infoboxPhaseRef.current = infoboxPhase; }, [infoboxPhase]);

  // ── Spatial audio ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audioCtx = new AudioContext();
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyserRef.current = analyser;

    type Node = { el: HTMLAudioElement; filter: BiquadFilterNode; gain: GainNode };
    const nodes: Record<StageId, Node> = {} as Record<StageId, Node>;

    for (const [id, stage] of Object.entries(STAGES) as [StageId, typeof STAGES[StageId]][]) {
      const el     = new Audio(stage.src);
      el.loop      = true;
      const src    = audioCtx.createMediaElementSource(el);
      const filter = audioCtx.createBiquadFilter();
      const gain   = audioCtx.createGain();
      filter.type            = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value         = 0.5;
      gain.gain.value        = 0.05;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      nodes[id] = { el, filter, gain };
    }

    const startAudio = () => {
      audioCtx.resume().then(() => {
        for (const { el } of Object.values(nodes)) el.play().catch(() => {});
      });
    };
    document.addEventListener('pointerdown', startAudio, { once: true });

    const MAX_DIST = 0.45;
    let rafId: number;

    const audioTick = () => {
      if (audioCtx.state === 'running') {
        const nx = displayRef.current.x / window.innerWidth;
        const ny = displayRef.current.y / window.innerHeight;
        const activeZone = getZone(nx, ny);
        const now = audioCtx.currentTime;
        for (const [id, node] of Object.entries(nodes) as [StageId, Node][]) {
          const stage = STAGES[id];
          const dist  = Math.hypot(nx - stage.nx, ny - stage.ny);
          let targetGain: number, targetFreq: number;
          if (id === activeZone) {
            const t = Math.max(0, 1 - dist / MAX_DIST);
            const tEased = t * t;
            targetFreq = 300  + (20000 - 300)  * tEased;
            targetGain = 0.18 + (1.0   - 0.18) * tEased;
          } else {
            targetFreq = 180;
            targetGain = 0.04;
          }
          node.filter.frequency.setTargetAtTime(targetFreq, now, 0.3);
          node.gain.gain.setTargetAtTime(targetGain,        now, 0.3);
        }
      }
      rafId = requestAnimationFrame(audioTick);
    };
    rafId = requestAnimationFrame(audioTick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('pointerdown', startAudio);
      for (const { el } of Object.values(nodes)) { el.pause(); el.src = ''; }
      analyserRef.current = null;
      audioCtx.close();
    };
  }, []);

  // ── Cursor, intro hint, proximity, visualizer ──────────────────────────────
  useEffect(() => {
    let mounted = true;
    let introDismissed = false;

    const cx0 = window.innerWidth / 2;
    const cy0 = window.innerHeight / 2;
    mouseRef.current    = { x: cx0, y: cy0 };
    displayRef.current  = { x: cx0, y: cy0 };
    prevMouseRef.current = { x: cx0, y: cy0 };

    const dismissIntro = () => {
      if (introDismissed) return;
      introDismissed = true;
      setIntroOpaque(false);
      setTimeout(() => { if (mounted) setIntroGone(true); }, 450);
    };

    const fadeInRaf   = requestAnimationFrame(() => { if (mounted) setIntroOpaque(true); });
    const autoDismiss = setTimeout(dismissIntro, 5000);
    const LERP = 0.12, VELOCITY_DISMISS = 10;
    let rafId: number;

    const handleProximityChange = (newId: StageId | null) => {
      if (newId === activeStageRef.current) return;
      if (infoboxTimerRef.current) clearTimeout(infoboxTimerRef.current);

      if (newId !== null) {
        const wasOpen = activeStageRef.current !== null;
        activeStageRef.current = newId;
        setActiveStage(newId);
        if (!wasOpen) {
          animKeyRef.current++;
          setAnimKey(animKeyRef.current);
          setInfoboxPhase('showing');
          infoboxTimerRef.current = setTimeout(() => setInfoboxPhase('visible'), 450);
        }
      } else {
        activeStageRef.current = null;
        setInfoboxPhase('hiding');
        infoboxTimerRef.current = setTimeout(() => {
          setActiveStage(null);
          setInfoboxPhase('hidden');
        }, 450);
      }
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;
      let closestId: StageId | null = null;
      let closestDist = PROX_RADIUS;
      for (const [id, stage] of Object.entries(STAGES) as [StageId, typeof STAGES[StageId]][]) {
        const d = Math.hypot(nx - stage.nx, ny - stage.ny);
        if (d < closestDist) { closestId = id as StageId; closestDist = d; }
      }
      handleProximityChange(closestId);
    };

    const tick = () => {
      displayRef.current.x += (mouseRef.current.x - displayRef.current.x) * LERP;
      displayRef.current.y += (mouseRef.current.y - displayRef.current.y) * LERP;
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${displayRef.current.x - 12}px, ${displayRef.current.y - 12}px)`;
      }
      if (!introDismissed) {
        const dx = mouseRef.current.x - prevMouseRef.current.x;
        const dy = mouseRef.current.y - prevMouseRef.current.y;
        if (dx * dx + dy * dy > VELOCITY_DISMISS * VELOCITY_DISMISS) dismissIntro();
      }
      prevMouseRef.current = { x: mouseRef.current.x, y: mouseRef.current.y };

      // Visualizer
      const vc = vizCanvasRef.current;
      const an = analyserRef.current;
      if (vc && an && infoboxPhaseRef.current !== 'hidden') {
        an.getByteFrequencyData(freqDataRef.current);
        const vctx = vc.getContext('2d');
        if (vctx) {
          vctx.clearRect(0, 0, vc.width, vc.height);
          const BAR_COUNT = 48;
          const pitch = vc.width / BAR_COUNT;
          const barW  = Math.max(2, pitch * 0.55);
          const mid   = vc.height / 2;
          vctx.fillStyle = 'rgba(255,34,0,0.5)';
          vctx.fillRect(0, mid - 0.5, vc.width, 1);
          for (let i = 0; i < BAR_COUNT; i++) {
            const lo = Math.floor((i / BAR_COUNT) * 100);
            const hi = Math.max(lo + 1, Math.floor(((i + 1) / BAR_COUNT) * 100));
            let sum = 0;
            for (let b = lo; b < hi; b++) sum += (freqDataRef.current[b] || 0);
            const val  = (sum / (hi - lo)) / 255;
            const barH = val * (mid - 4);
            if (barH < 1) continue;
            vctx.fillStyle = 'rgba(255,34,0,0.88)';
            vctx.fillRect(i * pitch + (pitch - barW) / 2, mid - barH, barW, barH);
            vctx.fillStyle = 'rgba(255,34,0,0.25)';
            vctx.fillRect(i * pitch + (pitch - barW) / 2, mid + 1,    barW, barH * 0.4);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    const onClick = () => {
      if (activeStageRef.current) {
        routerRef.current.push('/stage/' + STAGES[activeStageRef.current].stageId);
      }
    };

    rafId = requestAnimationFrame(tick);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);
    return () => {
      mounted = false;
      cancelAnimationFrame(fadeInRaf);
      clearTimeout(autoDismiss);
      if (infoboxTimerRef.current) clearTimeout(infoboxTimerRef.current);
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
    };
  }, []);

  const stageInfo = activeStage ? STAGES[activeStage] : null;
  const activeStageNameForNav = stageInfo?.stageName ?? null;

  return (
    <main className="relative flex-1 overflow-hidden">
      <NoordelichtScene flyIn={flyIn} onCenterChange={(lat, lng) => setCenter({ lat, lng })} />

      {/* Top-left SSFB logo — mirrors explore page */}
      <Link
        href="/home"
        onClick={playClickSound}
        style={{ position: 'fixed', top: 18, left: 24, zIndex: 60, display: 'block', lineHeight: 0, backgroundColor: '#000', padding: '8px 10px' }}
      >
        <img src="/images/logored.svg" alt="SSFB" style={{ width: 90, height: 'auto', display: 'block' }} />
      </Link>

      {/* Bottom-left stage nav — single-stage highlight */}
      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 50 }}>
        <div style={{
          fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 16,
          textTransform: 'uppercase', letterSpacing: '-0.64px',
          color: '#FF0000', backgroundColor: '#000', padding: '2px 8px',
          width: 'fit-content', marginBottom: 14,
        }}>
          STAGE
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, listStyle: 'none', padding: 0, margin: 0 }}>
          {stages.map(stage => (
            <li key={stage.id} style={{ position: 'relative', overflow: 'hidden' }}>
              <Link
                href={`/stage/${stage.id}`}
                onClick={playClickSound}
                style={{
                  fontFamily: 'var(--font-ui)', fontSize: 16,
                  textTransform: 'uppercase', letterSpacing: '-0.64px',
                  color: '#FF0000', backgroundColor: '#000',
                  padding: '2px 8px', display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                {stage.name}
              </Link>
              {activeStageNameForNav === stage.name && (
                <div
                  key={activeStage}
                  style={{
                    position: 'absolute', inset: 0,
                    pointerEvents: 'none',
                    display: 'flex', alignItems: 'center',
                    animation: 'nav-highlight-sweep 0.65s ease-out forwards',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-ui)', fontSize: 16,
                    textTransform: 'uppercase', letterSpacing: '-0.64px',
                    color: '#000', paddingLeft: 8,
                  }}>
                    {stage.name}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Live camera coordinates */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.64px', color: '#FF0000', backgroundColor: '#000', padding: '2px 8px' }}>
          LATITUDE · LONGITUDE
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, letterSpacing: '-0.56px', color: '#FF0000', backgroundColor: '#000', padding: '2px 8px' }}>
          {center.lat.toFixed(4)}° N
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, letterSpacing: '-0.56px', color: '#FF0000', backgroundColor: '#000', padding: '2px 8px' }}>
          {center.lng.toFixed(4)}° E
        </span>
      </div>

      {/* Stage marker + hint rectangle — appears at hotspot position when infobox is active */}
      {stageInfo && infoboxPhase !== 'hidden' && (
        <div style={{
          position: 'fixed',
          left: `${stageInfo.nx * 100}%`,
          top:  `${stageInfo.ny * 100}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 55,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* Red square marker */}
          <div style={{ width: 12, height: 12, backgroundColor: '#FF0000', flexShrink: 0 }} />
          {/* Hint rectangle */}
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
            {stageInfo.stageName}
          </div>
        </div>
      )}

      {/* Stage infobox — bottom-right, blip-in/out */}
      {stageInfo && infoboxPhase !== 'hidden' && (
        <div
          key={animKey}
          style={{
            position: 'fixed',
            right: 11,
            bottom: 17,
            width: 390,
            height: 524,
            backgroundColor: '#000',
            border: '2px solid #1a1a1a',
            overflow: 'hidden',
            zIndex: 60,
            transformOrigin: 'center center',
            animation:
              infoboxPhase === 'showing'
                ? 'blip-in 0.45s cubic-bezier(0.2,0,0.6,1) forwards'
                : infoboxPhase === 'hiding'
                ? 'blip-out 0.45s cubic-bezier(0.4,0,0.8,1) forwards'
                : undefined,
          }}
        >
          {/* Stage name */}
          <div style={{
            position: 'absolute', top: 7, left: 15,
            fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 700,
            lineHeight: 0.855, textTransform: 'uppercase', color: '#db0000',
            whiteSpace: 'nowrap',
          }}>
            {stageInfo.stageName}
          </div>

          {/* Artist image — B&W only */}
          <div style={{
            position: 'absolute', top: 88, left: 15,
            width: 361, height: 340,
            backgroundColor: '#111',
            overflow: 'hidden',
          }}>
            {stageInfo.image && (
              <img
                src={stageInfo.image}
                alt={stageInfo.artist}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)' }}
              />
            )}
          </div>

          {/* Spectrum visualizer */}
          <canvas
            ref={el => { vizCanvasRef.current = el; }}
            width={361}
            height={44}
            style={{ position: 'absolute', bottom: 50, left: 15, display: 'block', backgroundColor: '#000' }}
          />

          {/* Scrolling ticker */}
          <div style={{
            position: 'absolute', bottom: 14, left: 15, right: 0,
            height: 28, overflow: 'hidden', display: 'flex', alignItems: 'center',
          }}>
            <div style={{ display: 'inline-flex', animation: 'home-ticker 12s linear infinite', whiteSpace: 'nowrap' }}>
              {[0, 1, 2, 3].map(i => (
                <span key={i} style={{
                  fontFamily: 'var(--font-ui)', fontSize: 12,
                  letterSpacing: '-0.3px', textTransform: 'uppercase',
                  color: '#ff2200', paddingRight: 40,
                }}>
                  PLAYING NOW: {stageInfo.artist}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cursor + intro hint + click hint */}
      <div ref={cursorRef} style={{ position: 'fixed', top: 0, left: 0, width: 24, height: 24, pointerEvents: 'none', zIndex: 100 }}>
        <div style={{ width: 24, height: 24, backgroundColor: '#000' }} />
        {!introGone && (
          <div style={{
            position: 'absolute', top: 0, left: 26,
            backgroundColor: '#000', padding: '9px 11px',
            opacity: introOpaque ? 1 : 0, transition: 'opacity 0.45s ease',
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 400,
              color: '#FF2200', textTransform: 'uppercase',
              letterSpacing: '-0.8px', lineHeight: 0.855,
            }}>
              DRAG TO EXPLORE NOORDERLICHT
            </span>
          </div>
        )}
        {stageInfo && infoboxPhase !== 'hidden' && (
          <div style={{
            position: 'absolute', top: 0, left: 26,
            backgroundColor: '#000', padding: '9px 11px',
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 400,
              color: '#FF2200', textTransform: 'uppercase',
              letterSpacing: '-0.8px', lineHeight: 0.855,
            }}>
              CLICK TO EXPLORE {stageInfo.stageName}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
