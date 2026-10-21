# Packs

Lichess's pitfalls for packs and the pieces they draw (`content/packs`,
`#shared/piece-glyph.ts`), learned the hard way. The rules for the whole
repo are in the root's [AGENTS.md](../../../AGENTS.md).

- **Lichess's piece variables.** Lichess draws its pieces from
  `---white-pawn` … `---black-king` (`.is2d .pawn.white { background-image:
  var(---white-pawn) }`), set on `:root`, and inline on `<body>` once its
  menu changes the board or the set: a pack overrides them on both
  (`content/packs/apply.ts`), and our own pieces (`#shared/piece-glyph.ts`)
  read them. Before drawing a board Lichess decodes each one, slicing
  `url(` and `)` off its value: write them unquoted, and know that one image
  that fails to decode leaves the page without a board. Packs are checked
  for that at import.
