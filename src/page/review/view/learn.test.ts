import { afterEach, describe, expect, it } from 'vitest';
import { analysis } from '#page/lichess/analysis.ts';
import { fakeController, withFakeSite } from '#page/review/fixtures/fake-lichess.ts';
import { en } from '#page/review/i18n/en.ts';
import { createSession, type Mode } from '#page/review/session.ts';
import { createElements } from './elements.ts';
import { learnFromMistakes } from './learn.ts';
import { renderKey } from './render-key.ts';
import { renderSummary } from './summary-panel.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Lichess's request form, in the underboard our layout hides.
const requestForm = (className: string): string =>
  `<main class="analyse"><div class="analyse__underboard"><form class="${className}" action="/request"><button type="submit"></button></form></div></main>`;

function setUp(serverAnalysis: boolean) {
  const ctrl = fakeController({
    id: 'abcdefgh',
    positions: [{ ply: 0, fen: START }],
    serverAnalysis,
  });
  withFakeSite(ctrl);
  const facade = analysis();
  if (!facade) throw new Error('not a controller');
  const modes: Mode[] = [];
  const session = createSession({
    language: en,
    coach: 1,
    elements: createElements(),
    redraw: () => {},
    setMode: mode => modes.push(mode),
  });
  let requests = 0;
  document.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault();
    requests++;
  });
  return { ctrl, facade, session, modes, requests: () => requests };
}

/** The summary's button, as drawn for the game. */
function learnButton(serverAnalysis: boolean): HTMLButtonElement | null {
  const { facade, session } = setUp(serverAnalysis);
  renderSummary(session, facade);
  return session.elements.panel.querySelector('.ln-ext-review__learn');
}

afterEach(() => {
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'site');
  Reflect.deleteProperty(window, 'i18n');
});

describe('the summary’s "Learn from your mistakes"', () => {
  it('shows on an analysed game, in Lichess’s own words', () => {
    Object.assign(window, {
      i18n: { site: { learnFromYourMistakes: 'Apprendre de vos erreurs' } },
    });
    expect(learnButton(true)?.textContent).toBe('Apprendre de vos erreurs');
  });

  it('shows where Lichess offers to analyse the game first', () => {
    document.body.innerHTML = requestForm('future-game-analysis');
    expect(learnButton(false)?.textContent).toBe('Learn from your mistakes');
  });

  it('comes in when Lichess draws its form after the summary', () => {
    document.body.innerHTML =
      '<main class="analyse"><div class="analyse__underboard"></div></main>';
    const { facade, session } = setUp(false);
    const before = renderKey(session, facade);
    document.body.innerHTML = requestForm('future-game-analysis');
    expect(renderKey(session, facade)).not.toBe(before);
  });

  // Lichess analyses only games of more than 4 moves; the review runs from 2.
  it('stays out of a game too short for Lichess to analyse', () => {
    document.body.innerHTML =
      '<main class="analyse"><div class="analyse__underboard"></div></main>';
    expect(learnButton(false)).toBeNull();
  });
});

describe('learn from your mistakes', () => {
  it('starts Lichess’s exercise on an analysed game, and closes the review', () => {
    document.body.innerHTML = requestForm('future-game-analysis');
    const { ctrl, facade, session, modes, requests } = setUp(true);
    learnFromMistakes(session, facade);
    expect(ctrl.retro).toBeDefined();
    expect(modes).toEqual(['normal']);
    expect(requests()).toBe(0);
  });

  it('first requests the server analysis the exercise needs', () => {
    document.body.innerHTML = requestForm('future-game-analysis');
    const { ctrl, facade, session, modes, requests } = setUp(false);
    learnFromMistakes(session, facade);
    expect(requests()).toBe(1);
    expect(ctrl.retro).toBeDefined();
    expect(modes).toEqual(['normal']);
  });

  it('leaves the sign-in to Lichess when signed out', () => {
    document.body.innerHTML = requestForm('future-game-analysis must-login');
    const { ctrl, facade, session, modes, requests } = setUp(false);
    learnFromMistakes(session, facade);
    expect(requests()).toBe(1);
    expect(ctrl.retro).toBeUndefined();
    expect(modes).toEqual([]);
  });
});
