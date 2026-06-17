'use client';

import { useEffect, useRef } from 'react';

const FPS = 20;
const INTERVAL = 1000 / FPS;

export default function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let last = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(ts: number) {
      raf = requestAnimationFrame(draw);
      if (ts - last < INTERVAL) return;
      last = ts;

      const { width, height } = canvas;
      const imageData = ctx.createImageData(width, height);
      const buf = new Uint32Array(imageData.data.buffer);
      for (let i = 0; i < buf.length; i++) {
        const v = (Math.random() * 256) | 0;
        // little-endian RGBA: R=v, G=v, B=v, A=255
        buf[i] = (0xff << 24) | (v << 16) | (v << 8) | v;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: 'none',
        opacity: 0.1,
        mixBlendMode: 'multiply',
      }}
    />
  );
}
