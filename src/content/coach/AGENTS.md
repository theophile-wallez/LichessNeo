# The coach's mascots

Lichess's pitfalls for the coach's 3D mascots (`content/coach`,
`playground/`), learned the hard way. The rules for the whole repo are in
the root's [AGENTS.md](../../../AGENTS.md).

- **The coach's mascots.** Three.js scenes (`content/coach/mascot`), drawn in
  the content world: the page's CSP keeps the extension's bundle out of the
  page world. They're the ES chunk `coach-mascot.js`, loaded with `import()`
  only when a coach shows, and each draws only while on screen in a visible
  tab (`VisibleLoop`). Its first frame waits for the stage's light and shaders
  (`Stage.ready`), so its build is spread over two tasks. Each wears a solid
  finish (`cast/finishes.ts`), drawn in its fur's pattern
  (`cast/patterned.ts`): clay for the animals and most others, glossy plastic
  for the computer's robot. Fur is still a skin any mascot may take: shells
  whose alpha blends with `MaxEquation`, or the canvas shows holes. Without
  WebGL, the coach's still (`img/coaches/mascot-<n>.webp`) stays. The robot is
  the eighth coach (`ROBOT_COACH`), in its level 3 blue. The coaches of other
  shapes than the egg come after it (9 to 26, `CAST` in `cast/cast.ts`); a
  face off the egg's height moves the bust framing with it (`bust`), and a
  head turned three quarters looks the other way where it stands on the page's
  right (`facingLeft`, the home's hero). The avatars are drawn from every
  coach but the robot (`AVATAR_COACHES`, `#shared/avatar.ts`). Try a mascot's
  change in `pnpm playground` first: it drives the same rig with its own
  clock. The stills (`img/coaches/*.webp`) are the live mascots' first frame,
  looking straight ahead: the `bust` framing at 124 × 114, twice the pixels,
  read off the canvas from `onDrawn` (a screenshot comes out darker). Render
  them again when a mascot changes, or the live one won't land on its still.
  Wherever a still stands in for a live mascot, the swap must be seamless: the
  live box is the still's box, in its framing and its aspect (124 / 114 for
  `bust`); it comes in neutral, as its still looks, taking a mood only once
  drawn; and a canvas that spills past a still cut at its sides (for the arms)
  comes in clipped to the still, then opens out
  (`styles/dashboard/overview.css`). Check the swap: the still alone (block
  `coach-mascot.js`), then the first live frame, outlines matching to the
  pixel.
