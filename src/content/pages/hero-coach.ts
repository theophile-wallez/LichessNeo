import { setData } from '#shared/dom.ts';
import { loadMascots } from '#content/coach/load.ts';

// The hero's illustration: the home's coach, live, as in the Game Review,
// which makes an entrance, waves hello and reacts when it's clicked. It's the
// user's coach unless the settings gave the home one of its own
// (#shared/coach.ts). Its still shows only if the mascots' bundle won't load or
// there's no WebGL (styles/home/hero.css): before, it would flash and vanish as
// it came in.

const LIVE_CLASS = 'ln-ext-hero__coach--live';
const STILL_CLASS = 'ln-ext-hero__coach--still';

export async function mountHeroCoach(host: HTMLElement, coach: number): Promise<void> {
  const mountMascot = await loadMascots();
  if (!host.isConnected) return;
  // Large on the page's right, it looks into the page.
  const mascot = mountMascot?.(host, { framing: 'full', facing: 'left' });
  if (!mascot) {
    setData(host, 'lnExtAvatarCoach', String(coach));
    host.classList.toggle(STILL_CLASS, true);
    return;
  }
  mascot.setCoach(coach);
  host.classList.toggle(LIVE_CLASS, true);
  host.addEventListener('click', () => mascot.poke());
  // From the card's edge: the right one, or the left right to left.
  mascot.enter(document.documentElement.dir === 'rtl' ? 'left' : 'right');
}
