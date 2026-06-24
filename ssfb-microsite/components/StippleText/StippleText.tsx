'use client';

import { useEffect, useRef } from 'react';
import { drawStipple } from '@/utils/stipple';

const CANVAS_W = 1400;
const LINE_H = 220;   // native height that sets font size
const LINE_GAP = 130; // vertical step between line centres — tighter than LINE_H

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function StippleText({ text, dotColor = '#000000', canvasWidth = CANVAS_W, align = 'center', anchorBottom = false, style }: { text: string; dotColor?: string; canvasWidth?: number; align?: 'left' | 'center'; anchorBottom?: boolean; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const fontSize = Math.floor(LINE_H * 0.76);
      const font = `600 ${fontSize}px 'Flama Condensed Trial', 'Arial Narrow', sans-serif`;

      const measure = document.createElement('canvas').getContext('2d')!;
      measure.font = font;
      const lines = wrapLines(measure, text.toUpperCase(), canvasWidth * 0.92);
      const CANVAS_H = LINE_H + LINE_GAP * (lines.length - 1);

      canvas.width = canvasWidth;
      canvas.height = CANVAS_H;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const offscreen = document.createElement('canvas');
      offscreen.width = canvasWidth;
      offscreen.height = CANVAS_H;
      const off = offscreen.getContext('2d')!;

      off.fillStyle = '#ffffff';
      off.fillRect(0, 0, canvasWidth, CANVAS_H);
      off.font = font;
      if ('letterSpacing' in off) off.letterSpacing = `${-0.02 * fontSize}px`;
      off.textAlign = align;
      off.textBaseline = anchorBottom ? 'alphabetic' : 'middle';
      off.fillStyle = '#000000';
      const textX = align === 'left' ? 0 : canvasWidth / 2;
      lines.forEach((line, i) => {
        const lineY = anchorBottom
          ? (CANVAS_H - 5) - LINE_GAP * (lines.length - 1 - i)
          : LINE_H / 2 + LINE_GAP * i;
        off.fillText(line, textX, lineY);
      });

      ctx.clearRect(0, 0, canvasWidth, CANVAS_H);
      drawStipple(ctx, offscreen, {
        ySquares: Math.round(52 * CANVAS_H / LINE_H),
        xSquares: Math.round(175 * canvasWidth / CANVAS_W),
        minDotSize: 0,
        maxDotSize: 6,
        angle: 0,
        gridType: 'Regular',
        threshold: 215,
        bgColor: 'rgba(0,0,0,0)',
        dotColor,
      });
    };

    const fontSize = Math.floor(LINE_H * 0.76);
    document.fonts.load(`600 ${fontSize}px 'Flama Condensed Trial'`).then(render).catch(render);
  }, [text, canvasWidth, align, anchorBottom]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={LINE_H}
      style={{ width: '78vw', maxWidth: 1000, height: 'auto', ...style }}
    />
  );
}
