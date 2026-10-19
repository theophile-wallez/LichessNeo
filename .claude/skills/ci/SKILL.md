---
name: ci
description: Start the release of main by hand (`/ci`: the CI, then a GitHub release of its zips), or send main to the stores (`/ci store`), since no push runs either.
argument-hint: '[store]'
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *), Bash(node scripts/version.ts *)
---

No push runs the CI, to spare the Actions minutes. Arguments: `$ARGUMENTS`.

- no argument: the Release workflow on `main`. It runs the CI (checks,
  packages, end-to-end and Firefox tests), then makes a GitHub release of
  main's zips. It doesn't reach the stores.
- `store`: a `store-<version>` tag on `origin/main`'s last commit, which runs
  the Release workflow in its store mode: the CI, then the store zip sent to
  the Chrome Web Store and the Firefox zip, with its sources, to Firefox
  Add-ons. Each store reviews it before it goes live.

Refuse any other argument. Pass `gh` the `origin` repository (`--repo
<owner>/<repo>`, from `git remote get-url origin`): the checkout has more
than one remote.

## Both

1. Either runs on what GitHub has, not the local checkout: `git fetch origin
   --tags`, then compare `origin/main` with the local `main`. If local work
   isn't on `origin/main` yet, say so and stop: don't push for the user.
2. `v=$(node scripts/version.ts --ref origin/main)`: the version it gets.

## The release (no argument)

3. Start it: `gh workflow run release.yml --ref main`. Then find the run it
   made (`gh run list --workflow release.yml --branch main --event
   workflow_dispatch --limit 1 --json databaseId,url,status`; it may take a
   few seconds to appear, so retry briefly) and give its URL and `v`.

## The stores (`store`)

3. Check the secrets: `gh secret list` must show `CWS_SERVICE_ACCOUNT`,
   `CWS_PUBLISHER_ID`, `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`. If one is
   missing, name it and stop: that store's job would fail.
4. If `store-$v` exists on `origin` already, that commit was sent: say so
   and stop.
5. Tag and push: `git tag "store-$v" origin/main && git push origin
   "store-$v"`. Then find the run it made (`gh run list --workflow
   release.yml --event push --limit 1 --json databaseId,url,headBranch`,
   retrying briefly until its `headBranch` is the tag) and give its URL.
6. Remind the user that the Chrome Web Store refuses a new version while one
   is in review: if the previous one is still there, its job fails, and the
   tag must be deleted (`git push origin :store-$v`, `git tag -d store-$v`)
   before sending again.

Don't wait for a run to finish unless asked: its results are looked at
afterwards (`gh run view <id>`, `gh run watch <id>`).
