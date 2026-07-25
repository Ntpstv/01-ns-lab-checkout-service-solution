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
