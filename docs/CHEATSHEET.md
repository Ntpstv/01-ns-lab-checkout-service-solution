# Team Tools Cheatsheet — checkout-service

Lab A · 13:00–14:45 · 3 skills + 2 hooks built for this repo.

**Verified:** `npm run typecheck` green · `npm test` 29/29 passing

> **Before the hooks work:** restart the Claude Code session (exit, run `claude` again).
> Hooks load at session start — editing `.claude/settings.json` or the hook scripts mid-session has no effect until then.

---

## Skills

### `ship`

`.claude/skills/ship/SKILL.md`

**Trigger:** `ship`, `ship it`, `ship this`

Review diff → run tests → commit → open PR, back to back. Stops immediately if tests are red.

1. `git diff` / `git status` — see everything pending
2. Review for obvious bugs, leaked secrets, convention violations
3. `npm test` — if red, STOP here, no commit
4. If green: `git add` only the relevant files, commit with a short clear message
5. Open a PR summarizing what/why

### `review-pr <n>`

`.claude/skills/review-pr/SKILL.md`

**Trigger:** `review-pr 42` (arg `$1` = PR number)

Pulls a real PR's diff and checks it against the team checklist — not a freeform review.

1. `gh pr diff $1` — prefetch the diff
2. Load `docs/review-checklist.md`
3. Compare the diff against every checklist item, citing file:line for issues
4. Output: Summary → Findings (by category) → Verdict

### `deliver` (chain skill)

`.claude/skills/deliver/SKILL.md`

**Trigger:** `deliver`, `ship and review`

Doesn't duplicate the other two skills' logic — it calls them in sequence, passing the real PR number between them.

```
ship  →  gh pr view --json number  →  review-pr $PR
```

1. Invoke `ship` — if tests are red or no PR gets opened, stop the whole chain
2. Resolve the PR number with `gh pr view --json number -q .number` (never guessed from text output)
3. Invoke `review-pr` with that number
4. Report the combined result: PR link + review verdict

---

## Hooks

### `format.sh`

`.claude/hooks/format.sh` — **PostToolUse** on `Edit|Write`, registered in `.claude/settings.json`

Auto-formats any file Claude edits or creates, silently, via prettier. Parses hook JSON with `node` (not `jq` — not installed on this machine).

**Tested:** messy `.ts` file → reformatted automatically, no request needed.

```text
// before
const   x = {a:1,b:2}
function foo(  ) {
return    x
}
```

```ts
// after (automatic)
const x = { a: 1, b: 2 };
function foo() {
  return x;
}
```

### `guard-commit.sh`

`.claude/hooks/guard-commit.sh` — **PreToolUse** on `Bash`, registered in `.claude/settings.json`

Intercepts any command containing `git commit`, runs `npm run typecheck` first. Red typecheck → blocks (exit 2) with the `tsc` error handed back on stderr for Claude to fix.

**Tested:** 3 cases — commit while green → allowed · unrelated command → skipped · commit while a type error is present → blocked with the real `tsc` output.

---

## Files touched

| File                                | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `.claude/skills/ship/SKILL.md`      | skill: review → test → commit → PR                    |
| `.claude/skills/review-pr/SKILL.md` | skill: review a real PR against the checklist         |
| `.claude/skills/deliver/SKILL.md`   | chain skill: ship → review-pr                         |
| `.claude/hooks/format.sh`           | auto-format edited/created files                      |
| `.claude/hooks/guard-commit.sh`     | block commit if typecheck is red                      |
| `.claude/settings.json`             | wires both hooks to PreToolUse/PostToolUse            |
| `.claude/settings.local.json`       | allow-list for git/gh commands (local, not committed) |
| `docs/review-checklist.md`          | checklist `review-pr` checks against                  |
| `.prettierrc` + `package.json`      | prettier config + devDependency                       |
