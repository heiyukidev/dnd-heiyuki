# User Story: Loadout Item Passives

## Context
As a: Player

I want to: Equip fire-only, Passive-only, and hybrid Items whose Passives rewrite matching Items' Cooldown and/or potency

So that: Support tempo/strength fantasy works in Match without a shop, and the UI shows effective stats plus a distinct Passive-only face

## Functional Information
*Scope*: Catalog + types, shared effective-stats resolver, `resolveMatchStep` / Convex match start + validators, Match Loadout slot presentation (compose with in-flight `loadoutSlotPresentation` / `MatchLoadoutSlot`). No shop, draft, Passive conditions, new combat verbs, or Match time-cap / seat-order changes.

*Trigger*: Host starts a Match (eight-key uniform pool); live wakes recompute effective stats; client derives face/popover labels from both Loadouts + catalog.

*Interface*:
- Passive-only slots: distinct glyph + short modifier cue; no charge bar; no fire flash.
- Hybrid slots: keep fire face (icon + effective potency + charge bar); Passive wording in popover.
- Fire-capable faces/popovers: show effective Cooldown / potency (shared resolver).
- Optimistic bars still follow server `nextReadyAt` (ADR 0001).

*Business Rules*:
1. An Item has a fire effect, a Passive, or both. Six existing keys stay fire-only. Add `haste_charm` (Passive-only: own-seat damage −20% Cooldown) and `vital_spark` (hybrid: heal 5 / 3000ms + own-seat heal +2 flat potency).
2. At most one Passive per Item. Schema: seat target `own` | `enemy` | `both`; filter `all` | effect kind; one or more `{ stat: cooldown | potency, mode: flat | percent, value }`.
3. Stacking: `effective = (base × (1 + Σpercent)) + Σflat`; then Cooldown ≥ 500ms, potency ≥ 0. Percents as fractions (−20% → −0.2). Duplicate carriers each contribute; self-include when carrier matches.
4. Match start: three picks with replacement from all eight keys; Passive-only slots omit / never schedule `nextReadyAt`; no Passive caps or fire guarantees.
5. Sim: Passive-only never fires / never appears in animation hints; fire path uses effective potency; recharge uses effective Cooldown; recompute every wake (ADR 0002); mid-charge rewrite preserves progress fraction; expose eligibility re-eval helper for future conditions (no conditions authored).
6. Shared pure resolver used by sim and UI; prefer no new Match-update effective fields.
7. Heal still caps at 100 Life total on apply; same-timestamp resolve order and time-cap/Draw unchanged.
8. Lodash for array/object transforms; tests assert public seams only.

## Acceptance Criteria

*Given that* both seats' Loadouts and the catalog are known, *then* the shared resolver returns clamped effective Cooldown / potency per fire-capable slot for seat targets, filters, flat/percent stacking, self-include, duplicates, and Passive-only no-ops.

*Given that* a seat has `haste_charm` and damage Items, *then* those damage Items recharge on −20% effective Cooldown (floored at 500ms), and Passive-only slots never fire or emit animation hints.

*Given that* a seat has `vital_spark` and other heal Items, *then* `vital_spark` heals 5 every 3.0s and own-seat heal potency is +2 flat (including self when matching).

*Given that* Match start rolls Loadouts, *then* picks are uniform over eight keys with replacement, and Passive-only slots have no scheduled `nextReadyAt`.

*Given that* effective Cooldown changes mid-charge, *then* `nextReadyAt` is rewritten preserving progress fraction via the public re-eval helper.

*Given that* a Passive-only / hybrid / fire-only slot is presented with both Loadouts as input, *then* the presentation helper yields Passive-only face (no bar fields), hybrid fire face + Passive sentence, and effective potency/Cooldown labels.

*Given that* existing fire-only fights run without Passive carriers, *then* behavior matches prior base catalog stats (regression via `resolveMatchStep` tests).

## Implementation phases

### Phase 1 — Types, catalog, shared effective-stats resolver + tests
- Extend `ItemDefinition` / catalog for optional fire fields + optional `passive` block; keep six fire-only; add `haste_charm` and `vital_spark`; expand `ITEM_KEYS` to eight.
- Make `LoadoutSlot.nextReadyAt` optional (Passive-only).
- Add pure module (e.g. `src/match/effectiveStats.ts`): resolve effective Cooldown/potency from both seats' Loadouts + catalog; add mid-charge `nextReadyAt` rewrite helper.
- Table-driven vitest: seat targets, filters, flat/percent, stacking, clamps, self-include, duplicates, Passive-only recipients, enemy/both.

### Phase 2 — `resolveMatchStep` + Convex roll / validators
- Wire every wake to recompute effective stats; fire/recharge use effective values; skip Passive-only from ready collection, wakes, fires, hints.
- Call progress-fraction rewrite when effective Cooldown changes (wake path + exported re-eval hook).
- Update `rollLoadoutSlots` / `earliestWakeAt` for optional `nextReadyAt`; Convex `loadoutSlotValidator` optional `nextReadyAt`.
- Extend `resolveMatchStep.test.ts` per Testing Decisions (haste, vital_spark, Passive-only never fires, stacked charms, 500ms floor, mid-charge rescale).

### Phase 3 — Presentation helper + Match UI
- Extend `loadoutSlotPresentation` for Passive-only kind/face fields, hybrid Passive popover line, effective labels via shared resolver (needs both Loadouts + seat/slot context).
- Update `MatchLoadoutSlot.vue` / `SessionView.vue`: no bar on Passive-only; pass opposing+own Loadouts for effective derivation; no fake flash for Passive-only.
- Extend presentation tests; keep optimistic bar tied to server `nextReadyAt` for fire-capable slots.
