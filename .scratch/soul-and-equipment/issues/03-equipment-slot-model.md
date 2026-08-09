Type: grilling
Status: resolved
Blocked by: 02

# Equipment slot model

## Question

After Soul is playable: what is **Equipment** in a **Match**?

Decide: which slots exist (weapon, armor, …), how many, whether **Equipment** is rolled/drafted/chosen at Match begin or brought from elsewhere, and how it relates to **Soul** (stat sticks vs separate combat actors). Keep gold/shop out of scope.

## Answer

- **Relation:** Identity + light combat nudges — not a sixth **Loadout** **Boon**, not a separate fire actor (linked fire later), not a rewrite of the Soul panel’s rolled stats.
- **Slots (this slice):** Exactly one **Weapon** slot. No armor/accessories yet.
- **Acquisition:** At **Match start**, after **Soul**s roll, both seats simultaneously get independent **1-of-3** **Weapon** offers and must pick one. Boon **Draft** starts only when both have a **Weapon**. Match-scoped; clears on end/cancel. No gold/shop; not account-persistent.
- **Fog:** Own **Weapon** visible once chosen; opponent fog until fight (same as Soul/Loadout).
- **Light nudges:** Catalog fields on damage / fire-capable Cooldown / starting-max Life levers; apply on the shared path **after Passive + Soul**; Soul panel numbers unchanged; keep magnitudes light.
- **Deferred:** Weapon type enum + Boon filters → **Weapon types and Boon filters**; linked fire → **Equipment-linked fire effects**.

Locked in `CONTEXT.md` under **Equipment** / **Weapon**.
