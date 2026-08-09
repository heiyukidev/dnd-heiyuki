Type: task
Status: resolved
Blocked by: 03, 04, 05

# Build Equipment phase

## Question

Implement the locked **Equipment** model (slots, weapon types, linked fire if any) on top of Soul-first, including Match transport/UI enough to play with Equipment in a fight.

Done when Equipment is visible in a Match and affects combat per the grilling answers above.

## Answer

Shipped Match-scoped **Weapon** end-to-end:

- **Flow:** `startMatch` rolls **Soul**s → `playPhase: 'weapon'` with independent 1-of-3 offers → `pickWeapon` → when both seats have a **Weapon**, init **Draft**. Cancel clears **Equipment** with other match fields.
- **Catalog (v1):** eight keys in `src/match/weaponCatalog.ts` (two per type); light nudges only (damage/CD percents, Wand life bonus). Locked in `CONTEXT.md`.
- **Combat:** nudges on shared path after Passive + Soul; starting/max **Life** via `maxLifeForSeat`; no linked fire.
- **Passive:** optional `weaponType` carrier-seat gate in filter matching.
- **UI/fog:** pick screen; own **Weapon** in **Draft**; both revealed in fight; opponent fog until fight.
- **Tests:** 87 passing (catalog, weapon helpers, effectiveStats nudges + gate).

Hopper: no critical/high. Known follow-ups (warnings): Draft offer presentation should pass `weaponKeys` for effective preview; more Convex/sim integration tests.
