# The sidebar

Lichess's pitfalls for the sidebar and the header below 1020px
(`styles/sidebar`, `content/sidebar`), learned the hard way. The rules for
the whole repo are in the root's [AGENTS.md](../../../AGENTS.md).

- **Scroll state.** Once scrolled, Lichess adds `.hide` to `#top`, hiding
  `#topnav` and the dropdowns with `visibility`, `opacity` and
  `pointer-events: none`. Our sidebar is fixed, so `styles/sidebar` restores
  all three; forget `pointer-events` and the sidebar is visible but dead.
- **The header below 1020px.** Lichess keeps its top bar there, and its
  hamburger (`label.hbg`, for the `#tn-tg` checkbox) slides `#topnav` in as a
  drawer under it. `styles/sidebar/drawer.css` gives both our look, the
  drawer the sidebar's pictures; `content/sidebar/drawer.ts` makes a
  section's own link fold its links open there instead of leaving.
