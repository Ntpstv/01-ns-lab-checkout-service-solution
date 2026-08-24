#!/bin/bash
# PostToolUse hook (matcher: Edit|Write) — auto-formats the touched file with prettier.
set -euo pipefail

input=$(cat)

file_path=$(printf '%s' "$input" | node -e "
let d = '';
process.stdin.on('data', c => (d += c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(d);
    process.stdout.write((data.tool_input && data.tool_input.file_path) || '');
  } catch (e) {}
});
")

if [ -z "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *..*) exit 0 ;;
  */node_modules/*|*/dist/*|*/coverage/*) exit 0 ;;
esac

if [ ! -f "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.css|*.scss|*.html|*.yml|*.yaml)
    "$CLAUDE_PROJECT_DIR/node_modules/.bin/prettier" --write "$file_path" >/dev/null 2>&1 || true
    ;;
esac

exit 0
