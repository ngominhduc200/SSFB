'use client';

import Link from 'next/link';
import { playClickSound } from '@/utils/playClickSound';

type NavStripProps = {
  currentStage?: string;
  currentStageId?: string;
  liveInfo?: string;
  liveInfoVisible?: boolean;
  otherStages?: { label: string; id: string }[];
  prevArtist?: string;
  prevArtistId?: string;
  nextArtist?: string;
  nextArtistId?: string;
  currentArtist?: string;
  artistTime?: string;
};

function Chip({
  children,
  variant = 'black',
  href,
}: {
  children: React.ReactNode;
  variant?: 'black' | 'dark-red';
  href?: string;
}) {
  const base =
    'h-[26px] flex items-center px-[13px] font-[family-name:var(--font-ui)] text-[16px] uppercase tracking-[-0.64px] whitespace-nowrap rounded-[2px]';

  const style =
    variant === 'black'
      ? { background: '#000000', color: '#ffffff' }
      : { background: '#B90000', color: '#ffffff' };

  if (href) {
    return (
      <Link href={href} className={base} style={style} onClick={playClickSound}>
        {children}
      </Link>
    );
  }
  return <div className={base} style={style}>{children}</div>;
}

function Connector() {
  return <div className="h-px w-6 bg-[#454545] flex-shrink-0" />;
}

export default function NavStrip({
  currentStage,
  currentStageId,
  liveInfo,
  liveInfoVisible = true,
  otherStages = [],
  prevArtist,
  prevArtistId,
  nextArtist,
  nextArtistId,
  currentArtist,
  artistTime,
}: NavStripProps) {
  const isSetlistMode = !!(currentArtist);

  return (
    <div className="fixed bottom-[24px] left-[24px] right-[24px] z-40 flex items-center gap-0">
      {/* Left: current stage — always visible */}
      {currentStage && currentStageId && (
        <Chip href={`/stage/${currentStageId}`}>{currentStage}</Chip>
      )}

      {/* Stage artists mode: live info expands from left after entry sequence */}
      {!isSetlistMode && liveInfo && (
        <div
          className="flex items-center overflow-hidden"
          style={{
            maxWidth: liveInfoVisible ? '400px' : '0px',
            opacity: liveInfoVisible ? 1 : 0,
            transition: 'max-width 2s cubic-bezier(0.4,0,0.2,1), opacity 1.2s ease',
          }}
        >
          <Connector />
          <Chip variant="dark-red">{liveInfo}</Chip>
        </div>
      )}

      {/* Setlist mode: prev → current → next */}
      {isSetlistMode && (
        <>
          {prevArtist && prevArtistId && currentStageId && (
            <>
              <Connector />
              <Chip href={`/stage/${currentStageId}/${prevArtistId}`} variant="dark-red">
                {prevArtist}
              </Chip>
            </>
          )}
          <Connector />
          <Chip variant="dark-red">
            {currentArtist}&nbsp;&nbsp;{artistTime}
          </Chip>
          {nextArtist && nextArtistId && currentStageId && (
            <>
              <Connector />
              <Chip href={`/stage/${currentStageId}/${nextArtistId}`} variant="dark-red">
                {nextArtist}
              </Chip>
            </>
          )}
        </>
      )}

      {/* Right: other stages */}
      <div className="ml-auto flex items-center gap-[8px]">
        {otherStages.map((s) => (
          <Chip key={s.id} href={`/stage/${s.id}`}>{s.label}</Chip>
        ))}
      </div>
    </div>
  );
}
