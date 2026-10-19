---
name: ci
description: Start the GitHub CI by hand, on the current branch (`/ci`), or the release of main (`/ci release`), since no push runs it.
argument-hint: '[release]'
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
---

The CI never runs on a push, to spare the Actions minutes: this starts it.
Arguments: `$ARGUMENTS`.

1. Pick the workflow and the branch:
   - no argument: `ci.yml` (checks, packages, end-to-end and Firefox tests)
     on the current branch (`git branch --show-current`);
   - `release`: `release.yml` on `main` (the CI, then a GitHub release of
     main's zips). Refuse any other argument.
2. The run tests what GitHub has, not the local checkout: `git fetch origin`,
   then check that the branch exists on `origin` and that its commit there is
   `HEAD` (for `release`, `origin/main`, whatever the current branch). If the
   local branch is ahead or has uncommitted changes, say so and stop: don't
   push for the user.
3. Start it: `gh workflow run <workflow> --ref <branch>`. Then find the run
   it made (`gh run list --workflow <workflow> --branch <branch> --event
   workflow_dispatch --limit 1 --json databaseId,url,status`; it may take a
   few seconds to appear, so retry briefly) and give its URL.
4. Don't wait for it to finish unless asked: its results are looked at
   afterwards (`gh run view <id>`, `gh run watch <id>`).
