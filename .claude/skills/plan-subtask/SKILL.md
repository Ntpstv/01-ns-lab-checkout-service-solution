---
name: plan-subtask
description: Produce an implementation plan for one subtask from a Notion feature checklist, without writing any code. Use when the user says "plan subtask <notion-link> <name or number>" or asks to plan how to start a specific subtask.
allowed-tools: mcp__claude_ai_Notion__notion-fetch, Read, Grep, Glob, Bash(find:*), Bash(ls:*), Bash(cat:*)
argument-hint: [notion-link] [subtask-name-or-number]
---

# Plan Subtask

Notion page: $1
Subtask to plan: $2

1. **Resolve the page** — Use `notion-fetch` on $1 to read the current checklist.
2. **Resolve the subtask** — Subtasks are numbered 1-based, continuous across all groups (see `breakdown-feature`'s write-back step). Find the checklist item matching $2, whether $2 is that number or a name. If nothing matches, list every checklist item actually on the page and ask the user which one they meant. If $2 is a name and it matches more than one checklist item, list the matches and ask the user which one they meant — do not silently pick one. Do not guess. Once resolved, echo back the resolved item's full text before producing the plan, so the user can confirm the right one was picked.
3. **Survey the repo** — Look at the current FE repo's structure for components, hooks, and patterns relevant to this subtask, so the plan follows existing conventions instead of inventing new ones. If the survey finds no existing convention or code area covering this subtask, say so explicitly in the plan rather than inventing paths — and label any proposed file paths as proposals, not as something observed in the repo.
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
