Status: ready-for-agent

# Spec: Loadout slot presentation (icons + potency + popover)

## Problem Statement

During a **Match**, both **Loadout**s are visible, but each slot mostly shows an **Item** name and a plain effect word (`damage` / `heal` / `shield`). **Potency** is hidden, so players cannot tell at a glance how hard an **Item** hits, heals, or shields. Mid-fight scanning across six slots is slow, and there is no place for richer effect wording when catalog entries get more complicated later.

## Solution

Rework each Match **Loadout** slot so the face reads as **effect icon + potency**, with the existing live **Cooldown** charge bar underneath. A popover (hover, focus, or tap) always exposes the **Item** name, a short effect sentence, and a **Cooldown** duration line. Effect-kind color ties icon, potency, and fire flash together so both seats’ **Loadout**s stay scannable. Popover copy is derived from catalog fields via templates until an **Item** needs authored exception text.

## User Stories

1. As a **Player**, I want each **Loadout** slot to show an effect-kind icon, so that I can tell damage, heal, and shield apart without reading labels.
2. As a **Player**, I want each **Loadout** slot to show **potency** as a number, so that I know how strong the effect is at a glance.
3. As a **Player**, I want the live **Cooldown** charge bar to remain on every slot, so that I still see when each **Item** will fire.
4. As a **Player**, I do not want a static **Cooldown** duration number on the slot face, so that the face stays sparse next to the live bar.
5. As a **Player**, I do not want the **Item** name as the primary face signal, so that kind + potency stay dominant mid-fight.
6. As a **Player**, I want both my **Loadout** and the opponent’s **Loadout** to use the same slot presentation, so that reading either seat is the same skill.
7. As a **Player**, I want damage **Items** to share one damage icon (e.g. bolt), so that spark and cannon differ by potency, not by competing glyphs.
8. As a **Player**, I want heal **Items** to share one heal icon (e.g. plus), so that salve and mend scan as the same kind.
9. As a **Player**, I want shield **Items** to share one shield icon, so that ward and bulwark scan as the same kind.
10. As a **Player**, I want icon and potency to use a fixed color per effect kind, so that shape and color reinforce each other across six slots.
11. As a **Player**, I want heal colors to echo the **Life total** bar hue, so that healing clearly relates to life.
12. As a **Player**, I want shield colors to echo the **Shield** bar hue, so that shielding clearly relates to the shield buffer.
13. As a **Player**, I want damage to use a distinct warm color unused by the bars, so that offense does not look like life or shield chrome.
14. As a **Player**, I want hovering a slot to open a popover, so that I can read details without cluttering the board.
15. As a **Player** on a touch device, I want tapping a slot to open the same popover, so that I am not locked to hover-only.
16. As a keyboard user, I want focusing a slot to open the same popover, so that details are reachable without a pointer.
17. As a **Player**, I want a second tap or click outside to dismiss a tap-opened popover, so that the board returns to a clean state.
18. As a **Player**, I want every catalog **Item** to have a popover in v1, so that “complicated later” does not mean a different interaction mode.
19. As a **Player**, I want the popover to show the **Item** name, so that I can identify spark vs cannon when faces look similar.
20. As a **Player**, I want damage popovers to say “Deal {n} damage”, so that the effect reads in plain language.
21. As a **Player**, I want heal popovers to say “Heal {n}”, so that healing magnitude is clear.
22. As a **Player**, I want shield popovers to say “Gain {n} shield”, so that shield gains are clear.
23. As a **Player**, I want the popover to include a **Cooldown** line like `Cooldown 2s` or `Cooldown 4.5s`, so that charge time is readable without face clutter.
24. As a **Player**, I do not want heal-cap or shield-before-life footnotes in every popover, so that simple **Items** stay short.
25. As a **Player**, I want the number in the effect sentence to match the face **potency**, so that hover never contradicts the glanceable value.
26. As a **Player**, I want a slot fire flash to use that **Item**’s effect-kind color, so that the **animation hint** beat matches the scan language.
27. As a **Player**, I want optimistic **Cooldown** fill behavior unchanged, so that presentation polish does not break timing feel.
28. As a **Player**, I want duplicate **Items** in a **Loadout** to each show their own icon, potency, bar, and popover, so that independent charges stay obvious.
29. As a developer, I want popover copy derived from `effect` + `potency` + `cooldownMs` + `name`, so that the catalog cannot drift from displayed text.
30. As a developer, I do not want an authored `rulesText` field until an **Item** needs wording templates cannot express, so that empty authoring fields do not rot.
31. As a developer, I want three local effect icons (no icon library), so that kind glyphs stay small and colorable.
32. As a developer, I want slot face layout to be icon + potency on top and the cooldown bar below, so that the scan path is consistent.
33. As a future catalog author, I want same kind + same potency to be allowed to share a face, so that we do not invent face differentiators before they are needed.
34. As a future catalog author, I want “complicated” to mean denser popover content (or a later override), not a new hover/tap mode, so that interaction stays stable.
35. As a **Player**, I want this rework only on Match **Loadout** slots, so that Lobby and other surfaces are not redesigned as fake shop cards.
36. As a domain reader, I want “item card” talk to mean **Loadout** slot presentation of an **Item**, so that we do not invent a new domain object.

## Implementation Decisions

- **Scope**: Visual rework of Match **Loadout** slots only. No shop, draft, inventory, or catalog browser. Domain language stays **Item** / **Loadout** slot; “item card” is casual UI talk only (see `CONTEXT.md` flagged ambiguity).
- **Respect ADR 0001**: Client still animates **Cooldown** from `nextReadyAt` and reconciles on **Match update**s; this work does not change sim transport or **animation hint** payload shape beyond using existing `kind` for flash color.
- **No schema / API changes**: Slots still resolve presentation from `itemKey` + catalog on the client. Server catalog fields remain `key`, `name`, `effect`, `potency`, `cooldownMs`.
- **Face**: Effect-kind icon + potency number on the top row; full-width live cooldown bar below; no name and no static cooldown duration on the face.
- **Icons**: One shared glyph per `ItemEffect` — damage = bolt/burst, heal = plus/cross, shield = shield shape — shipped as local inline SVGs (or a tiny local icon module). Do not add an icon library for this.
- **Colors**: Fixed kind colors on icon and potency; heal ≈ existing life bar green; shield ≈ existing shield bar blue; damage = distinct warm hue not used by those bars. Keep saturation modest so bars and flash remain readable.
- **Fire flash**: When an **animation hint** lands, the firing slot flashes using that hint’s effect-kind color (not the generic accent-only flash).
- **Popover triggers**: Same content on pointer hover, keyboard focus, and tap; dismiss tap/focus overlays via second tap or outside interaction as appropriate for the chosen lightweight pattern. No popover library required if a small local pattern suffices.
- **Popover content (v1)**:
  - Title: **Item** `name`
  - Effect sentence from templates: damage → `Deal {potency} damage`; heal → `Heal {potency}`; shield → `Gain {potency} shield`
  - Cooldown line: `Cooldown {seconds}` where whole seconds omit `.0` (`2s`) and fractional values keep needed precision (`4.5s`)
- **Copy source**: Derive all of the above in a pure presentation helper from catalog fields. Do not add authored `rulesText` (or similar) until a future **Item** cannot be expressed by the three templates.
- **Identical faces**: Accept that two different future **Items** with the same kind + potency may look identical on the face; identity and extra rules live in the popover (and bar timing mid-fight).
- **Modules**: Add a pure Match presentation helper that maps catalog fields → face/popover model (effect kind, potency, sentences, cooldown line, kind color token). Update the Match **Loadout** slot UI to render that model, host the three icons, apply kind colors, wire popover triggers, and kind-colored flash. Leave the match engine and Convex match mutations untouched.
- **Confirmed test seam**: Single primary seam — the pure presentation helper described above. Vue remains a thin binding/animation layer and is not the automated test surface for copy/formatting rules.

## Testing Decisions

- Good tests assert external presentation behavior only: given catalog-like inputs, the helper returns the expected kind, potency, effect sentence, and cooldown line. Do not assert Vue class names, SVG path data, or popover DOM structure.
- Test the presentation helper module (one seam). Do not add Convex or `resolveMatchStep` tests for this feature; combat rules are unchanged.
- Cover at least: each effect template; cooldown formatting for whole and fractional seconds (e.g. 2000 → `Cooldown 2s`, 4500 → `Cooldown 4.5s`); potency echoed into both face value and sentence; unknown/missing catalog keys handled safely if the helper is responsible for fallbacks.
- Prior art: vitest pure-module tests alongside the match engine (`resolveMatchStep` style) — table-driven cases, no component harness.

## Out of Scope

- Shop, draft, inventory, or reusable “card” surfaces outside Match **Loadout**s
- Authored per-item rules text / `rulesText` catalog field
- Unique per-item face art or face initials
- Changing **Item** combat rules, catalog potencies/cooldowns, or **Match update** / **animation hint** contracts
- Icon library dependency
- Vue component snapshot/E2E tests for popover chrome
- Lobby UI redesign
- Accessibility audit beyond basic focus/tap reachability for the popover
- Formal color-token design system beyond the three kind hues needed here

## Further Notes

- Glossary terms to prefer: **Item**, **Loadout**, **Cooldown**, **potency**, **Life total**, **Shield**, **Match**, **animation hint**. Avoid introducing **Card** as a domain type.
- When the first catalog entry needs wording the templates cannot express, add an optional override field then — and treat “complicated” as denser popover content, not a new interaction.
- No ADR for this work: presentation choices are reversible and unsurprising once documented in this spec.
