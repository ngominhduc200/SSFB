'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notFound } from 'next/navigation';
import { stages } from '@/data/stages';
import { artists } from '@/data/artists';
import NavStrip from '@/components/NavStrip/NavStrip';
import StageScene from '@/components/StageScene/StageScene';
import StippleText from '@/components/StippleText/StippleText';

export default function StageArtistsPage({ params }: { params: { stageId: string } }) {
  const stage = stages.find((s) => s.id === params.stageId);
  if (!stage) notFound();

  const stageArtists = artists.filter((a) => a.stageId === params.stageId);
  const sorted = [...stageArtists].sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0));
  const otherStages = stages.filter((s) => s.id !== params.stageId);

  const STAGE_LIVE: Record<string, string> = {
    'stage-a': 'nihiloxica',
    'stage-b': 'vladimir-ivkovic-2',
    'stage-c': 'alessandro-adriani-the-hacker',
  };
  const liveArtist = artists.find(a => a.id === STAGE_LIVE[params.stageId]);

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
        <StippleText text={stage.name} />
      </div>

      <NavStrip
        currentStage={stage.name}
        currentStageId={stage.id}
        liveInfo={liveArtist ? `LIVE NOW: ${liveArtist.name}` : undefined}
        liveInfoVisible={liveInfoVisible}
        otherStages={otherStages.map((s) => ({ label: s.name, id: s.id }))}
      />
    </div>
  );
}
