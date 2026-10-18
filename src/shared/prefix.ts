// The prefix of everything the extension adds to Lichess's pages: classes, ids,
// data attributes and CSS variables (written out in full, as CSS can't take a
// variable in a selector), storage keys and messages (built from it here).

export const PREFIX = 'ln-ext';

/** A storage key or database name of ours: `ln-ext-<name>`. */
export const prefixed = <Name extends string>(name: Name): `${typeof PREFIX}-${Name}` =>
  `${PREFIX}-${name}`;

/** A message type of ours, between the worlds or to the worker: `ln-ext:<name>`. */
export const messageType = <Name extends string>(name: Name): `${typeof PREFIX}:${Name}` =>
  `${PREFIX}:${name}`;
