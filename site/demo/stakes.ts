import { inView } from 'motion';
import { avatarOf } from '#shared/avatar.ts';
import { queryOne } from '#shared/dom.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import type { RatedPlayer } from '#content/game/stakes/round.ts';
import { gameStakes, type Stakes } from '#content/game/stakes/rules.ts';
import { flowTo } from './motion/flow.ts';

// The Elo tile's two bars (index.html's .stakes-demo), as the extension draws
// a rated game's: each player's Elo, then what they would win, draw or lose,
// by the extension's own rules (content/game/stakes). The opponent changes
// while the tile is on screen, and every figure rolls to the new one.

const OUTCOMES = ['win', 'draw', 'loss'] as const;

const YOU: RatedPlayer = { user: 'You', glicko: { rating: 1702, deviation: 52 }, bot: false };

const OPPONENTS: readonly RatedPlayer[] = [
  { user: 'Owlbert', glicko: { rating: 1886, deviation: 48 }, bot: false },
  { user: 'Tempo64', glicko: { rating: 1694, deviation: 60 }, bot: false },
  { user: 'Rookery', glicko: { rating: 1531, deviation: 55 }, bot: false },
];

const NEXT_MS = 3200;

const SIGNED = { format: { signDisplay: 'exceptZero' } } as const;

function barMarkup(side: 'top' | 'bottom', clock: string): SafeHtml {
  return html`<div class="stakes-bar" data-side="${side}">
    <span class="demo-avatar"></span>
    <span class="stakes-bar__who"><b class="stakes-bar__name"></b><span class="stakes-bar__elo"></span></span>
    <span class="stakes-pill">${OUTCOMES.map(outcome => html`<span class="stakes-pill__outcome stakes-pill__outcome--${outcome}"></span>`)}</span>
    <span class="stakes-bar__clock">${clock}</span>
  </div>`;
}

function showPlayer(bar: HTMLElement, player: RatedPlayer, stakes: Stakes): void {
  const avatar = queryOne(bar, '.demo-avatar', HTMLElement);
  const name = queryOne(bar, '.stakes-bar__name', HTMLElement);
  const elo = queryOne(bar, '.stakes-bar__elo', HTMLElement);
  if (avatar) {
    const { color, coach } = avatarOf(player.user);
    avatar.dataset.color = color;
    // Absolute: a URL in a variable would resolve against the sheet that reads it.
    const still = new URL(`img/coaches/mascot-${coach}.webp`, document.baseURI).href;
    avatar.style.setProperty('--avatar-coach', `url(${still})`);
  }
  if (name) name.textContent = player.user;
  if (elo) flowTo(elo, player.glicko.rating, { format: { useGrouping: false } });
  for (const outcome of OUTCOMES) {
    const figure = queryOne(bar, `.stakes-pill__outcome--${outcome}`, HTMLElement);
    if (figure) flowTo(figure, stakes[outcome], SIGNED);
  }
}

export function startStakes(): void {
  const root = queryOne(document, '.stakes-demo', HTMLElement);
  if (!root) return;
  setHtml(root, html`${barMarkup('top', '2:41')}${barMarkup('bottom', '2:58')}`);
  const top = queryOne(root, '[data-side=top]', HTMLElement);
  const bottom = queryOne(root, '[data-side=bottom]', HTMLElement);
  if (!top || !bottom) return;
  let shown = 0;
  const show = (): void => {
    const opponent = OPPONENTS[shown % OPPONENTS.length] ?? YOU;
    const stakes = gameStakes({
      id: 'stakes',
      perf: 'blitz',
      variant: 'standard',
      players: { white: YOU, black: opponent },
      own: null,
    });
    showPlayer(top, opponent, stakes.black);
    showPlayer(bottom, YOU, stakes.white);
    shown += 1;
  };
  show();
  inView(root, () => {
    const timer = window.setInterval(show, NEXT_MS);
    return () => window.clearInterval(timer);
  });
}
