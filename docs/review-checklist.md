# Review Checklist

Checklist used by the `/review-pr` skill and by humans reviewing PRs on `checkout-service`.

## Correctness
- [ ] Logic matches the stated requirement/spec (docstrings, ticket, ASSIGNMENTS.md)
- [ ] Edge cases handled: null/undefined, empty collections, boundary values (0, negative, expired)
- [ ] Money/pricing math uses integer cents, not floats
- [ ] Async code awaits correctly; no unhandled promise rejections
- [ ] Concurrency: shared mutable state (e.g. inventory) is safe under parallel calls

## Tests
- [ ] New/changed behavior has a test covering it
- [ ] Edge cases have explicit tests: null/empty input, zero/negative/boundary values, expiry, concurrent calls — not just the happy path
- [ ] Tests assert behavior, not implementation details
- [ ] `npm test` passes; no skipped/focused tests (`.only`/`.skip`) left in
- [ ] `npm run build` / `npm run typecheck` passes

## Security
- [ ] No secrets, tokens, or credentials in the diff
- [ ] No new SQL/command injection, XSS, or path traversal surface
- [ ] Input from external callers (HTTP body, headers, query) is validated

## Convention
- [ ] Follows existing naming/style in the touched files
- [ ] No unrelated formatting or refactor mixed into the change
- [ ] Commit/PR message explains why, not just what

## Scope
- [ ] Diff matches the PR description — nothing unrelated slipped in
- [ ] No dead code, commented-out code, or leftover debug logging
