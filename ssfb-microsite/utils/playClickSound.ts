let audio: HTMLAudioElement | null = null;

export function playClickSound() {
  if (typeof window === 'undefined') return;
  if (!audio) audio = new Audio('/sounds/click.mp3');
  audio.currentTime = 0;
  audio.volume = 0.18;
  audio.play().catch(() => {});
}
