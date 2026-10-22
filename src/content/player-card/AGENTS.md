# The player card

Lichess's pitfalls behind the hover card's own rows (`content/player-card`),
learned the hard way. The card itself, which Lichess draws, is in
[ui/AGENTS.md](../ui/AGENTS.md); the rules for the whole repo are in the
root's [AGENTS.md](../../../AGENTS.md).

- **Nothing before the hover.** A tournament's standings or a forum topic
  hold hundreds of names: asking Lichess about each would be hundreds of
  requests in a few seconds, and a 429 for the whole tab. So the profile is
  asked when a name is hovered, the rest (`sources.ts`) only once the pointer
  has stayed on it, each answer kept for the tab's life, and every request
  held back for a while after a 429 or a failure (`api.ts`).
- **A record of the speeds turns the other ratings down.** `/api/user` sends
  every rating, puzzles and Storm included, and a zod `partialRecord` of the
  six speeds fails on the keys it doesn't know (`unrecognized_keys`), so the
  whole user is dropped. Spell the perfs out in a `z.object`, which strips
  what it doesn't name.
- **An empty rating history.** `/api/user/<name>/rating-history` answers `[]`
  for some players, however many games they have. Their curve is left out:
  `curveOf` would draw the rise from 1500 that a single point implies.
- **The games export needs the page's session.** `/api/games/user/<name>`
  answers 404 to a plain client with no Lichess session (curl, a script), but
  200 in the page: check it there, not from a terminal.
- **Lichess already gives the score against the visitor.** `/@/<user>/mini`
  ends with `.upt__score` ("Your score: 1 - 0") for every opponent the
  signed-in visitor has played, on any page, not just a game's — a row of
  ours from `/api/crosstable` only repeated it, so there is none.
  `styles/powertip/actions.css` gives Lichess's own the card's look.
