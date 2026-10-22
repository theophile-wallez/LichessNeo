# The interface

Lichess's pitfalls for hover cards and tab bars (`content/ui`), learned the
hard way. The rules for the whole repo are in the root's
[AGENTS.md](../../../AGENTS.md).

- **Hover cards.** Each kind has its own popup: the user card `#powerTip`
  (HTML from `/@/<user>/mini`), `#miniGame`, `#miniBoard`, `#hook`. The card
  is re-fetched and re-rendered on every hover and created on the first
  one: watch it with a `MutationObserver` on `childList`, never poll (a poll
  shows the raw markup first). Whatever we add to it goes back in on each of
  those passes, and only when it changes: a write of ours wakes that same
  observer. The player's own numbers are
  [`content/player-card`](../player-card/AGENTS.md).
- **Tab bars redrawn on click.** The profile's games filter, the home
  lobby's tabs and the explorer's databases are replaced whole when a tab is
  picked, so nothing can slide: they stay out of `TAB_BARS`. Before adding a
  snabbdom bar, check in lila that neither it nor a parent changes its
  selector with the tab.
