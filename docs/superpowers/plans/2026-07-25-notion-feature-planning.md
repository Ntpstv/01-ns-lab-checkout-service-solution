# Notion Feature Planning Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three Claude Code skills — `breakdown-feature`, `plan-subtask`, and `start-feature` — that turn a Notion feature spec into a subtask checklist and per-subtask implementation plans, without writing any code.

**Architecture:** Two atomic skills (`breakdown-feature`, `plan-subtask`) plus one chain skill (`start-feature`) that invokes them in sequence via the `Skill` tool, mirroring the existing `ship` / `review-pr` / `deliver` pattern already in this repo's `.claude/skills/`.

**Tech Stack:** Claude Code skill files (`SKILL.md` with YAML frontmatter), Notion MCP tools (`mcp__claude_ai_Notion__notion-fetch`, `mcp__claude_ai_Notion__notion-update-page`).

## Global Constraints

- Skills must stay generic — nothing depends on `checkout-service`'s backend code — so they can later be copied into the real FE (React/Next.js) repo's `.claude/skills/`.
- None of the three skills may write or scaffold code. They stop at a plan or a checklist.
- `breakdown-feature` must never write to Notion before the user explicitly confirms the proposed subtask list.
- `plan-subtask` must never write anything back to Notion — its output is chat-only.
- No auto-detection of "done" subtasks and no checking items off in Notion.
- Notion is the only spec source — no Jira integration.
- Single-page specs only — a feature spread across multiple Notion pages is out of scope.
- Any dry-run testing against a real Notion workspace requires the user's explicit page or permission first — never create or edit pages in the user's Notion workspace without asking.

---

### Task 1: `breakdown-feature` skill

**Files:**

- Create: `.claude/skills/breakdown-feature/SKILL.md`

**Interfaces:**

- Produces: a skill named `breakdown-feature`, triggered by `breakdown feature <notion-link>`, taking the Notion page link as `$1`. On success it leaves a to-do checklist written into that same Notion page and reports the page link plus the final subtask list back to the user. Later tasks (`start-feature`) invoke it by name via the `Skill` tool, passing the same link.

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/breakdown-feature/SKILL.md`:

```markdown
---
name: breakdown-feature
description: Fetch a Notion feature spec, propose a subtask breakdown for FE work, and write it back to the same page as a checklist once confirmed. Use when the user says "breakdown feature <notion-link>" or asks to break a Notion spec into subtasks.
allowed-tools: mcp__claude_ai_Notion__notion-fetch, mcp__claude_ai_Notion__notion-update-page, Read, Grep, Glob
argument-hint: [notion-link]
---

# Breakdown Feature

Notion page to break down: $1

1. **Fetch** — Use `notion-fetch` to read the page at $1. If the fetch fails (bad link, no access), stop and report the error. Do not guess at content.
2. **Read** — Identify the feature's scope and acceptance criteria from the page content. If they aren't clear enough to break into concrete subtasks, stop and ask the user to clarify rather than inventing scope.
3. **Propose** — Draft a subtask breakdown natural to FE work, grouping by concern such as: UI/component work, data-fetching or state, edge cases and error states, and tests. Present the proposed list to the user and wait for confirmation before writing anything.
4. **Confirm** — If the user asks for changes, revise and re-present. Only proceed once they explicitly approve the list.
5. **Write back** — Use `notion-update-page` to append the approved subtasks to the same page as a to-do checklist. Do not create a new page or overwrite existing content.
6. **Report** — Give the user the page link back and the final list of subtasks written.

## Rules

- Never write to Notion before the user has confirmed the subtask list.
- Never invent subtasks from an ambiguous or empty spec — ask instead.
```

- [ ] **Step 2: Get a test Notion page**

Ask the user for a Notion page you may use as a test FE feature spec — either a real spec they're fine with you experimenting against, or permission to create a small scratch page (e.g. "Add a search bar to the product listing page" with 2-3 acceptance criteria). Do not create or edit anything in their Notion workspace without this go-ahead.

- [ ] **Step 3: Dry-run the skill**

Invoke `breakdown feature <the test page link>`. Confirm:

- It fetches the page and shows a proposed subtask list grouped by concern (UI, data/state, edge cases, tests) before writing anything.
- It waits for your explicit confirmation.
- After confirming, it writes a to-do checklist back into the same page (verify by re-fetching the page with `notion-fetch` and checking the checklist blocks are present).
- It reports the page link and final subtask list.

Also confirm the failure path: run it once with a broken/inaccessible link and confirm it stops with a clear error instead of guessing content.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/breakdown-feature/SKILL.md
git commit -m "Add breakdown-feature skill"
```

---

### Task 2: `plan-subtask` skill

**Files:**

- Create: `.claude/skills/plan-subtask/SKILL.md`

**Interfaces:**

- Consumes: a Notion page containing a checklist written by `breakdown-feature` (Task 1) — specifically, checklist item text to match against `$2`.
- Produces: a skill named `plan-subtask`, triggered by `plan subtask <notion-link> <subtask-name-or-number>`, taking the Notion page link as `$1` and the subtask reference as `$2`. Outputs a plan (Goal / Files / Approach / Edge cases / Tests) as chat markdown only — nothing is written back to Notion or disk. `start-feature` (Task 3) invokes it by name via the `Skill` tool, once per chosen subtask.

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/plan-subtask/SKILL.md`:

```markdown
---
name: plan-subtask
description: Produce an implementation plan for one subtask from a Notion feature checklist, without writing any code. Use when the user says "plan subtask <notion-link> <name or number>" or asks to plan how to start a specific subtask.
allowed-tools: mcp__claude_ai_Notion__notion-fetch, Read, Grep, Glob, Bash(find:*)
argument-hint: [notion-link] [subtask-name-or-number]
---

# Plan Subtask

Notion page: $1
Subtask to plan: $2

1. **Resolve the page** — Use `notion-fetch` on $1 to read the current checklist.
2. **Resolve the subtask** — Find the checklist item matching $2. If nothing matches, list every checklist item actually on the page and ask the user which one they meant. Do not guess.
3. **Survey the repo** — Look at the current FE repo's structure for components, hooks, and patterns relevant to this subtask, so the plan follows existing conventions instead of inventing new ones.
4. **Plan** — Produce a plan covering:
   - **Goal** — what this subtask delivers, in one sentence.
   - **Files** — the files likely to be created or modified.
   - **Approach** — the concrete steps to take, in order.
   - **Edge cases** — inputs/states worth handling explicitly.
   - **Tests** — what should be tested and roughly how.
5. **Stop** — Present the plan in chat. Do not write any code, and do not write anything back to Notion.

## Rules

- No code in the output — this is a plan to be reviewed, not a diff.
- If the subtask can't be matched on the page, never fabricate one — ask.
```

- [ ] **Step 2: Dry-run against a matching subtask**

Using the same test page from Task 1 (which now has a checklist), invoke `plan subtask <link> <one of the checklist items>`. Confirm:

- It reads the checklist and correctly identifies the matching item.
- The plan it returns has all five sections (Goal, Files, Approach, Edge cases, Tests), is specific to that subtask and the target repo's conventions (not generic boilerplate), and contains no runnable code.
- Nothing gets written back to Notion (re-fetch the page and confirm it's unchanged from Task 1's result).

- [ ] **Step 3: Dry-run the not-found path**

Invoke `plan subtask <link> <a name that doesn't match any checklist item>`. Confirm it lists the actual checklist items on the page and asks which one was meant, instead of planning something unrelated.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/plan-subtask/SKILL.md
git commit -m "Add plan-subtask skill"
```

---

### Task 3: `start-feature` chain skill

**Files:**

- Create: `.claude/skills/start-feature/SKILL.md`

**Interfaces:**

- Consumes: `breakdown-feature` (Task 1, invoked with the Notion link as its argument) and `plan-subtask` (Task 2, invoked with the same link plus one subtask name per call), both via the `Skill` tool.
- Produces: a skill named `start-feature`, triggered by `start feature <notion-link>`, taking the Notion page link as `$1`. Runs the full chain end to end and reports a consolidated summary.

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/start-feature/SKILL.md`:

```markdown
---
name: start-feature
description: Chain skill that breaks a Notion feature spec into subtasks, then plans each one the user chooses. Runs "breakdown-feature" followed by "plan-subtask" for selected subtasks. Use when the user says "start feature <notion-link>".
allowed-tools: Skill
argument-hint: [notion-link]
---

# Start Feature (breakdown → plan chain)

This skill does not duplicate `breakdown-feature` or `plan-subtask`'s logic — it invokes them in sequence via the Skill tool and passes state between them. Do not inline their steps here; call the skills.

## Chain

1. **Invoke the `breakdown-feature` skill** with $1 as the Notion link.
   - If it stops (fetch failure, ambiguous spec, or the user doesn't confirm the subtask list), STOP the chain here. Report why. There is nothing to plan yet.
   - If it completes, note the final list of subtasks it wrote to the page.

2. **Ask the user which subtasks to plan now** — all of them, or a chosen subset. Wait for their answer before continuing.

3. **Invoke the `plan-subtask` skill** once per chosen subtask, passing $1 (the same Notion link) and that subtask's name.

4. **Report the outcome**: the Notion page link from step 1, followed by each plan produced in step 3, one after another.

## Rules

- Never call `plan-subtask` for a subtask the user didn't choose.
- Never skip step 1's confirmation gate — `breakdown-feature` already enforces it, but this chain must still stop if that gate isn't passed.
```

- [ ] **Step 2: Dry-run the full chain**

Ask the user for (or permission to create) a second test Notion spec page, separate from Task 1's page. Invoke `start feature <that page link>`. Confirm:

- It runs `breakdown-feature` first and the checklist confirmation gate still applies.
- After the checklist is written, it asks which subtasks to plan now.
- It calls `plan-subtask` only for the subtasks chosen, and each plan matches the quality bar from Task 2.
- The final report includes the page link and every plan produced.

- [ ] **Step 3: Dry-run the chain-stop path**

Invoke `start feature <a broken/inaccessible link>`. Confirm the chain stops at step 1 (reports the `breakdown-feature` failure) and never attempts to call `plan-subtask`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/start-feature/SKILL.md
git commit -m "Add start-feature chain skill"
```

---

### Task 4: Document the new skills in the team cheatsheet

**Files:**

- Modify: `docs/CHEATSHEET.md`

**Interfaces:**

- Consumes: the finished, dry-run-verified behavior of all three skills from Tasks 1-3 (exact trigger phrases and file paths).
- Produces: no runtime interface — this is documentation only, read by teammates.

- [ ] **Step 1: Add a new section to the cheatsheet**

Open `docs/CHEATSHEET.md` and, after the existing `## Skills` entries (`ship`, `review-pr`, `deliver`), add:

````markdown
### `breakdown-feature`

`.claude/skills/breakdown-feature/SKILL.md`

**Trigger:** `breakdown feature <notion-link>`

Fetches a Notion feature spec, proposes a subtask breakdown for FE work, and — only after you confirm — writes it back into the same page as a to-do checklist.

1. `notion-fetch` the page
2. Propose subtasks grouped by UI, data/state, edge cases, and tests
3. Wait for confirmation before writing anything
4. `notion-update-page` to append the checklist

### `plan-subtask`

`.claude/skills/plan-subtask/SKILL.md`

**Trigger:** `plan subtask <notion-link> <name-or-number>`

Turns one checklist item from a Notion feature page into a concrete plan (goal, files, approach, edge cases, tests) — no code written, nothing written back to Notion.

### `start-feature` (chain skill)

`.claude/skills/start-feature/SKILL.md`

**Trigger:** `start feature <notion-link>`

Runs `breakdown-feature`, then asks which subtasks to plan now, then calls `plan-subtask` for each one chosen.

```

start-feature → breakdown-feature → (pick subtasks) → plan-subtask × N

```

````

- [ ] **Step 2: Add a note on scope**

Directly under the new section header, add one line: `> Trained in this lab repo (Notion MCP is available here); designed generic so it can move to the real FE repo's .claude/skills/ once verified.`

- [ ] **Step 3: Add the three files to the "Files touched" table**

In the existing `## Files touched` table at the bottom of `docs/CHEATSHEET.md`, add three rows:

```markdown
| `.claude/skills/breakdown-feature/SKILL.md` | skill: Notion spec → confirmed subtask checklist |
| `.claude/skills/plan-subtask/SKILL.md` | skill: one subtask → implementation plan (no code) |
| `.claude/skills/start-feature/SKILL.md` | chain skill: breakdown-feature → plan-subtask |
````

- [ ] **Step 4: Commit**

```bash
git add docs/CHEATSHEET.md
git commit -m "Document breakdown-feature/plan-subtask/start-feature in CHEATSHEET"
```
````
