# Boon auto-battler sessions

This context covers a two-player auto-battler: players join a shared **Session**, receive **Boons**, and those **Boons** fight automatically. The product is pivoting away from D&D-style character combat; older sheet / battle-map language is retired.

## Language

**Session**:
A host-created space that other people join to play together; it is the canonical unit of membership and shared lobby state. The **Session** outlives a single fight so players can return to it after a **Match**.
_Avoid_: "Room" for this concept in domain language (product UI may still say room casually).

**Host**:
The authenticated user who creates the **Session**. They occupy seat 1 as a fighting **Player**, and they are the only person who may **start** a **Match** in that **Session**.
_Avoid_: Dungeon Master, non-playing facilitator, spectator-only GM for this product.

**Player**:
An authenticated user admitted to a **Session** who occupies a fighting seat. In the prototype there are exactly two seats: the **Host** (seat 1) and one other **Player** (seat 2). Closing the tab mid-**Match** does not forfeit or cancel: membership persists, the live server sim continues, and reconnect shows the current **Session** / **Match** state (including later **Lobby** return).

**Join link**:
A shareable URL the **Host** gives out so an authenticated user can start a **Join request** for that **Session**.

**Join request**:
An authenticated user's pending entry into a **Session** opened via its **Join link**; they are not a **Player** until the **Host** approves the request (v1 prototype). If both fighting seats are already filled, the **Host** cannot approve another **Player** into this prototype—the **Session** is full (2/2). No spectators in v1.

**Lobby**:
The idle state of a live **Session** when no **Match** is in progress—both **Players** are seated and waiting; the **Host** may start the next **Match** from here. The **Host** may also **end** the **Session** from the **Lobby**.

**Archived session**:
A **Session** the **Host** has formally ended from the **Lobby**: closed for new **Join request** approvals and new **Matches**. Kept as a record rather than deleted; no rich history UI required in the prototype.
_Avoid_: Ending / archiving mid-**Match** in v1—wait for **Lobby**.

**Match**:
One auto-battle between the two seated **Players** inside a **Session**. When it ends (a winner is decided, or a **Draw**), both return to the **Lobby** of that same **Session**; the **Session** is not archived or destroyed just because the fight ended.

**Life total**:
The hit-point number for one **Player** seat during a **Match**. **Boons** do not have hit points; they only fire effects. The first seat whose **Life total** reaches 0 loses that **Match** (the other seat wins). If both seats reach 0 at the same simulated instant, the **Match** is a **Draw**. Baseline start is **100** **Life total** and **0** **Shield**; the seat’s **Soul** **Vitality** may raise starting **Life total** above that baseline for the **Match**.

**Draw**:
A **Match** outcome where both seats' **Life total**s reach 0 at the same simulated instant—no winner. Also the outcome when the **Match time cap** expires with equal **Life total**s. Both **Players** still return to the **Lobby**.

**Match time cap**:
Maximum simulated duration of a **Match**: **60 seconds**. If neither seat has reached 0 **Life total** by then, the seat with the higher **Life total** wins; if equal, **Draw**. Guarantees every **Match** terminates.

**Seat resolve order**:
A random permutation of the two fighting seats, chosen once at **Match start**, used only to break ties when multiple **Boons** fire at the same simulated timestamp. Not biased toward the **Host**.

**Shield**:
A temporary absorb buffer on a seat during a **Match**. Incoming damage hits **Shield** before **Life total** when a shield buffer is present. Matches start with **0** **Shield**. Shield does not decay over time in v1—only damage spends it. New shield effects **add** to the current buffer (no separate shield cap in the prototype).

**Gold**:
**Match**-scoped spendable currency granted equally to both seats at **Match** begin (**5** per seat in v1). After a seat finishes its five **Draft** picks, it may spend **Gold** to bump **Soul stats** (**1** **Gold** per +1 Strength / Speed / Vitality); bumps may exceed the rolled per-stat max of **10**. Unused **Gold** is lost when the seat confirms spend. Cleared on **Match** end or **Match cancel**; not account- or **Session**-persistent.
_Avoid_: Nectar, money, cash, points, coin/tribute/drachma as domain synonyms; **Lobby** shop; buying **Equipment** or **Boons** with **Gold** in this slice.

**Soul**:
The fighter identity for one seat for the duration of a single **Match**. Each seat receives a fresh **Soul** when the **Match** begins, initialized with a **random** set of **Soul stats**. It does not persist across **Matches** or **Sessions**. In the Soul-first prototype, **Soul stats** (1) lightly rewrite combat so the roll is felt in the fight, and (2) appear during **Draft** as soft guidance toward fitting **Boons**—they do **not** change offer odds or ban picks. Soft guidance is a small own-seat **Soul** panel (the three stats plus at most one short “favors …” line from the top stat; skip or say “Balanced” on ties/low tops)—**not** highlights on **Boon offer** choices. Own **Soul** is visible from **Match** begin; opponent **Soul** stays hidden during **Draft** and is revealed when the fight starts (same fog as opponent **Loadout** / **God pool**). **Soul stats (v1)**: **Strength** (damage potency), **Speed** (**Cooldown** on fire-capable **Boons**), **Vitality** (starting **Life total**). **Equipment** and account-lifetime progression are later layers on this model.
_Avoid_: Avatar; account-persistent character sheet for this prototype; treating **Soul** as a **Boon** or **God**; mechanical **Draft** weighting or forced picks from **Soul stats**; open opponent **Soul** during **Draft**; glowing/highlighting offer cards as “recommended.”

**Soul stats**:
The numeric fields on a **Soul**. Prototype set: **Strength**, **Speed**, **Vitality**. Both seats always share the same point total **15** (same average); each seat independently receives a random partition of those **15** points into the three stats with each stat an integer **0–10**. Combat jobs (Soul-first): **Strength** multiplies damage potency by `(1 + Strength × 0.1)` (e.g. 0 → 1×, 10 → 2×); **Speed** shortens fire-capable **Cooldown**s by `Speed × 2` percent (e.g. 10 → −20%), still floored at **500ms**; **Vitality** sets starting **Life total** to `100 + Vitality` (heal cap matches that same max). **Soul** modifiers apply **after** **Passive** stacking on the shared effective-stat path.
_Avoid_: Conflating **Soul stats** with **Boon** catalog potency/**Cooldown**; using **Vitality** as a heal multiplier in this slice; independent per-stat rolls that can give one seat a higher total than the other; treating **Weapon** nudges as changes to the displayed **Soul** panel numbers.

**Equipment**:
Match-scoped gear a seat brings into a fight. In this slice: exactly one **Weapon** slot (no armor/accessories yet). **Equipment** is identity + light combat nudges — not a sixth **Loadout** **Boon**, not a separate fire actor, and not a rewrite of rolled **Soul stats** on the Soul panel. Cleared when the **Match** ends or on **Match cancel**; not account- or **Session**-persistent.
_Avoid_: **Equipment** shop acquisition with **Gold** ( **Gold** spends on **Soul** bumps only in this slice); paper-doll inventory; treating **Equipment** as a **Boon** / **Loadout** slot; timer-firing **Equipment** in this slice.

**Weapon**:
The sole **Equipment** slot in this slice. At **Match start**, after **Soul**s are rolled and before **Boon** **Draft**, each seat simultaneously receives an independent offer of **3** **Weapons** and must pick **1** (no empty Weapon). Boon **Draft** starts only when both seats have chosen. Own **Weapon** is visible once chosen; opponent **Weapon** stays hidden until the fight (same fog as **Soul** / **Loadout** / **God pool**). Every catalog **Weapon** has exactly one **Weapon type**. Catalog **Weapons** may carry light nudges on the shared effective-stat path **after Passive + Soul** (same levers: damage potency, fire-capable **Cooldown**, starting / max **Life**); magnitudes stay light and are per catalog row (not hard-coded by type). A **Weapon** does not charge, fire, own a `nextReadyAt`, or inject a linked **Boon**.
_Avoid_: Rolling the **Weapon** with no pick; drafting it inside Boon offers; mirroring the same three offers to both seats; empty Weapon slot; Weapon nudges that rewrite the Soul panel’s Strength/Speed/Vitality readout; treating **Weapon type** fantasy jobs as mandatory nudge formulas; linked fire / equip-only fire verbs on **Weapons** in this slice.

**Weapon type**:
The identity class of a **Weapon**. Prototype set: **Sword**, **Axe**, **Wand**, **Bow**. Soft catalog guidance only: Sword mid damage/tempo, Axe heavy/slower, Wand soft/tempo/hybrid, Bow fast/poke. Used by **Passive** filters as an optional seat gate on the carrier’s equipped **Weapon**, and by soft **Draft** favor copy (not offer odds).
_Avoid_: Dual-wield / spear / fists in this slice; tagging **Boons** with a weapon affinity; mechanical **Draft** reweighting or bans from equipped type; **Boons** that rewrite **Soul stats**.

**God**:
A named divinity identity that owns a fixed catalog of **Boons** sharing one thematic tempo/role fantasy (for example swift low-damage, slow high-damage, healing). The unit counted by a seat's **God pool**. Product names need not be strict classical Olympians (e.g. **Dynamite**).
_Avoid_: Treating **God** as only a UI label or catalog tag with no pool membership.

**God catalog (v1)**:
The shipped set of five **Gods**, each with seven **Boons** (35 total). Replaces the old spark/cannon/… and Passive-slice keys — those are not kept in parallel.

| God          | Fantasy                                              |
| ------------ | ---------------------------------------------------- |
| **Hermes**   | Swiftness — fast, lower-damage                       |
| **Dynamite** | Destruction — slow, very high damage                 |
| **Hygieia**  | Health — healing                                     |
| **Athena**   | Aegis — shield / mitigation                          |
| **Zeus**     | Lightning — mid-tempo damage and punchy **Passive**s |

**God pool**:
The set of **Gods** that have granted at least one **Boon** to a seat during the current **Match**'s **Draft**. Cap is **3**. A **God** enters when that seat accepts their first **Boon**. While at cap, further **Boon** offers for that seat may only come from **Gods** already in the pool. Resets when the **Match** ends (return to **Lobby**); does not persist across **Matches**.
_Avoid_: Cross-**Match** / **Session**-lifetime god commitment in this slice.

**Match cancel**:
The **Host**-only action that aborts an in-progress **Match** (including during **Weapon** pick, **Draft**, or the live fight) and returns both seats to the **Lobby** without archiving the **Session**. Clears **Loadout**s, **God pool**s, **Soul**s, **Gold**, pending **Soul** bumps, and **Equipment** (**Weapon**).
_Avoid_: Ending the **Session** from mid-**Match**; joiner-initiated cancel in this slice.

**Draft**:
The phase of a **Match** after both seats have picked a **Weapon** and before the live fight, where each seat builds its **Loadout** by accepting a series of **Boon offers**, then spends **Gold** on **Soul** bumps. Each seat makes exactly **5** picks (final **Loadout** size is **5**). Both seats draft **simultaneously** and independently; after five picks a seat enters **Gold** spend (free realloc on Strength / Speed / Vitality until **Confirm**; leftover **Gold** lost on confirm). The live server sim begins only when both seats have confirmed spend. Global `playPhase` stays `draft` through picking and spending. Opponent **Boon offer**s, **Loadout**, **God pool**, **Weapon**, final **Soul**, and **Gold** stay hidden until the fight starts.
_Avoid_: Lobby shop; drafting before the **Host** starts the **Match**; random five-pick without offers; open-information or alternating draft in this slice; per-offer pick timers / auto-pick in this slice.

**Boon offer**:
One **Draft** choice presented to a seat: exactly **3** **Boons** from a single **God**; the seat picks one into its **Loadout**. Which **God** is offered is chosen **uniformly at random** among eligible **Gods** (all five in the **God catalog** while under the pool cap; only pool **Gods** when at cap). The three options are drawn **uniformly** from that **God**'s remaining unowned **Boons**.
_Avoid_: Mixed-god choice rows; picking more than one from a single offer; duplicate **Boon** keys in one seat's **Loadout**.

**Boon**:
A combat unit on a **Player**'s **Loadout**. Every **Boon** belongs to exactly one **God**. A **Boon** has a catalog identity and must provide at least one of: a **fire effect** (damage, heal, or shield + **Cooldown** loop), or a **Passive**. Three valid shapes: **fire-only**, **Passive-only**, or **hybrid** (both). **Boons** do not have hit points. When a fire effect resolves: **damage** spends enemy **Shield** first then enemy **Life total** (floor 0); **heal** raises own **Life total** capped at that seat’s starting max (**100 + Vitality**, or **100** without **Soul**); **shield** adds to own **Shield** buffer. **Passive**-only **Boons** never charge or fire.
_Avoid_: Item (retired domain name for this concept); treating **Passive**-only as a non-**Boon** aura; requiring every **Boon** to fire; a **Boon** without a **God**.

**Fire effect**:
The damage, heal, or shield application a **Boon** performs when its **Cooldown** loop completes. Absent on **Passive**-only **Boons**.

**Passive**:
A modifier attached to a **Boon** that can rewrite matching **Boons**' **Cooldown** and/or **potency** while the carrier is in a **Loadout**. On **hybrid** **Boons** it sits alongside the **fire effect**; on **Passive**-only **Boons** it is the whole card. Each **Passive** declares which seats it affects (**own**, **enemy**, or **both**), which **Boons** in those seats receive it via a filter that may include **effect kind** (damage / heal / shield) and/or **God** and/or **Weapon type**, combined with AND when more than one is set; omit all three for **all**, and one or more changes to **Cooldown** and/or **potency**. **Weapon type** on the filter is a **carrier-seat gate**: if set, the **Passive** contributes nothing unless the carrier seat’s equipped **Weapon** has that type (it is not a tag on recipient **Boons**). **Effect kind** and **God** still match recipient **Boons**. Each change is either **flat** or **percent**, chosen per change on that **Passive**. When the carrier matches its own filter and seat target, it receives the modifier too (only meaningful for stats the carrier actually has — a **Passive**-only carrier has no **Cooldown** / potency of its own). Multiple matching **Passive**s stack additively by layer: `effective = (base × (1 + Σpercent)) + Σflat`, then clamp (**effective Cooldown** ≥ **500ms**, **effective potency** ≥ **0**). With unique **Draft** keys, stacking comes from different carrier **Boons**, not duplicate copies of one key. Aside from the optional **Weapon type** gate, in this slice every **Passive** is otherwise **unconditional** (always eligible while the carrier is present and the gate passes); the live sim still **recomputes** **effective Cooldown** / **effective potency** on every wake so future **Passive** conditions can gate eligibility without a model change. Not a second **fire effect**.
_Avoid_: Aura (unless we later mean a seat-level effect that is not on a **Boon**); conflating a **Passive** condition trigger with a **Boon** fire; treating **Weapon type** as a property of the recipient **Boon**.

**Cooldown**:
How long a **Boon** with a **fire effect** charges before it fires. Those **Boons** use the same loop: charge from empty to full over their **Cooldown**, fire once, reset, repeat until the **Match** ends. **Passive**-only **Boons** have no **Cooldown**. A **Passive** may change the **effective Cooldown** of matching fire-capable **Boons**; it does not introduce a different fire-trigger model. After stacking, **effective Cooldown** is floored at **500ms**.

**Effective Cooldown** / **effective potency**:
The **Cooldown** and potency values used by the live sim for a **Boon** after all currently eligible matching **Passive**s are applied and clamped (**Cooldown** ≥ **500ms**, potency ≥ **0**). Catalog base values are unchanged. The sim recomputes these on every wake, and also whenever a **Passive** eligibility change is re-evaluated (the hook future **Passive** conditions will call when their trigger activates). If **effective Cooldown** changes mid-charge, rewrite `nextReadyAt` by **preserving charge progress fraction**: `nextReadyAt = now + (1 − progress) × newEffectiveCooldown`.

**Loadout**:
The set of **Boons** a **Player** brings into a **Match**. Built during **Draft** by accepting **Boon offers** (not rolled at random at **Match start**). No inventory grid or placement puzzle—**Boons** stack in **Loadout** order; each fire-capable **Boon** charges independently. **Boon** keys are **unique per seat**: a key already in the **Loadout** cannot appear in that seat's later **Boon offer**s.

**Boon catalog**:
All **Boons** in the game; every entry belongs to exactly one **God** in the **God catalog (v1)** (seven per **God**, thirty-five total). Full key / potency / **Cooldown** / **Passive** tables live in `local/greek-gods/boon-catalog.md` — not inlined here. The prior spark/cannon/… and `haste_charm` / `vital_spark` keys are retired — not a parallel pool.

**Match start**:
The **Host** action that leaves the **Lobby** and begins a **Match**. Allowed only when the **Session** is in **Lobby** and there are exactly two admitted fighting **Players** (**Host** + one approved joiner). Pending **Join request**s do not count; no solo or bot match in this prototype. On start, both seats’ **Soul**s are rolled and each receives **5** **Gold**, then each seat must pick **1** of **3** offered **Weapons** (independent offers, simultaneous); when both have a **Weapon**, the **Match** enters **Draft** (empty **Loadout** / empty **God pool**). The live server-side countdown/sim begins only after both seats finish drafting and confirm **Soul** spend. **Loadout**s, **God pool**s, **Soul**s, **Gold**, and **Equipment** do not persist to the next **Match**.
_Avoid_: Precomputing the entire fight into a replay timeline for the client to animate locally; assigning a random **Loadout** at start with no **Draft**; starting Boon **Draft** before both **Weapons** are chosen.

**Match update**:
A small server-pushed delta during a live **Match**: what just changed in combat state (for example which **Boon** fired, **Life total** / **Shield** changes, terminal outcome when the **Match** ends) plus an **animation hint**. Clients subscribe and react; they do not run the rules sim and do not reconstruct a full offline replay. The live sim is **event-driven**: the server schedules the next wake for the soonest **Boon** ready-time (or the **Match time cap**), resolves that instant (including same-timestamp ties via **seat resolve order**), pushes a **Match update**, then schedules the next wake—no fixed empty tick loop.

**Animation hint**:
A compact, server-authored cue on a **Match update** telling the client what presentation to play (for example seat/slot that fired and effect kind: damage / heal / shield). Not a full animation scripted timeline; not “client invents flair from raw HP alone.”

**Cooldown presentation**:
Each fire-capable **Loadout** slot exposes a server `nextReadyAt` (set when the live fight begins after **Draft**, refreshed after that slot fires, and rewritten on mid-charge **effective Cooldown** changes). The frontend animates charge fill **optimistically** toward that time on its own—no server stream of charge frames. When a **Match update** arrives for a fire, the client reconciles bars/state to the server and continues optimistic charge animation from the new `nextReadyAt`. Face and popover **Cooldown** / potency numbers show **effective** values (client-derived from both **Loadout**s + catalog via the same stacking rules), not raw catalog bases. **Passive**-only slots have no `nextReadyAt` and no charge bar: their face uses a distinct **Passive** glyph plus a short modifier cue; full **Passive** wording lives in the popover. **Hybrid** slots keep the fire face (effect icon + **effective** potency + charge bar) and put **Passive** wording in the popover only.

**Same-timestamp resolve**:
When multiple **Boons** become ready at the same simulated instant, resolve using the **Match**'s random **seat resolve order**, then **Loadout** slot index (0 → 4). During the live fight both **Players** see both **Loadout**s and both **Life total** / **Shield** bars. When the **Match** ends, the server waits a short results beat (~2 seconds) then returns the **Session** to **Lobby**—clients do not gate that transition.

## Relationships

- A **Session** has exactly one **Host** (the creator).
- A **Session** has up to two fighting **Players** in the prototype (**Host** + one joiner). A third user is not admitted as a fighting **Player** (no spectators yet).
- A **Join link** identifies exactly one **Session**.
- A user becomes a **Player** only after the **Host** approves their **Join request**.
- Only the **Host** may start a **Match**, and only from the **Lobby**, and only when both fighting seats are filled.
- A **Session** may host zero or more **Matches** over its lifetime; at most one **Match** is active at a time.
- Ending a **Match** (by fight outcome or **Match cancel**) returns both **Players** to the **Lobby**; it does not end the **Session**.
- The **Host** may **Match cancel** during **Draft** or the live fight; joiners may not.
- A **Match** ends when a seat hits 0 **Life total**, both hit 0 together (**Draw**), or the **Match time cap** resolves a winner/**Draw**.
- The **Host** may end the **Session** from the **Lobby**, producing an **Archived session**.
- During a **Match**, each fighting **Player** has exactly one **Life total** (and may have a **Shield** buffer).
- Each fighting seat has one **Soul** for the current **Match** (random **Soul stats** at begin; combat uses rolled stats + confirmed bumps; cleared when the **Match** ends).
- Each fighting seat receives **5** **Gold** at **Match** begin (cleared when the **Match** ends).
- Each fighting seat has exactly one **Weapon** (**Equipment**) for the current **Match** (picked at start; cleared when the **Match** ends).
- Each fighting **Player** has one **Loadout** of **Boons** for a **Match**.
- Every **Boon** belongs to exactly one **God**.
- A **God** owns a fixed set of **Boons** (seven each in **God catalog (v1)**).
- The **God catalog (v1)** has exactly five **Gods**: Hermes, Dynamite, Hygieia, Athena, Zeus.
- Each fighting seat has one **God pool** for the current **Match** **Draft** (max **3** **Gods**); it resets when the **Match** ends.
- A **Boon offer** presents 3 **Boons** from one **God**; the seat adds one pick to its **Loadout**.
- A **God** enters a seat's **God pool** when that seat accepts their first **Boon** from that **God**.
- A **Boon** is **fire-only**, **Passive**-only, or **hybrid**; it must have a **fire effect**, a **Passive**, or both.
- A **Boon** may carry at most one **Passive**.
- Each **Passive** declares a seat target (**own**, **enemy**, or **both**), a **Boon** filter (**all**, and/or **effect kind**, and/or **God**, and/or **Weapon type** — AND when more than one is set; **Weapon type** gates on the carrier’s equipped **Weapon**), and one or more stat changes to **Cooldown** and/or **potency**.
- Every fire-capable **Boon** in a **Loadout** charges in parallel on the shared **Match** clock; **Passive**-only slots do not schedule wakes. **effective Cooldown** / **effective potency** are recomputed on every wake and whenever **Passive** eligibility is re-evaluated (future condition triggers call that re-eval).
- When **effective Cooldown** changes mid-charge, rewrite `nextReadyAt` by preserving charge progress fraction: `nextReadyAt = now + (1 − progress) × newEffectiveCooldown`.
- **Match start** rolls both seats’ **Soul**s and grants **Gold**, then both seats pick a **Weapon** (1 of 3, independent); **Draft** begins only after both have a **Weapon**; each seat picks exactly **5** **Boons**, then spends **Gold** on **Soul** bumps and confirms; the live server sim starts only after both seats confirm spend. **Loadout**s, **God pool**s, **Soul**s, **Gold**, and **Equipment** do not carry over to the next **Match**.
- Effective-stat order on the shared path: **Passive** stacking → **Soul** → **Weapon** light nudges.
- Clients never invent **Match** outcomes; they apply **Match update**s (with **animation hint**s) from the server.
- The server does **not** ship a full precomputed fight replay for a separate client animation layer.

## Flagged ambiguities

- **Soul** is **Match**-scoped: rolled with random stats at **Match** begin; cleared when the **Match** ends (or on **Match cancel**). Not account- or **Session**-persistent in this prototype.
- **Soul**-first prototype: **Soul stats** lightly affect combat **and** soft-guide **Draft** (UI cues only—no offer reweighting or bans).
- **Soul stats (v1)**: **Strength**, **Speed**, **Vitality**; both seats share total **15**, independently partitioned into three ints **0–10** at roll. **Gold** bumps after five **Draft** picks may push stats above **10**; combat uses roll + confirmed bumps. Combat: Strength damage potency `(1 + Strength×0.1)×`; Speed `−(Speed×2)%` Cooldown (floor 500ms); Vitality starting Life `100+Vitality`. Soul applies **after** Passive stacking.
- **Gold (v1)**: **Match**-scoped; flat grant **5** both seats at begin; cost **1** per +1 bump on any **Soul stat**; leftover lost on confirm; soft **Draft** favor line uses rolled **Soul** only (not bumps).
- Own **Soul** visible from **Match** begin; opponent **Soul** hidden during **Draft**, revealed when the fight starts.
- Soft **Draft** guidance: own-seat Soul panel (stats + at most one “favors …” / “Balanced” line); no offer-card highlighting or mechanical reweighting.
- **Equipment** (this slice): one **Weapon** slot; identity + light nudges; not a **Loadout** **Boon**.
- **Weapon** pick: at **Match start**, simultaneous independent 1-of-3; must pick; Boon **Draft** waits on both; own visible once chosen; opponent fog until fight; Match-scoped clear on end/cancel.
- **Weapon** light nudges: catalog fields on damage / fire-capable **Cooldown** / starting-max **Life** levers; apply **after Passive + Soul**; do not rewrite Soul panel numbers; keep magnitudes light. No linked fire on **Weapons** in this slice.
- **Weapon type (v1):** **Sword**, **Axe**, **Wand**, **Bow**. Soft fantasy jobs only; every **Weapon** has one type.
- **Weapon catalog (v1):** eight keys in `src/match/weaponCatalog.ts` (two per type): `steel_longsword`, `knight_blade` (Sword); `war_axe`, `stone_maul` (Axe); `elder_wand`, `crystal_staff` (Wand); `hunters_bow`, `swift_shortbow` (Bow). Light nudges only: damage ±5–10%, CD ±5–10% (still floor 500ms after all), life +0–3 on Wand rows.
- **Passive** filter may include optional **Weapon type** as a carrier-seat gate (AND with **effect kind** / **God**); omit = no weapon gate. No **Boon** weapon-affinity tags. Weapon-gated catalog **Passive**s (v1): `hermes_fleet_foot` (Sword · Hermes damage **−10% Cooldown**); `dynamite_scorched_earth` (Axe · Dynamite **+15%** potency); `hygieia_overflow` (Wand · heal **+3** flat potency); `hermes_stolen_seconds` (Bow · damage **−15% Cooldown**).
- **Boons** do **not** rewrite **Soul stats** (Strength / Speed / Vitality on the panel or as a separate rewrite layer). Combat stacking stays Passive → Soul → Weapon.
- Soft **Draft** guidance for **Weapon**: own **Weapon** plus at most one favor line from type — Sword → “Favors damage kits”; Axe → “Favors high-damage kits”; Wand → “Favors sustain / hybrid”; Bow → “Favors Hermes tempo”. No offer reweighting, bans, or offer-card highlights (same discipline as **Soul** soft guidance).
- **Item** was renamed to **Boon**: same combat-unit concept; prefer **Boon** everywhere in domain language.
- **God** is first-class (not a catalog tag only).
- **God catalog (v1)**: Hermes, Dynamite, Hygieia, Athena, Zeus — 7 **Boons** each; retires the prior eight-key catalog. Authored table: `local/greek-gods/boon-catalog.md` (not inlined in this file).
- **Boon** definitions in that table are accepted for v1 (balance can tune later without renaming domain rules).
- **Dynamite** is an intentional non-classical **God** name: god of **destruction** (slow/high-damage), not war/Ares.
- **God pool**: enters on first accepted **Boon** from that **God**; max 3; at cap offers only from pool **Gods**; resets when the **Match** ends.
- **Draft** is a **Match** phase after both seats pick a **Weapon**, before the live fight (not a Lobby shop). Each seat picks exactly **5** **Boons**, then spends **Gold** on **Soul** bumps. Global phase stays `draft` through picking and spending.
- A **Boon offer** is 3 **Boons** from one **God**; pick one. Offered **God** is uniform among eligible **Gods**; options uniform among that **God**'s unowned **Boons**.
- **Draft** is simultaneous; opponent **Loadout** / offers / **God pool** / **Weapon** stay hidden until the fight starts.
- **Boon** keys are unique per seat **Loadout**; already-picked keys are excluded from later offers.
- No **Draft** pick timer or auto-pick in this slice; a finished seat waits on the other for picks and spend confirm.
- No **Boon offer** rerolls in this slice.
- **Host** may **Match cancel** (→ **Lobby**) during **Weapon** pick, **Draft**, or the live fight; does not archive the **Session**.
- Random five-pick **Loadout** at **Match start** is retired in favor of **Draft**.
- Prior **Boon catalog (v1)** / Passive slice keys (`spark`, `cannon`, …, `haste_charm`, `vital_spark`) are retired once the **God catalog** ships; not a parallel pool.
- Legacy D&D sheet / battle-map / turn-order language is retired for this product direction.
- Combat transport shape is recorded in [ADR 0001](docs/adr/0001-live-event-driven-match-updates.md).
- **Draft** before the live fight is recorded in [ADR 0003](docs/adr/0003-match-draft-before-fight.md).
- **Passive** effective-stat recompute / mid-charge `nextReadyAt` rewrite is recorded in [ADR 0002](docs/adr/0002-passive-effective-stats-reeval.md).
- “Boon card” / legacy “item card” in UI talk means the Match **Loadout** slot presentation of a **Boon**, not a separate domain object. There is no shop/inventory card surface in the prototype.
- “Passive Item” as a never-firing slot was **reopened** and renamed with the **Boon** rename: **Passive**-only **Boons** are valid; they occupy a **Loadout** slot, never charge/fire, and only contribute their **Passive**.
- Seat targeting for **Passive**s is declared per catalog **Passive** (**own** / **enemy** / **both**), not a single product-wide rule.
- **Boon** filtering for **Passive**s: optional **effect kind** and/or **God** and/or **Weapon type** (AND when more than one); none means **all**. **Weapon type** gates on the carrier’s equipped **Weapon**.
- A **Passive** may only rewrite **Cooldown** and/or **potency** in this slice — not new combat verbs or on-fire extras.
- Each **Passive** stat change is authored as either **flat** or **percent** (not both layers on one change).
- After stacking, clamp **effective Cooldown** at **500ms** minimum and **effective potency** at **0** minimum; no extra maxima (heal caps at the seat’s max **Life total** — starting life — on apply).
- A **Passive** that matches its own carrier includes that carrier among recipients (no-op for stats the carrier lacks).
- When several **Passive**s hit the same **Boon** and stat, stack with `effective = (base × (1 + Σpercent)) + Σflat`, then clamp to **effective Cooldown** ≥ **500ms** and **effective potency** ≥ **0**. Duplicate **Boon** copies are not used in **Draft** (unique keys); stacking is across different carrier **Boons**.
- **Passive** conditions are out of scope for this slice (all present carriers are eligible); the every-wake recompute plus an eligibility re-eval hook is the forward-compatible path. Mid-charge `nextReadyAt` rewrite is required when that hook changes **effective Cooldown**.
- “Trigger” on a **Passive** condition means “eligibility changed, run re-eval” — not a second **Boon** fire. Fire-capable **Boons** still only fire via the **Cooldown** loop.
- The catalog may mix **fire-only**, **Passive**-only, and **hybrid** **Boons**; existing six stay **fire-only** unless later retrofitted.
- First **Passive** slice adds `haste_charm` (**Passive**-only: own-seat damage **−20% Cooldown**) and `vital_spark` (**hybrid**: heal 5 / 3.0s + own-seat heal **+2** potency).
- **Match start** draws five **Boons** uniformly with replacement from all eight catalog keys (no **Passive**-specific pool caps or fire guarantees).
- **Passive**-only **Loadout** slots use a distinct face (no charge bar); **hybrid** slots keep the fire face/bar and disclose the **Passive** in the popover.
- Match UI shows **effective Cooldown** / **effective potency** (client-derived; server remains authoritative for fires and `nextReadyAt`).

## Example dialogue

> **Dev:** "Is the person who creates the **Session** just a facilitator?"
> **Domain expert:** "No — they are the **Host**: seat 1 and the only one who can start the **Match**."

> **Dev:** "When a fight ends, do we tear down the **Session**?"
> **Domain expert:** "No — they go back to the **Lobby**. The **Host** can start another **Match** with the same seats."

> **Dev:** "Do the **Boons** themselves have HP?"
> **Domain expert:** "No — seats have a **Life total**. **Boons** only trigger effects; first **Life total** to 0 loses."

> **Dev:** "Can a **Boon** trigger on hit or only on a timer?"
> **Domain expert:** "Timers only in v1 — charge, fire, reset. No conditional triggers yet."

> **Dev:** "Do players keep their **Boons** between fights?"
> **Domain expert:** "Not in the prototype — each **Match** runs a fresh **Draft**; **Loadout** and **God pool** reset when you return to the **Lobby**."

> **Dev:** "Can the **Host** start alone to test?"
> **Domain expert:** "Not in this prototype — start needs exactly two admitted **Players**."

> **Dev:** "Whose machine decides who won?"
> **Domain expert:** "The server, live. It pushes **Match update**s with **animation hint**s; clients don't pre-receive a full replay to animate."

> **Dev:** "How much HP do we start with?"
> **Domain expert:** "100 **Life total**, 0 **Shield**, every **Match**."

> **Dev:** "What **Boons** exist in the prototype?"
> **Domain expert:** "Thirty-five — seven per **God** in the **God catalog (v1)**: Hermes, Dynamite, Hygieia, Athena, Zeus. Old spark/cannon keys are gone."

> **Dev:** "Does heal go above 100? Does shield stack?"
> **Domain expert:** "Heal caps at that seat’s starting max **Life total** (**100 + Vitality** with **Soul**, else **100**). Shield stacks by adding and only goes down when damage hits it."

> **Dev:** "What if we both die on the same tick?"
> **Domain expert:** "That's a **Draw** — no winner, back to the **Lobby**."

> **Dev:** "What if both sides only heal forever?"
> **Domain expert:** "At 60 seconds of sim time the **Match time cap** ends it — higher **Life total** wins, or **Draw** if tied."

> **Dev:** "If two **Boons** fire at the same time, who resolves first?"
> **Domain expert:** "Whatever **seat resolve order** was rolled for that **Match**, then slot index. Seat priority is random per **Match**, not always the **Host**."

> **Dev:** "Can a third friend join and watch?"
> **Domain expert:** "Not in this prototype — **Session** is full at 2/2 fighting **Players**; no spectators yet."

> **Dev:** "Do I see their **Boons** during the fight?"
> **Domain expert:** "Yes — both **Loadout**s and both bars are shared while **Match update**s stream in."

> **Dev:** "Who decides when we go back to the **Lobby**?"
> **Domain expert:** "The server — after the live **Match** ends plus a short results beat. Clients don't have to click Continue."

> **Dev:** "If I close the tab mid-fight, do I lose?"
> **Domain expert:** "No — the server keeps simulating. Reconnect to whatever state the **Session** is in."

> **Dev:** "Do we precompute the whole fight for a frontend animation player?"
> **Domain expert:** "No — live server countdown, small **Match update**s, **animation hint**s included."

> **Dev:** "Does the server tick every frame?"
> **Domain expert:** "No — event-driven. Wake at the next **Boon** ready-time (or time cap), resolve, push a **Match update**, schedule the next wake."

> **Dev:** "Who animates the cooldown bars?"
> **Domain expert:** "The frontend, optimistically from `nextReadyAt`. The server only confirms fires via **Match update**s."

> **Dev:** "Can a **Boon** only fire, or can it also buff other **Boons**?"
> **Domain expert:** "All three shapes are legal — **fire-only**, **Passive**-only, or **hybrid**. **Passive**-only never charges; it just contributes its **Passive** from the **Loadout** slot."

> **Dev:** "If two **Passive**s both shorten the same **Boon**'s **Cooldown**, how do they combine?"
> **Domain expert:** "Add the percents, add the flats, then `effective = (base × (1 + Σpercent)) + Σflat` and clamp. Two copies of the same **Boon** each add their **Passive**."

> **Dev:** "Do we bake effective stats once at **Match start**?"
> **Domain expert:** "No — recompute on every wake, and re-evaluate when a future **Passive** condition trigger fires. If **effective Cooldown** changes mid-charge, rewrite `nextReadyAt` by keeping the same progress fraction on the new **Cooldown**."

> **Dev:** "How do I tell a **Passive**-only slot from a charging one?"
> **Domain expert:** "Different face — **Passive** glyph and a short cue, no charge bar. Hybrids still look like fire **Boons**; read the popover for the **Passive**."

> **Dev:** "Does the popover show catalog **Cooldown** or the hasted one?"
> **Domain expert:** "**Effective** — same stacking math as the server. The bar already follows `nextReadyAt`; the label should not contradict it."

> **Dev:** "Is **Dynamite** the god of war?"
> **Domain expert:** "No — destruction. Slow, brutal damage — not Ares."

> **Dev:** "When does the fight clock start?"
> **Domain expert:** "After both seats finish **Draft**. **Match start** rolls **Soul**s, then **Weapon** pick (1 of 3), then **Draft** — the sim starts only when both finish drafting."

> **Dev:** "Can I see their picks while I'm drafting?"
> **Domain expert:** "No — simultaneous and hidden until the fight starts."

> **Dev:** "Someone went AFK in **Draft** — are we stuck?"
> **Domain expert:** "The **Host** can **Match cancel** back to the **Lobby** during **Draft** or the live fight. That doesn't archive the **Session**."

> **Dev:** "How do we shut the room down for the night?"
> **Domain expert:** "From the **Lobby**, the **Host** ends the **Session** into an **Archived session**. Not mid-**Match**."
