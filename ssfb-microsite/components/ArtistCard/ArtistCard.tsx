'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Artist } from '@/types';
import { playClickSound } from '@/utils/playClickSound';

type Props = {
  artist: Artist;
  stageId: string;
};

export default function ArtistCard({ artist, stageId }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  function handleSetlistClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();
    document.dispatchEvent(new CustomEvent('stage-exit'));
    setTimeout(() => router.push(`/stage/${stageId}/${artist.id}`), 750);
  }

  return (
    <div
      className="w-[280px] h-[280px] cursor-pointer"
      style={{ perspective: '1000px', transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.5s ease' }}
      onClick={() => { playClickSound(); setFlipped((f) => !f); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setFlipped(false); setHovered(false); }}
    >
      {/* Inner — flip container */}
      <div
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Photo area — full card */}
          <div className="absolute inset-0 bg-black border border-[#333]" />
          {/* Artist name — top left */}
          <span
            className="absolute text-black uppercase leading-none"
            style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 600, top: '10px', left: '10px' }}
          >
            {artist.name}
          </span>
          {/* Time — bottom right */}
          <span
            className="absolute text-black uppercase leading-none"
            style={{ fontFamily: 'var(--font-ui)', fontSize: '20px', letterSpacing: '-0.64px', bottom: '10px', right: '10px' }}
          >
            {artist.time}
          </span>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 bg-white border border-[#333] flex flex-col p-[16px]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-[family-name:var(--font-ui)] font-semibold text-[16px] text-black uppercase tracking-[-0.64px] mb-[12px]">
            {artist.name}
          </span>
          <p className="font-[family-name:var(--font-ui)] text-[16px] text-black tracking-[-0.64px] leading-[1.4] flex-1">
            {artist.bio}
          </p>
          <button
            className="w-full h-[40px] bg-red flex items-center justify-center font-[family-name:var(--font-ui)] text-[16px] text-white uppercase tracking-[-0.64px] mt-[16px]"
            onClick={handleSetlistClick}
          >
            OPEN SETLIST →
          </button>
        </div>
      </div>
    </div>
  );
}
