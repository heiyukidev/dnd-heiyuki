# Soul and Equipment

## Destination

Playable **Soul** in **Matches**, then **Equipment**, then **Equipment** interactions with **Boons** / **Gods** / **Matches** — built in the product, not a handoff-only spec.

## Notes

- Domain: `CONTEXT.md`; combat transport ADRs `docs/adr/0001`–`0003`; catalog `local/greek-gods/boon-catalog.md`.
- Skills: `/grilling` + domain docs when resolving HITL tickets; execute via Phillip after a phase’s decisions are locked.
- **Execution override:** this map carries build work (task tickets), not planning-only. Sequence: Soul → Equipment → Equipment–Boon/God Match interactions.
- Soul-first rules already locked in `CONTEXT.md` during charting (Match-scoped random **Soul**, Strength/Speed/Vitality, formulas, Soft Draft guidance without reweighting, opponent **Soul** hidden until fight).

## Decisions so far

- [Soft Draft guidance for Soul](issues/01-soft-draft-guidance-for-soul.md) — Soul panel + one favor line (no offer highlights); both seats share total 15, independent splits.
- [Build Soul-first prototype](issues/02-build-soul-first-prototype.md) — Match-scoped Soul live: roll/combat/Draft panel/fog/clear; heal cap = starting max life; favor copy + Balanced threshold locked.
- [Equipment slot model](issues/03-equipment-slot-model.md) — One Weapon slot; pick 1-of-3 at Match start before Draft; identity + light nudges after Passive+Soul; opponent fog until fight.
- [Weapon types and Boon filters](issues/04-weapon-types-and-boon-filters.md) — Types Sword/Axe/Wand/Bow; Passive filter optional carrier-seat Weapon-type gate (AND with kind/God).
- [Equipment-linked fire effects](issues/05-equipment-linked-fire-effects.md) — No linked fire this slice; Weapon stays type + light nudges only.
- [Build Equipment phase](issues/06-build-equipment-phase.md) — Weapon pick + catalog + nudges + Passive weaponType gate live; playPhase `weapon` before Draft.
- [Equipment Boons with Gods and Matches](issues/07-equipment-boons-with-gods-and-matches.md) — Weapon-gated Passives yes; no Soul rewrites; Draft soft favor by Weapon type only.
- [Build Equipment–Boon interactions](issues/08-build-equipment-boon-interactions.md) — Four weapon-gated Passives + weaponFavorLine soft Draft cue live.

## Not yet specified

## Out of scope

- **Gold** sinks/sources, steal-on-win, shops buying stats/**Equipment**
- **Nectar** / gifting or bribing **Gods**
- Non-player events / PvE rewards
- Account- or **Session**-persistent **Soul** (this prototype is Match-scoped)
- Rarity ladders, duo boons, keepsakes
