import { COACH_MOODS, type CoachMood } from '#shared/coach.ts';
import { createElement } from '#shared/dom.ts';
import { ENTRANCE_KINDS, type EntranceKind } from '#content/coach/mascot/rig/entrance.ts';
import { REACTION_KINDS, type ReactionKind } from '#content/coach/mascot/rig/reactions.ts';
import type { App } from './app.ts';
import { button, buttons, choice, section, slider, toggle } from './controls.ts';

// The panel's sections on what the mascot does: its mood, its moves, and the
// clock it lives by.

const MOOD_NAMES: Readonly<Record<CoachMood, string>> = {
  neutral: 'Neutre',
  happy: 'Content',
  delight: 'Ravi',
  doubt: 'Dubitatif',
  worry: 'Inquiet',
  shock: 'Choqué',
  surprise: 'Surpris',
  sad: 'Triste',
  angry: 'Fâché',
  proud: 'Fier',
  thinking: 'Pensif',
  shy: 'Gêné',
};

const ENTRANCE_NAMES: Readonly<Record<EntranceKind, string>> = {
  drop: 'Tombe du ciel',
  walk: 'Marche',
  hops: 'Sautille',
  rise: 'Surgit du sol',
  spin: 'Descend en toupie',
  slide: 'Glisse et freine',
};

const REACTION_NAMES: Readonly<Record<ReactionKind, string>> = {
  hop: 'Saut',
  wave: 'Coucou',
  laugh: 'Rire',
  twirl: 'Pirouette',
  hello: 'Bonjour',
  jiggle: 'Gelée',
  tickle: 'Chatouilles',
  spinHop: 'Saut pirouette',
  shy: 'Gêné',
};

export function moodPanel(panel: HTMLElement, app: App): void {
  const box = section(panel, 'Expression');
  const mood = choice({
    label: 'Humeur',
    values: COACH_MOODS.map(value => ({ value, label: MOOD_NAMES[value] })),
    value: app.settings.mood,
    onPick: picked => {
      app.update({ mood: picked });
      app.theater.setMood(picked);
    },
  });
  const talking = toggle('Parle', app.settings.talking, value => {
    app.update({ talking: value });
    app.theater.setTalking(value);
  });
  const follow = toggle('Suit le pointeur', app.settings.follow, value => {
    app.update({ follow: value });
    app.theater.setFollow(value);
  });
  box.append(mood.element, talking.element, follow.element);
}

export function reactionsPanel(panel: HTMLElement, app: App): void {
  const box = section(panel, 'Réactions');
  const { theater } = app;
  const poke = buttons(button('Clic (une réaction au hasard)', () => theater.poke()));
  const each = buttons(
    ...REACTION_KINDS.map(kind => button(REACTION_NAMES[kind], () => theater.react(kind))),
  );
  const moves = buttons(
    button('Petit saut', () => theater.hop(2.2)),
    button('Grand saut', () => theater.hop(4.2)),
    button('Coucou', () => theater.waveHello()),
  );
  box.append(poke, each, moves);
}

export function entrancesPanel(panel: HTMLElement, app: App): void {
  const box = section(panel, 'Entrées');
  for (const kind of ENTRANCE_KINDS) {
    const row = createElement('div', { className: 'row' });
    const sides = buttons(
      button('← Gauche', () => app.theater.enter(kind, 'left')),
      button('Droite →', () => app.theater.enter(kind, 'right')),
    );
    row.append(createElement('span', { className: 'label', text: ENTRANCE_NAMES[kind] }), sides);
    box.append(row);
  }
}

export function clockPanel(panel: HTMLElement, app: App): void {
  const box = section(panel, 'Temps');
  const { theater } = app;
  const speed = slider({
    label: 'Vitesse ×',
    min: 0.05,
    max: 2,
    step: 0.05,
    value: app.settings.speed,
    onInput: value => {
      app.update({ speed: value });
      theater.setSpeed(value);
    },
  });
  const pause = button('Pause', () => {
    theater.setPaused(!theater.paused);
    pause.textContent = theater.paused ? 'Reprendre' : 'Pause';
  });
  const step = button('Image suivante', () => theater.step());
  const snapshot = button('Capture PNG', () => {
    const name = `${app.actor.character.name.toLowerCase()}-${app.settings.mood}.png`;
    const link = createElement('a', { attrs: { href: theater.snapshot(), download: name } });
    link.click();
  });
  box.append(speed.element, buttons(pause, step, snapshot));
}
