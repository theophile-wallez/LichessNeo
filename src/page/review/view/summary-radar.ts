import type { Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { PROFILE_AXES, type Profile, type ProfileAxis } from '#page/review/judge/profile.ts';

// Each player's profile (judge/profile.ts) as a radar, one shape per side in
// its color. Every axis has its name, a "?" telling how its score is worked
// out, and both scores out of 100 in the sides' colors. The panel's tooltips (view/tooltip.ts) only
// take HTML, so the labels and the corners' hit areas are HTML in the SVG.

const SIZE = 300;
const RADIUS = 92;
const CENTER = { x: SIZE / 2, y: 126 };
const LABEL_REACH = 1.42;
const AXIS_W = 128;
const AXIS_H = 42;
const HIT = 22;
const RINGS = [0.25, 0.5, 0.75, 1];

export interface RadarInput {
  /** Null until every move is judged at full depth. */
  readonly profiles: Readonly<Record<Color, Profile>> | null;
  readonly names: Readonly<Record<Color, string>>;
  readonly language: ReviewLanguage;
  /** The sides from left to right, as their cards are. */
  readonly order: readonly Color[];
}

/** The point `reach` of the way out along axis `i` of `count`, the first straight up. */
export function radarPoint(i: number, count: number, reach: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
  return {
    x: CENTER.x + Math.cos(angle) * RADIUS * reach,
    y: CENTER.y + Math.sin(angle) * RADIUS * reach,
  };
}

const pointList = (points: readonly { x: number; y: number }[]): string =>
  points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

const axisPoint = (axis: ProfileAxis, reach: number): { x: number; y: number } =>
  radarPoint(PROFILE_AXES.indexOf(axis), PROFILE_AXES.length, reach);

function grid(): SafeHtml {
  const rings = RINGS.map(
    reach =>
      html`<polygon class="cdc-sum-radar__ring${reach === 1 ? ' cdc-sum-radar__ring--edge' : ''}" points="${pointList(PROFILE_AXES.map(axis => axisPoint(axis, reach)))}"/>`,
  );
  const spokes = PROFILE_AXES.map(axis => {
    const { x, y } = axisPoint(axis, 1);
    return html`<line class="cdc-sum-radar__spoke" x1="${CENTER.x}" y1="${CENTER.y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  });
  return html`${rings}${spokes}`;
}

const scoreText = (score: number | null): string =>
  score === null ? '—' : String(Math.round(score));

function shape(input: RadarInput, profile: Profile, color: Color): SafeHtml {
  const { names, language } = input;
  const reach = (axis: ProfileAxis): number => (profile[axis] ?? 0) / 100;
  const points = PROFILE_AXES.map(axis => axisPoint(axis, reach(axis)));
  const hits = PROFILE_AXES.map(axis => {
    const { x, y } = axisPoint(axis, reach(axis));
    const score = profile[axis];
    const tip = `${names[color]} · ${language.ui.profile[axis].name}: ${score === null ? '—' : `${Math.round(score)}/100`}`;
    return html`<foreignObject x="${(x - HIT / 2).toFixed(1)}" y="${(y - HIT / 2).toFixed(1)}" width="${HIT}" height="${HIT}"><div class="cdc-sum-radar__hit" data-cdc-tip="${tip}"></div></foreignObject>`;
  });
  const side = color === 'white' ? 'w' : 'b';
  return html`<g class="cdc-side-${side}"><polygon points="${pointList(points)}"/>${points.map(({ x, y }) => html`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"/>`)}${hits}</g>`;
}

function label({ profiles, language, order }: RadarInput, axis: ProfileAxis): SafeHtml {
  const { name, how } = language.ui.profile[axis];
  const scores = order.map(
    color =>
      html`<b class="cdc-side-${color === 'white' ? 'w' : 'b'}">${profiles ? scoreText(profiles[color][axis]) : '·'}</b>`,
  );
  const { x, y } = axisPoint(axis, LABEL_REACH);
  return html`<foreignObject x="${(x - AXIS_W / 2).toFixed(1)}" y="${(y - AXIS_H / 2).toFixed(1)}" width="${AXIS_W}" height="${AXIS_H}"><div class="cdc-sum-radar__axis">
      <span class="cdc-sum-radar__name">${name}<span class="cdc-sum-radar__how" data-cdc-tip="${how}" aria-label="${how}">?</span></span>
      <span class="cdc-sum-radar__scores">${scores}</span>
    </div></foreignObject>`;
}

/** The profiles' radar: its grid and labels while the game is analyzed, the shapes once it's done. */
export function radarMarkup(input: RadarInput): SafeHtml {
  const { profiles, language } = input;
  const shapes = profiles
    ? html`${shape(input, profiles.black, 'black')}${shape(input, profiles.white, 'white')}`
    : '';
  // Room around the circle for the side axes' labels.
  return html`<h2 class="cdc-sum-h">${language.ui.profileTitle}</h2><div class="cdc-sum-radar">
      <svg viewBox="-36 -32 ${SIZE + 72} ${SIZE + 12}" width="${SIZE + 72}" height="${SIZE + 12}">${grid()}${shapes}${PROFILE_AXES.map(axis => label(input, axis))}</svg>
    </div>`;
}
