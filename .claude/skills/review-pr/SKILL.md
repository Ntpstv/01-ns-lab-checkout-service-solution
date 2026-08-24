---
name: review-pr
description: Review a GitHub pull request by number against the team's review checklist. Use when the user says "review-pr <number>" or asks to review a specific PR on GitHub.
allowed-tools: Read, Bash(gh pr view:*), Bash(gh pr diff:*)
argument-hint: [pr-number]
---

# Review PR

PR diff: !`gh pr diff $1`

Team review checklist: @docs/review-checklist.md

Review the PR diff above against every item in the checklist. For each unchecked concern you find, cite the specific file and line. Structure the output as:

1. **Summary** — one or two sentences on what the PR does
2. **Findings** — bullet list grouped by checklist section (Correctness / Tests / Security / Convention / Scope), each with file:line and why it matters
3. **Verdict** — Approve, Approve with comments, or Request changes

If `$1` is not a valid PR number, run `gh pr view $1` first to confirm it exists before diffing.
