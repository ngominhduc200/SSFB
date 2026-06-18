'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { playClickSound } from '@/utils/playClickSound';

const linkStyle = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 400,
  fontSize: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.64px',
  color: '#FF0000',
  mixBlendMode: 'difference' as const,
};

const exploreLinkStyle = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 400,
  fontSize: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.64px',
  color: '#FF0000',
  backgroundColor: '#000',
  padding: '4px 8px',
};

export default function Nav() {
  const pathname = usePathname();
  const isExplore = pathname === '/explore';
  const isHome    = pathname === '/home';
  const useMapStyle = isExplore || isHome;

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '24px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {!isExplore && !isHome && (
          <Link href="/home" style={linkStyle} onClick={playClickSound}>SSFB</Link>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/explore"  style={useMapStyle ? exploreLinkStyle : linkStyle} onClick={playClickSound}>MAP</Link>
          <Link href="/schedule" style={useMapStyle ? exploreLinkStyle : linkStyle} onClick={playClickSound}>SCHEDULE</Link>
        </div>
      </div>
    </nav>
  );
}
