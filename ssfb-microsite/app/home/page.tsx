// Home page: /home
import Link from 'next/link';
import TimeDisplay from '@/components/TimeDisplay/TimeDisplay';

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden">
      {/* Map background — drop map.svg into /public/map.svg */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/images/3Dmap.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.07,
        }}
      />

      {/* Center prompt */}
      <div className="fixed inset-0 pt-[65px] flex flex-col items-center justify-center gap-[16px] z-10">
        <span className="font-[family-name:var(--font-ui)] text-[16px] uppercase text-red tracking-[-0.64px] pointer-events-none">
          HOVER AND CLICK TO EXPLORE
        </span>
        <Link
          href="/stage/stage-a"
          className="font-[family-name:var(--font-ui)] text-[16px] uppercase tracking-[-0.64px] border border-black px-[16px] py-[8px] hover:bg-black hover:text-white transition-colors"
        >
          Stage A →
        </Link>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end px-[24px] pb-[24px]">
        {/* Festival name */}
        <h1
          className="text-red uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '130px',
            lineHeight: '0.855',
            fontWeight: 600,
          }}
        >
          STRANGE SOUNDS
          <br />
          FROM BEYOND
        </h1>

        {/* Right: times + address */}
        <div className="absolute bottom-[24px] right-[24px]">
          <TimeDisplay />
        </div>
      </div>
    </main>
  );
}
