import { setData } from '#shared/dom.ts';
import { coachesMove, loadMascots, onCoachMotion } from '#content/coach/load.ts';
import type { MascotView } from '#content/coach/mascot/index.ts';

// The hero's illustration: the home's coach, live, as in the Game Review,
// which makes an entrance, waves hello and reacts when it's clicked. It's the
// user's coach unless the settings gave the home one of its own
// (#shared/coach.ts). Its still shows only if the mascots' bundle won't load,
// there's no WebGL or the settings keep the coaches still (styles/home/hero.css):
// before, it would flash and vanish as it came in.

const LIVE_CLASS = 'ln-ext-hero__coach--live';
const STILL_CLASS = 'ln-ext-hero__coach--still';

function showStill(host: HTMLElement, coach: number | null): void {
  setData(host, 'lnExtAvatarCoach', coach === null ? null : String(coach));
  host.classList.toggle(STILL_CLASS, coach !== null);
}

export function mountHeroCoach(host: HTMLElement, coach: number): void {
  let mascot: MascotView | null = null;
  const mount = async (): Promise<void> => {
    const mountMascot = await loadMascots();
    if (!host.isConnected || mascot) return;
    // Large on the page's right, it looks into the page. Kept still while the bundle loaded, it stays.
    mascot = coachesMove()
      ? (mountMascot?.(host, { framing: 'full', facing: 'left' }) ?? null)
      : null;
    host.classList.toggle(LIVE_CLASS, mascot !== null);
    if (!mascot) return showStill(host, coach);
    showStill(host, null);
    mascot.setCoach(coach);
    // From the card's edge: the right one, or the left right to left.
    mascot.enter(document.documentElement.dir === 'rtl' ? 'left' : 'right');
  };
  host.addEventListener('click', () => mascot?.poke());
  // Taken off or put back as the settings' 3D is switched, in this tab or another.
  const stop = onCoachMotion(moving => {
    if (!host.isConnected) return stop();
    mascot?.destroy();
    mascot = null;
    host.classList.toggle(LIVE_CLASS, false);
    if (moving) void mount();
    else showStill(host, coach);
  });
  void mount();
}
