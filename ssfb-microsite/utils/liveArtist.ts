import { artists } from '@/data/artists';

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function getCurrentLive(stageArtists: typeof artists) {
  const now = new Date();
  const day = now.getDay();
  const dayLabel = day === 6 ? 'SAT' : day === 0 ? 'SUN' : null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return stageArtists.find(a => {
    const m = a.time.match(/^(SAT|SUN)\s+(\d{1,2}:\d{2})[^0-9](\d{1,2}:\d{2})/);
    if (!m) return false;
    // On festival days match the correct day prefix; on other days match any
    if (dayLabel && m[1] !== dayLabel) return false;
    return nowMin >= toMin(m[2]) && nowMin < toMin(m[3]);
  });
}
