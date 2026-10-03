import { pickCoach } from '#shared/coach.ts';
import { loadMascots } from '#content/coach/load.ts';

// The hero's illustration: the user's coach, live, as in the Game Review,
// which reacts when it's clicked. Its still shows until the mascots' bundle is
// in, or for good without WebGL (styles/home/hero.css).

const LIVE_CLASS = 'cdc-hero__coach--live';

export async function mountHeroCoach(host: HTMLElement): Promise<void> {
  const mountMascot = await loadMascots();
  if (!mountMascot || !host.isConnected) return;
  const mascot = mountMascot(host, { framing: 'full' });
  if (!mascot) return;
  mascot.setCoach(pickCoach());
  host.classList.toggle(LIVE_CLASS, true);
  host.addEventListener('click', () => mascot.poke());
}
