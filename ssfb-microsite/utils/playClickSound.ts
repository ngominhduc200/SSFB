export function playClickSound() {
  if (typeof window === 'undefined') return;
  const a = new Audio('/sounds/click.mp3');
  a.volume = 0.18;
  a.play().catch(() => {});
}
