# ADR 0002: Active effects, combat round clock, and typed modifier ops

## Status

Accepted (2026-05-20)

## Context

The **Derived stat pipeline** needs spell and buff support beyond **Stat override**. Equipment catalogs already use SRD JSON with structured hooks (for example armor `armor_class`). Spells require timed buffs, 1:1 spell keys for player recognition, and shared fight timing.

## Decision

1. **Active effect (sheet)** — instances on the character (`activeEffects[]`) referencing bundled **Effect definition** data by `effectKey` (1:1 with SRD spell `index` when spell-sourced).
2. **Modifier operations** — definitions use an ordered typed op list (for example `{ "op": "acFloor", "value": 16 }`), not parsed prose or expression strings.
3. **Effect stacking** — phased combination per stat (for AC: mundane → highest set formula → floors → bonuses → **Stat override**).
4. **Combat round clock (session)** — DM-controlled start / advance / end on the **Session**; visible in **Turn order** overlay; drives round-based expiry (`startedRound`, `endsAtRound`; definition default, DM may edit end round).
5. **New fight** — clears all active effects on all characters and resets the clock; **End combat** pauses the clock only.
6. **UI** — round controls in **Turn order**; effect chips on **Character sheet** combat header.
7. **SRD spell catalog** — list all spells; combat math only where a definition exists. **Multiclass (v2)** remains separate.
8. **First definitions** — bounded **Effect vertical slice (v1)**: ten ops and ten spells; see [ADR 0003](0003-effect-vertical-slice-ten-ops-ten-spells.md).

## Consequences

- **Positive:** Explains Barkskin-style buffs without overwriting calculated AC on every save; one clear spell name per key; testable op interpreter.
- **Positive:** Round clock gives shared time for durations without inferring rounds from **Turn order** wraps.
- **Negative:** Large content surface (spell catalog + per-spell definitions); ops and stacking must be maintained in code.
- **Negative:** Spells without definitions still need manual play or **Stat override** until authored.

## Alternatives considered

- **Stat override only** — Simple but poor UX for common buffs.
- **Shared effect keys across spells** — Rejected for player clarity (ADR 0001 spirit).
- **Infer rounds from turn order** — Rejected; unreliable vs explicit **advance round**.
- **Expression-string formulas** — Rejected; harder to test and secure than typed ops.
