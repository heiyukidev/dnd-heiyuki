Type: grilling
Status: resolved
Blocked by: 03

# Weapon types and Boon filters

## Question

Which **Weapon** types exist (axe, sword, wand, dual sword, …), and how may **Boons** / **Passive**s target them?

Decide the type enum and whether filters extend the existing **Passive** filter model (effect kind ∧ God ∧ weapon type) or need a different hook.

## Answer

- **Types (v1):** Exactly four — **Sword**, **Axe**, **Wand**, **Bow**. Soft fantasy jobs (catalog guidance, not hard type→nudge laws): Sword mid damage/tempo; Axe heavy/slower; Wand soft/tempo/hybrid; Bow fast/poke. No dual-wield / spear / fists in this slice.
- **Filter model:** Extend the existing **Passive** filter with an optional **Weapon** type field, ANDed with **effect kind** and/or **God**. Omit = no weapon gate (all types).
- **Semantics:** Seat gate on the **carrier** seat’s equipped **Weapon** (not a tag on recipient **Boons**). If set and the carrier’s **Weapon** type does not match, the **Passive** contributes nothing; recipient matching by kind/God is unchanged.
- **Not in this ticket:** Affinity tags on **Boons**; **Draft** offers gated by equipped type — defer to [Equipment Boons with Gods and Matches](07-equipment-boons-with-gods-and-matches.md).

Locked in `CONTEXT.md` under **Weapon** / **Weapon type** / **Passive**.
