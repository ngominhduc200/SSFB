import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav/Nav';
import AmbientPlayer from '@/components/AmbientPlayer/AmbientPlayer';
import GrainOverlay from '@/components/GrainOverlay/GrainOverlay';

export const metadata: Metadata = {
  title: 'SSFB — Strange Sounds From Beyond',
  description: 'Strange Sounds From Beyond — music festival microsite',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col h-screen overflow-hidden">
        <Nav />
        <AmbientPlayer />
        {children}
        <GrainOverlay />
      </body>
    </html>
  );
}
