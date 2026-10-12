import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { syncPicks } from './picks.ts';

// The setup as Lichess serves it, for the computer (ai), a friend and a seek (hook).

const VARIANT =
  '<div class="mselect"><input class="mselect__toggle" type="checkbox" id="mselect-variant">' +
  '<label class="mselect__label" for="mselect-variant"><span class="icon" data-icon="\ue021"></span>' +
  '<div class="text"><span class="name">Standard</span><span class="desc">Standard rules</span>' +
  '</div></label></div>';

const tabs = (active: number): string =>
  '<div class="tabs-horiz" role="tablist">' +
  ['Unlimited', 'Real time', 'Correspondence']
    .map((name, i) => `<button${i === active ? ' class="active"' : ''} role="tab">${name}</button>`)
    .join('') +
  '</div>';

const TIME = {
  unlimited: `${tabs(0)}<div class="time-panel">Take all the time you need</div>`,
  realTime:
    `${tabs(1)}<div class="time-panel"><div class="sliders-grid">` +
    '<div class="slider-container"><div class="label-row"><label>Minutes per side</label>' +
    '<span class="val-box">3</span></div><input class="range" type="range"></div>' +
    '<div class="slider-separator">+</div><div class="slider-container"><div class="label-row">' +
    '<span class="val-box">2</span><label>Increment in seconds</label></div>' +
    '<input class="range" type="range"></div></div><div class="presets">' +
    ['1+0', '2+1', '3+0', '3+2', '10+0', '10+5', '30+20']
      .map(preset => `<button class="preset-btn">${preset}</button>`)
      .join('') +
    '</div></div>',
  correspondence:
    `${tabs(2)}<div class="time-panel"><div class="slider-container full-width">` +
    '<div class="label-row"><label>Days per turn</label><span class="val-box">2</span></div>' +
    '<input class="range" type="range"></div></div>',
};

const MODE =
  '<div class="config-group"><div class="label">Game mode</div><group class="radio">' +
  '<div><input id="sf_mode_casual" type="radio" value="casual" checked><label for="sf_mode_casual">Casual</label></div>' +
  '<div><input id="sf_mode_rated" type="radio" value="rated" disabled><label for="sf_mode_rated">Rated</label></div>' +
  '</group></div>';

const LEVEL =
  '<div class="config-group"><div class="radio-pane"><div class="label">Strength</div><group class="radio">' +
  '<div><input id="sf_level_1" name="level" type="radio" value="1" checked><label for="sf_level_1">1</label></div>' +
  '</group></div></div>';

const side = (checked: string): string =>
  '<div class="config-group"><div class="label">Side</div><group class="radio color-picker color-cards">' +
  ['white', 'random', 'black']
    .map(
      color =>
        `<div><input id="color-picker-${color}" name="color" type="radio" value="${color}"` +
        `${color === checked ? ' checked' : ''}><label class="card-radio" for="color-picker-${color}">` +
        `<div class="color-picker__button ${color}"><icon></icon></div>` +
        `<span class="text">${color === 'random' ? 'Random side' : color}</span></label></div>`,
    )
    .join('') +
  '</group></div>';

const SETUPS = {
  ai: (time = TIME.unlimited) =>
    `${VARIANT}<div class="config-group time-control-tabs">${time}</div>${LEVEL}${side('white')}`,
  friend: (time = TIME.unlimited) =>
    `${VARIANT}<div class="config-group time-control-tabs">${time}</div>${MODE}${side('black')}`,
  hook: (time = TIME.unlimited) =>
    `${VARIANT}<div class="config-group time-control-tabs">${time}</div>${MODE}<div class="ratings"></div>`,
};

function open(markup: string): HTMLElement {
  document.body.innerHTML = `<dialog open><div class="game-setup"><div class="setup-content">${markup}</div></div></dialog>`;
  syncPicks();
  const root = queryOne(document, '.setup-content > .lr-ext-setup', HTMLElement);
  if (!root) throw new Error('no tiles');
  return root;
}

/** Lichess redraws the content in place: its own nodes anew, ours kept. */
function redraw(markup: string): void {
  const content = queryOne(document, '.setup-content', HTMLElement);
  const root = queryOne(document, '.lr-ext-setup', HTMLElement);
  if (!content || !root) throw new Error('no setup');
  content.innerHTML = markup;
  content.prepend(root);
  syncPicks();
}

const tile = (part: string): HTMLElement => {
  const found = queryOne(document, `.lr-ext-setup__tile[data-lr-ext-part="${part}"]`, HTMLElement);
  if (!found) throw new Error(`no ${part} tile`);
  return found;
};

const shown = (part: string) => {
  const found = tile(part);
  return {
    hidden: found.hidden,
    glyph: queryOne(found, '.lr-ext-setup__icon', HTMLElement)?.dataset.icon,
    pick: queryOne(found, '.lr-ext-setup__icon', HTMLElement)?.dataset.lrExtPick,
    caption: queryOne(found, '.lr-ext-setup__caption', HTMLElement)?.textContent,
    value: queryOne(found, '.lr-ext-setup__value', HTMLElement)?.textContent,
  };
};

const partsMarked = (): (string | undefined)[] =>
  queryAll(document, '[data-lr-ext-setup-part]', HTMLElement).map(
    element => element.dataset.lrExtSetupPart,
  );

const { dataset } = document.documentElement;

beforeEach(() => {
  dataset.lrExtVariantLabel = 'Variant';
  dataset.lrExtTimeControlLabel = 'Time control';
});

afterEach(() => {
  document.body.replaceChildren();
  delete dataset.lrExtVariantLabel;
  delete dataset.lrExtTimeControlLabel;
});

describe('the game setup’s tiles', () => {
  it('shows each pick of the computer’s setup, with its caption', () => {
    open(SETUPS.ai());
    expect(shown('variant')).toEqual({
      hidden: false,
      glyph: '\ue021',
      pick: undefined,
      caption: 'Variant',
      value: 'Standard',
    });
    expect(shown('time')).toMatchObject({
      pick: 'unlimited',
      caption: 'Time control',
      value: 'Unlimited',
    });
    expect(shown('side')).toMatchObject({
      hidden: false,
      pick: 'white',
      caption: 'Side',
      value: 'white',
    });
    expect(partsMarked()).toEqual(['variant', 'time', 'level', 'side']);
  });

  it('marks a friend’s game mode, which stays Lichess’s own control', () => {
    open(SETUPS.friend());
    expect(shown('side')).toMatchObject({ pick: 'black', value: 'black' });
    expect(partsMarked()).toEqual(['variant', 'time', 'mode', 'side']);
  });

  it('hides the side’s tile for a seek, which has none', () => {
    open(SETUPS.hook());
    expect(shown('side').hidden).toBe(true);
    expect(partsMarked()).toEqual(['variant', 'time', 'mode']);
  });

  it('shows a real time clock and its speed, and marks each preset’s', () => {
    open(SETUPS.friend(TIME.realTime));
    expect(shown('time')).toMatchObject({ glyph: '\ue008', pick: undefined, value: '3+2' });
    const presets = queryAll(document, '.preset-btn', HTMLElement).map(preset => [
      preset.dataset.lrExtSpeed,
      preset.dataset.lrExtFirst,
    ]);
    expect(presets).toEqual([
      ['bullet', ''],
      ['bullet', undefined],
      ['blitz', ''],
      ['blitz', undefined],
      ['rapid', ''],
      ['rapid', undefined],
      ['classical', ''],
    ]);
  });

  it('shows correspondence with its glyph', () => {
    open(SETUPS.friend(TIME.correspondence));
    expect(shown('time')).toMatchObject({ glyph: '\ue019', value: 'Correspondence' });
  });

  it('follows Lichess’s redraws, keeping one row of tiles', () => {
    open(SETUPS.friend());
    redraw(SETUPS.friend(TIME.realTime));
    expect(shown('time').value).toBe('3+2');
    expect(queryAll(document, '.lr-ext-setup', HTMLElement)).toHaveLength(1);
  });
});

describe('the panel under the tiles', () => {
  it('opens on the time control', () => {
    const root = open(SETUPS.friend());
    expect(root.dataset.lrExtOpen).toBe('time');
    expect(tile('time').dataset.lrExtExpanded).toBe('');
    expect(tile('time').ariaExpanded).toBe('true');
    expect(tile('side').dataset.lrExtExpanded).toBeUndefined();
    expect(tile('side').ariaExpanded).toBe('false');
    expect(root.dataset.lrExtSwitched).toBeUndefined();
  });

  it('switches to the side, and back, each sliding in', () => {
    const root = open(SETUPS.friend());
    tile('side').click();
    syncPicks();
    expect(root.dataset.lrExtOpen).toBe('side');
    expect(root.dataset.lrExtSwitched).toBe('side');
    expect(tile('side').ariaExpanded).toBe('true');
    expect(tile('time').ariaExpanded).toBe('false');
    tile('time').click();
    expect(root.dataset.lrExtOpen).toBe('time');
    expect(root.dataset.lrExtSwitched).toBe('time');
  });

  it('can’t be closed: its own tile does nothing', () => {
    const root = open(SETUPS.friend());
    tile('time').click();
    syncPicks();
    expect(root.dataset.lrExtOpen).toBe('time');
    expect(root.dataset.lrExtSwitched).toBeUndefined();
  });

  it('stays on the side as a side is picked', () => {
    const root = open(SETUPS.friend());
    tile('side').click();
    redraw(
      SETUPS.friend().replace(' checked><label class="card-radio" for="color-picker-black"', '>'),
    );
    expect(root.dataset.lrExtOpen).toBe('side');
  });

  it('goes back to the time control once the side is gone', () => {
    const root = open(SETUPS.friend());
    tile('side').click();
    redraw(SETUPS.hook());
    expect(root.dataset.lrExtOpen).toBe('time');
  });

  it('marks the variant’s tile while its menu is open, the panel still there', () => {
    const root = open(SETUPS.friend());
    const toggle = queryOne(document, '.mselect__toggle', HTMLInputElement);
    if (toggle) toggle.checked = true;
    syncPicks();
    expect(tile('variant').dataset.lrExtExpanded).toBe('');
    expect(root.dataset.lrExtOpen).toBe('time');
  });
});
