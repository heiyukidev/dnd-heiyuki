# User Story: Match Loadout slot presentation (icons + potency + popover)

## Context
As a: Player

I want to: Scan Match Loadout slots by effect-kind icon and potency, with a popover for name / effect sentence / cooldown duration

So that: Mid-fight I can tell how hard each Item hits, heals, or shields without reading names, while still reading details on demand

## Functional Information
*Scope*: Match panel Loadout slots in `SessionView.vue` only (both seats). No Lobby, shop, draft, inventory, catalog browser, schema, API, or combat-rule changes.

*Trigger*: Match / results UI renders Loadout slots; pointer hover, keyboard focus, or tap opens the slot popover; animation hints trigger kind-colored fire flash.

*Interface*:
- Slot face: effect-kind icon + potency number on top row; full-width live cooldown bar below. No Item name and no static cooldown duration on the face.
- Popover (hover / focus / tap): Item name, templated effect sentence, cooldown line (`Cooldown 2s` / `Cooldown 4.5s`). Second tap or outside interaction dismisses tap-opened popover.
- Colors: icon + potency + flash share a fixed hue per effect kind (heal ≈ life bar `#3a8f5a`, shield ≈ shield bar `#4a7bbd`, damage = distinct warm hue unused by bars).
- Both seats use identical presentation.

*Business Rules*:
1. Presentation is derived client-side from `itemKey` + local `ITEM_CATALOG` (`name`, `effect`, `potency`, `cooldownMs`). No new catalog fields / no `rulesText`.
2. Effect sentences: damage → `Deal {n} damage`; heal → `Heal {n}`; shield → `Gain {n} shield`. Face potency and sentence number must match.
3. Cooldown line formats whole seconds without `.0`; fractional seconds keep needed precision.
4. One shared glyph per `ItemEffect` (damage bolt, heal plus, shield shape) as local inline SVGs — no icon library.
5. Fire flash uses animation hint `kind` color (payload shape unchanged; ADR 0001 preserved). Optimistic cooldown fill behavior unchanged.
6. Duplicate Items each keep independent face / bar / popover.
7. Unknown / missing catalog keys handled safely in the presentation helper fallbacks.
8. Domain language stays Item / Loadout slot; “item card” is casual UI talk only.

## Acceptance Criteria

*Given that* a Match Loadout slot has a known catalog Item, *then* the face shows that effect’s icon and potency (not the name or static cooldown duration), with the live cooldown bar underneath.

*Given that* the player hovers, focuses, or taps a slot, *then* a popover shows the Item name, the correct effect sentence for its kind/potency, and a correctly formatted Cooldown line.

*Given that* an animation hint fires for a slot, *then* that slot flashes using the hint’s effect-kind color (not the generic accent-only flash).

*Given that* catalog-like inputs are passed to the pure presentation helper, *then* vitest asserts kind, potency, effect sentence, and cooldown line (including whole and fractional seconds and safe fallbacks) — Vue DOM/SVG paths are not the test surface.

*Given that* Lobby / Convex match mutations / resolveMatchStep / catalog schema are unchanged, *then* this work only touches Match presentation modules and SessionView slot UI.

## Implementation phases

### Phase 1 — Pure presentation helper + tests
- Add `src/match/loadoutSlotPresentation.ts`: map catalog fields (or itemKey + catalog) → face/popover model (effect kind, potency, effect sentence, cooldown line, kind color token).
- Add `src/match/loadoutSlotPresentation.test.ts` (table-driven vitest, resolveMatchStep style).
- Cover: three effect templates; cooldown `2000` → `Cooldown 2s`, `4500` → `Cooldown 4.5s`; potency echoed in face + sentence; unknown/missing key fallbacks.

### Phase 2 — Match slot UI (icons, colors, popover, kind flash)
- Add three local effect icons (`src/match/effectIcons.ts` or inline in a small Match slot component).
- Rework Match Loadout slots in `SessionView.vue` (optionally extract `MatchLoadoutSlot.vue` if markup grows): icon + potency face, kind colors, popover triggers, kind-colored flash from existing `animationHints[].kind`.
- Keep optimistic cooldown bar behavior; leave Lobby and engine/Convex untouched.
