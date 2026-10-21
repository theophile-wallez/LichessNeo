# The home and the tournaments

Lichess's pitfalls on the home and the tournament pages (`content/pages`,
`page/seek`), learned the hard way. The rules for the whole repo are in the
root's [AGENTS.md](../../../AGENTS.md).

- **JS-sized widgets.** The home blog carousel sizes its cards from its
  `clientWidth`, which counts padding: inset it with a transparent border,
  not padding.
- **The home's quick pairing.** Our speed cards (`content/pages/speed-cards`)
  replace the lobby's pools tab, hidden, and drive it: open that tab (the
  first; bots have none), click its `.lpool[data-id]`, go back. The settings
  pick the cards (`quickPairing`, `speed-cards/picks.ts`): a speed's, with its
  pools, or one of the player's own, a variant, a mode and up to four time
  controls. Such a card's Standard, rated clock that is a pool joins it, signed
  in, as a speed's does; any other is a lobby seek `page/seek` posts for a
  socket of its own (lila's `Setup.hook` form), else Lichess's setup opens with
  it filled in (`/?…#hook`). Signed in,
  joining a pool keeps Lichess on that tab, which then glows (`glowing`)
  while it seeks from another; signed out, a pool's click makes a seek in
  the lobby. A game's "New opponent" opens `/#pool/<id>`, where the lobby
  switches to its pools tab while it's built: from another stored tab
  (`lobby.tab:<user>`, which ours leave on the lobby's), that redraw throws
  and the lobby never shows, so the link resets it first.
  `/api/user/<name>/rating-history` names its series by key (`blitz`), not
  as its docs show them. On a game page, `page/seek` makes "New opponent"
  seek right there, on a lobby socket of its own (`/lobby/socket/v5`, lila's
  `ui/lib/src/socket.ts`: `p` and `0` pings, `poolIn` every 10s, `poolOut`,
  a `redirect` once paired), and falls back to Lichess's link if it fails.
  So does the review's "New 2+1", in a finished game's analysis. The hero's
  first button plays the pool last played: Lichess draws its start buttons
  (`.lobby__start`) again once its lobby boots, so ours is put back at once,
  and its "Create a game" stays hidden for the cards' "Custom game" to click.
- **Tournament podiums.** A finished Arena's and Swiss's `.podium` holds
  `.second`, `.first`, `.third`, in that order, and Lichess hides it below
  500px. An Arena's shows no score: `content/pages/podium.ts` reads it from
  `#page-init-data` (`data.podium`, a Swiss's `points`), and
  `styles/podium.css` draws the steps for both.
