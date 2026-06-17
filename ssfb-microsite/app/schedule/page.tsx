'use client';
import { useState, useRef, useEffect } from 'react';
import type { Artist } from '@/types';
import { saturdayArtists, sundayArtists } from '@/data/artists';
import { stages } from '@/data/stages';

const HOURS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const START_HOUR = 12;
const TOTAL_HOURS = 11;
const STAGE_ROW_HEIGHT = 120;
const ARTIST_OFFSET = 50;
const RULE_BOTTOM = 70;
const NUM_WAVEFORM_BARS = 30;

const STAGE_COLORS: Record<string, string> = {
  'stage-a': '#1461FB',
  'stage-b': '#E91E8C',
  'stage-c': '#8B1FFF',
};

// Artists with click-to-play functionality
const PLAYABLE_IDS = new Set(['nihiloxica', 'vladimir-ivkovic-1', 'alessandro-adriani-the-hacker']);

const ARTIST_AUDIO: Record<string, string> = {
  'nihiloxica':                    '/audio/Nihiloxica.mp3',
  'vladimir-ivkovic-1':            '/audio/Vladimir.mp3',
  'alessandro-adriani-the-hacker': '/audio/Alessandro.mp3',
};

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

const LIVE_LEFT_PCT = timeToPercent('6:00PM');
const LIVE_MINUTES = 18 * 60;

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

function ArtistLabel({ artist, muted, isPlaying, onPlay }: {
  artist: Artist;
  muted?: boolean;
  isPlaying?: boolean;
  onPlay?: () => void;
}) {
  const isPlayable = PLAYABLE_IDS.has(artist.id);

  const hoverTarget = isPlayable
    ? '[CLICK TO PLAY MUSIC]'
    : (artist.endTime ? `${to24h(artist.time)}–${to24h(artist.endTime)}` : to24h(artist.time));

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

  return (
    <div
      className="uppercase cursor-pointer select-none"
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '16px',
        letterSpacing: '-0.64px',
        maxWidth: '180px',
        color: muted ? '#909090' : isPlaying ? '#FF0000' : '#111111',
      }}
      onMouseEnter={() => scrambleTo(hoverTarget)}
      onMouseLeave={() => scrambleTo(artist.name)}
      onClick={isPlayable ? onPlay : undefined}
    >
      {text}
    </div>
  );
}

function LiveIndicator({ isPlaying, barRefs }: {
  isPlaying: boolean;
  barRefs: { current: (HTMLDivElement | null)[] };
}) {
  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${LIVE_LEFT_PCT}%` }}
    >
      <div className="absolute top-0 left-0 w-px bg-red" style={{ bottom: RULE_BOTTOM }} />

      {/* Waveform — always in DOM so barRefs stay populated; opacity controls visibility */}
      <div
        className="absolute flex items-end gap-[2px]"
        style={{
          bottom: RULE_BOTTOM + 4,
          transform: 'translateX(-50%)',
          opacity: isPlaying ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {Array.from({ length: NUM_WAVEFORM_BARS }, (_, i) => (
          <div
            key={i}
            ref={el => { barRefs.current[i] = el; }}
            style={{ width: 2, height: 4, backgroundColor: '#FF0000', transformOrigin: 'bottom' }}
          />
        ))}
      </div>

      <div
        className="absolute flex flex-col items-center gap-[3px]"
        style={{ bottom: 4, left: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
      >
        <span className="text-red uppercase" style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '-0.5px' }}>
          18:00
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
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [inScheduleArea, setInScheduleArea] = useState(false);
  const [topPad, setTopPad] = useState(80);
  const [playingArtistId, setPlayingArtistId] = useState<string | null>(null);

  const timelineSectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRafRef = useRef<number | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>(new Array(NUM_WAVEFORM_BARS).fill(null));

  const activeArtists = activeDate === 'sat' ? saturdayArtists : sundayArtists;

  const scrollToLive = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const liveX = 24 + (LIVE_LEFT_PCT / 100) * 2140;
    el.scrollLeft = Math.max(0, liveX - el.clientWidth / 3);
  };

  const scrollToStart = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = 0;
  };

  // Vertically center the three stage rows in the available space
  useEffect(() => {
    const recalc = () => {
      if (!timelineSectionRef.current) return;
      const usable = timelineSectionRef.current.clientHeight - RULE_BOTTOM;
      const content = stages.length * STAGE_ROW_HEIGHT;
      setTopPad(Math.max(70, Math.floor((usable - content) / 2)));
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  const stopPlayback = () => {
    if (animRafRef.current) { cancelAnimationFrame(animRafRef.current); animRafRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    analyserRef.current = null;
    setPlayingArtistId(null);
    barRefs.current.forEach(bar => { if (bar) bar.style.height = '4px'; });
  };

  const startPlayback = (artistId: string) => {
    stopPlayback();

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;

    const audio = new Audio(ARTIST_AUDIO[artistId]);
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    audio.loop = true;
    audio.play().catch(() => {});

    audioRef.current = audio;
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    setPlayingArtistId(artistId);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      for (let i = 0; i < NUM_WAVEFORM_BARS; i++) {
        const bar = barRefs.current[i];
        if (bar) {
          const idx = Math.floor((i / NUM_WAVEFORM_BARS) * bufferLength);
          bar.style.height = `${Math.max(4, (dataArray[idx] / 255) * 36 + 4)}px`;
        }
      }
      animRafRef.current = requestAnimationFrame(animate);
    };
    animRafRef.current = requestAnimationFrame(animate);
  };

  const togglePlayback = (artistId: string) => {
    if (playingArtistId === artistId) {
      stopPlayback();
    } else {
      startPlayback(artistId);
    }
  };

  const handleStageEnter = (stageId: string) => {
    if (hoveredStage === stageId) return;
    setHoveredStage(stageId);
  };

  const handleStageLeave = () => {
    setHoveredStage(null);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const detectStageFromY = (relY: number): string | null => {
    for (let i = 0; i < stages.length; i++) {
      const rowTop = i * STAGE_ROW_HEIGHT + topPad;
      if (relY >= rowTop && relY < rowTop + STAGE_ROW_HEIGHT) return stages[i].id;
    }
    return null;
  };

  const handleContentMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const relY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const detected = detectStageFromY(relY);
    if (detected !== hoveredStage) {
      if (detected) handleStageEnter(detected);
      else handleStageLeave();
    }
  };

  const handleContentMouseLeave = () => {
    setInScheduleArea(false);
    handleStageLeave();
  };

  // On mount, jump timeline to live position (Saturday is default)
  useEffect(() => {
    scrollToLive();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On date switch: stop audio, reset scroll to start then jump to live/start
  useEffect(() => {
    stopPlayback();
    setHoveredStage(null);
    if (activeDate === 'sat') {
      scrollToLive();
    } else {
      scrollToStart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  return (
    <main
      className="flex flex-col flex-1 overflow-hidden relative"
      style={{
        backgroundImage: "url('/schedule-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
      }}
    >
      {/* Cursor cue */}
      {inScheduleArea && !hoveredStage && (
        <div
          className="fixed pointer-events-none z-50"
          style={{ left: mousePos.x, top: mousePos.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '10px',
              letterSpacing: '0.05em',
              color: 'rgba(80,80,80,0.8)',
            }}
          >
            [HEAR WHO&apos;S PLAYING]
          </span>
        </div>
      )}

      {/* Timeline — heavy white overlay keeps image faint, attention on content */}
      <div
        ref={timelineSectionRef}
        className="relative flex flex-1 overflow-hidden"
        onMouseMove={handleContentMouseMove}
        onMouseEnter={() => setInScheduleArea(true)}
        onMouseLeave={handleContentMouseLeave}
      >
        <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor: 'rgba(255,255,255,0.88)' }} />

        {/* Sticky stage labels */}
        <div className="flex-shrink-0 w-[158px] relative z-10">
          {stages.map((stage, stageIdx) => {
            const top = stageIdx * STAGE_ROW_HEIGHT + topPad + 8;
            return (
              <div
                key={stage.id}
                className="absolute left-[12px]"
                style={{ top }}
              >
                <div className="relative pt-[4px] pb-[5px]" style={{ paddingLeft: '9px', paddingRight: '6px' }}>
                  <div
                    className="absolute left-0 top-[4px] w-[3px]"
                    style={{
                      backgroundColor: STAGE_COLORS[stage.id],
                      height: '38px',
                    }}
                  />
                  <div className="flex flex-col gap-[1px]">
                    <span
                      className="uppercase"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '13px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: STAGE_COLORS[stage.id],
                      }}
                    >
                      {stage.label}
                    </span>
                    <span
                      className="uppercase"
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
              </div>
            );
          })}
        </div>

        {/* Scrollable timeline — scrollbar hidden */}
        <div ref={scrollRef} className="no-scrollbar flex-1 overflow-x-auto overflow-y-hidden relative px-[24px] z-10">
          <div className="relative h-full" style={{ minWidth: 2140 }}>

            {/* Colored bands — invisible by default, fade in on stage hover */}
            {stages.map((stage, stageIdx) => {
              const rowTop = stageIdx * STAGE_ROW_HEIGHT + topPad;
              return (
                <div
                  key={`band-${stage.id}`}
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top: rowTop + ARTIST_OFFSET - 4,
                    height: 58,
                    backgroundColor: STAGE_COLORS[stage.id],
                    opacity: hoveredStage === stage.id ? 0.22 : 0,
                    transition: 'opacity 0.2s ease',
                  }}
                />
              );
            })}

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
                    isPlaying={playingArtistId === artist.id}
                    onPlay={() => togglePlayback(artist.id)}
                  />
                </div>
              ));
            })}

            {activeDate === 'sat' && (
              <LiveIndicator
                isPlaying={playingArtistId !== null}
                barRefs={barRefs}
              />
            )}

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

      {/* Bottom bar — own background image cropped to the crowd scene */}
      <div
        className="relative z-10 flex items-end px-[24px] pb-[16px] gap-[40px] h-[25vh] flex-shrink-0 border-t border-white/20"
        style={{
          backgroundImage: "url('/schedule-background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 75%',
        }}
      >
        <h1
          className="uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '80px',
            lineHeight: '0.855',
            fontWeight: 600,
            color: '#ffffff',
          }}
        >
          SCHEDULE
        </h1>
        <div className="ml-auto flex flex-col items-end justify-end gap-[2px]">
          <button
            onClick={() => setActiveDate('sat')}
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
            onClick={() => setActiveDate('sun')}
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
