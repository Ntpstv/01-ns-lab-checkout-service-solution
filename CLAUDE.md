# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small checkout/orders service used as a training lab (Lab B — Dev + QA tracks). This is the
**solution branch**: coupons, idempotent checkout, and the inventory race-condition fix are all
already implemented. See `SOLUTION.md` for the instructor-facing diff summary and `docs/ASSIGNMENTS.md`
for the original assignment brief (both are in Thai).

## Commands

```bash
npm install
npm run build      # tsc compile to dist/
npm run typecheck  # tsc --noEmit
npm test           # jest, all suites
npm run dev        # tsx watch src/index.ts, http://localhost:3000
npm start           # node dist/index.js (run build first)
```

Run a single test file or test case with jest directly:
```bash
npx jest src/__tests__/inventory.test.ts
npx jest -t "does not oversell"
```

## Architecture

Layering is `routes -> services -> repositories`. Routes parse the request and call a service;
services hold all business logic and orchestrate repositories; repositories are the only place
that touches storage.

**Repositories are async by design.** `src/repositories/asyncStore.ts` implements an in-memory
`Map` but awaits a `setTimeout(0)` tick on every `get`/`put`. This is intentional — it forces a
real interleaving point so concurrency bugs in callers (not in the store) are observable in tests.
`productRepo`, `orderRepo`, and `couponRepo` are all `createAsyncStore<T>` instances.

**Money is integer cents everywhere** (`src/lib/money.ts`, type `Cents = number`). Never use
floats for prices/totals; convert only at the edges with `toCents`/`formatCents`. Percentages
round half-up via `percentOf`.

**Concurrency control lives in `src/lib/locks.ts`** — `withLock(key, fn)` is a per-key async
mutex (chained promises) ensuring calls with the same key run strictly sequentially while
different keys run independently. Two places depend on it:
- `inventoryService.reserve`/`release` lock on `sku:<sku>` — this is what prevents oversell when
  two reservations race for the last unit of stock (read-check-write is otherwise a classic
  check-then-act race across the `await` in `asyncStore`).
- `orderService.checkout` locks on `idem:<idempotencyKey>` to serialize retries of the same key.

**Idempotent checkout** (`orderService.checkout`): if an `Idempotency-Key` header is present, the
whole checkout is serialized per key via `withLock`. The key is recorded in `idempotencyStore`
**only after** the order is successfully created — if it were recorded before, a failed attempt
could never be retried. A repeated key returns the original order without reserving stock again.

**Checkout flow** (`orderService.doCheckout`):
1. Resolve coupon by code (missing/unknown code -> no discount) — see `couponService.discountForCoupon`.
2. `pricingService.priceCart` computes subtotal/discount/tax/total (tax is charged on
   subtotal-discount, discount is clamped to never exceed subtotal).
3. Reserve stock line by line; if a later line fails, all previously reserved lines in *this
   request* are rolled back via `inventory.release` before throwing.
4. Persist the order to `orderRepo`.

**Coupons** (`couponService.discountForCoupon`) are pure and clock-injectable (`src/lib/clock.ts`
provides `systemClock` for prod and `fixedClock(iso)` for deterministic tests). Rules: null coupon
-> 0, expired (`expiresAt <= now`) -> 0, subtotal below `minSubtotalCents` -> 0, `percent` uses
`percentOf`, `fixed` uses the raw cents value, and the result is always clamped to `[0, subtotal]`.

**Errors**: services throw plain `Error`s with descriptive messages; `errorHandler` middleware
catches anything unhandled and responds `400` with `{ error: message }`. There's no custom error
hierarchy — don't add one without reason.

## Seed data

`app.ts` seeds `productRepo` (BOOK/PEN/MUG) and `couponRepo` (SAVE10, WELCOME200, EXPIRED) on
every `createApp()` call — including in tests that build the app fresh. There is no persistence
across process restarts; everything lives in memory for the lifetime of the process.
