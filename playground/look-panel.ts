import type { App } from './app.ts';
import { ACTORS, asSource, type Edits } from './cast.ts';
import { button, buttons, choice, colorField, section, select, slider } from './controls.ts';

// The panel's sections on who the mascot is, how it's framed, and its colors.

// Where the front color starts, as a normal's z: -1 is all round, 1 none.
const MASK = { min: -1, max: 1, step: 0.01, value: 0 } as const;

export function whoPanel(panel: HTMLElement, app: App, onActor: () => void): void {
  const box = section(panel, 'Personnage');
  const values = ACTORS.map(({ id, label }) => ({ value: id, label }));
  const actor = select('Qui', values, id => {
    app.update({ actor: id });
    app.theater.play(app.character, true);
    onActor();
  });
  actor.set(app.settings.actor);
  const framing = choice({
    label: 'Cadrage',
    values: [
      { value: 'bust', label: 'Buste' },
      { value: 'full', label: 'En entier' },
    ],
    value: app.settings.framing,
    onPick: picked => {
      app.update({ framing: picked });
      app.theater.setFraming(picked);
    },
  });
  const size = slider({
    label: 'Taille (px)',
    min: 57,
    max: 900,
    step: 1,
    value: app.settings.size,
    digits: 0,
    onInput: value => app.update({ size: value }),
  });
  const actual = button('Taille réelle (114 px)', () => {
    size.set(114);
    app.update({ size: 114 });
  });
  const background = colorField('Fond', app.settings.background, value =>
    app.update({ background: value }),
  );
  box.append(actor.element, framing.element, size.element, buttons(actual), background.element);
}

/** The colors' section, and what refreshes it once another actor shows. */
export function colorsPanel(panel: HTMLElement, app: App, onReset: () => void): () => void {
  const box = section(panel, 'Couleurs');
  const paint = (patch: Edits): void => {
    app.edit(patch);
    app.theater.paint(app.character);
  };
  const { colors } = app.character;
  const coat = colorField('Pelage', colors.coat, value => paint({ colors: { coat: value } }));
  const front = colorField('Ventre', colors.front, value => paint({ colors: { front: value } }));
  const accent = colorField('Accent', colors.accent, value => paint({ colors: { accent: value } }));
  const light = colorField('Lumières', colors.light ?? colors.accent, value =>
    paint({ colors: { light: value } }),
  );
  // The brows' material is built with the face: a new color takes a new mascot.
  const brows = colorField('Sourcils', app.character.face.brows.color, value => {
    app.edit({ brows: value });
    app.theater.play(app.character, false);
  });
  const maskAt = (index: 0 | 1) => (value: number) => {
    const mask: [number, number] = [...app.character.frontMask];
    mask[index] = value;
    paint({ frontMask: mask });
  };
  const maskBottom = slider({ label: 'Ventre, en bas', ...MASK, onInput: maskAt(0) });
  const maskTop = slider({ label: 'Ventre, en haut', ...MASK, onInput: maskAt(1) });
  const refresh = (): void => {
    const character = app.character;
    coat.set(character.colors.coat);
    front.set(character.colors.front);
    accent.set(character.colors.accent);
    light.set(character.colors.light ?? character.colors.accent);
    brows.set(character.face.brows.color);
    maskBottom.set(character.frontMask[0]);
    maskTop.set(character.frontMask[1]);
    light.element.hidden = character.colors.light === undefined;
  };
  const reset = button('Rétablir', () => {
    app.edit(null);
    app.theater.play(app.character, false);
    onReset();
  });
  const copy = button('Copier le code', () => {
    void navigator.clipboard.writeText(asSource(app.character));
  });
  box.append(coat.element, front.element, accent.element, light.element, brows.element);
  box.append(maskBottom.element, maskTop.element, buttons(reset, copy));
  refresh();
  return refresh;
}
