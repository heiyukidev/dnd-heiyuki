Type: task
Status: resolved
Blocked by: 01, 02, 03, 04

# Build Match gold → Soul bumps

## Question

Ship the playable slice: flat **Match** grant, post–five-pick spend step that bumps **Soul stats** (may exceed 10), confirm clears leftover, opponent final **Soul** fogged until fight, then both ready → live sim.

Blocked until economy, currency name, spend UX, and phase sync are locked. Implement via Phillip; lock results into `CONTEXT.md`.

## Answer

Shipped playable Match-scoped **Gold** → **Soul** bumps:

- Grant **5** **Gold** at **Match** begin (weapon seats → carried into draft).
- After five **Draft** picks: seat spends via `adjustSoulBump` / `confirmSoulSpend`; leftover **Gold** lost on confirm; bumps may exceed 10.
- Global `playPhase` stays `draft`; fight starts when both `spendConfirmed`; combat **Soul** = `effectiveSoul(roll, bumps)`.
- Waiting reasons: `opponent_draft` vs `opponent_spend`.
- `CONTEXT.md` glossary + Draft / Match start / cancel updated.
- Hopper/Timmy loop clean of critical/high (99 tests pass).
