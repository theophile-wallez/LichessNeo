# Profiles

Lichess's pitfalls on profile pages (`content/profile`, `styles/profile`),
learned the hard way. The rules for the whole repo are in the root's
[AGENTS.md](../../../AGENTS.md).

- **Profiles.** Headless browsers get a bot check (Cloudflare's "Just a
  moment…", a 403) on every `/@/…` page, so the end-to-end tests can't reach
  one. Logged out, a profile's rating chart and activity feed are
  empty: to style them, inject plausible markup into
  `.angle-content .activity` and `#us_profile` (see lila's `ActivityUi.scala`
  and `PerfStatUi.ratingHistoryContainer`). The awards are
  `position: absolute` to escape `.user-show { overflow: hidden }`, with
  margins tuned for that. `bits.dropdownOverflow` counts how many action
  buttons fit from `.user-actions`'s `offsetWidth`: never change that
  element's flex sizing.
