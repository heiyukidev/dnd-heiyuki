Type: task
Status: resolved
Blocked by: 07

# Build Equipment–Boon interactions

## Question

Implement the locked Equipment ↔ Boon / Draft interactions from [Equipment Boons with Gods and Matches](07-equipment-boons-with-gods-and-matches.md):

1. Catalog **Passive**s (or hybrids) that use the carrier **Weapon type** gate — at least one per type (Sword / Axe / Wand / Bow).
2. Soft **Draft** favor line from own **Weapon type** (copy locked in `CONTEXT.md`); no offer reweighting / highlights.
3. No **Soul** stat rewrites from **Boons**.

Done when a Match can draft Weapon-gated **Passive**s and show the Weapon favor cue end-to-end.

## Answer

Shipped:

- **Weapon-gated Passives** (retrofit within 7/God): `hermes_fleet_foot` Sword; `dynamite_scorched_earth` Axe; `hygieia_overflow` Wand; `hermes_stolen_seconds` Bow.
- **`weaponFavorLine`**: helper + Draft/weapon play-state + SessionView soft cue; no offer reweighting.
- Catalog markdown + CONTEXT keys locked. **91** tests pass. Hopper: no critical/high.
