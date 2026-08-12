# Surface brief — whole app Scenario Broadcast

<!-- impeccable:surface-brief -->

## Scope & mode

- **Surfaces:** Home, Join, Lobby (Session), Match phases (Weapon / Draft / Fight / Results)
- **Mode:** Operate
- **Direction:** Scenario Broadcast Crawl (seed `a8895c5c`)
- **Approved comp:** `.impeccable/mocks/comp-dual-seat-stage.png` (Dual-seat on-air stage)

## Audience / job

Two friends share a Session, draft Weapon + Boons, watch the authoritative auto-fight. Success = complete the Match loop without inventing outcomes.

## Chosen direction & memorable moment

Whole app reads as one on-air Scenario channel. Memorable moment: Draft as a center **SELECT** stack of numbered system boxes between equal West/East seat windows, with a phosphor crawl under the stage.

## Composition commitments (from approved comp)

| Ingredient | Medium |
|---|---|
| Channel header (Heiyuki + phase + ON AIR) | semantic HTML/CSS |
| Three-column Match stage (West / SELECT / East) | CSS grid |
| Bracketed panel chrome, double-line borders | CSS + SVG corners |
| Segmented Life / Shield meters | CSS/SVG (not solid bars only) |
| Weapon name + line icon | CSS + authored SVG |
| Loadout 5-slot strip | existing `MatchLoadoutSlot` restyled |
| Numbered Boon/Weapon offer rows | semantic buttons, system-box chrome |
| Bottom scenario crawl | CSS; motion = crawl/marquee respecting reduced-motion |
| Home / Join / Lobby shared chrome | same tokens + channel header/crawl grammar |
| Draft timer (in comp) | **omit** — product has no pick timers |
| Decorative fake Greek noise / viewer bitrate | **omit** — not product truth |
| Primary CTA (Start Match, pick offer) | amber lamp accent on CTA only; ORV system blue phosphor elsewhere |

## Type

- Display / channel: condensed grotesk (self-host; not Cinzel; avoid Inter/Space Grotesk/Fraunces cluster)
- UI / body: quiet grotesk companion
- Crawl: slightly tighter tracking condensed caps

## Palette (locked)

`#07090e` ground · `#5eb8ff` ORV system blue phosphor · `#f0c878` amber lamps/CTA · `#e8eef4` ice text · `#c45c2a` fight-hit flash only

## Unresolved

- Exact self-hosted font pair (Phillip picks from fontsource, matching condensed broadcast silhouette)
- Whether Results beat uses crawl victory line or full dual-seat freeze

## Do not

- Ship kylix/tondo/frieze class names as the visual system
- Invent Draft timers, spectator counts, or bitrate telemetry
- Keep Lobby on the legacy light shell
