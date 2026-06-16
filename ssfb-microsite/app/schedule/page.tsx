'use client';
// Schedule page: /schedule
import { useState, useRef, useEffect } from 'react';
import type { Artist } from '@/types';
import { saturdayArtists, sundayArtists } from '@/data/artists';
import { stages } from '@/data/stages';

const HOURS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const START_HOUR = 12;
const TOTAL_HOURS = 11;
const STAGE_ROW_HEIGHT = 120;
const TOP_PADDING = 60;
// Artists sit 50px below each row top; label sits 8px below row top (~35px label leaves 7px gap)
const ARTIST_OFFSET = 50;
const RULE_BOTTOM = 70;

const STAGE_COLORS: Record<string, string> = {
  'stage-a': '#1461FB',
  'stage-b': '#E91E8C',
  'stage-c': '#8B1FFF',
};

const WAVEFORM = [
  { h: 8,  d: 0.00 }, { h: 16, d: 0.06 }, { h: 26, d: 0.12 }, { h: 18, d: 0.18 },
  { h: 32, d: 0.24 }, { h: 10, d: 0.30 }, { h: 22, d: 0.36 }, { h: 34, d: 0.42 },
  { h: 14, d: 0.48 }, { h: 6,  d: 0.54 }, { h: 28, d: 0.60 }, { h: 20, d: 0.54 },
  { h: 36, d: 0.48 }, { h: 12, d: 0.42 }, { h: 30, d: 0.36 }, { h: 8,  d: 0.30 },
  { h: 24, d: 0.24 }, { h: 36, d: 0.18 }, { h: 16, d: 0.12 }, { h: 28, d: 0.06 },
  { h: 10, d: 0.00 }, { h: 22, d: 0.06 }, { h: 34, d: 0.12 }, { h: 14, d: 0.18 },
  { h: 26, d: 0.24 }, { h: 8,  d: 0.30 }, { h: 32, d: 0.36 }, { h: 18, d: 0.42 },
  { h: 24, d: 0.48 }, { h: 12, d: 0.54 },
];

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#!|/\\><^';
const GLITCH_FRAMES = 22;

function timeToPercent(timeStr: string): number {
  const [timePart, period] = timeStr.split(/(?=[AP]M)/);
  const [h, m = '0'] = timePart.split(':');
  let hour = parseInt(h);
  if (period === 'PM' && hour !== 12) hour += 12;
  const totalMinutes = (hour - START_HOUR) * 60 + parseInt(m);
  return (totalMinutes / (TOTAL_HOURS * 60)) * 100;
}

function to24h(timeStr: string): string {
  const match = timeStr.match(/^(\d+):?(\d*)([AP]M)$/i);
  if (!match) return timeStr;
  let hour = parseInt(match[1]);
  const min = match[2] || '00';
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${min.padStart(2, '0')}`;
}

// Matrix/glitch scramble: characters resolve left-to-right to target string
function ArtistLabel({ artist, muted }: { artist: Artist; muted?: boolean }) {
  const targetTime = artist.endTime
    ? `${to24h(artist.time)}–${to24h(artist.endTime)}`
    : to24h(artist.time);

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

      const result = target
        .split('')
        .map((char, i) => {
          if (i < resolved) return char;
          if (char === ' ') return ' ';
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        })
        .join('');

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
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="uppercase cursor-pointer select-none"
      style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', letterSpacing: '-0.64px', maxWidth: '180px', color: muted ? '#a0a0a0' : '#000000' }}
      onMouseEnter={() => scrambleTo(targetTime)}
      onMouseLeave={() => scrambleTo(artist.name)}
    >
      {text}
    </div>
  );
}

const LIVE_LEFT_PCT = timeToPercent('6:00PM');
const LIVE_MINUTES = 18 * 60; // 6:00PM in minutes from midnight

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

function LiveIndicator() {
  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${LIVE_LEFT_PCT}%` }}
    >
      <div className="absolute top-0 left-0 w-px bg-red" style={{ bottom: RULE_BOTTOM }} />

      <div
        className="absolute flex items-end gap-[2px]"
        style={{ bottom: RULE_BOTTOM + 4, transform: 'translateX(-50%)' }}
      >
        {WAVEFORM.map((bar, i) => (
          <div
            key={i}
            style={{
              width: 2,
              height: bar.h,
              backgroundColor: '#FF0000',
              transformOrigin: 'bottom',
              animation: `waveform ${0.45 + (i % 7) * 0.07}s ease-in-out ${bar.d}s infinite`,
            }}
          />
        ))}
      </div>

      {/* 18:00 on top, LIVE badge below */}
      <div
        className="absolute flex flex-col items-center gap-[3px]"
        style={{ bottom: 4, left: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
      >
        <span
          className="text-red uppercase"
          style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '-0.5px' }}
        >
          18:00
        </span>
        <div className="bg-red px-[8px] py-[1px]">
          <span
            className="text-white uppercase"
            style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '-0.5px' }}
          >
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [activeDate, setActiveDate] = useState<'sat' | 'sun'>('sat');
  const activeArtists = activeDate === 'sat' ? saturdayArtists : sundayArtists;

  return (
    <main className="flex flex-col flex-1 overflow-hidden bg-white">
      <div className="flex flex-1 overflow-hidden">

        {/* Sticky stage labels — transparent column, white fill only on the text badge */}
        <div className="flex-shrink-0 w-[158px] relative">
          {stages.map((stage, stageIdx) => {
            const top = stageIdx * STAGE_ROW_HEIGHT + TOP_PADDING + 8;
            return (
              <div
                key={stage.id}
                className="absolute left-[12px]"
                style={{ top }}
              >
                {/* White fill scoped tightly to the text block */}
                <div className="inline-flex items-stretch gap-[6px] bg-white px-[6px] pt-[4px] pb-[5px]">
                  <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: STAGE_COLORS[stage.id] }} />
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
                        color: STAGE_COLORS[stage.id],
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

        {/* Scrollable timeline */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative px-[24px]">
          <div className="relative h-full" style={{ minWidth: 2140 }}>

            {/* Artist markers — 50px below row top, clear of stage labels */}
            {stages.map((stage, stageIdx) => {
              const stageArtists = activeArtists.filter((a: Artist) => a.stageId === stage.id);
              const rowTop = stageIdx * STAGE_ROW_HEIGHT + TOP_PADDING;
              return stageArtists.map((artist: Artist) => (
                <div
                  key={artist.id}
                  className="absolute"
                  style={{ left: `${timeToPercent(artist.time)}%`, top: rowTop + ARTIST_OFFSET }}
                >
                  <ArtistLabel
                    artist={artist}
                    muted={activeDate === 'sat' && parseToMinutes(artist.endTime ?? artist.time) <= LIVE_MINUTES}
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
                    className="absolute top-0 left-0 w-px border-l border-dashed border-[#d0d0d0]"
                    style={{ bottom: RULE_BOTTOM }}
                  />
                  <div
                    className="absolute uppercase text-black"
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '16px',
                      letterSpacing: '-0.64px',
                      transform: 'translateX(-50%)',
                      bottom: RULE_BOTTOM - 22,
                    }}
                  >
                    {hour}
                  </div>
                </div>
              );
            })}

            <div className="absolute left-0 right-0 h-px bg-black" style={{ bottom: RULE_BOTTOM }} />

            {/* 15-minute tick marks between hours */}
            {Array.from({ length: TOTAL_HOURS * 4 }, (_, i) => {
              if (i % 4 === 0) return null; // hour positions already have labels
              const leftPct = (i / (TOTAL_HOURS * 4)) * 100;
              return (
                <div
                  key={`tick-${i}`}
                  className="absolute bg-black"
                  style={{
                    left: `${leftPct}%`,
                    width: 1,
                    height: 4,
                    bottom: RULE_BOTTOM - 4,
                    transform: 'translateX(-50%)',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-end px-[24px] pb-[16px] gap-[40px] h-[134px] flex-shrink-0 border-t border-[#d0d0d0]">
        <h1
          className="text-red uppercase leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '80px',
            lineHeight: '0.855',
            fontWeight: 600,
          }}
        >
          SCHEDULE
        </h1>
        {/* Stacked date selector — active is large + black, inactive is small + gray */}
        <div className="ml-auto flex flex-col items-end justify-end gap-[2px]">
          <button
            onClick={() => setActiveDate('sat')}
            className="uppercase cursor-pointer transition-all duration-200"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: activeDate === 'sat' ? '62px' : '38px',
              lineHeight: '0.855',
              fontWeight: 600,
              color: activeDate === 'sat' ? '#000000' : '#c8c8c8',
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
              color: activeDate === 'sun' ? '#000000' : '#c8c8c8',
            }}
          >
            SUN 6.24
          </button>
        </div>
      </div>
    </main>
  );
}
