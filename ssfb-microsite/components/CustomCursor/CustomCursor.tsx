'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function CustomCursor() {
  const pathname = usePathname();
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap  = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const onMove  = (e: PointerEvent) => {
      wrap.style.transform = `translate(${e.clientX - 12}px, ${e.clientY - 12}px)`;
      const hide = !!(e.target as HTMLElement).closest('[data-cursor-hide]');
      wrap.style.opacity = hide ? '0' : '1';
    };
    const onDown  = () => { inner.style.transform = 'scale(0.9)'; };
    const onUp    = () => { inner.style.transform = 'scale(1)'; };
    const onLeave = () => { wrap.style.opacity = '0'; };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup',   onUp);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup',   onUp);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [pathname]);

  // Early return AFTER all hooks — keeps hook call order stable across renders
  if (pathname === '/') return null;

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 999999,
        opacity: 0,
        transform: 'translate(-9999px, -9999px)',
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: 24,
          height: 24,
          background: '#FF0000',
          border: '1.5px solid #000000',
          transformOrigin: 'center',
          transition: 'transform 80ms ease',
        }}
      />
    </div>
  );
}
