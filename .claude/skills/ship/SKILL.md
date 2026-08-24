---
name: ship
description: Review the pending diff, run the test suite, and commit + open a PR only when everything is green. Use whenever the user says "ship", "ship it", "ship this", or asks to review-test-commit-PR the current changes.
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(npm test:*), Bash(npm run test:*), Bash(gh pr create:*), Bash(gh pr view:*)
---

# Ship

Follow these steps in order. Do not skip any step.

1. **Diff** — Run `git status`, `git diff`, and `git diff --staged` to see everything pending.
2. **Review** — Read the diff for obvious bugs, leaked secrets/credentials, and violations of team conventions found in the codebase. Report anything you find before proceeding.
3. **Test** — Run `npm test`. If any test fails, STOP here: report the failing test(s) and the root cause. Do not commit.
4. **Commit** — If tests are all green: stage only the files relevant to this change (never blind `git add -A`/`.`), then commit with a short, clear message describing why.
5. **PR** — Open a pull request summarizing what changed and why. Ask the user for target remote/branch before pushing or opening the PR if it isn't already clear from context.
