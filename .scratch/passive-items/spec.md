Status: ready-for-agent

# Spec: Loadout Item Passives

## Problem Statement

Every **Item** in the prototype only fires on a **Cooldown** loop (damage, heal, or shield). There is no way for a **Loadout** piece to permanently (or later, conditionally) rewrite other **Items**' tempo or strength—so support fantasy like “reduce the **Cooldown** of all damaging **Items**” cannot exist. Players also have no **Passive**-only slots or hybrid cards, and the Match UI has no face language for non-charging pieces or for **effective** stats after modifiers.

## Solution

Extend the catalog and live sim so an **Item** may be **fire-only**, **Passive**-only, or **hybrid**. A **Passive** rewrites matching **Items**' **Cooldown** and/or potency (flat or percent, per change) using seat targets and **Item** filters. Effective stats recompute every wake (ADR 0002) with clamps; mid-charge eligibility changes rescale `nextReadyAt` by progress fraction. Ship `haste_charm` (**Passive**-only) and `vital_spark` (**hybrid**) in the uniform eight-key random pool. Match **Loadout** UI shows **effective** numbers, a distinct **Passive**-only face, and **Passive** popover copy on hybrids.

## User Stories

1. As a **Player**, I want some **Items** to carry a **Passive**, so that my **Loadout** can buff or tempo other pieces without a shop.
2. As a **Player**, I want **Passive**-only **Items** that never charge or fire, so that a slot can be pure support.
3. As a **Player**, I want **hybrid** **Items** that both fire and carry a **Passive**, so that one slot can contribute offense/sustain and a modifier.
4. As a **Player**, I want existing six catalog **Items** to remain **fire-only**, so that baseline fights stay familiar.
5. As a **Player**, I want `haste_charm` to shorten own-seat damage **Cooldown**s by 20%, so that damage tempo is a readable support fantasy.
6. As a **Player**, I want `vital_spark` to heal for 5 every 3.0s and grant +2 potency to own-seat heal **Items**, so that hybrids feel distinct from pure charms.
7. As a **Player**, I want **Match start** to roll three **Items** uniformly from all eight keys with replacement, so that **Passive**s appear naturally without a special support slot.
8. As a **Player**, I accept that I might roll three `haste_charm`s, so that the prototype stays rule-simple.
9. As a **Player**, I want a **Passive** to declare own / enemy / both seat targets, so that future sabotage and global auras fit the same model.
10. As a **Player**, I want a **Passive** to filter recipients by all **Items** or by effect kind (damage / heal / shield), so that “all damaging **Items**” is expressible.
11. As a **Player**, I want a **Passive** to change **Cooldown** and/or potency only in this slice, so that modifiers stay number rewrites, not new combat verbs.
12. As a **Player**, I want each **Passive** change to be flat or percent, so that authors can write −20% or +2 without a global layering table per card.
13. As a **Player**, I want the carrier included when it matches its own filter and seat target, so that “all my damage **Items**” includes the hybrid that grants the **Passive**.
14. As a **Player**, I want duplicate **Loadout** copies to each contribute their **Passive**, so that with-replacement synergy is intentional.
15. As a **Player**, I want multiple **Passive**s on the same recipient to stack as `effective = (base × (1 + Σpercent)) + Σflat`, so that combining is predictable.
16. As a **Player**, I want **effective Cooldown** floored at 500ms, so that stacks cannot thrash the event-driven sim.
17. As a **Player**, I want **effective potency** floored at 0, so that negative stacks cannot deal negative damage or heals.
18. As a **Player**, I want heal still capped at 100 **Life total** on apply, so that potency buffs do not invent a new heal ceiling.
19. As a **Player**, I want **Passive**-only slots to never schedule wakes or emit fires, so that the sim stays event-driven only for fire-capable **Items**.
20. As a **Player**, I want fire-capable **Items** to use **effective Cooldown** for charge and **effective potency** on fire, so that **Passive**s actually change the fight.
21. As a **Player**, I want effective stats recomputed on every wake, so that future conditional **Passive**s do not need a new timing model (ADR 0002).
22. As a developer, I want an eligibility re-eval hook for future **Passive** condition triggers, so that turning a **Passive** on/off can rewrite mid-charge schedules.
23. As a **Player**, when **effective Cooldown** changes mid-charge, I want `nextReadyAt` rewritten by preserving progress fraction, so that buffs and nerfs feel fair (ADR 0002).
24. As a **Player**, I want both seats’ **Loadout**s to contribute eligible **Passive**s into the same resolution, so that enemy-targeted **Passive**s (when authored) affect me correctly.
25. As a **Player**, I want an **Item** to carry at most one **Passive**, so that catalog authoring stays one modifier block per key.
26. As a **Player**, I want **Passive**-only **Loadout** slots to use a distinct face (glyph + short cue, no charge bar), so that I can see at a glance that the slot is not charging.
27. As a **Player**, I want **hybrid** slots to keep the fire face (icon + **effective** potency + charge bar), so that scanning fire strength stays unchanged.
28. As a **Player**, I want **hybrid** and **Passive**-only popovers to explain the **Passive** in plain language, so that I know what is modifying the board.
29. As a **Player**, I want face and popover **Cooldown** / potency to show **effective** values, so that labels match `nextReadyAt` and actual fires.
30. As a **Player**, I want optimistic charge bars to keep following server `nextReadyAt`, so that ADR 0001 presentation still holds.
31. As a **Player**, I want **Passive**-only slots to never show a fake cooldown bar, so that empty chrome does not look like a stuck charge.
32. As a **Player**, I want **animation hint**s only for real fires, so that **Passive**-only slots do not flash a fire effect.
33. As a **Player**, I want both **Loadout**s visible with the new faces during a **Match**, so that I can read enemy charms and hybrids too.
34. As a developer, I want a shared pure effective-stats resolver used by sim and UI, so that stacking math cannot drift between server and client.
35. As a developer, I want catalog **Passive** data structured for seat target, filter, and flat/percent changes, so that new keys do not require engine branches.
36. As a developer, I want `resolveMatchStep` to remain the combat behavior seam, so that Passive timing and potency stay proven at the existing highest sim boundary.
37. As a developer, I want the loadout slot presentation helper extended for **Passive**-only and effective labels, so that UI rules stay unit-tested without Vue harnesses.
38. As a **Host**, I want **Match start** unchanged except for the wider catalog pool, so that lobby flow does not grow new steps.
39. As a domain reader, I want **Passive** condition triggers distinguished from **Item** fire triggers, so that “trigger” does not reopen on-hit fires.
40. As a future designer, I want unconditional **Passive**s only in this slice, so that condition design can land later on the re-eval hook without rewriting v1 cards.
41. As a **Player**, I want same-timestamp resolve order unchanged (seat resolve order, then slot index), so that **Passive**s do not invent a new tie-break.
42. As a **Player**, I want the **Match time cap** and **Draw** rules unchanged, so that all-**Passive**-only **Loadout**s still end the fight.
43. As a reconnecting **Player**, I want server-authoritative fires and `nextReadyAt`s to remain the source of truth, so that client-derived effective labels cannot dispute outcomes.

## Implementation Decisions

- **Respect ADR 0001**: Live event-driven sim; **Match update**s with **animation hint**s; client-optimistic cooldown from `nextReadyAt`.
- **Respect ADR 0002**: Recompute **effective Cooldown** / **effective potency** every wake; eligibility re-eval hook for future conditions; mid-charge `nextReadyAt` rewrite preserves progress fraction.
- **Catalog shapes**: An **Item** must have a **fire effect**, a **Passive**, or both. Six existing keys stay **fire-only**. Add `haste_charm` (**Passive**-only) and `vital_spark` (**hybrid**: heal 5 / 3000ms + own-seat heal **+2** flat potency).
- **`haste_charm` Passive**: seat target own; filter damage effect kind; −20% **Cooldown** (percent).
- **Random pool**: Uniform over all eight keys; three picks with replacement; no Passive-bearing caps; no fire-capable guarantee.
- **Passive schema (catalog)**: At most one **Passive** per **Item**. Fields cover seat target (`own` | `enemy` | `both`), recipient filter (`all` | effect kind), and one or more stat changes each `{ stat: cooldown | potency, mode: flat | percent, value: number }`.
- **Stacking**: Collect all eligible matching **Passive** changes per recipient slot/stat; `effective = (base × (1 + Σpercent)) + Σflat`; then clamp **Cooldown** ≥ 500ms, potency ≥ 0. Percents are summed as fractions (e.g. −20% → −0.2).
- **Self-include**: Carrier is a recipient when it matches its own seat target and filter; **Passive**-only carriers simply have no cooldown/potency to rewrite.
- **Sim behavior**: **Passive**-only slots omit `nextReadyAt` scheduling (or equivalent “never ready”); never appear in fires / **animation hint**s. Fire path reads effective potency; recharge uses effective **Cooldown**.
- **Shared resolver**: One pure module resolves effective stats from both seats’ **Loadout**s + catalog. Server sim and client presentation both call it (client display-only; server authoritative for outcomes and `nextReadyAt`).
- **Re-eval**: Expose a pure helper that, given prior effective **Cooldown**, progress (or last schedule), and new effective **Cooldown**, returns the rewritten `nextReadyAt`. Wire wake path to recompute effective stats each step; reserve explicit re-eval calls for future condition triggers (no conditions authored in this slice).
- **Presentation**: Extend Match **Loadout** slot presentation for **Passive**-only face (distinct glyph + short modifier cue, no bar), hybrid popover **Passive** line, and effective potency / **Cooldown** lines via the shared resolver. Do not add authored `rulesText` unless templates cannot express the two new cards.
- **Transport**: Prefer no new **Match update** fields for effective numbers in this slice (client can derive while **Passive**s are unconditional and **Loadout**s are fully visible). If match-start slot shape must represent **Passive**-only (e.g. nullable `nextReadyAt`), update validators accordingly without breaking ADR 0001’s update philosophy.
- **Confirmed test seams**:
  1. Pure effective-stats resolver (shared formula)
  2. `resolveMatchStep` (combat behavior with **Passive**s)
  3. Loadout slot presentation helper (**Passive**-only / hybrid / effective labels)

## Testing Decisions

- Good tests assert external behavior only: given **Loadout**s + catalog (+ time / seat order for combat), observe effective numbers, fires, `nextReadyAt`s, outcomes, or presentation model fields. Do not assert Vue DOM, Convex scheduler internals, or private helper names beyond the public seams.
- **Effective-stats resolver**: table-driven cases for seat targets, filters, flat vs percent, stacking order, clamps, self-include, duplicate carriers, **Passive**-only no-op recipients, enemy/both targets (even if first catalog keys only use own).
- **`resolveMatchStep`**: prior art — existing vitest suite beside the match engine. Add cases for `haste_charm` shortening damage recharge; `vital_spark` heal potency buff on own heals; **Passive**-only never firing; stacked duplicate charms; 500ms floor; mid-charge rescale helper / re-eval path when effective **Cooldown** changes.
- **Presentation helper**: prior art — loadout slot presentation tests. Cover **Passive**-only model (no cooldown bar fields / distinct kind), hybrid fire face + **Passive** sentence, effective values when a charm is present in the opposing or same **Loadout** input the helper needs.
- Do not require E2E or Convex integration tests for this slice; keep Convex as a thin schedule/persist edge over the pure engine.

## Out of Scope

- **Passive** conditions / eligibility triggers beyond the unconditional “carrier present” rule (hook only)
- Tag/key recipient filters beyond all / effect kind
- New combat verbs (on-fire extras, shields that also haste, etc.)
- Retrofitting **Passive**s onto the original six keys
- Shop, draft, persistent stash, or non-uniform pool rules (support slot, at-most-one Passive, fire guarantees)
- Base→effective breakdown UI or server-authored effective fields on every **Match update**
- Changing **Match time cap**, **Life total** start, **Shield** rules, or seat resolve order
- On-hit or non-cooldown fire triggers
- Spectators or loadouts larger than three

## Further Notes

- Domain glossary: `CONTEXT.md`. Timing architecture: ADR 0002 (builds on ADR 0001).
- Issue tracker for this repo is local markdown under `.scratch/` (see `docs/agents/issue-tracker.md`).
- Follow-up `/to-tickets` can split implementation into numbered issues under `.scratch/passive-items/issues/`.
- Related in-flight work: loadout slot presentation (icons + potency + popover) — Passive faces and effective labels should compose with that helper rather than fork a second slot UI.
- Loadout size is now five per seat (the out-of-scope “larger than three” line above was for this slice only).
