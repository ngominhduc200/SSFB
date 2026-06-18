'use client';
import { useState, useRef, useEffect } from 'react';
import { playClickSound } from '@/utils/playClickSound';
import type { Artist } from '@/types';
import { saturdayArtists, sundayArtists } from '@/data/artists';
import { stages } from '@/data/stages';
import StippleText from '@/components/StippleText/StippleText';

const ARTIST_AUDIO: Record<string, string> = {
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
  'merel':                       '/audio/Red Light Radio/Merel (1).mp3',
  'les-filles-de-illighadad':    '/audio/Red Light Radio/Les Filles de Illighadad (1).mp3',
  'lulu-and-mata-hari':          '/audio/Red Light Radio/Fenna.mp3',
  'vladimir-ivkovic-1':          '/audio/Vladimir.mp3',
  'nurse-with-wound':            '/audio/Red Light Radio/Identified Patient - 5th December 2025.mp3',
  'vladimir-ivkovic-2':          '/audio/Vladimir.mp3',
  'zozo':                        '/audio/Red Light Radio/Die Orangen - Krautback (Full Circle_s Fail We May Sail We Must Remix).mp3',
  'orpheu-the-wizard':           '/audio/Red Light Radio/Merel (1).mp3',
  'fenna-fiction':               '/audio/Red Light Radio/Fenna.mp3',
  'dollkraut-band':              '/audio/Red Light Radio/Dollkraut.mp3',
  'twice-upon-a-time':           '/audio/Red Light Radio/Fenna.mp3',
  'ramzi-djfati':                '/audio/Red Light Radio/DJFati.mp3',
  'die-orangen':                 '/audio/Red Light Radio/Die Orangen - Krautback (Full Circle_s Fail We May Sail We Must Remix).mp3',
  'man-miran':                   '/audio/Red Light Radio/Dollkraut.mp3',
  'dj-marcelle':                 '/audio/Red Light Radio/Die Orangen - Krautback (Full Circle_s Fail We May Sail We Must Remix).mp3',
  'identified-patient':          '/audio/Red Light Radio/Identified Patient - 5th December 2025.mp3',
  'randstad':                    '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3',
  'job-sifre':                   '/audio/Tent/Young Marco.mp3',
  'die-wilde-jago':              '/audio/Alessandro.mp3',
  'dopplereffekt':               '/audio/Nihiloxica.mp3',
  'jasss':                       '/audio/Alessandro.mp3',
  'alessandro-adriani-the-hacker': '/audio/Alessandro.mp3',
  'giant-swan':                  '/audio/Alessandro.mp3',
  'i-f':                         '/audio/Tent/Young Marco.mp3',
  'satoshi':                     '/audio/Tent/Satoshi.mp3',
  'margie':                      '/audio/Tent/Satoshi.mp3',
  'dj-paulao':                   '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3',
  'young-marco':                 '/audio/Tent/Young Marco.mp3',
  'leroy-burgess':               '/audio/Tent/Satoshi.mp3',
  'antal':                       '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3',
  'hunee':                       '/audio/Tent/Antal @ Strange Sounds From Beyond 25.06.2017 CUT.mp3',
};

const HOURS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const START_HOUR = 12;
const TOTAL_HOURS = 11;
const STAGE_ROW_HEIGHT = 120;
const ARTIST_OFFSET = 50;
const RULE_BOTTOM = 70;
const LIVE_IDS = new Set(['nihiloxica', 'vladimir-ivkovic-2', 'alessandro-adriani-the-hacker']);
const NUM_WAVEFORM_BARS = 400;
const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#!|/\\><^';
const GLITCH_FRAMES = 22;

function timeToPercent(timeStr: string): number {
  // Our format: 'SAT 12:00–14:00' — use the start time
  const ourMatch = timeStr.match(/[A-Z]{3}\s+(\d{1,2}):(\d{2})/);
  if (ourMatch) {
    const totalMinutes = (parseInt(ourMatch[1]) - START_HOUR) * 60 + parseInt(ourMatch[2]);
    return (totalMinutes / (TOTAL_HOURS * 60)) * 100;
  }
  // Fallback: '1:00PM' format
  const [timePart, period] = timeStr.split(/(?=[AP]M)/);
  const [h, m = '0'] = timePart.split(':');
  let hour = parseInt(h);
  if (period === 'PM' && hour !== 12) hour += 12;
  return (((hour - START_HOUR) * 60 + parseInt(m)) / (TOTAL_HOURS * 60)) * 100;
}

function to24h(timeStr: string): string {
  // Our format: 'SAT 12:00–14:00' → '12:00'
  const ourMatch = timeStr.match(/[A-Z]{3}\s+(\d{1,2}:\d{2})/);
  if (ourMatch) return ourMatch[1];
  // '2:00PM' format → '14:00'
  const match = timeStr.match(/^(\d+):?(\d*)([AP]M)$/i);
  if (!match) return timeStr;
  let hour = parseInt(match[1]);
  const min = match[2] || '00';
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${min.padStart(2, '0')}`;
}

const LIVE_LEFT_PCT = timeToPercent('6:30PM');
const LIVE_MINUTES = 18 * 60 + 30;

function parseToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d+):?(\d*)([AP]M)$/i);
  if (!match) return 0;
  let hour = parseInt(match[1]);
  const min = parseInt(match[2] || '0');
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + min;
}

function ArtistLabel({ artist, muted, lineBreakAfter, onHoverStart, onHoverEnd }: {
  artist: Artist;
  muted?: boolean;
  lineBreakAfter?: string;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}) {
  const timeRange = artist.time.match(/[A-Z]{3}\s+(\d{1,2}:\d{2})[^\d]+(\d{1,2}:\d{2})/);
  const hoverTarget = timeRange ? `${timeRange[1]}–${timeRange[2]}` : to24h(artist.time);

  const [text, setText] = useState(artist.name);
  const rafRef = useRef<number | null>(null);
  const frame = useRef(0);

  const scrambleTo = (target: string) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    frame.current = 0;
    const tick = () => {
      frame.current++;
      const progress = Math.min(frame.current / GLITCH_FRAMES, 1);
      const resolved = Math.floor(progress * target.length);
      const result = target.split('').map((char, i) => {
        if (i < resolved) return char;
        if (char === ' ') return ' ';
        return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }).join('');
      setText(result);
      if (frame.current < GLITCH_FRAMES) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setText(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const parts = lineBreakAfter ? text.split(new RegExp(`(?<=${lineBreakAfter})\\s*`, 'i')) : null;

  return (
    <div
      className="uppercase select-none"
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '16px',
        letterSpacing: '-0.64px',
        maxWidth: '180px',
        color: muted ? '#909090' : '#111111',
      }}
      onMouseEnter={() => { scrambleTo(hoverTarget); onHoverStart?.(); }}
      onMouseLeave={() => { scrambleTo(artist.name); onHoverEnd?.(); }}
    >
      {parts ? parts.map((part, i) => <div key={i}>{part}</div>) : text}
    </div>
  );
}

function LiveIndicator() {
  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${LIVE_LEFT_PCT}%` }}
    >
      <div className="absolute top-0 left-0 w-px bg-red" style={{ bottom: RULE_BOTTOM }} />
      <div
        className="absolute flex flex-col items-center gap-[3px]"
        style={{ bottom: 14, left: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
      >
        <span className="text-red uppercase" style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '-0.5px' }}>
          18:30
        </span>
        <div className="bg-red px-[8px] py-[1px]">
          <span className="text-white uppercase" style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '-0.5px' }}>
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [activeDate, setActiveDate] = useState<'sat' | 'sun'>('sat');
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [inScheduleArea, setInScheduleArea] = useState(false);
  const [topPad, setTopPad] = useState(80);
  const [timelineBounds, setTimelineBounds] = useState({ top: 0, height: 0 });
  const timelineSectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const isHoveringLiveRef = useRef(false);
  const pendingPlayRef = useRef<{ src: string; volume: number; live: boolean } | null>(null);
  const animRafRef = useRef<number | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>(new Array(NUM_WAVEFORM_BARS).fill(null));
  const mousePosRef = useRef({ x: -100, y: -100 });

  const activeArtists = activeDate === 'sat' ? saturdayArtists : sundayArtists;

  const scrollToLive = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const liveX = 24 + (LIVE_LEFT_PCT / 100) * 2140;
    el.scrollLeft = Math.max(0, liveX - el.clientWidth / 2);
  };

  const scrollToStart = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = 0;
  };

  // Vertically center the three stage rows in the available space
  useEffect(() => {
    const recalc = () => {
      if (!timelineSectionRef.current) return;
      const rect = timelineSectionRef.current.getBoundingClientRect();
      setTimelineBounds({ top: rect.top, height: rect.height });
      const usable = timelineSectionRef.current.clientHeight - RULE_BOTTOM;
      const content = stages.length * STAGE_ROW_HEIGHT;
      setTopPad(Math.max(70, Math.floor((usable - content) / 2)));
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  useEffect(() => {
    hoverAudioRef.current = new Audio();
    const audio = hoverAudioRef.current;
    const initCtx = () => {
      if (!audioCtxRef.current) {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        ctx.createMediaElementSource(audio).connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        analyserDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      // Resume context (starts suspended) and retry any autoplay-blocked request
      audioCtxRef.current.resume().then(() => {
        const p = pendingPlayRef.current;
        if (!p) return;
        pendingPlayRef.current = null;
        audio.pause();
        audio.src = encodeURI(p.src);
        audio.loop = true;
        audio.volume = p.volume;
        isHoveringLiveRef.current = p.live;
        audio.play().catch(() => {});
      });
    };
    document.addEventListener('pointerdown', initCtx, { once: true });
    return () => { document.removeEventListener('pointerdown', initCtx); audio.pause(); };
  }, []);

  const stopWaveform = () => {
    if (animRafRef.current) { cancelAnimationFrame(animRafRef.current); animRafRef.current = null; }
    barRefs.current.forEach(bar => { if (bar) bar.style.height = '0px'; });
  };

  const CONTENT_WIDTH = 2140;
  const SCROLL_PADDING = 24;

  const startWaveform = () => {
    const heights = new Array(NUM_WAVEFORM_BARS).fill(0);
    const animate = () => {
      if (analyserRef.current && analyserDataRef.current) {
        analyserRef.current.getByteFrequencyData(analyserDataRef.current);
      }
      const rect = timelineSectionRef.current?.getBoundingClientRect();
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
      if (rect) {
        const cursorContentX = (mousePosRef.current.x - rect.left - SCROLL_PADDING) + scrollLeft;
        const relX = Math.max(0, Math.min(1, cursorContentX / CONTENT_WIDTH));
        const useAudio = isHoveringLiveRef.current && analyserDataRef.current !== null;
        for (let i = 0; i < NUM_WAVEFORM_BARS; i++) {
          const barX = i / (NUM_WAVEFORM_BARS - 1);
          const dist = Math.abs(barX - relX);
          const gaussian = Math.exp(-2500 * dist * dist);
          let targetH: number;
          if (useAudio) {
            const data = analyserDataRef.current!;
            const freqIdx = Math.min(data.length - 1, Math.floor((i / NUM_WAVEFORM_BARS) * data.length));
            targetH = gaussian * (8 + 52 * Math.min(1, (data[freqIdx] / 255) * 2.5));
          } else {
            targetH = 20 * gaussian;
          }
          heights[i] += (targetH - heights[i]) * (isHoveringLiveRef.current ? 0.35 : 0.15);
          const bar = barRefs.current[i];
          if (bar) bar.style.height = `${heights[i]}px`;
        }
      }
      animRafRef.current = requestAnimationFrame(animate);
    };
    if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
    animRafRef.current = requestAnimationFrame(animate);
  };

  const switchAudio = (src: string, volume = 0.4, live = false) => {
    const audio = hoverAudioRef.current;
    if (!audio) return;
    audioCtxRef.current?.resume();
    audio.pause();
    audio.src = encodeURI(src);
    audio.loop = true;
    audio.volume = volume;
    isHoveringLiveRef.current = live;
    audio.play().catch(() => {
      // Browser blocked autoplay — store and retry on first user interaction
      pendingPlayRef.current = { src, volume, live };
    });
  };

  const handleTimelineEnter = () => {
    setInScheduleArea(true);
    document.dispatchEvent(new Event('ambient-duck'));
    switchAudio('/sounds/radio.mp3', 0.4, false);
    startWaveform();
  };

  const handleHoverPlay = (artistId: string) => {
    const src = ARTIST_AUDIO[artistId];
    if (!src) return;
    switchAudio(src, 0.2, true);
  };

  const handleHoverEnd = () => {
    switchAudio('/sounds/radio.mp3', 0.4, false);
  };

  const handleTimelineLeave = () => {
    setInScheduleArea(false);
    isHoveringLiveRef.current = false;
    stopWaveform();
    hoverAudioRef.current?.pause();
    document.dispatchEvent(new Event('ambient-restore'));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const pos = { x: e.clientX, y: e.clientY };
      setMousePos(pos);
      mousePosRef.current = pos;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    return () => {
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      hoverAudioRef.current?.pause();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // On mount, jump timeline to live position (Saturday is default)
  useEffect(() => {
    scrollToLive();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On date switch: reset scroll to start then jump to live/start
  useEffect(() => {
    if (activeDate === 'sat') {
      scrollToLive();
    } else {
      scrollToStart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate]);

  return (
    <main
      className="flex flex-col flex-1 overflow-hidden relative cursor-none"
      style={{ backgroundImage: "url('/schedule-background.png')", backgroundSize: 'cover', backgroundPosition: 'center 30%' }}
    >
      {/* Vertical line — only in timeline section */}
      {inScheduleArea && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: mousePos.x,
            top: timelineBounds.top,
            width: 1,
            height: timelineBounds.height,
            backgroundColor: '#000000',
          }}
        />
      )}

      {/* Timeline — heavy white overlay keeps image faint, attention on content */}
      <div
        ref={timelineSectionRef}
        className="relative flex flex-1 overflow-hidden"
        onMouseEnter={handleTimelineEnter}
        onMouseLeave={handleTimelineLeave}
        style={{ backgroundColor: '#ffffff' }}
      >

        {/* Sticky stage labels — overlaid on top of full-width timeline */}
        <div className="absolute left-0 top-0 bottom-0 w-[158px] z-20 pointer-events-none">
          {stages.map((stage, stageIdx) => {
            const top = stageIdx * STAGE_ROW_HEIGHT + topPad + 4;
            return (
              <div
                key={stage.id}
                className="absolute left-[24px]"
                style={{ top }}
              >
                <div className="relative pt-[4px] pb-[5px]" style={{ paddingLeft: '9px', paddingRight: '6px' }}>
                  <div
                    className="absolute left-0 w-[3px]"
                    style={{ backgroundColor: '#FF0000', top: '4px', bottom: '5px' }}
                  />
                  <span
                    className="uppercase whitespace-nowrap"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '20px',
                      fontWeight: 600,
                      lineHeight: 1.1,
                      color: '#111111',
                    }}
                  >
                    {stage.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable timeline — full width */}
        <div ref={scrollRef} className="no-scrollbar absolute inset-0 overflow-x-auto overflow-y-hidden px-[24px] z-10">
          <div className="relative h-full" style={{ minWidth: 2140 }}>

            {/* Artist markers */}
            {stages.map((stage, stageIdx) => {
              const stageArtists = activeArtists.filter((a: Artist) => a.stageId === stage.id);
              const rowTop = stageIdx * STAGE_ROW_HEIGHT + topPad;
              return stageArtists.map((artist: Artist) => (
                <div
                  key={artist.id}
                  className="absolute z-10"
                  style={{ left: `${timeToPercent(artist.time)}%`, top: rowTop + ARTIST_OFFSET }}
                >
                  <ArtistLabel
                    artist={artist}
                    muted={activeDate === 'sat' && parseToMinutes(artist.endTime ?? artist.time) <= LIVE_MINUTES}
                    lineBreakAfter={artist.id === 'dollkraut-band' ? 'DOLLKRAUT' : undefined}
                    onHoverStart={LIVE_IDS.has(artist.id) ? () => handleHoverPlay(artist.id) : undefined}
                    onHoverEnd={LIVE_IDS.has(artist.id) ? handleHoverEnd : undefined}
                  />
                </div>
              ));
            })}

            {activeDate === 'sat' && <LiveIndicator />}

            {/* Hour columns */}
            {HOURS.map((hour, i) => {
              const leftPct = (i / TOTAL_HOURS) * 100;
              return (
                <div key={hour} className="absolute top-0 bottom-0" style={{ left: `${leftPct}%` }}>
                  <div
                    className="absolute top-0 left-0 w-px border-l border-dashed border-black/15"
                    style={{ bottom: RULE_BOTTOM }}
                  />
                  <div
                    className="absolute uppercase"
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '16px',
                      letterSpacing: '-0.64px',
                      transform: 'translateX(-50%)',
                      bottom: RULE_BOTTOM - 22,
                      color: '#1a1a1a',
                    }}
                  >
                    {hour}
                  </div>
                </div>
              );
            })}

            <div className="absolute left-0 right-0 h-px bg-black/20" style={{ bottom: RULE_BOTTOM }} />

            {/* Cursor-reactive waveform — lives inside scrollable content so it scrolls with timeline */}
            {inScheduleArea && (
              <div
                className="absolute left-0 right-0 pointer-events-none flex justify-between items-end"
                style={{ bottom: RULE_BOTTOM, height: 52, zIndex: 25 }}
              >
                {Array.from({ length: NUM_WAVEFORM_BARS }, (_, i) => (
                  <div
                    key={i}
                    ref={el => { barRefs.current[i] = el; }}
                    style={{ width: 2, height: 0, backgroundColor: '#FF0000' }}
                  />
                ))}
              </div>
            )}

            {/* 15-minute tick marks */}
            {Array.from({ length: TOTAL_HOURS * 4 }, (_, i) => {
              if (i % 4 === 0) return null;
              const leftPct = (i / (TOTAL_HOURS * 4)) * 100;
              return (
                <div
                  key={`tick-${i}`}
                  className="absolute"
                  style={{
                    left: `${leftPct}%`,
                    width: 1,
                    height: 4,
                    bottom: RULE_BOTTOM - 4,
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="relative z-10 flex items-end px-[24px] pb-[24px] gap-[40px] h-[25vh] flex-shrink-0 border-t border-white/20"
        style={{ backgroundImage: "url('/schedule-background.png')", backgroundSize: 'cover', backgroundPosition: 'center 75%' }}
      >
        <StippleText text="SCHEDULE" dotColor="#FF0000" canvasWidth={700} align="left" anchorBottom style={{ position: 'absolute', left: 24, bottom: 24, maxWidth: 480, height: 'auto' }} />
        <div className="ml-auto flex flex-col items-end justify-end gap-[2px]">
          <button
            onClick={() => { playClickSound(); setActiveDate('sat'); }}
            className="uppercase cursor-pointer transition-all duration-200"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: activeDate === 'sat' ? '62px' : '38px',
              lineHeight: '0.855',
              fontWeight: 600,
              color: activeDate === 'sat' ? '#FF0000' : '#ffffff',
            }}
          >
            SAT 6.23
          </button>
          <button
            onClick={() => { playClickSound(); setActiveDate('sun'); }}
            className="uppercase cursor-pointer transition-all duration-200"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: activeDate === 'sun' ? '62px' : '38px',
              lineHeight: '0.855',
              fontWeight: 600,
              color: activeDate === 'sun' ? '#FF0000' : '#ffffff',
            }}
          >
            SUN 6.24
          </button>
        </div>
      </div>
    </main>
  );
}
