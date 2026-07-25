#!/bin/bash
# PreToolUse hook (matcher: Bash) — blocks `git commit` while typecheck is red.
set -euo pipefail

input=$(cat)

command=$(printf '%s' "$input" | node -e "
let d = '';
process.stdin.on('data', c => (d += c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(d);
    process.stdout.write((data.tool_input && data.tool_input.command) || '');
  } catch (e) {}
});
")

if [ -z "$command" ]; then
  exit 0
fi

# Only guard actual `git commit` invocations, not unrelated commands that merely
# mention the word (e.g. `git log --grep=commit`).
if ! printf '%s' "$command" | grep -Eq '(^|[;&|]|\()\s*git\s+commit\b'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

typecheck_output=$(npm run typecheck 2>&1) && exit 0

message="typecheck failed — fix the type errors below before committing:

$(printf '%s' "$typecheck_output" | tail -n 40)"

printf '%s' "$message" | node -e "
let d = '';
process.stdin.on('data', c => (d += c));
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { permissionDecision: 'deny' },
    systemMessage: d,
  }));
});
" >&2

exit 2
