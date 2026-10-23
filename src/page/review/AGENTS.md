# The Game Review

Lichess's pitfalls for the Game Review's engine and judge, and for opening
practice's lookups, learned the hard way. The review's design is in
[README.md](README.md). The rules for the whole repo are in the root's
[AGENTS.md](../../../AGENTS.md).

- **The cloud eval.** `/api/cloud-eval?fen=…&multiPv=2`: no account, one
  position per request, one request at a time; a 404 means nobody analyzed
  it (in a game: out of the opening). Scores are White's view, castling is
  king-takes-rook. The export's `evals=true` gives the server analysis when
  there is one: one line per position, no second best.
- **Mate distances.** Win probability can't grade a move between two mates,
  so the review reads mate distances, and our engine only gets short ones
  right (at depth 16, mate in 5 or fewer is exact; longer comes out longer).
  Trust a move's short side only (`SURE_MATE`, `page/review/judge/mate.ts`)
  and never print a long defense's length.
- **The engine is nondeterministic.** Two runs of a game differ on about
  one verdict in six, mostly by one step, the game rating by 100+ points:
  compare runs from the same `ln-ext-review:*` cache entry, which skips the
  engine, or against that spread.
- **The explorer, away from the board.** The explorer's host is the analysis
  controller's `explorer.opts.endpoint`; Lichess asks it
  `<endpoint>/masters?fen=<start>&play=<uci,…>` with the session's cookies
  (`credentials: 'include'`), and answers signed-in users only. The answer is
  ndjson: read its last line (`practice/explorer-lookup.ts`).
- **Puzzle batches.** `/api/puzzle/batch/<angle>?nb=50&color&difficulty`
  needs no account, but Lichess gives one address about 300 puzzles an hour,
  then a 429 for the rest of it: ask for a batch once a visit
  (`practice/traps.ts`). Its difficulty is around 1500, a visitor's rating,
  whatever the user's. An opening's angle is its family's name in
  underscores (`Italian_Game`), and its puzzles are mostly middlegames':
  keep those whose `initialPly` is early.
- **Studies from the page.** The session lists a user's studies, private ones
  too (`/api/study/by/<user>`), but the API's export (`/api/study/<id>.pgn`)
  reads no session: export a private one through the site's
  `/study/<id>.pgn`. Adding a chapter (`/study/<id>/import-pgn`) wants an
  `sri`. A study has at most 64 chapters, and comments are plain text, the one
  place a chapter keeps our data. The session's routes can't create a private
  study: that takes an OAuth token (`study:write`, PKCE, no secret), given back
  once used (`practice/study-api.ts`).
