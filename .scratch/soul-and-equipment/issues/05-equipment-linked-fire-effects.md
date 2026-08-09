Type: grilling
Status: resolved
Blocked by: 03

# Equipment-linked fire effects

## Question

Can a **Weapon** (or other **Equipment**) carry a boon-like timed fire (e.g. sword that also casts a fireball every 2s) on top of its weapon identity?

Decide: same fire/Cooldown loop as **Boons**, a linked catalog **Boon**, or equip-only effects — and how that interacts with **Soul** **Speed** / weapon speed bonuses.

## Answer

- **No linked fire in this slice.** A **Weapon** does not charge, fire, own a `nextReadyAt`, inject a hidden **Boon**, or use a non-Cooldown equip verb.
- **Weapons stay** identity (**Weapon type**) + light nudges on the shared path after Passive + Soul. **Soul** **Speed** and weapon CD nudges continue to affect **Loadout** fire-capable **Boons** only.
- **Deferred:** timer-firing Weapons (same loop / linked Boon / equip-only) to a later effort after Equipment is playable.

Locked in `CONTEXT.md` under **Equipment** / **Weapon**.
