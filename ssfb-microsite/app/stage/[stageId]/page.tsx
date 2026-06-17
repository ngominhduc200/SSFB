'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notFound } from 'next/navigation';
import { stages } from '@/data/stages';
import { artists } from '@/data/artists';
import NavStrip from '@/components/NavStrip/NavStrip';
import StageScene from '@/components/StageScene/StageScene';

export default function StageArtistsPage({ params }: { params: { stageId: string } }) {
  const stage = stages.find((s) => s.id === params.stageId);
  if (!stage) notFound();

  const stageArtists = artists.filter((a) => a.stageId === params.stageId);
  const sorted = [...stageArtists].sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));
  const liveArtist = stageArtists.find((a) => a.isLive);
  const otherStages = stages.filter((s) => s.id !== params.stageId);

  const [liveInfoVisible, setLiveInfoVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (heroRef.current) heroRef.current.style.opacity = '1';
      setLiveInfoVisible(true);
    }, 50);
    return () => clearTimeout(t);
  }, []);

  // Direct DOM manipulation — no React re-render, no scroll interruption
  const handleFirstScroll = useCallback(() => {
    if (heroRef.current) heroRef.current.style.opacity = '0';
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <StageScene
        artists={sorted}
        stageId={params.stageId}
        onFirstScroll={handleFirstScroll}
      />

      <div
        ref={heroRef}
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{ opacity: 0, transition: 'opacity 0.8s ease' }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(60px, 8vw, 120px)',
            fontWeight: 600,
            lineHeight: 0.9,
            textAlign: 'center',
            textTransform: 'uppercase',
            color: '#000000',
            letterSpacing: '-0.02em',
          }}
        >
          {stage.name}
        </h1>
      </div>

      <NavStrip
        currentStage={stage.label}
        currentStageId={stage.id}
        liveInfo={liveArtist ? `· LIVE NOW: ${liveArtist.name}` : undefined}
        liveInfoVisible={liveInfoVisible}
        otherStages={otherStages.map((s) => ({ label: s.label, id: s.id }))}
      />
    </div>
  );
}
