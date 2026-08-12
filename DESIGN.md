---
name: Heiyuki — Scenario Broadcast Crawl
description: Whole-app on-air Scenario channel — matte broadcast black, phosphor chrome, amber lamps, ice text.
colors:
  ground: "#07090e"
  phosphor: "#5eb8ff"
  amber: "#f0c878"
  ice: "#e8eef4"
  ice-dim: "#9aacbf"
  coral: "#c45c2a"
  panel: "#0b101a"
  panel-lift: "#101522"
  rarity-common: "#9aa3ad"
  rarity-uncommon: "#72b072"
  rarity-rare: "#6a9ec8"
  rarity-epic: "#a082c8"
  rarity-legendary: "#d8924a"
typography:
  display:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
  headline:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.04em"
  title:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.04em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.02em"
  label:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  crawl:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  chrome: "2px"
  lamp: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "color-mix(in srgb, {colors.amber} 14%, {colors.panel})"
    textColor: "{colors.amber}"
    rounded: "{rounded.chrome}"
    padding: "8px 14px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "color-mix(in srgb, {colors.amber} 22%, {colors.panel})"
    textColor: "{colors.amber}"
  button-default:
    backgroundColor: "{colors.panel-lift}"
    textColor: "{colors.ice}"
    rounded: "{rounded.chrome}"
    padding: "8px 14px"
  button-ghost:
    backgroundColor: "{colors.panel-lift}"
    textColor: "{colors.ice-dim}"
    rounded: "{rounded.chrome}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.panel-lift}"
    textColor: "{colors.ice}"
    rounded: "{rounded.chrome}"
    padding: "8px 14px"
  input-field:
    backgroundColor: "{colors.panel-lift}"
    textColor: "{colors.ice}"
    rounded: "{rounded.chrome}"
    padding: "8px 10px"
  panel-broadcast:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ice-dim}"
    rounded: "{rounded.chrome}"
    padding: "14px 16px"
  chip-tag:
    backgroundColor: "transparent"
    textColor: "{colors.ice-dim}"
    rounded: "{rounded.chrome}"
    padding: "2px 6px"
---

# Design System: Heiyuki — Scenario Broadcast Crawl

## Overview

**Creative North Star: "Scenario Broadcast Crawl"**

Heiyuki reads as one on-air Scenario channel end to end. Home, Join, Lobby, and Match share the same matte black ground, phosphor system chrome, amber alert lamps, and ice typography — not a Match-only skin over a light lobby shell. The memorable frame is the dual-seat stage: West seat window, center SELECT stack, East seat window, with a condensed phosphor crawl docked at the bottom.

Density is instrument-panel tight: numbered offer rows, segmented Life/Shield meters, channel-bug headers, and L-bracketed panels. Greek gods stay first-class on Boon offers (name + seal treatment), never as pottery chrome or a TFT shop HUD. Depth comes from tonal panel lifts and phosphor border mixes, not soft card shadows.

**Key Characteristics:**
- Whole-app channel continuity (header bug + crawl + panel grammar everywhere)
- ORV system blue phosphor for system chrome; amber reserved for lamps and CTAs
- Coral reserved for fight-hit flash only
- Condensed broadcast caps (Barlow Condensed) + quiet UI grotesk (Barlow)
- Near-square 2px chrome; L-bracket panel corners
- Segmented meters and numbered SELECT offers as signature instruments

## Colors

Matte broadcast black with cold phosphor readouts, warm amber lamps, and ice body — coral is a hit strobe, not UI chrome.

### Primary
- **Phosphor / ORV System Blue** (`#5eb8ff`): System chrome — borders (mixed), channel phase labels, field labels, meter fills, links, focus rings, offer numbers, god-name lines. The voice of the console.
- **Amber Lamp** (`#f0c878`): ON AIR lamps, primary CTAs, crawl accents, gold/spend emphasis, results verdict. Rare on purpose.

### Secondary
- **Ice Bright** (`#e8eef4`): Headings, emphasis, player names, input text, filled meter values.
- **Ice Dim** (`#9aacbf`): Default body/meta text on ground and panels.

### Tertiary
- **Coral Hit** (`#c45c2a`): Fight-hit loadout flash only. Never buttons, errors, or borders as a general accent.
- **Rarity ramp** (common `#9aa3ad` → uncommon `#72b072` → rare `#6a9ec8` → epic `#a082c8` → legendary `#d8924a`): Weapon/Boon offer border and tag tint only.
- **Effect kind ramp** (damage `#4588be` → heal `#3a8f5a` → shield `#5a9fd4`; passive `#3d78a8`): Offer/loadout `--offer-kind` tint only — cooler ORV-blue family, never coral or violet chrome.

### Neutral
- **Broadcast Ground** (`#07090e`): Page and shell background.
- **Panel** (`#0b101a`): Channel panels, crawl bed, code chips.
- **Panel Lift** (`#101522`): Interactive surfaces — buttons, inputs, offer rows, loadout slots, meter empty segments.

Borders are not solid hex: default border mixes phosphor at 50% into transparent (~3:1 vs ground); strong border at 60%. Accent washes mix amber or phosphor at ~8–14% into panel/ground.

### Named Rules
**The Coral Hit-Only Rule.** Coral appears only as fight-hit flash on loadout slots. Errors use ice text on a faint coral-tinted panel wash — never coral fills as buttons.

**The Amber Lamp Rule.** Amber is for ON AIR lamps, CTA borders/fills, crawl accent items, and gold/verdict emphasis. Phosphor owns everyday system chrome.

**The Phosphor Chrome Rule.** If it is a border, focus ring, meter segment, channel label, or SELECT index number, it is phosphor (or a phosphor mix) unless rarity or amber lamp applies.

## Typography

**Display Font:** Barlow Condensed (system-ui fallback) — channel bug, phase labels, crawl, buttons, field labels, offer indices, god lines.
**Body Font:** Barlow (system-ui fallback) — body copy, offer detail, seat meta.
**Mono Font:** ui-monospace / SF Mono / Consolas — join tokens, code chips.

**Character:** Condensed caps feel like a Scenario channel bug and lower-third crawl; Barlow body stays quiet so instruments and SELECT numbers carry hierarchy. Self-hosted via `@fontsource/barlow-condensed` (500/600/700) and `@fontsource/barlow` (400/500/600).

### Hierarchy
- **Display / channel bug** (700, ~1.05rem, 0.12em tracking, uppercase): `HEIYUKI` brand bug; denser tracking than headlines.
- **Headline** (600, 2rem / 1.6rem ≤1024px, 0.04em, uppercase): Greenroom and Lobby titles.
- **Title** (600, 1.1rem, 0.04em, uppercase): Panel section heads (`h2`).
- **Body** (400, 17px / 16px ≤1024px, 145% line-height, 0.02em): Default UI copy.
- **Label** (600, 0.72–0.78rem, 0.06–0.08em, uppercase): Field labels, meter labels, seat labels, button text.
- **Crawl** (600, 0.72rem, 0.1em, uppercase): Bottom scenario crawl items.

### Named Rules
**The Condensed Caps Rule.** Channel chrome, buttons, labels, and crawl are Barlow Condensed uppercase with open tracking. Do not use Cinzel, Inter, Space Grotesk, Fraunces, or serif “museum” display faces.

**The Quiet Body Rule.** Body stays Barlow at ice-dim; display condensed does the shouting so the stage does not fill with competing headlines.

## Layout

The shell is a full-viewport column: optional channel header, flex main, optional crawl footer. Match play owns the full main and docks its own crawl.

- **Greenroom / Join:** Centered stage max-width 720px (Home) / 640px (Join), padding 24×16.
- **Lobby:** Narrow body max-width 720px, 16px padding.
- **Match stage:** CSS grid — single column stacked (West → Center SELECT → East) below 900px; three columns `1fr | minmax(280px, 1.1fr) | 1fr` at ≥900px.
- **Channel header:** Three-column grid `1fr auto 1fr` — brand+phase | session chip | status (ON AIR).
- **Rhythm:** Prefer 8 / 12 / 16 / 24. Instrument gaps inside seats and offer stacks use 6–12.
- **Loadout:** Five equal columns, 6px gap.

### Named Rules
**The Dual-Seat Stage Rule.** Match composition is West seat | SELECT center | East seat under one channel header, crawl docked bottom. Do not collapse into a shop grid or circular tondo arena.

## Elevation & Depth

Flat tonal layering. Surfaces sit on ground → panel → panel-lift. Borders (phosphor mixes) define edges. Glow is reserved for live signal: ON AIR lamp, filled meter segments, fight-hit flash. Soft drop shadows appear only on loadout popovers (`0 4px 16px` ground wash).

### Shadow Vocabulary
- **Lamp glow** (`0 0 8px` amber ~70% mix): ON AIR indicator only.
- **Meter charge** (`0 0 4px` phosphor or amber ~40% mix): Filled Life/Shield segments.
- **Hit strobe** (`0 0 12px` coral ~40% mix): Loadout flash during fight.
- **Popover lift** (`0 4px 16px` ground ~60% mix): Loadout tooltip only.

### Named Rules
**The Flat Console Rule.** No ambient card shadows. Depth is panel lift + phosphor border; glow means “on air” or “hit,” not decoration.

## Shapes

Near-square broadcast chrome: **2px** radius on buttons, inputs, code chips, and interactive rows. Panels themselves are square with **L-bracket corners** (10×10 phosphor corner marks via `::before` / `::after` on opposite corners). ON AIR lamp is a **7px circle**. Tags and offers are hard-edged rectangles with 1px phosphor/rarity borders — not pills.

### Named Rules
**The Bracket Panel Rule.** Recurring containers use `.broadcast-panel` grammar: panel fill, strong phosphor border, L-brackets on opposite corners. Do not invent kylix rim shells, elliptical tondos, or frieze class names.

**The No-Pill Rule.** Capsules and large radii are out. Interactive chrome stays 2px; lamps alone are round.

## Components

### Buttons
- **Shape:** 2px radius; 1px border; condensed uppercase label (0.78rem, 0.06em).
- **Default:** Panel-lift fill, ice text, strong phosphor border.
- **CTA (primary):** Amber border + amber text on amber-tinted panel (~14%); hover lifts wash to ~22%.
- **Ghost:** Softer phosphor border, ice-dim text.
- **Danger:** Coral-mixed border (~50% into border), ice text — for archive/cancel, not coral fill.
- **Compact:** 4×10 padding, 0.72rem — Soul spend steppers.
- **Focus:** 2px phosphor outline, 2px offset. Disabled at 0.45 opacity.
- **Motion:** Background/border 120ms ease; honor `prefers-reduced-motion`.

### Chips / Tags
- **Style:** Transparent fill, 2×6 padding, uppercase 0.68rem; border mixes offer-kind or rarity color.
- **Use:** Boon mode/effect/weapon-gate tags and rarity labels — not filter chips.

### Cards / Containers
- **Broadcast panel:** Panel background, strong border, 14×16 padding, L-brackets — Home, Join, Lobby, seat windows.
- **Offer row:** Full-width system box (panel-lift, strong border, 12×14 padding); numbered SELECT index in phosphor; hover washes with `--offer-kind` or phosphor.
- **Status / banner:** Phosphor or amber wash on panel; warn variant uses amber mix.
- **Error:** Ice text; coral ~8% wash + coral-mixed border — not coral button chrome.
- **Shadow:** None at rest (see Elevation).

### Inputs / Fields
- **Label:** Condensed uppercase phosphor above the control.
- **Field:** Panel-lift, strong border, 2px radius, 8×10 padding, ice text.
- **Focus:** Phosphor outline, 1px offset.

### Navigation / Channel chrome
- **Channel bug:** Condensed 700 ice; hover → phosphor; focus-visible phosphor outline.
- **Phase line:** Condensed phosphor (`MAIN SCENARIO — …`).
- **Session chip:** Quiet ice-dim center (`CHANNEL 07090E` / session title).
- **ON AIR:** Amber condensed + circular amber lamp with glow.
- **Crawl:** Panel bed, strong top border, uppercase condensed items separated by `|`; marquee 40s linear when motion allowed; static wrap when reduced-motion or greenroom.

### Segmented meters (signature)
- **Layout:** Grid `3.5rem | 1fr | auto` — label | track | tabular value.
- **Track:** 20 equal segments, 2px gaps, 10px tall; empty = phosphor wash on panel-lift; filled Life = phosphor + glow; filled Shield = amber + glow.
- **Label:** Condensed uppercase phosphor.

### Loadout slots (signature)
- **Shape:** Panel-lift cells, strong border, five-across strip; index numeral top-left.
- **Flash:** Coral (or kind flash color) border/wash/glow on hit.
- **Cooldown:** 4px phosphor fill bar, transform origin left, 80ms linear.
- **Popover:** Panel above slot with strong border and popover lift shadow.

### Named Rules
**The Numbered SELECT Rule.** Weapon and Boon picks are a vertical stack of numbered system boxes in the center column — not a bordered card grid or shop carousel.

**The Segmented Instrument Rule.** Life and Shield read as discrete phosphor/amber segments, not a single smooth bar fill.

## Do's and Don'ts

### Do:
- **Do** keep Home, Join, Lobby, and Match on the same ground/panel/phosphor/amber token set and channel header + crawl grammar.
- **Do** reserve amber for lamps and CTAs; phosphor for everyday chrome.
- **Do** use Barlow Condensed uppercase for channel chrome and Barlow for body.
- **Do** build panels with L-brackets and 2px interactive chrome.
- **Do** flash fight hits with coral only; keep god names first-class on Boon offers.
- **Do** respect `prefers-reduced-motion` (static crawl, no offer/slot transition).

### Don't:
- **Don't** revive Kylix Tondo Arena tokens, Cinzel/Source Sans, rim shells, friezes, or elliptical tondos.
- **Don't** use coral as a general accent (buttons, links, idle borders).
- **Don't** ship soft card elevation, large radii, or pill clusters.
- **Don't** invent Draft timers, spectator counts, bitrate telemetry, or decorative fake Greek noise as chrome.
- **Don't** put Lobby or Home back on a light legacy shell separate from the broadcast channel.
