import { AI_LEVELS, robotTier } from '#shared/coach.ts';
import { createElement, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import { AI_RATINGS } from '#content/game/ai-players.ts';
import { playUiSound } from '#content/ui/sounds.ts';

// Stockfish's level as a slider (styles/pages/level-slider.css), in place of the
// computer setup's eight buttons, which stay, hidden, and keep the setting: a
// move of the slider clicks the level's radio. A native range, invisible, takes
// the pointer and the keys over our drawn track; the robot stands on its left.

const SPARKLES = 14;

/** The notch's tick, a whole tone higher per level: semitones from Foley's, the middle level at 0. */
export const tickPitch = (level: number): number => 2 * (level - Math.ceil(AI_LEVELS / 2));

export interface LevelSlider {
  /** Where the robot goes. */
  readonly robot: HTMLElement;
  readonly level: number;
}

interface Parts {
  readonly root: HTMLElement;
  readonly robot: HTMLElement;
  readonly input: HTMLInputElement;
  readonly number: HTMLElement;
  readonly rating: HTMLElement;
}

const built = new WeakMap<HTMLElement, Parts>();

function pick(level: number): void {
  const radio = document.getElementById(`sf_level_${level}`);
  if (radio instanceof HTMLInputElement && !radio.checked) radio.click();
}

/** Spread over the whole track at fixed spots, so the fill uncovers more as it grows. */
function sparkles(): HTMLElement[] {
  return Array.from({ length: SPARKLES }, (_, i) => {
    const sparkle = createElement('span', { className: 'ln-ext-level__sparkle' });
    setStyleProperty(sparkle, '--ln-ext-x', `${((i * 37) % 97) + 1.5}%`);
    setStyleProperty(sparkle, '--ln-ext-y', `${20 + ((i * 53) % 60)}%`);
    setStyleProperty(sparkle, '--ln-ext-delay', `${((i * 0.43) % 2.4).toFixed(2)}s`);
    return sparkle;
  });
}

function build(pane: HTMLElement): Parts {
  const root = createElement('div', { className: 'ln-ext-level' });
  const robot = createElement('div', { className: 'ln-ext-level__robot' });
  const slider = createElement('div', { className: 'ln-ext-level__slider' });
  const label = queryOne(pane, '.label', HTMLElement)?.textContent.trim() ?? '';
  const input = createElement('input', {
    className: 'ln-ext-level__input',
    attrs: { type: 'range', min: '1', max: String(AI_LEVELS), step: '1', 'aria-label': label },
  });
  const track = createElement('div', { className: 'ln-ext-level__track' });
  const glints = createElement('span', { className: 'ln-ext-level__glints' });
  glints.append(...sparkles());
  track.append(createElement('span', { className: 'ln-ext-level__fill' }), glints);
  for (let i = 0; i < AI_LEVELS; i++) {
    const dot = createElement('span', { className: 'ln-ext-level__dot' });
    setStyleProperty(dot, '--ln-ext-i', String(i));
    track.append(dot);
  }
  track.append(createElement('span', { className: 'ln-ext-level__thumb' }));
  slider.append(input, track);
  const number = createElement('b');
  const rating = createElement('span');
  const value = createElement('div', { className: 'ln-ext-level__value' });
  value.append(number, rating);
  root.append(robot, slider, value);
  pane.append(root);
  const parts = { root, robot, input, number, rating };
  built.set(root, parts);
  // Drawn at once, not on the next tick.
  input.addEventListener('input', () => {
    const level = Number(input.value);
    pick(level);
    show(parts, level);
    playUiSound('tick', { pitch: tickPitch(level) });
  });
  return parts;
}

function show(parts: Parts, level: number): void {
  const { root, input, number, rating } = parts;
  setData(root, 'lnExtTier', String(robotTier(level)));
  setStyleProperty(root, '--ln-ext-level-p', String((level - 1) / (AI_LEVELS - 1)));
  if (input.value !== String(level)) input.value = String(level);
  if (number.textContent !== String(level)) number.textContent = String(level);
  const elo = AI_RATINGS[level - 1] ?? '';
  if (rating.textContent !== elo) rating.textContent = elo;
}

/** Keeps the slider in the computer's setup in step with its level; null elsewhere. */
export function syncLevelSlider(): LevelSlider | null {
  const checked = queryOne(document, '.game-setup input[name="level"]:checked', HTMLInputElement);
  const group = checked?.closest('group');
  const pane = group?.parentElement;
  if (!checked || !(group instanceof HTMLElement) || !pane) return null;
  setData(group, 'lnExtSlid', '');
  const existing = queryOne(pane, ':scope > .ln-ext-level', HTMLElement);
  const parts = (existing && built.get(existing)) ?? build(pane);
  const level = Number(checked.value);
  show(parts, level);
  return { robot: parts.robot, level };
}
