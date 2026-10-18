import ImageUpload01Icon from '@hugeicons/core-free-icons/ImageUpload01Icon';
import { AVATAR_COLORS, type AvatarColor, avatarOf } from '#shared/avatar.ts';
import { COACH_COUNT } from '#shared/coach.ts';
import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { keepOwnAvatar, onOwnAvatar, ownAvatar, type OwnAvatar } from '#shared/own-avatar.ts';
import { onOwnName, ownName } from '#shared/own-name.ts';
import { message } from '#content/platform/runtime.ts';
import { pictureFrom } from './avatar-picture.ts';
import { coachName } from '#content/coach/names.ts';

// The Avatar card of the settings' Profile customization page
// (styles/pages/settings-profile.css): the avatar of the user's name, one they
// make of a coach and a color, or a picture of theirs (#shared/own-avatar.ts).
// The profile's avatar leads here (content/profile/avatar-link.ts).

const MODES = ['name', 'coach', 'picture'] as const;
type Mode = (typeof MODES)[number];

const MODE_NAMES: Readonly<Record<Mode, string>> = {
  name: 'avatarModeName',
  coach: 'avatarModeCoach',
  picture: 'avatarModePicture',
};

const COACHES = Array.from({ length: COACH_COUNT }, (_, i) => i + 1);

const COLOR_NAMES: Readonly<Record<AvatarColor, string>> = {
  blue: 'avatarColorBlue',
  purple: 'avatarColorPurple',
  pink: 'avatarColorPink',
  red: 'avatarColorRed',
  orange: 'avatarColorOrange',
  green: 'avatarColorGreen',
  cyan: 'avatarColorCyan',
};

const button = (attributes: SafeHtml, label: string): SafeHtml =>
  html`<button type="button" ${attributes} title="${label}" aria-label="${label}" aria-pressed="false"></button>`;

const CARD = html`<div class="lr-ext-avatar-pick__head">
    <span class="lr-ext-setting__icon" aria-hidden="true"></span>
    <div>
      <h2 class="lr-ext-setting__title">${message('avatarTitle')}</h2>
      <p class="lr-ext-setting__body">${message('avatarBody')}</p>
    </div>
  </div>
  <div class="lr-ext-avatar-pick__stage">
    <span class="lr-ext-avatar-pick__preview" aria-hidden="true"></span>
    <div class="lr-ext-avatar-pick__who">
      <strong class="lr-ext-avatar-pick__name"></strong>
      <div class="lr-ext-avatar-pick__modes">
        ${MODES.map(mode => html`<button type="button" data-lr-ext-avatar-mode="${mode}">${message(MODE_NAMES[mode])}</button>`)}
      </div>
    </div>
  </div>
  <div class="lr-ext-avatar-pick__panel" data-lr-ext-avatar-mode="name">
    <p class="lr-ext-avatar-pick__note">${message('avatarNameNote')}</p>
  </div>
  <div class="lr-ext-avatar-pick__panel" data-lr-ext-avatar-mode="coach" hidden>
    <h3 class="lr-ext-appearance__label">${message('avatarCoach')}</h3>
    <div class="lr-ext-avatar-pick__coaches">
      ${COACHES.map(coach => button(html`class="lr-ext-avatar-pick__coach" data-lr-ext-avatar-coach="${coach}" data-lr-ext-pick-coach="${coach}"`, coachName(coach)))}
    </div>
    <h3 class="lr-ext-appearance__label">${message('avatarColor')}</h3>
    <div class="lr-ext-avatar-pick__colors">
      ${AVATAR_COLORS.map(color => button(html`class="lr-ext-avatar-pick__color" data-lr-ext-avatar-color="${color}" data-lr-ext-pick-color="${color}"`, message(COLOR_NAMES[color])))}
    </div>
  </div>
  <div class="lr-ext-avatar-pick__panel" data-lr-ext-avatar-mode="picture" hidden>
    <label class="lr-ext-avatar-pick__upload">
      ${hugeicon(ImageUpload01Icon)}<span>${message('avatarUpload')}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
    </label>
    <p class="lr-ext-avatar-pick__note">${message('avatarPictureNote')}</p>
    <p class="lr-ext-avatar-pick__error" role="alert" hidden>${message('avatarPictureFailed')}</p>
  </div>`;

const userName = (): string => document.body.dataset.username ?? '';

const modeOf = (avatar: OwnAvatar | null): Mode => avatar?.kind ?? 'name';

/** The coach and the color the coach panel starts from: the pick's, or the name's. */
function composed(): { coach: number; color: AvatarColor } {
  const own = ownAvatar();
  return own?.kind === 'coach' ? own : avatarOf(userName());
}

function press(element: HTMLElement, on: boolean): void {
  const pressed = String(on);
  if (element.getAttribute('aria-pressed') !== pressed)
    element.setAttribute('aria-pressed', pressed);
}

function render(card: HTMLElement, mode: Mode): void {
  const own = ownAvatar();
  const { coach, color } = composed();
  const preview = queryOne(card, '.lr-ext-avatar-pick__preview', HTMLElement);
  if (preview) {
    setData(preview, 'lrExtAvatarCoach', String(coach));
    setData(preview, 'lrExtAvatarColor', color);
    setData(preview, 'lrExtAvatarPicture', own?.kind === 'picture' ? '' : null);
  }
  const name = queryOne(card, '.lr-ext-avatar-pick__name', HTMLElement);
  const shown = ownName() ?? userName();
  if (name && name.textContent !== shown) name.textContent = shown;
  for (const tab of queryAll(card, '[data-lr-ext-avatar-mode]', HTMLElement)) {
    const on = tab.dataset.lrExtAvatarMode === mode;
    if (tab instanceof HTMLButtonElement) tab.classList.toggle('active', on);
    else if (tab.hidden === on) tab.hidden = !on;
  }
  const picked = own?.kind === 'coach';
  for (const tile of queryAll(card, '[data-lr-ext-pick-coach]', HTMLElement)) {
    setData(tile, 'lrExtAvatarColor', color);
    press(tile, picked && tile.dataset.lrExtPickCoach === String(coach));
  }
  for (const swatch of queryAll(card, '[data-lr-ext-pick-color]', HTMLElement))
    press(swatch, picked && swatch.dataset.lrExtPickColor === color);
}

const isColor = (value: string | undefined): value is AvatarColor =>
  AVATAR_COLORS.some(color => color === value);

/** The pick a click in the coach panel makes, or null for a click elsewhere. */
function coachPick(target: EventTarget | null): OwnAvatar | null {
  const tile = closestTo(target, '[data-lr-ext-pick-coach], [data-lr-ext-pick-color]', HTMLElement);
  if (!tile) return null;
  const { coach, color } = composed();
  const { lrExtPickCoach, lrExtPickColor } = tile.dataset;
  return {
    kind: 'coach',
    coach: lrExtPickCoach === undefined ? coach : Number(lrExtPickCoach),
    color: isColor(lrExtPickColor) ? lrExtPickColor : color,
  };
}

function watchUpload(card: HTMLElement, show: () => void): void {
  const input = queryOne(card, 'input[type=file]', HTMLInputElement);
  const error = queryOne(card, '.lr-ext-avatar-pick__error', HTMLElement);
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    void pictureFrom(file).then(picture => {
      if (error) error.hidden = picture !== null;
      if (picture) keepOwnAvatar({ kind: 'picture', picture });
      show();
      return picture;
    });
  });
}

/** The page's card, kept in step with the pick, here or in another tab. */
export function buildAvatarCard(): HTMLElement {
  const card = createElement('section', { className: 'lr-ext-avatar-pick' });
  setHtml(card, CARD);
  // The panel shown: the picture's waits for a file before the pick changes.
  let mode = modeOf(ownAvatar());
  const show = (): void => render(card, mode);
  card.addEventListener('click', event => {
    const tab = closestTo(event.target, 'button[data-lr-ext-avatar-mode]', HTMLElement);
    const next = MODES.find(name => name === tab?.dataset.lrExtAvatarMode);
    if (next === 'name') keepOwnAvatar(null);
    if (next === 'coach' && ownAvatar()?.kind !== 'coach')
      keepOwnAvatar({ kind: 'coach', ...composed() });
    mode = next ?? mode;
    const pick = coachPick(event.target);
    if (pick) keepOwnAvatar(pick);
    show();
  });
  watchUpload(card, show);
  onOwnName(show);
  onOwnAvatar(avatar => {
    if (avatar || mode !== 'picture') mode = modeOf(avatar);
    show();
  });
  show();
  return card;
}
