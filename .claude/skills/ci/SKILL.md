---
name: ci
description: Start the release of main by hand (the CI, then a GitHub release of its zips), since no push runs it.
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
---

No push runs the CI, to spare the Actions minutes: this starts the Release
workflow on `main`, which runs the CI (checks, packages, end-to-end and
Firefox tests), then makes a GitHub release of main's zips. It doesn't reach
the stores: that's `/store`.

Pass `gh` the `origin` repository (`--repo <owner>/<repo>`, from
`git remote get-url origin`): the checkout has more than one remote.

1. The run releases what GitHub has, not the local checkout: `git fetch
   origin`, then compare `origin/main` with the local `main`. If local work
   isn't on `origin/main` yet, say so and stop: don't push for the user.
2. Start it: `gh workflow run release.yml --ref main`. Then find the run it
   made (`gh run list --workflow release.yml --branch main --event
   workflow_dispatch --limit 1 --json databaseId,url,status`; it may take a
   few seconds to appear, so retry briefly) and give its URL, with the
   version it will get (`node scripts/version.ts --ref origin/main`).
3. Don't wait for it to finish unless asked: its results are looked at
   afterwards (`gh run view <id>`, `gh run watch <id>`).
