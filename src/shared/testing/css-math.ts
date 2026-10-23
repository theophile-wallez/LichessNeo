// happy-dom substitutes custom properties but evaluates no math: it answers a declaration
// as it was written, `clamp(200px, 14vw, 250px)`. These turn such an answer into the pixels
// a browser would lay out, so a layout's formulas can be checked in a unit test.

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

const TOKENS = /[a-z]+\(|[\d.]+[a-z]*|[-+*/(),]/gi;

interface Cursor {
  readonly tokens: readonly string[];
  at: number;
}

function toPixels(token: string, viewport: Viewport): number {
  const parts = /^([\d.]+)([a-z]*)$/.exec(token);
  if (!parts) throw new Error(`not a number: ${token}`);
  const [, number = '', unit = ''] = parts;
  const value = Number(number);
  switch (unit) {
    case '':
    case 'px':
      return value;
    case 'vw':
      return (value * viewport.width) / 100;
    case 'vh':
    case 'dvh':
      return (value * viewport.height) / 100;
    default:
      throw new Error(`unsupported unit: ${token}`);
  }
}

function apply(name: string, args: readonly number[]): number {
  switch (name) {
    case 'calc':
      return args[0] ?? Number.NaN;
    case 'min':
      return Math.min(...args);
    case 'max':
      return Math.max(...args);
    case 'clamp':
      return Math.max(args[0] ?? 0, Math.min(args[1] ?? 0, args[2] ?? 0));
    default:
      throw new Error(`unsupported function: ${name}(`);
  }
}

function parseFactor(cursor: Cursor, viewport: Viewport): number {
  const token = cursor.tokens[cursor.at++];
  if (token === undefined) throw new Error('expression ends early');
  if (token === '-') return -parseFactor(cursor, viewport);
  if (token === '+') return parseFactor(cursor, viewport);
  if (token !== '(' && !token.endsWith('(')) return toPixels(token, viewport);

  const args = [parseSum(cursor, viewport)];
  while (cursor.tokens[cursor.at] === ',') {
    cursor.at++;
    args.push(parseSum(cursor, viewport));
  }
  if (cursor.tokens[cursor.at++] !== ')') throw new Error(`unclosed ${token}`);
  return token === '(' ? (args[0] ?? Number.NaN) : apply(token.slice(0, -1), args);
}

function parseProduct(cursor: Cursor, viewport: Viewport): number {
  let value = parseFactor(cursor, viewport);
  for (
    let sign = cursor.tokens[cursor.at];
    sign === '*' || sign === '/';
    sign = cursor.tokens[cursor.at]
  ) {
    cursor.at++;
    const other = parseFactor(cursor, viewport);
    value = sign === '*' ? value * other : value / other;
  }
  return value;
}

function parseSum(cursor: Cursor, viewport: Viewport): number {
  let value = parseProduct(cursor, viewport);
  for (
    let sign = cursor.tokens[cursor.at];
    sign === '+' || sign === '-';
    sign = cursor.tokens[cursor.at]
  ) {
    cursor.at++;
    const other = parseProduct(cursor, viewport);
    value = sign === '+' ? value + other : value - other;
  }
  return value;
}

/** A CSS length with every custom property already substituted, in pixels. */
export function cssPixels(expression: string, viewport: Viewport): number {
  const tokens = expression.toLowerCase().match(TOKENS);
  if (!tokens) throw new Error(`no length in: ${expression}`);
  const cursor = { tokens, at: 0 };
  const value = parseSum(cursor, viewport);
  if (cursor.at < tokens.length) throw new Error(`trailing ${tokens[cursor.at]} in: ${expression}`);
  return value;
}

/** The parts of a space-separated list, a `grid-template-columns`'s tracks, kept whole. */
export function splitTracks(value: string): string[] {
  const tracks: string[] = [];
  let current = '';
  let depth = 0;
  for (const character of value.trim()) {
    if (character === '(') depth++;
    if (character === ')') depth--;
    if (depth === 0 && /\s/.test(character)) {
      if (current !== '') tracks.push(current);
      current = '';
    } else current += character;
  }
  if (current !== '') tracks.push(current);
  return tracks;
}

/** The tracks of a `grid-template-columns`, in pixels. */
export function cssTracks(value: string, viewport: Viewport): number[] {
  return splitTracks(value).map(track => cssPixels(track, viewport));
}
