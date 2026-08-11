# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two authenticated friends (or playtest partners) who want a short shared multiplayer auto-battler match — host creates a Session, a second player joins by link and approval, then both draft and watch the fight. The long-term audience is multiplayer auto-battler players in the TFT / Auto Chess family; the shipped prototype is still the 2-seat path toward that.

## Product Purpose

Heiyuki (working UI label; name not locked) is a multiplayer auto-battler: players draft a fight identity, then the server runs the battle. Success today means two seats can complete Weapon pick → Boon Draft → live auto-fight → Lobby rematch without clients inventing outcomes. Success later means growing toward a fuller multiplayer auto-battler (more seats, richer meta) without abandoning authoritative server sim and draft-before-fight.

## Positioning

Draft a god-affiliated Loadout around a rolled Soul and a picked Weapon, then watch an authoritative auto-fight — not turn-based D&D combat, not a lobby shop, not a client-owned sim or precomputed replay. Neighboring auto-battlers share “draft then auto-fight”; this product’s mechanism is Greek-god Boon pools, Weapon-gated offers, Soul soft guidance, and live server Match updates with animation hints.

## Operating Context

- Authenticated web app (Clerk) with live backend state (Convex).
- Host creates a Session, shares a Join link, approves a Join request; Lobby when idle; Host starts Matches and may Match-cancel or archive the Session from Lobby.
- Match flow: Soul + Gold roll → simultaneous Weapon pick (1 of 3) → simultaneous hidden Draft (5 Boon picks, then Gold Soul bumps) → event-driven live fight → short results beat → Lobby.
- Domain vocabulary and rules live in `CONTEXT.md` and ADRs under `docs/adr/`; Boon tables in `local/greek-gods/boon-catalog.md`.

## Capabilities and Constraints

- Prototype: exactly two fighting seats; no spectators; no solo/bot Match; no Draft pick timers/rerolls in this slice.
- Match-scoped Soul, Gold, Weapon, Loadout, and God pool — cleared on Match end or Match cancel; not account-persistent yet.
- God catalog (v1): Hermes, Ares, Apollo, Athena, Zeus — seven Boons each.
- Clients subscribe to Match updates; they do not run the rules sim.
- Open product direction: grow toward a TFT/Auto Chess–scale multiplayer auto-battler; seat count, economy, and progression beyond this prototype are undecided.
- Product display name is **not locked** (UI currently says “Heiyuki”; repo/title still carry `dnd-heiyuki`).
- Visual UI is intentionally due for a full style rehaul; incumbent screens are functional evidence, not a locked brand system.

## Brand Commitments

- Working label in UI: “Heiyuki” — provisional only; do not treat as final product name.
- Domain language from `CONTEXT.md` is binding for product copy (Session, Host, Player, Match, Soul, Weapon, Draft, Boon, God, Loadout, etc.); retired D&D sheet / battle-map vocabulary stays retired.
- **Match visual direction:** cool-blue **Kylix Tondo Arena** — deep slip ground, ice-slip text, steel-bronze rim chrome, frieze offer bands, circular tondo fight stage. Greek gods are first-class in Match chrome (god seals on Boon offers), not a TFT shop skin.
- Lobby and Home remain functionally styled; Match phases own the kylix token set (`DESIGN.md`).

## Evidence on Hand

- Runnable Vue 3 + Convex + Clerk prototype (`src/views/*`, match engine under `src/match/`).
- Product/domain authority: `CONTEXT.md`, ADRs in `docs/adr/`, catalog docs under `local/greek-gods/`.
- No shipped testimonials, press, marketing site, or final naming assets. Do not fabricate customers, benchmarks, or a locked brand.

## Product Principles

1. **Authoritative auto-fight** — the server owns outcomes; clients present Match updates and hints.
2. **Draft before spectacle** — Weapon and Boon Draft shape the fight; watching is the payoff, not turn-by-turn control.
3. **Shared Session, disposable Match identity** — return to Lobby for rematch; Match loadouts and Souls do not persist yet.
4. **Auto-battler north star** — prototype choices should leave a path toward multiplayer auto-battler depth (TFT/Auto Chess family), not back toward D&D sheet play.
5. **Provisional surface** — name and visual style are open; domain truth and fair fog-of-war Draft stay closed.
