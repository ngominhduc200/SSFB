// Entry splash page: /
import Link from 'next/link';

export default function Entry() {
  return (
    <div className="fixed inset-0 z-[200] bg-[#1E1E1E] flex flex-col items-center justify-center">
      {/* Map background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/images/3Dmap.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
        }}
      />

      {/* Festival name */}
      <h1
        className="text-red uppercase text-center relative z-10"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(52px, 9vw, 130px)',
          lineHeight: '0.855',
          fontWeight: 600,
        }}
      >
        STRANGE
        <br />
        SOUNDS
        <br />
        FROM
        <br />
        BEYOND
      </h1>

      {/* Enter CTA */}
      <Link
        href="/home"
        className="relative z-10 mt-[48px] font-[family-name:var(--font-ui)] text-[16px] uppercase tracking-[-0.64px] border border-red text-red px-[16px] py-[8px] hover:bg-red hover:text-[#1E1E1E] transition-colors"
      >
        ENTER →
      </Link>
    </div>
  );
}
