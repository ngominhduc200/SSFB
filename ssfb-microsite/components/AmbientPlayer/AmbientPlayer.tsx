'use client';

import { useEffect, useRef } from 'react';

const AMBIENT_SRC = '/sounds/ambient.mp3';
const AMBIENT_VOLUME = 0.4;
const FADE_SPEED = 0.04; // fraction of remaining distance per frame

export default function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetRef = useRef(AMBIENT_VOLUME);
  const rafRef = useRef<number>();

  function fadeTo(target: number) {
    targetRef.current = target;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    function step() {
      const audio = audioRef.current;
      if (!audio) return;
      const diff = targetRef.current - audio.volume;
      if (Math.abs(diff) < 0.005) {
        audio.volume = targetRef.current;
        return;
      }
      audio.volume = Math.max(0, Math.min(1, audio.volume + diff * FADE_SPEED));
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    const audio = new Audio(AMBIENT_SRC);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    function startAmbient() {
      audio.play().then(() => fadeTo(AMBIENT_VOLUME)).catch(() => {});
    }

    // Try immediate autoplay; if blocked, wait for first interaction
    audio.play().then(() => fadeTo(AMBIENT_VOLUME)).catch(() => {
      document.addEventListener('click', startAmbient, { once: true });
      document.addEventListener('keydown', startAmbient, { once: true });
    });

    function onDuck() { fadeTo(0); }
    function onRestore() { fadeTo(AMBIENT_VOLUME); }

    document.addEventListener('ambient-duck', onDuck);
    document.addEventListener('ambient-restore', onRestore);

    return () => {
      audio.pause();
      audio.src = '';
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('ambient-duck', onDuck);
      document.removeEventListener('ambient-restore', onRestore);
      document.removeEventListener('click', startAmbient);
      document.removeEventListener('keydown', startAmbient);
    };
  }, []);

  return null;
}
