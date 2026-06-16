'use client';

import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pt-[24px] px-[24px]">
      <div className="w-full flex items-center">
        <Link
          href="/home"
          className="font-[family-name:var(--font-ui)] font-semibold text-[16px] uppercase text-red tracking-[-0.64px]"
        >
          SSFB
        </Link>
        <div className="ml-auto w-[240px] flex items-center justify-between">
          <Link
            href="/explore"
            className="font-[family-name:var(--font-ui)] font-semibold text-[16px] uppercase text-red tracking-[-0.64px]"
          >
            MAP
          </Link>
          <Link
            href="/schedule"
            className="font-[family-name:var(--font-ui)] font-semibold text-[16px] uppercase text-red tracking-[-0.64px]"
          >
            SCHEDULE
          </Link>
        </div>
      </div>
    </nav>
  );
}
