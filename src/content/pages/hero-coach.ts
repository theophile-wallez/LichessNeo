import { pickCoach } from '#shared/coach.ts';
import { loadMascots } from '#content/coach/load.ts';

// The hero's illustration: the user's coach, live, as in the Game Review,
// which makes an entrance, waves hello and reacts when it's clicked. Its
// still shows only if the mascots' bundle won't load or there's no WebGL
// (styles/home/hero.css): before, it would flash and vanish as it came in.

const LIVE_CLASS = 'lr-ext-hero__coach--live';
const STILL_CLASS = 'lr-ext-hero__coach--still';

export async function mountHeroCoach(host: HTMLElement): Promise<void> {
  const mountMascot = await loadMascots();
  if (!host.isConnected) return;
  const mascot = mountMascot?.(host, { framing: 'full' });
  if (!mascot) {
    host.classList.toggle(STILL_CLASS, true);
    return;
  }
  mascot.setCoach(pickCoach());
  host.classList.toggle(LIVE_CLASS, true);
  host.addEventListener('click', () => mascot.poke());
  // From the card's edge: the right one, or the left right to left.
  mascot.enter(document.documentElement.dir === 'rtl' ? 'left' : 'right');
}
