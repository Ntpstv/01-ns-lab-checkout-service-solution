---
name: start-feature
description: Chain skill that breaks a Notion feature spec into subtasks, then plans each one the user chooses. Runs "breakdown-feature" followed by "plan-subtask" for selected subtasks. Use when the user says "start feature <notion-link>".
allowed-tools: Skill, mcp__claude_ai_Notion__notion-fetch, mcp__claude_ai_Notion__notion-update-page, Read, Grep, Glob, Bash(find:*), Bash(ls:*), Bash(cat:*)
argument-hint: [notion-link]
---

# Start Feature (breakdown → plan chain)

This skill does not duplicate `breakdown-feature` or `plan-subtask`'s logic — it invokes them in sequence via the Skill tool and passes state between them. Do not inline their steps here; call the skills.

## Chain

1. **Invoke the `breakdown-feature` skill** with $1 as the Notion link.
   - If it stops (fetch failure, ambiguous spec, or the user doesn't confirm the subtask list), STOP the chain here. Report why. There is nothing to plan yet.
   - If it completes, note the final list of subtasks it wrote to the page.

2. **Ask the user which subtasks to plan now** — all of them, or a chosen subset. Wait for their answer before continuing.

3. **Invoke the `plan-subtask` skill** once per chosen subtask, passing $1 (the same Notion link) and that subtask's **number** (not its name). The `Skill` tool's `args` string is split on whitespace with no rest-of-line capture for the last placeholder, so a multi-word subtask name would silently truncate to its first word — the number is a single token and avoids this.

4. **Report the outcome**: the Notion page link from step 1, followed by each plan produced in step 3, one after another.

## Rules

- Never call `plan-subtask` for a subtask the user didn't choose.
- Never skip step 1's confirmation gate — `breakdown-feature` already enforces it, but this chain must still stop if that gate isn't passed.
