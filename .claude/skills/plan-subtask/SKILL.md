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
