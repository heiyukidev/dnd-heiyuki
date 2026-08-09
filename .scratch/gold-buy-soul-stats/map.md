# Gold buys Soul stats

## Destination

Playable **Match**-scoped currency: after the random **Soul** roll and after each seat finishes its five **Draft** picks, that seat spends a flat grant to bump **Soul stats** (may exceed **10** per stat); unused currency is lost on confirm; opponent’s final **Soul** stays fogged until the fight.

## Notes

- Domain: `CONTEXT.md`; combat transport ADRs `docs/adr/0001`–`0003`.
- Skills: `/grilling` + domain docs when resolving HITL tickets; execute via Phillip after economy / phase / UX decisions are locked.
- **Execution override:** this map carries build work (task tickets), not planning-only.
- Reopens gold/shops that [Soul and Equipment](../soul-and-equipment/map.md) ruled out of scope — as a **new** effort, not a rewrite of that map.
- Charting locks (not ticketed): Match-scoped only; augment after the 15-point roll (not replace); spend is the last thing a seat does in **Draft** (after own five picks, before fight); per-seat spend (A) — other may still be drafting; bumps may push a stat above **10**; flat equal grant both seats; leftover lost on confirm; own bumps visible immediately, opponent fog until fight; Soft **Draft** guidance still uses rolled **Soul** only (bumps land after picks).

## Decisions so far

- [Economy: grant size and cost curve](issues/01-economy-grant-and-cost.md) — Flat 1:1, shared price; grant **5**, cost **1** per +1 Soul bump.
- [Domain name for Match currency](issues/02-currency-domain-name.md) — Glossary + UI term is **Gold**; avoid Nectar/money/cash/points.
- [Soul spend step UX](issues/03-soul-spend-ux.md) — Free realloc on Soul panel; explicit Confirm (0-spend OK); favor line stays on rolled Soul.
- [Draft → spend → fight phase sync](issues/04-draft-spend-phase-sync.md) — Stay in `draft`; seat picking→spending→ready; both ready → match; cancel wipes Gold too.
- [Build Match gold → Soul bumps](issues/05-build-gold-soul-bumps.md) — Playable: grant 5 at Match begin, post-pick spend UI + mutations, both confirm → fight with bumped Soul; CONTEXT locked.

## Not yet specified

- Soft / soft-diminishing caps if the economy allows extreme stacks
- Exact confirm control copy and spend UI layout details beyond the UX ticket

## Out of scope

- Session- or account-persistent currency
- Buying **Equipment**, **Boons**, or offer rerolls
- Earn / steal / mid-fight gold this slice
- Lobby shop
- Replacing the random **Soul** roll
- Soft **Draft** offer reweighting or bans from bumps
