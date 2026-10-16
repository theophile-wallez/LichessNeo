import { FINISHES, type Finish } from '#content/coach/mascot/cast/finishes.ts';
import type { App } from './app.ts';
import { button, buttons, choice, section, slider } from './controls.ts';
import { PLAIN_FUR, type FurTuning } from './settings.ts';

// The panel's sections on what the mascot is made of: fur or a solid finish,
// and the fur's tuning.

// The fur's tuning, relative to what each part was made with.
const FACTOR = { min: 0.1, max: 3, step: 0.05 } as const;

const SKIN_NAMES: Readonly<Record<'fur' | Finish, string>> = {
  fur: 'Fourrure',
  plastic: 'Plastique',
  clay: 'Pâte à modeler',
  velvet: 'Velours',
  metal: 'Métal',
  ceramic: 'Céramique',
  toon: 'Dessin animé',
  jelly: 'Gelée',
};

/** The skin's section, and what refreshes it once another actor shows. */
export function skinPanel(panel: HTMLElement, app: App, onSkin: () => void): () => void {
  const box = section(panel, 'Matière');
  const skin = choice({
    label: 'Peau',
    values: (['fur', ...FINISHES] as const).map(value => ({ value, label: SKIN_NAMES[value] })),
    value: app.character.skin,
    onPick: picked => {
      app.edit({ skin: picked });
      app.theater.play(app.character, false);
      onSkin();
    },
  });
  box.append(skin.element);
  return () => {
    skin.set(app.character.skin);
    // The robot keeps a solid skin (see edited).
    skin.offer('fur', app.actor.character.colors.light === undefined);
  };
}

export function furPanel(panel: HTMLElement, app: App): () => void {
  const box = section(panel, 'Fourrure');
  const tune = (patch: Partial<FurTuning>): void => {
    const fur = { ...app.settings.fur, ...patch };
    app.update({ fur });
    app.theater.tuneFur(fur);
  };
  const { fur } = app.settings;
  const sliders = {
    length: slider({
      label: 'Longueur ×',
      ...FACTOR,
      value: fur.length,
      onInput: length => tune({ length }),
    }),
    density: slider({
      label: 'Densité ×',
      ...FACTOR,
      value: fur.density,
      onInput: density => tune({ density }),
    }),
    layers: slider({
      label: 'Couches ×',
      ...FACTOR,
      value: fur.layers,
      onInput: layers => tune({ layers }),
    }),
  };
  const reset = button('Rétablir', () => {
    tune(PLAIN_FUR);
    for (const key of ['length', 'density', 'layers'] as const) sliders[key].set(PLAIN_FUR[key]);
  });
  box.append(
    sliders.length.element,
    sliders.density.element,
    sliders.layers.element,
    buttons(reset),
  );
  return () => {
    box.hidden = app.character.skin !== 'fur';
  };
}
