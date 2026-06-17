'use client';

import Link from 'next/link';
import { playClickSound } from '@/utils/playClickSound';

const linkStyle = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  fontSize: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.64px',
  color: '#FF0000',
  mixBlendMode: 'difference' as const,
};

export default function Nav() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '24px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/home" style={linkStyle} onClick={playClickSound}>SSFB</Link>
        <div style={{ marginLeft: 'auto', width: '240px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/explore" style={linkStyle} onClick={playClickSound}>MAP</Link>
          <Link href="/schedule" style={linkStyle} onClick={playClickSound}>SCHEDULE</Link>
        </div>
      </div>
    </nav>
  );
}
