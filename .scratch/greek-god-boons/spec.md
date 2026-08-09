Status: ready-for-agent

# Spec: Greek God Boons & Match Draft

## Problem Statement

**Match start** still rolls a random **Loadout** and starts the fight immediately. There is no player choice, no **God** fantasy, and no Hades-style offers — so tempo/theme kits (swift Hermes vs destructive Dynamite vs healing Hygieia) cannot emerge. Domain language still centers on retired “Item” random assignment rather than **Boons** granted by **Gods** under a capped **God pool**.

## Solution

Rename combat units to **Boons**, each owned by one **God**. **Match start** opens a **Draft**: both seats simultaneously take five **Boon offer**s (three **Boons** from one **God**, pick one), building unique-key **Loadout**s under a max-3 **God pool**. Opponent draft state stays hidden until both finish; then the live event-driven fight begins (ADR 0001 / 0003). Ship five **Gods** × seven **Boons** from the authored catalog; extend **Passive** filters to optional **God** ∧ **effect kind**. The **Host** may **Match cancel** back to the **Lobby** during **Draft** or the live fight.

## User Stories

1. As a **Player**, I want combat pieces called **Boons**, so that language matches the god-granted fantasy.
2. As a **Player**, I want every **Boon** to belong to exactly one **God**, so that kits feel themed.
3. As a **Player**, I want five **Gods** (Hermes, Dynamite, Hygieia, Athena, Zeus), so that draft has meaningful identity choices.
4. As a **Player**, I want Dynamite to be the god of destruction (slow, huge damage), so that the fantasy is not “war/Ares.”
5. As a **Player**, I want Hermes **Boons** to be fast and lower damage, so that swiftness reads in the numbers.
6. As a **Player**, I want Hygieia **Boons** to heal, so that sustain is a god identity.
7. As a **Player**, I want Athena **Boons** to shield, so that mitigation is a god identity.
8. As a **Player**, I want Zeus **Boons** to be mid-tempo damage with punchy **Passive**s (including enemy sabotage), so that lightning feels distinct from Hermes and Dynamite.
9. As a **Player**, I want seven **Boons** per **God** (thirty-five total), so that offers have depth without an infinite catalog.
10. As a **Player**, I want the old spark/cannon/… and Passive-slice keys retired, so that there is one catalog, not two pools.
11. As a **Host**, I want **Match start** to open **Draft** instead of rolling a random **Loadout**, so that choice replaces luck-at-start.
12. As a **Player**, I want **Draft** to happen after **Match start** and before the live fight, so that Lobby stays idle-between-fights only.
13. As a **Player**, I want exactly five picks per seat, so that **Loadout** size stays familiar.
14. As a **Player**, I want each **Boon offer** to show three **Boons** from one **God**, so that picks feel like Hades room rewards.
15. As a **Player**, I want to pick exactly one **Boon** from each offer into my **Loadout**, so that decisions are crisp.
16. As a **Player**, I want the offered **God** chosen uniformly among eligible **Gods**, so that draft odds are readable.
17. As a **Player**, I want the three options drawn uniformly from that **God**’s unowned **Boons**, so that I cannot be offered duplicates I already hold.
18. As a **Player**, I want a **God pool** capped at three **Gods**, so that builds commit instead of sampling every divinity.
19. As a **Player**, I want a **God** to enter my **God pool** when I accept their first **Boon**, so that commitment is automatic.
20. As a **Player**, when my **God pool** is full, I want further offers only from those three **Gods**, so that the cap is enforceable.
21. As a **Player**, I want my **God pool** and **Loadout** to reset when the **Match** ends, so that each fight is a fresh draft (no Session-long run yet).
22. As a **Player**, I want **Boon** keys to be unique in my **Loadout**, so that five picks are five distinct cards.
23. As a **Player**, I want both seats to draft simultaneously, so that draft does not take twice as long.
24. As a **Player**, I want the opponent’s offers, **Loadout**, and **God pool** hidden during **Draft**, so that I am not forced into mirror-draft mind games.
25. As a **Player**, I want both **Loadout**s revealed when the fight starts, so that mid-fight reading stays shared as today.
26. As a **Player**, I want the live sim to start only when both seats finish drafting, so that neither side fights with an incomplete kit.
27. As a **Player**, I want a clear “waiting for opponent” state after I finish early, so that I know why the fight has not started.
28. As a **Player**, I accept no pick timer and no auto-pick in this slice, so that the prototype stays simple.
29. As a **Player**, I accept no **Boon offer** rerolls in this slice, so that each offer is a real commitment.
30. As a **Host**, I want to **Match cancel** during **Draft**, so that a stuck draft can return to the **Lobby** without archiving the **Session**.
31. As a **Host**, I want to **Match cancel** during the live fight, so that the same escape hatch works if the fight is broken or abandoned.
32. As a joiner **Player**, I want **Match cancel** to be Host-only, so that the opponent cannot unilaterally abort.
33. As a **Player**, I want **Match cancel** to clear **Loadout**s and **God pool**s and return to the **Lobby**, so that the next **Match** starts clean.
34. As a reconnecting **Player**, I want to resume mid-**Draft** with my current offer and picks, so that closing the tab does not forfeit the draft.
35. As a **Player**, I want **Passive** filters to support **all**, **effect kind**, and/or **God** (AND when both kind and **God** are set), so that Hermes can haste Hermes damage without buffing Dynamite nukes.
36. As a **Player**, I want authored catalog **Boons** (including **Passive**-only and hybrids) to work in the live fight under ADR 0001 / 0002, so that draft choices matter in combat.
37. As a **Player**, I want Zeus’s Thunder Tyrant to lengthen enemy damage **Cooldown**s, so that sabotage **Passive**s are expressible.
38. As a **Player**, I want fight **Loadout** slot presentation to keep working with the new catalog (**effective** stats, **Passive**-only faces), so that mid-fight scanning still works.
39. As a **Player**, I want each **Boon offer** UI to show the offering **God** and the three choices (name / effect / key stats), so that I can decide without opening a wiki.
40. As a **Player**, I want my own growing **Loadout** and **God pool** visible during **Draft**, so that I can track commitment.
41. As a developer, I want a pure Draft engine as the behavior seam for offers and picks, so that Convex stays a thin persist/schedule edge.
42. As a developer, I want the existing effective-stats resolver extended for **God** filters, so that stacking math does not fork.
43. As a developer, I want `resolveMatchStep` to remain the combat seam once draft completes, so that fight rules are not re-proven in Convex.
44. As a developer, I want presentation helpers (fight slots + draft offer model) tested as pure functions, so that Vue is not the test harness.
45. As a domain reader, I want ADR 0003 to record Draft-before-fight, so that future agents do not restore random start rolls.
46. As a domain reader, I want the full 35-row table kept out of `CONTEXT.md` and in the authored catalog file, so that the glossary stays rules-focused.
47. As a **Player**, I want same-timestamp resolve, **Match time cap**, **Life total** / **Shield** rules unchanged, so that draft does not rewrite combat physics.
48. As a **Host**, I want ending the **Session** to remain Lobby-only (not mid-**Draft** / mid-fight), so that **Match cancel** and **Archived session** stay distinct.

## Implementation Decisions

- **Respect ADR 0001**: Live event-driven sim; **Match update**s with **animation hint**s; optimistic cooldown from `nextReadyAt` once the fight runs.
- **Respect ADR 0002**: Effective stats recompute every wake; mid-charge `nextReadyAt` rewrite by progress fraction; eligibility re-eval hook unchanged.
- **Respect ADR 0003**: **Match start** → **Draft** → live fight; no random five-pick at start.
- **Rename**: Domain and product language use **Boon** (retire **Item**). Implementation may rename modules/types toward Boon in the same slice or as a coordinated rename with catalog swap — behavior follows glossary.
- **God catalog (v1)**: Hermes, Dynamite (destruction), Hygieia, Athena, Zeus — seven **Boons** each. Authoritative numbers/names/shapes: `local/greek-gods/boon-catalog.md`. Retire prior eight-key catalog; not a parallel pool.
- **Draft rules**: 5 picks; each **Boon offer** = 3 **Boons** from one **God**; pick one; unique keys; **God pool** max 3; god enters on first accepted **Boon**; at cap offers only from pool; offered god uniform among eligible; three options uniform among that god’s remaining unowned **Boons**; simultaneous; opponent draft hidden until fight; no timer/auto-pick/reroll.
- **Play phase**: Session play phase must distinguish **Draft** from live fight (and existing lobby / results). Fight scheduling (`nextReadyAt`, wake jobs) begins only when both seats complete **Draft**.
- **Match cancel**: Host-only; allowed in **Draft** or live fight; returns to **Lobby**; clears match draft/fight state; does not archive **Session**. Cancel wake jobs if any.
- **Passive filter schema**: Optional **effect kind** and/or **God** (AND when both); neither means **all**. Seat targets remain own / enemy / both. Stacking formula unchanged.
- **Catalog shapes**: fire-only / Passive-only / hybrid as today; each **Boon** records its **God**.
- **Transport / visibility**: During **Draft**, each seat only receives (or is allowed to see) own offers + own **Loadout** / **God pool**; opposing seat’s draft fields are omitted or redacted in the play-state query. On fight start, both **Loadout**s are fully visible as today.
- **UI**: Draft surface for current offer + own pool/loadout + waiting state; fight UI reuses loadout slot presentation against the new catalog; show **God** identity where it helps draft decisions.
- **Confirmed test seams**:
  1. Pure Draft engine (offer generation, pick application, pool/uniqueness/completion)
  2. Effective-stats resolver (**God** ∧ **effect kind**, including enemy filters)
  3. `resolveMatchStep` (new catalog combat regression; schedules after draft-complete loadouts)
  4. Presentation helpers (fight slots with new keys; pure draft-offer presentation model)

## Testing Decisions

- Good tests assert external behavior only: given draft state + injected rolls → offer/pick/completion; given **Loadout**s + catalog → effective stats / fires / `nextReadyAt` / presentation fields. Do not assert Vue DOM, Convex scheduler internals, or private helpers beyond public seams.
- **Draft engine**: table-driven cases for under-cap vs at-cap god eligibility; unique-key exclusion; five-pick completion; both-seats-ready gate; refusing duplicate keys; offer always size 3 when ≥3 unowned remain for that god (v1 catalog guarantees this for 5 picks).
- **Effective-stats**: extend prior art tests for **God** filter, combined **God**+kind, and enemy-targeted **Cooldown** lengthening (Thunder Tyrant).
- **`resolveMatchStep`**: prior art vitest suite — smoke/regression with representative new **Boons** (Hermes tempo, Dynamite nuke, Hygieia heal, Athena shield, Zeus enemy passive).
- **Presentation**: prior art loadout slot tests updated for new keys; add pure draft-offer model tests (god label + three choice summaries).
- No required E2E / Convex integration tests; Convex remains thin auth/persist/schedule over pure modules.

## Out of Scope

- **Boon offer** rerolls, pick timers, auto-pick
- Cross-**Match** / **Session**-lifetime **God pool** or persistent stash
- Lobby draft (before **Match start**)
- Open-information or alternating draft
- Boon rarity / upgrade paths / duo boons / keepsakes
- More than five **Gods** or changing the 7×5 catalog size in this slice
- New combat verbs beyond damage / heal / shield + existing **Passive** stat rewrites
- **Passive** conditions beyond unconditional carrier-present
- Spectators, gold, shops, inventory grids
- Joiner-initiated **Match cancel**
- Ending / archiving the **Session** from mid-**Match**
- Inlining the 35-row catalog into `CONTEXT.md`
- Balance perfection beyond the authored v1 table (tuning can follow)

## Further Notes

- Domain glossary: `CONTEXT.md`. Draft architecture: [ADR 0003](../../docs/adr/0003-match-draft-before-fight.md) (builds on ADR 0001 / 0002).
- Authored catalog: `local/greek-gods/boon-catalog.md`.
- Related prior specs: `.scratch/passive-items/spec.md`, `.scratch/loadout-slot-presentation/spec.md` — this slice supersedes random pool assignment and retires the eight-key catalog those assumed.
- Issue tracker: local markdown under `.scratch/` (`docs/agents/issue-tracker.md`). Follow-up `/to-tickets` can split implementation under `.scratch/greek-god-boons/issues/`.
