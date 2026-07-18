Status: ready-for-agent

# Spec: Item auto-battler prototype (Session + Match)

## Problem Statement

The product is pivoting away from D&D-style character combat. Players still need a shared place to meet, but the game itself should be a simple two-player item auto-battler: buy nothing yet—just get random **Items**, watch them fight on cooldowns, see a winner (or **Draw**), and return to the same room’s **Lobby** for another round. Rebuilding from a character-sheet / battle-map mental model would waste the existing joinable **Session** infrastructure and delay a playable prototype.

## Solution

Reuse the existing **Session** create / **Join link** / **Join request** / approve flow. Rebrand the creator as **Host** (seat 1, sole person who can start). When two fighting **Players** are seated, the **Host** starts a **Match**: each seat gets three random **Items** from a tiny catalog; the server runs an event-driven live sim and pushes small **Match update**s (with **animation hint**s); clients show both **Loadout**s and bars, animate cooldowns optimistically from `nextReadyAt`, and reconcile on updates. When the **Match** ends, the server returns everyone to the **Lobby** after a short results beat. The **Host** can end the **Session** into an **Archived session** from the **Lobby**.

## User Stories

1. As a signed-in user, I want to create a **Session**, so that I become the **Host** and can invite someone to play.
2. As a **Host**, I want a **Join link**, so that a friend can request entry without searching for the **Session**.
3. As a signed-in user, I want to open a **Join link** and submit a **Join request**, so that I can wait for admission.
4. As a user with a pending **Join request**, I want a clear waiting state, so that I know I am not in the fight yet.
5. As a **Host**, I want to approve a **Join request**, so that the joiner becomes the second fighting **Player**.
6. As a **Host**, I want to reject a **Join request**, so that I can refuse unwanted joiners.
7. As a rejected requester, I want to be able to submit a new **Join request** later, so that a mistaken reject is not permanent.
8. As a **Host**, I want approval blocked when the **Session** is already 2/2, so that a third person cannot become a fighting **Player**.
9. As a third user, I want a clear “Session full (2/2)” signal, so that I understand there are no spectators in this prototype.
10. As a **Host**, I want to see when both seats are filled, so that I know **Match start** is available.
11. As a **Host**, I want **Match start** disabled until exactly two fighting **Players** are admitted, so that I cannot start alone or with only pending requests.
12. As a **Player** (non-host), I want to see that only the **Host** can start, so that I do not expect a Start button of my own.
13. As a **Host**, I want **Match start** to assign each seat a random **Loadout** of three **Items**, so that the fight begins immediately with no shop or draft.
14. As a **Player**, I want duplicates allowed in a **Loadout**, so that two copies of the same **Item** charge independently.
15. As a **Player**, I want both seats to start at 100 **Life total** and 0 **Shield**, so that every **Match** feels fair and readable.
16. As a **Player**, I want to see my **Loadout** and the opponent’s **Loadout** during the **Match**, so that the auto-battle is watchable, not hidden-info.
17. As a **Player**, I want to see both **Life total** and **Shield** bars update live, so that I understand who is winning.
18. As a **Player**, I want cooldown bars to fill smoothly on my client, so that the fight feels alive between server beats.
19. As a **Player**, I want cooldown fill to come from server `nextReadyAt` but animate on the client optimistically, so that the backend stays efficient.
20. As a **Player**, I want a flash/cue when an **Item** fires (**animation hint**), so that I notice damage, heal, and shield beats.
21. As a **Player**, I want damage to hit enemy **Shield** before **Life total**, so that shielding matters.
22. As a **Player**, I want heal to raise my **Life total** but never above 100, so that heal does not snowball forever.
23. As a **Player**, I want shield effects to add to my **Shield** buffer with no separate cap, so that stacking shields is simple.
24. As a **Player**, I want shield not to decay over time, so that only damage spends it.
25. As a **Player**, I want the first seat to 0 **Life total** to lose (other wins), so that the win condition is obvious.
26. As a **Player**, I want a mutual kill at the same instant to be a **Draw**, so that neither side is arbitrarily favored.
27. As a **Player**, I want a 60-second **Match time cap**, so that all-heal/all-shield fights still end.
28. As a **Player**, I want time-cap resolution to pick the higher **Life total** (or **Draw** if equal), so that tank races still have an outcome.
29. As a **Player**, I want same-timestamp fires resolved by a random **seat resolve order** for that **Match**, then slot index, so that the **Host** is not favored.
30. As a **Player**, I want the server—not my browser—to decide fires and outcomes, so that both clients agree.
31. As a **Player**, I do not want a full precomputed fight dump for a local replay player, so that presentation stays driven by live **Match update**s.
32. As a **Player**, I want the **Session** to return to **Lobby** after the **Match** ends plus a short results beat (~2s), so that we can rematch without clicking Continue.
33. As a **Host**, I want to start another **Match** from the **Lobby** with the same seats, so that we can play multiple rounds.
34. As a **Player**, I want each new **Match** to re-roll both **Loadout**s, so that rematches feel fresh without a stash.
35. As a **Player**, I want closing the tab mid-**Match** not to forfeit, so that a disconnect is not a rage-quit loss.
36. As a reconnecting **Player**, I want to see current **Session** / **Match** / **Lobby** state, so that I can catch up after a drop.
37. As a **Host**, I want to end the **Session** from the **Lobby** into an **Archived session**, so that the room closes cleanly.
38. As a **Host**, I want end-**Session** blocked mid-**Match**, so that archiving does not interrupt an in-flight fight.
39. As any participant, I want an **Archived session** to reject new play and new joins, so that a closed room stays closed.
40. As a developer, I want the **Item catalog (v1)** to be the six named entries (spark/cannon/salve/mend/ward/bulwark), so that tuning is centralized.
41. As a developer, I want to strip or stop shipping D&D sheet / battle-map / turn-order play surfaces for this pivot, so that the prototype UI matches the new game.
42. As a **Host**, I want lobby UI that shows seats and Start / End **Session**, so that room management is obvious.
43. As a **Player**, I want a dedicated **Match** view (both loadouts, bars, fire cues, results), so that lobby and fight are distinct states.
44. As a **Player**, I want results to show winner seat or **Draw**, so that the outcome is unambiguous before **Lobby** return.

## Implementation Decisions

- **Domain vocabulary** follows root `CONTEXT.md`. Prefer **Session**, **Host**, **Player**, **Lobby**, **Match**, **Item**, **Loadout**, **Life total**, **Shield**, **Match update**, **animation hint**. Avoid “Dungeon Master”, “room” as the domain term for **Session**, and precomputed “Match timeline” replay language.
- Respect [ADR 0001](docs/adr/0001-live-event-driven-match-updates.md): live event-driven server sim; **Match update**s with **animation hint**s; client-optimistic cooldown from `nextReadyAt`; no full precomputed client replay.
- **Reuse** existing Convex **Session** create, **Join link** / token, **Join request**, approve/reject, membership, and `live` | `archived` status where possible. Adapt role language from DM-centric to **Host** = seat 1 fighting **Player**.
- **Retire from the play path** (for this prototype): **Session character** sheets, battle map, turn order, spotlight, table rolls, spell/attack systems. Data tables may remain temporarily if cheaper than a hard delete in the first slice, but product UI and live mutations must not depend on them for play.
- **Match state** lives on the **Session** (or a dedicated match document keyed by **Session**)—phase `lobby` | `match` | (brief) `results`, both seats’ **Loadout**s, **Life total** / **Shield**, `nextReadyAt` per slot, **seat resolve order**, match clock / startedAt, last **Match update** (or append-only update log if needed for subscribers), outcome.
- **Match start** (Host-only): require **Lobby** + exactly two admitted fighting **Players**; roll three catalog keys per seat with replacement; set HP/shield; choose random **seat resolve order**; set initial `nextReadyAt` from each **Item**’s **Cooldown**; schedule first wake at min(next ready, time cap).
- **Wake handler**: call the pure match engine for “resolve instant at `t`”; persist new state; broadcast/queryable **Match update**; if not over, schedule next wake; if over, enter results then schedule **Lobby** return ~2s later.
- **Item catalog (v1)** shipped as static data: spark 8/2s, cannon 18/4.5s, salve 6/2.5s, mend 14/5s, ward 8/3s, bulwark 16/5.5s.
- **Effect rules**: damage → enemy shield then life (floor 0); heal → own life cap 100; shield → add to own shield; no shield decay; no shield cap in prototype.
- **End conditions**: life ≤ 0 (winner other seat); both ≤ 0 same instant → **Draw**; at 60s cap → higher life wins else **Draw**.
- **UI**: Home create **Session**; Join waiting / full / archived; **Lobby** (seats, Host Start, Host End Session); **Match** (both loadouts, bars, optimistic cooldowns, animation on hints, results banner).
- **Visibility**: both clients see both loadouts and both bars during **Match**.
- **Disconnect**: no forfeit; sim continues; reconnect reads authoritative state.
- **Capacity**: cannot approve a third fighting **Player**; no spectators.

### Confirmed test seam

Single primary seam: a pure, deterministic match engine function (e.g. `resolveMatchStep`) that, given loadouts, life/shield, wake time, seat resolve order, and catalog, returns the next **Match update** shape (fires, new totals, new `nextReadyAt`s, animation hints, ended/outcome). Convex scheduler/mutations only schedule and persist; Vue only renders and animates. No separate E2E or Convex integration seam required for this prototype.

Illustrative engine I/O shape (decision sketch, not shipped code):

```ts
// resolveMatchStep(input) -> {
//   atMs: number
//   fires: { seat, slotIndex, itemKey, effect, potency }[]
//   seats: { life, shield, slots: { itemKey, nextReadyAt }[] }[]
//   animationHints: { kind, seat, slotIndex }[]
//   outcome?: { type: 'winner', seat } | { type: 'draw' } | { type: 'continue' }
//   nextWakeAt?: number
// }
```

## Testing Decisions

- Good tests assert **external behavior** of the match engine: given state + time, observable update/outcome—not Convex scheduler internals or Vue timers.
- Test the pure match engine module thoroughly (Vitest), same style as existing pure domain tests (`castSpell`, derived pipeline, etc.).
- Cover: single fire; same-timestamp ordering (seat order then slot); damage through shield; heal cap; shield stack; win on 0; mutual kill **Draw**; time-cap win/**Draw**; `nextReadyAt` refresh after fire; next wake selection.
- Do not require browser E2E for the first slice. Optional light UI tests only if a tiny presentational helper is extracted; not mandatory.
- Prior art: `src/**/*.test.ts` with Vitest; prefer pure functions over mounting the whole **Session** view.

## Out of Scope

- Shop, gold, draft, persistent stash, inventory grid, placement puzzle, loadout limits.
- Conditional triggers (on-hit, start-of-fight once, etc.) beyond cooldown loops.
- Spectators, >2 players, matchmaking, ranked, bots/solo practice.
- Precomputed full-fight client replay player.
- Fixed high-frequency server tick loops for charge frames.
- Rich archived-session history UI.
- Migrating or faithfully preserving D&D sheet/map/turn features.
- IP/catalog beyond the six prototype **Items**.
- Mobile-specific layout polish beyond “usable.”
- Ending/archiving mid-**Match**.
- Voluntary forfeit / disconnect-as-loss.

## Further Notes

- Glossary: `CONTEXT.md`. Architecture decision: `docs/adr/0001-live-event-driven-match-updates.md`.
- Issue tracker for this repo is local markdown under `.scratch/` (see `docs/agents/issue-tracker.md`).
- Follow-up `/to-tickets` can split implementation into numbered issues under `.scratch/item-auto-battler-prototype/issues/`.
