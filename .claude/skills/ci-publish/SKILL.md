---
name: ci-publish
description: Send main to the Chrome Web Store and Firefox Add-ons, by tagging it `store-<version>`.
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *), Bash(node scripts/version.ts *)
---

A `store-<version>` tag on `origin/main`'s last commit runs the Release
workflow in its store mode: the CI, then the store zip sent to the Chrome
Web Store and the Firefox zip, with its sources, to Firefox Add-ons. Each
store reviews it before it goes live. Arguments: `$ARGUMENTS`; refuse any.

Pass `gh` the `origin` repository (`--repo <owner>/<repo>`, from `git remote
get-url origin`): the checkout has more than one remote.

1. It runs on what GitHub has, not the local checkout: `git fetch origin
   --tags`, then compare `origin/main` with the local `main`. If local work
   isn't on `origin/main` yet, say so and stop: don't push for the user.
2. `v=$(node scripts/version.ts --ref origin/main)`: the version it gets.
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

Don't wait for the run to finish unless asked: its results are looked at
afterwards (`gh run view <id>`, `gh run watch <id>`).
