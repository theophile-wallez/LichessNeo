// Lichess's "Show player ratings": off, or off in a game the user plays, it marks <body>
// `no-rating` (lila's page.scala), and its own stylesheets hide the ratings with it. What the
// stylesheets can't reach (a rating copied into text) asks here.

/** Whether the page may show players' ratings; true until <body> is parsed. */
export function ratingsShown(): boolean {
  if (!document.body) return true;
  return !document.body.classList.contains('no-rating');
}
