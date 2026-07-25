---
name: deliver
description: Chain skill that ships the current changes then reviews the resulting PR — runs the "ship" skill (review diff, test, commit, open PR) and, only if it succeeds, feeds the new PR number into the "review-pr" skill to check it against the team checklist. Use when the user says "deliver", "ship and review", "ship then review", or "full ship".
allowed-tools: Skill, Read, Grep, Glob, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(npm test:*), Bash(npm run test:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr diff:*)
---

# Deliver (ship → review chain)

This skill does not duplicate the logic of `ship` or `review-pr` — it invokes them in sequence via the Skill tool and passes state between them. Do not inline their steps here; call the skills.

## Chain

1. **Invoke the `ship` skill.**
   - If `ship` stops because tests are red, or the user declines to open the PR, STOP the chain here. Report why and do not proceed to step 2. There is no PR to review yet.
   - If `ship` completes and a PR was opened, continue.

2. **Resolve the PR number that `ship` just created.**
   - Do not parse it out of free-text output. Run:
     ```
     gh pr view --json number -q .number
     ```
     on the current branch to get the authoritative PR number.
   - If this fails (no PR found for the current branch), STOP the chain and report the failure — do not guess a number.

3. **Invoke the `review-pr` skill** with that PR number as its argument (`$1`).

4. **Report the outcome** to the user: PR URL/number from step 1, followed by `review-pr`'s Summary/Findings/Verdict from step 3. If the verdict is "Request changes", say so plainly rather than softening it.

## Rules
- Never skip step 2's `gh pr view` lookup in favor of assuming the PR number.
- Never call `review-pr` if `ship` didn't actually open a PR.
- Each link in the chain must fully finish (and its own stop conditions respected) before the next one starts.
