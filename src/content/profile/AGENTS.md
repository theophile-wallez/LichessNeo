# Profiles

Lichess's pitfalls on profile pages (`content/profile`, `styles/profile`),
learned the hard way. The rules for the whole repo are in the root's
[AGENTS.md](../../../AGENTS.md).

- **Profiles.** Headless browsers get a bot check (Cloudflare's "Just a
  moment…", a 403) on every `/@/…` page, so the end-to-end tests can't reach
  one; a one-off check opens them in the kept signed-in profile
  (`launchSignedIn()`), which gets through. Logged out, a profile's rating
  chart and activity feed are empty: to style them, inject plausible markup
  into `.angle-content .activity` and `#us_profile` (see lila's
  `ActivityUi.scala` and `PerfStatUi.ratingHistoryContainer`). The awards are
  `position: absolute` to escape `.user-show { overflow: hidden }`, with
  margins tuned for that. `bits.dropdownOverflow` counts how many action
  buttons fit from `.user-actions`'s `offsetWidth`: never change that
  element's flex sizing.
- **A rating's stats page.** Lichess dashes and puts a help cursor on
  everything with a `title` in `.perf-stat__content` (meant for the rating
  deviation's hint), cards of ours included: `styles/profile/perf-stat`
  takes it off them. Its game and player links are `glpt` and `ulpt`, whose
  class Lichess removes once it has hooked its preview on the first hover:
  style them by a class of ours, never by those.
