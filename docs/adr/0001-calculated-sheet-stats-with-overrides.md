# ADR 0001: Calculated sheet stats with per-field overrides

## Status

Accepted (2026-05-20)

## Context

The **Character sheet** currently treats most combat numbers as participant-typed (**Sheet numbers (v1)**), with a few read-only hints (AC, walking speed, max HP) that do not overwrite stored values. We want a **Derived stat pipeline** (proficiency bonus, ability modifiers, saves, skills, initiative modifier, passive Perception, hit dice, and eventually more) without forcing tables to abandon manual control for unmodeled effects (Barkskin, magic items, house rules).

## Decision

Adopt a **hybrid calculated + override** model (**Calculated sheet stat** + **Stat override**):

- For each field enrolled in the pipeline, the stored value is the calculated result by default and updates when modeled inputs change (on debounced autosave).
- A per-field **Stat override** pins a different stored value until the participant clears the override, at which point the calculated value is restored.
- Fields not yet enrolled, or outside modeled rules, remain plain-text entry as today.

## Consequences

- **Positive:** Removes duplicate typing for the common case; keeps an escape hatch aligned with real table play and incomplete 5e coverage.
- **Positive:** Replaces the ambiguous “hint beside authoritative field” pattern for enrolled stats with one visible number and explicit override state.
- **Negative:** Schema and UI must track override flags (or equivalent) per field; merge/conflict behavior must define whether overrides survive input changes.
- **Negative:** Existing hint-only fields (AC, speed, max HP) need a deliberate migration path into enrolled fields vs staying manual longer.

## Alternatives considered

- **Hints only (extend v1):** Safe but does not reduce input surface; two numbers per field forever.
- **Write-through authoritative (no override):** Simplest automation but fights temp effects and partial rules modeling.
- **Parallel `derived` object:** Avoids overwriting typed fields but duplicates state and complicates “what does the token show?”
