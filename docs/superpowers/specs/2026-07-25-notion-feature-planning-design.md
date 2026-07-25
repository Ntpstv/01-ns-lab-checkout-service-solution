# Notion Feature Planning Skills — Design

## Context

The team already has three skills built for this repo (`ship`, `review-pr`,
`deliver` — see `docs/CHEATSHEET.md`) covering the review → test → commit →
PR loop. This design adds a second, independent skill set for the _start_ of
FE work: turning a Notion feature spec into subtasks and a per-subtask plan,
before any code is written.

This is trained/validated in the `checkout-service` lab repo first (it's a
convenient sandbox with Notion MCP access already wired up), even though the
target repo for real use is a separate React/Next.js frontend. The skills are
written generic — nothing here depends on `checkout-service`'s backend code —
so they can be copied into the real FE repo's `.claude/skills/` once proven.

## Goals

- Turn a single Notion page (one feature spec) into a subtask checklist,
  written back into that same page.
- Produce a concrete implementation _plan_ for a chosen subtask — grounded in
  the target repo's existing conventions — without writing any code.
- Reuse the two steps independently: come back days later and re-plan one
  subtask without re-running the breakdown.

## Non-goals

- Writing or scaffolding code. All three skills stop at "plan," never at
  "diff."
- Auto-detecting when a subtask is done, or checking it off in Notion. That
  remains a manual step (or a future skill).
- Talking to Jira directly. Notion is the source of truth for this workflow.
- Supporting multi-page specs (a feature spread across several Notion pages).
  Out of scope until a real need shows up.

## Architecture

Three skills, mirroring the existing `ship` / `review-pr` / `deliver`
pattern: two atomic skills plus a chain skill that sequences them.

```
Notion page (spec)
   │  notion-fetch
   ▼
breakdown-feature ──writes──▶ Notion page (spec + checklist)
   │
   │  (user picks which subtasks to plan now)
   ▼
plan-subtask (x N) ──▶ plan printed in chat (not persisted)

start-feature = breakdown-feature, then plan-subtask for each chosen subtask
```

The Notion page stays the single source of truth for the subtask list — no
local state to keep in sync. Plans are scoped to the current session; if the
repo changes before a subtask is picked up, re-running `plan-subtask`
produces a fresh plan rather than trusting a stale one.

## Components

### `breakdown-feature`

**Trigger:** `breakdown feature <notion-link>`

1. `notion-fetch` the given page.
2. Read the spec for scope and acceptance criteria.
3. Propose a subtask breakdown natural to FE work — e.g. by component/UI, by
   data-fetching/state, by edge case & error state, by tests — and show it to
   the user.
4. On confirmation, write the subtasks back into the same Notion page as a
   to-do checklist (`notion-update-page`). Never write before confirming.

**Output:** link back to the Notion page, plus the list of subtasks written.

### `plan-subtask`

**Trigger:** `plan subtask <notion-link> <name or number>`

Takes the Notion link explicitly (rather than relying on chat context from a
prior `breakdown-feature` run) so it works standalone, days later, in a fresh
session.

1. Resolve the referenced subtask by re-reading the Notion checklist
   directly.
2. Look at the target repo's current structure for relevant existing
   components/patterns, so the plan matches conventions already in place
   rather than inventing new ones.
3. Produce a plan: goal, files likely touched, approach steps, edge cases to
   consider, tests to add. No code.

**Output:** the plan as markdown in chat. Nothing is written back to Notion.

### `start-feature` (chain)

**Trigger:** `start feature <notion-link>`

1. Invoke `breakdown-feature` with the link.
2. Once the checklist is written, ask the user which subtasks to plan now
   (all, or a subset).
3. Invoke `plan-subtask` for each chosen subtask.
4. Report a consolidated summary: the Notion link plus each requested plan.

## Error Handling

- **Notion access fails** (bad link, no permission): fail immediately with a
  clear message. Never guess at content.
- **Spec is too ambiguous** to identify scope/acceptance criteria: ask the
  user rather than inventing subtasks.
- **Before any Notion write**: always get explicit user confirmation on the
  proposed subtask list first, so a misread spec can't silently corrupt the
  page.
- **`plan-subtask` given an unknown subtask reference**: list the subtasks
  that actually exist on the page and ask again, rather than planning
  something unrelated.
- **Chain failure**: if `breakdown-feature` fails inside `start-feature`, stop
  the whole chain — don't attempt `plan-subtask` against a checklist that was
  never written.

## Testing / Verification

These are prompt-based skills, not code — verified by dry run, the same way
`ship`/`review-pr`/`deliver` were verified (see `docs/CHEATSHEET.md`):

1. Use one real (or representative dummy) Notion spec page.
2. Run `breakdown-feature`: confirm the proposed checklist is sensible and
   that the Notion page isn't otherwise damaged by the write.
3. Run `plan-subtask` on one subtask: confirm the plan is specific to that
   subtask and repo, not generic boilerplate, and contains no code.
4. Run `start-feature` end to end against a real spec; record the result in
   `docs/CHEATSHEET.md` alongside the existing skills once verified.
