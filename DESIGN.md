# Heiyuki Match — Kylix Tondo Arena

Design system for Match-phase UI (Weapon pick, Draft, live fight, Results). Lobby and Home use the legacy light shell; Match phases use the kylix token set scoped under `.kylix-match`.

**Form:** Kylix Tondo Arena (cool-blue steer) · seed `8ce5babf`

## Thesis

Match is a cool-blue Attic kylix — a circular tondo fight stage inside a rim run-shell. Draft is the Olympian exterior frieze. Refuse TFT shop HUD and warm museum-ochre kitsch.

## Palette

| Token                   | Value     | Use                                            |
| ----------------------- | --------- | ---------------------------------------------- |
| `--kylix-ground`        | `#070b14` | Slip ground, page background                   |
| `--kylix-ice`           | `#c5d4e8` | Body text, figures, offer effect lines         |
| `--kylix-ice-bright`    | `#e8eef7` | Headings, emphasis, cooldown fill              |
| `--kylix-ice-secondary` | `#a3b4c9` | Rim subtitle/meta, cooldown labels (≥4.5:1)    |
| `--kylix-rim`           | `#7a8fa6` | Borders, rim chrome                            |
| `--kylix-bronze`        | `#5a6d82` | Handle accents, depth                          |
| `--kylix-god`           | `#6b4a72` | God seals, danger/error chrome, passive tint   |
| `--kylix-coral`         | `#e85d3a` | Fight-hit flash only — never errors or buttons |
| `--kylix-life`          | `#3d6b8a` | Life total rim band                            |
| `--kylix-shield`        | `#4a6080` | Shield rim band                                |

Body text on ground meets ≥4.5:1 contrast (`#c5d4e8` on `#070b14`).

## Typography

- **Display / inscribed:** Cinzel — phase titles, seat labels, frieze god names, god seals
- **UI / quiet grotesk:** Source Sans 3 — stats, offers, buttons, meta
- Self-hosted via `@fontsource/cinzel` and `@fontsource/source-sans-3` in `src/main.ts`
- Banned cluster avoided (Inter, Roboto, Fraunces, Playfair, Space Grotesk, etc.)

## Composition

```
┌─────────────────────────────────────────────┐
│  ○ rim shell — handles, title, cancel, crumbs │
├─────────────────────────────────────────────┤
│  instruments: Soul panel · Weapon panel       │
├─────────────────────────────────────────────┤
│  frieze band — Weapon / Boon offer targets    │
│  (god seal + label on Boon offers)            │
├─────────────────────────────────────────────┤
│         ╭─────────────────────╮               │
│         │   tondo fight arena  │              │
│         │  seat W  │  seat E   │              │
│         │  Life/Shield bands   │              │
│         │  loadout slots       │              │
│         ╰─────────────────────╯               │
└─────────────────────────────────────────────┘
```

- **Rim shell:** `.kylix-rim-shell` — bronze handles, elliptical rim header, session crumbs
- **Frieze:** `.kylix-frieze` — god-first header (hero seal + name), divider-separated offer row (not bordered card grid)
- **Tondo:** `.kylix-tondo` — elliptical ring, dual opposed seats at ≥720px; empty fallback when seats not yet loaded
- **Life / Shield:** `.kylix-rim-band` — `role="progressbar"` with aria-valuenow/min/max; scaleX fills

## Motion

One authored family:

1. **Frieze press** — `.kylix-offer:active` scale 0.98
2. **Tondo fire flash** — `.slot.flash` coral glow on `MatchLoadoutSlot`
3. **Charge fill** — cooldown `scaleX` on slot bars

All respect `prefers-reduced-motion: reduce`.

## Craft rules

- Familiar buttons with focus rings; no glass, gradient text, eyebrow kickers, nested cards
- Domain vocabulary unchanged (Soul, Weapon, Draft, Boon, God, Life total, etc.)
- Greek gods first-class via frieze seals — not TFT shop tiles
- Draft Boon offers encode taxonomy like fight slots: `kindColor` on icons + tag borders only (`LOADOUT_EFFECT_KIND_COLORS` damage `#8a7898` cool steel-lavender, heal green, shield blue; passive `#6b4a72` god purple); body/detail copy stays ice; never `--kylix-coral` for static chrome
- Fight-hit slot flash is always `--kylix-coral` (`#e85d3a`) — separate from static kind taxonomy
- Desktop-first (≥720px dual-seat); mobile stacks without losing tondo readability

## Files

| File                                  | Role                                        |
| ------------------------------------- | ------------------------------------------- |
| `index.html`                          | Direction contract comment                  |
| `src/main.ts`                         | Self-hosted Cinzel + Source Sans 3 imports  |
| `src/views/SessionView.vue`           | Kylix layout for weapon/draft/match/results |
| `src/components/MatchLoadoutSlot.vue` | Tondo slot styling + flash                  |
| `PRODUCT.md`                          | Brand commitment for Match direction        |
