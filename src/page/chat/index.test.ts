import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chat } from './index.ts';

// A game's chat as Lichess draws it, with its rematch button (lila's ui/round view/button.ts).
const LINE = (text: string): string => `<li class="system"><t>${text}</t></li>`;

function page(lines: readonly string[], rematch: string): void {
  document.body.innerHTML = `<main class="round">
    <div class="rcontrols"><div class="follow-up"><button class="fbt rematch white ${rematch}"></button></div></div>
    <section class="mchat"><ol class="mchat__messages">${lines.map(LINE).join('')}</ol></section>
  </main>`;
}

const labels = (): (string | undefined)[] =>
  [...document.querySelectorAll<HTMLElement>('.mchat__messages > li')].map(
    line => line.dataset['lrExtLabel'],
  );

const settle = (): Promise<void> => new Promise(done => setTimeout(done, 0));

beforeEach(() => {
  Object.assign(window, {
    i18n: {
      site: {
        rematchOfferSent: 'Proposition de revanche envoyée',
        rematchOfferDeclined: 'Proposition de revanche déclinée',
        yourOpponentWantsToPlayANewGameWithYou:
          'Votre adversaire veut jouer une nouvelle partie avec vous',
      },
    },
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'i18n');
});

describe('a rematch offer in the chat', () => {
  it('says the opponent sent it while their offer glows', () => {
    page(['Rematch offer sent'], 'glowing');
    chat.start();
    expect(labels()).toEqual(['Votre adversaire veut jouer une nouvelle partie avec vous']);
  });

  it('says it was sent when it is the player’s', () => {
    page(['Rematch offer sent'], 'me');
    chat.start();
    expect(labels()).toEqual(['Proposition de revanche envoyée']);
  });

  it('keeps saying it was the opponent’s once declined', async () => {
    page(['Rematch offer sent'], 'glowing');
    chat.start();
    const button = document.querySelector('.rematch');
    button?.classList.remove('glowing');
    document
      .querySelector('.mchat__messages')
      ?.insertAdjacentHTML('beforeend', LINE('Rematch offer declined'));
    await settle();
    expect(labels()).toEqual([
      'Votre adversaire veut jouer une nouvelle partie avec vous',
      'Proposition de revanche déclinée',
    ]);
  });

  it('learns whose it is when the button changes after the line', async () => {
    page(['Rematch offer sent'], '');
    chat.start();
    expect(labels()).toEqual(['Proposition de revanche envoyée']);
    document.querySelector('.rematch')?.classList.add('glowing');
    await settle();
    expect(labels()).toEqual(['Votre adversaire veut jouer une nouvelle partie avec vous']);
  });

  it('leaves an earlier offer to Lichess’s words', () => {
    page(['Rematch offer sent', 'Rematch offer declined', 'Rematch offer sent'], 'glowing');
    chat.start();
    expect(labels()).toEqual([
      'Proposition de revanche envoyée',
      'Proposition de revanche déclinée',
      'Votre adversaire veut jouer une nouvelle partie avec vous',
    ]);
  });
});
