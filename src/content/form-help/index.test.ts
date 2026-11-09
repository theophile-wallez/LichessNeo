import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { HELP_CLASS, syncFormHelp } from './index.ts';

// An arena's form as lila serves it (/tournament/new), cut to its tips and one section.
const ARENA =
  '<main class="page-small"><div class="tour__form box box-pad">' +
  '<h1 class="box__top">Create a new tournament</h1>' +
  '<form class="form3" method="post" action="/tournament/new">' +
  '<div class="form-group"><a class="text" data-icon="" href="/tournament/help#organizing" target="_blank">Our tips for organizing events</a></div>' +
  '<fieldset class="toggle-box toggle-box--toggle"><legend>Tournament</legend></fieldset>' +
  '</form></div></main>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the form help link', () => {
  it('copies the tips into the title and marks the group it leaves', () => {
    document.body.innerHTML = ARENA;
    syncFormHelp();
    const copy = queryOne(document, `h1.box__top > a.${HELP_CLASS}`, HTMLAnchorElement);
    expect(copy?.textContent).toBe('Our tips for organizing events');
    expect(copy?.pathname).toBe('/tournament/help');
    expect(copy?.target).toBe('_blank');
    expect(copy?.rel).toBe('noopener');
    const group = queryOne(document, 'form.form3 > .form-group', HTMLElement);
    expect(group?.dataset['lnExtHelp']).toBe('title');
    // The original stays where Lichess put it.
    expect(queryOne(group ?? document, 'a.text[data-icon]', HTMLAnchorElement)).not.toBeNull();
  });

  it('copies a link in a paragraph, as a broadcast’s guide is', () => {
    document.body.innerHTML =
      '<main class="page-menu"><div class="page-menu__content box box-pad">' +
      '<h1 class="box__top">New live broadcast</h1><form class="form3">' +
      '<div class="form-group"><p><a class="text" data-icon="" href="/broadcast/help">How to use Lichess Broadcasts</a></p></div>' +
      '</form></div></main>';
    syncFormHelp();
    const copy = queryOne(document, `.box__top > .${HELP_CLASS}`, HTMLAnchorElement);
    expect(copy?.textContent).toBe('How to use Lichess Broadcasts');
    expect(copy?.hasAttribute('target')).toBe(false);
  });

  it('copies it once, however many ticks pass', () => {
    document.body.innerHTML = ARENA;
    syncFormHelp();
    syncFormHelp();
    expect(queryAll(document, `.${HELP_CLASS}`, HTMLElement)).toHaveLength(1);
  });

  it('leaves a form that opens with a field alone, and the settings', () => {
    document.body.innerHTML =
      '<main class="box"><h1 class="box__top">New team</h1><form class="form3">' +
      '<div class="form-group"><label class="form-label">Name</label><input class="form-control"></div>' +
      '</form></main>' +
      '<main class="account"><div class="box"><h1 class="box__top">Display</h1><form class="form3">' +
      '<div class="form-group"><a class="text" data-icon="" href="/help">Help</a></div></form></div></main>';
    syncFormHelp();
    expect(queryAll(document, `.${HELP_CLASS}`, HTMLElement)).toHaveLength(0);
  });
});
