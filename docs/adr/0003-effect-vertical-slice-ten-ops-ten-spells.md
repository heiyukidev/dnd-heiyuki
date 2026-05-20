# ADR 0003: Effect vertical slice — ten modifier ops and ten spell definitions

## Status

Accepted (2026-05-20)

## Context

[ADR 0002](0002-active-effects-and-combat-round-clock.md) accepts typed **modifier operation list**s and phased **Effect stacking (sheet)** but leaves the first shippable op catalog and spell definitions open. We need a bounded v1 slice that exercises the **Derived stat pipeline**, **Active effect (sheet)** chips, and **Combat round clock** without dice-based buffs, resistance, or concentration automation.

## Decision

Ship exactly **ten modifier ops** and **ten bundled Effect definitions** (SRD spell `index` = `effectKey`). All other SRD spells appear in **SRD spell catalog (v1)** only until a definition is added later.

### Modifier operations (v1 vertical slice)

| `op`              | Target                               | Stacking / application                                                                                                                                 |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `acSet`           | Armor class                          | Set-formula phase: `{ base, addDexMod? }` competes with mundane AC; pipeline keeps **highest** among set formulas, then floors, then bonuses           |
| `acFloor`         | Armor class                          | Floor phase: `final = max(final, value)` per op                                                                                                        |
| `acBonus`         | Armor class                          | Bonus phase: sum all `value`                                                                                                                           |
| `speedAdjust`     | **Walking speed (sheet)**            | After mundane speed: apply every op in definition order — each op may `multiply` (factor on running total) and/or `add` (integer feet)                 |
| `maxHpBonus`      | **Maximum hit points (sheet)**       | Additive on calculated max before **Stat override**                                                                                                    |
| `saveBonusAll`    | Every **Save modifier (sheet)**      | Add `value` to each save mod                                                                                                                           |
| `skillBonus`      | One skill **Skill modifier (sheet)** | `{ skill, value }` — skill keys match sheet skill ids (e.g. `stealth`)                                                                                 |
| `initiativeBonus` | **Initiative modifier (sheet)**      | Add `value`; **no v1 spell** uses this op yet (reserved for header coverage)                                                                           |
| `abilityModBonus` | One **Ability modifier (sheet)**     | `{ ability, value }` — abilities `str` \| `dex` \| `con` \| `int` \| `wis` \| `cha`; **no v1 spell** yet                                               |
| `tempHpGrant`     | Current HP (once)                    | On **add** of the **Active effect (sheet)** instance only: increase current HP by `value` without exceeding max; not re-run on recalc or round advance |

**Out of scope for this slice:** dice bonuses (`+1d4`), resistance/vulnerability, advantage/disadvantage, concentration, upcasting in definitions, `stackingGroup` (ADR 0002 future).

### Spell definitions (v1 vertical slice)

| `effectKey` (SRD `index`) | Modifiers                                | Default `durationRounds`                     |
| ------------------------- | ---------------------------------------- | -------------------------------------------- |
| `barkskin`                | `acFloor` 16                             | 10                                           |
| `mage-armor`              | `acSet` base 13, `addDexMod` true        | `null` (no auto-expire on **advance round**) |
| `shield-of-faith`         | `acBonus` +2                             | 10                                           |
| `shield`                  | `acBonus` +5                             | 1                                            |
| `haste`                   | `acBonus` +2, `speedAdjust` `multiply` 2 | 10                                           |
| `longstrider`             | `speedAdjust` `add` 10                   | 600                                          |
| `aid`                     | `maxHpBonus` +5                          | 600                                          |
| `pass-without-trace`      | `skillBonus` stealth +10                 | 10                                           |
| `warding-bond`            | `acBonus` +1, `saveBonusAll` +1          | 60                                           |
| `false-life`              | `tempHpGrant` 12 (flat; not rolled)      | `null`                                       |

When `durationRounds` is `null`, instances do not auto-remove on **advance round**; the table removes them manually or the **Dungeon Master** sets `endsAtRound`. Otherwise `endsAtRound = startedRound + durationRounds` on add (unless **Dungeon Master** edits `endsAtRound`).

### Round duration convention (bundled defaults)

Combat approximation for prose durations (not parsed from SRD text at runtime):

| Prose (typical)                | `durationRounds` |
| ------------------------------ | ---------------- |
| Until start of your next turn  | 1                |
| Up to 1 minute (concentration) | 10               |
| 1 hour                         | 60               |
| 8 hours                        | 600              |

Long out-of-combat defaults (`mage-armor`, `aid`, `longstrider`) use `null` or large values as in the table above; **Dungeon Master** may shorten `endsAtRound` during play.

### Implementation order (within this ADR)

1. Ops `acSet`, `acFloor`, `acBonus` + spells `barkskin`, `mage-armor`, `shield-of-faith`, `shield` + **Armor class (sheet)** enrollment.
2. **Combat round clock** + expiry on **advance round**.
3. `speedAdjust`, `maxHpBonus`, `saveBonusAll`, `skillBonus` + spells `haste` through `warding-bond`.
4. `tempHpGrant` + `false-life`; `initiativeBonus` and `abilityModBonus` in interpreter only.

## Consequences

- **Positive:** Fixed, testable surface for the first interpreter and catalog UI; covers AC, speed, max HP, saves, skills, and one-shot temp HP.
- **Positive:** Spell keys stay 1:1 with SRD `index` per ADR 0002.
- **Negative:** `false-life` and other dice spells are intentionally simplified (flat temp HP); tables must override for RAW rolls.
- **Negative:** `haste`/`longstrider` stacking order must match documented `speedAdjust` rules when both are active.

## Alternatives considered

- **AC-only slice (four spells, three ops):** Smaller demo but would special-case the interpreter and delay speed/HP/save paths.
- **Include Bless / Guidance (`+1d4`):** Rejected until a dice op exists.
- **`tempHpGrant` as separate “on apply” hook only:** Rejected for slice; still modeled as op #10 but executed only on instance add, not on stat recalc.
