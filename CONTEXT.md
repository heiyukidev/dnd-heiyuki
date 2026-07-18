# Item auto-battler sessions

This context covers a two-player item auto-battler: players join a shared **Session**, receive **Items**, and those **Items** fight automatically. The product is pivoting away from D&D-style character combat; older sheet / battle-map language is retired.

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
The hit-point number for one **Player** seat during a **Match**. **Items** do not have hit points; they only fire effects. The first seat whose **Life total** reaches 0 loses that **Match** (the other seat wins). If both seats reach 0 at the same simulated instant, the **Match** is a **Draw**. Every **Match** starts both seats at **100** **Life total** and **0** **Shield**.

**Draw**:
A **Match** outcome where both seats' **Life total**s reach 0 at the same simulated instant—no winner. Also the outcome when the **Match time cap** expires with equal **Life total**s. Both **Players** still return to the **Lobby**.

**Match time cap**:
Maximum simulated duration of a **Match**: **60 seconds**. If neither seat has reached 0 **Life total** by then, the seat with the higher **Life total** wins; if equal, **Draw**. Guarantees every **Match** terminates.

**Seat resolve order**:
A random permutation of the two fighting seats, chosen once at **Match start**, used only to break ties when multiple **Items** fire at the same simulated timestamp. Not biased toward the **Host**.

**Shield**:
A temporary absorb buffer on a seat during a **Match**. Incoming damage hits **Shield** before **Life total** when a shield buffer is present. Matches start with **0** **Shield**. Shield does not decay over time in v1—only damage spends it. New shield effects **add** to the current buffer (no separate shield cap in the prototype).

**Item**:
A combat unit on a **Player**'s **Loadout**. An **Item** has a catalog identity and must provide at least one of: a **fire effect** (damage, heal, or shield + **Cooldown** loop), or a **Passive**. Three valid shapes: **fire-only**, **Passive-only**, or **hybrid** (both). **Items** do not have hit points. When a fire effect resolves: **damage** spends enemy **Shield** first then enemy **Life total** (floor 0); **heal** raises own **Life total** capped at **100**; **shield** adds to own **Shield** buffer. **Passive**-only **Items** never charge or fire.
_Avoid_: Treating **Passive**-only as a non-**Item** aura; requiring every **Item** to fire.

**Fire effect**:
The damage, heal, or shield application an **Item** performs when its **Cooldown** loop completes. Absent on **Passive**-only **Items**.

**Passive**:
A modifier attached to an **Item** that can rewrite matching **Items**' **Cooldown** and/or **potency** while the carrier is in a **Loadout**. On **hybrid** **Items** it sits alongside the **fire effect**; on **Passive**-only **Items** it is the whole card. Each **Passive** declares which seats it affects (**own**, **enemy**, or **both**), which **Items** in those seats receive it (**all**, or by **effect kind**: damage / heal / shield), and one or more changes to **Cooldown** and/or **potency**. Each change is either **flat** or **percent**, chosen per change on that **Passive**. When the carrier matches its own filter and seat target, it receives the modifier too (only meaningful for stats the carrier actually has — a **Passive**-only carrier has no **Cooldown** / potency of its own). Multiple matching **Passive**s stack additively by layer: `effective = (base × (1 + Σpercent)) + Σflat`, then clamp (**effective Cooldown** ≥ **500ms**, **effective potency** ≥ **0**). Duplicate **Loadout** copies each contribute their **Passive**. In this slice every **Passive** is **unconditional** (always eligible while the carrier is present); the live sim still **recomputes** **effective Cooldown** / **effective potency** on every wake so future **Passive** conditions can gate eligibility without a model change. Not a second **fire effect**.
_Avoid_: Aura (unless we later mean a seat-level effect that is not on an **Item**); conflating a **Passive** condition trigger with an **Item** fire.

**Cooldown**:
How long an **Item** with a **fire effect** charges before it fires. Those **Items** use the same loop: charge from empty to full over their **Cooldown**, fire once, reset, repeat until the **Match** ends. **Passive**-only **Items** have no **Cooldown**. A **Passive** may change the **effective Cooldown** of matching fire-capable **Items**; it does not introduce a different fire-trigger model. After stacking, **effective Cooldown** is floored at **500ms**.

**Effective Cooldown** / **effective potency**:
The **Cooldown** and potency values used by the live sim for an **Item** after all currently eligible matching **Passive**s are applied and clamped (**Cooldown** ≥ **500ms**, potency ≥ **0**). Catalog base values are unchanged. The sim recomputes these on every wake, and also whenever a **Passive** eligibility change is re-evaluated (the hook future **Passive** conditions will call when their trigger activates). If **effective Cooldown** changes mid-charge, rewrite `nextReadyAt` by **preserving charge progress fraction**: `nextReadyAt = now + (1 − progress) × newEffectiveCooldown`.

**Loadout**:
The multiset of **Items** a **Player** brings into a **Match**. In the prototype there is no inventory grid or placement puzzle—**Items** simply stack in the **Loadout**. Random assignment picks three entries from the combined catalog (**Item catalog (v1)** plus **Item catalog (Passive slice)**) with replacement (duplicates allowed); each fire-capable copy charges independently.

**Item catalog (v1)**:
The shipped prototype set of six **fire-only** **Item** definitions:

| Key | Effect | Potency | Cooldown |
|-----|--------|---------|----------|
| `spark` | damage | 8 | 2.0s |
| `cannon` | damage | 18 | 4.5s |
| `salve` | heal | 6 | 2.5s |
| `mend` | heal | 14 | 5.0s |
| `ward` | shield | 8 | 3.0s |
| `bulwark` | shield | 16 | 5.5s |

**Item catalog (Passive slice)**:
Extends the catalog with two new keys. All eight keys share one uniform random **Loadout** pool: three picks with replacement (a seat may roll zero or several **Passive**-bearing **Items**, including all **Passive**-only).

| Key | Shape | Fire | Passive |
|-----|--------|------|---------|
| `haste_charm` | **Passive**-only | — | own seat, damage **Items**, **−20% Cooldown** |
| `vital_spark` | **hybrid** | heal 5 / 3.0s | own seat, heal **Items**, **+2** flat potency |

**Match start**:
The **Host** action that leaves the **Lobby** and begins a **Match**. Allowed only when the **Session** is in **Lobby** and there are exactly two admitted fighting **Players** (**Host** + one approved joiner). Pending **Join request**s do not count; no solo or bot match in this prototype. On start, the server assigns each seat a fresh random **Loadout** of three **Items** from the combined eight-key catalog and begins a **live** server-side countdown/sim. There is no shop, draft, or rearrange step. The next **Match** re-rolls both **Loadout**s; nothing persists between fights yet.
_Avoid_: Precomputing the entire fight into a replay timeline for the client to animate locally.

**Match update**:
A small server-pushed delta during a live **Match**: what just changed in combat state (for example which **Item** fired, **Life total** / **Shield** changes, terminal outcome when the **Match** ends) plus an **animation hint**. Clients subscribe and react; they do not run the rules sim and do not reconstruct a full offline replay. The live sim is **event-driven**: the server schedules the next wake for the soonest **Item** ready-time (or the **Match time cap**), resolves that instant (including same-timestamp ties via **seat resolve order**), pushes a **Match update**, then schedules the next wake—no fixed empty tick loop.

**Animation hint**:
A compact, server-authored cue on a **Match update** telling the client what presentation to play (for example seat/slot that fired and effect kind: damage / heal / shield). Not a full animation scripted timeline; not “client invents flair from raw HP alone.”

**Cooldown presentation**:
Each fire-capable **Loadout** slot exposes a server `nextReadyAt` (set at **Match start**, refreshed after that slot fires, and rewritten on mid-charge **effective Cooldown** changes). The frontend animates charge fill **optimistically** toward that time on its own—no server stream of charge frames. When a **Match update** arrives for a fire, the client reconciles bars/state to the server and continues optimistic charge animation from the new `nextReadyAt`. Face and popover **Cooldown** / potency numbers show **effective** values (client-derived from both **Loadout**s + catalog via the same stacking rules), not raw catalog bases. **Passive**-only slots have no `nextReadyAt` and no charge bar: their face uses a distinct **Passive** glyph plus a short modifier cue; full **Passive** wording lives in the popover. **Hybrid** slots keep the fire face (effect icon + **effective** potency + charge bar) and put **Passive** wording in the popover only.

**Same-timestamp resolve**:
When multiple **Items** become ready at the same simulated instant, resolve using the **Match**'s random **seat resolve order**, then **Loadout** slot index (0 → 2). During a live **Match** both **Players** see both **Loadout**s and both **Life total** / **Shield** bars. When the **Match** ends, the server waits a short results beat (~2 seconds) then returns the **Session** to **Lobby**—clients do not gate that transition.

## Relationships

- A **Session** has exactly one **Host** (the creator).
- A **Session** has up to two fighting **Players** in the prototype (**Host** + one joiner). A third user is not admitted as a fighting **Player** (no spectators yet).
- A **Join link** identifies exactly one **Session**.
- A user becomes a **Player** only after the **Host** approves their **Join request**.
- Only the **Host** may start a **Match**, and only from the **Lobby**, and only when both fighting seats are filled.
- A **Session** may host zero or more **Matches** over its lifetime; at most one **Match** is active at a time.
- Ending a **Match** returns both **Players** to the **Lobby**; it does not end the **Session**.
- A **Match** ends when a seat hits 0 **Life total**, both hit 0 together (**Draw**), or the **Match time cap** resolves a winner/**Draw**.
- The **Host** may end the **Session** from the **Lobby**, producing an **Archived session**.
- During a **Match**, each fighting **Player** has exactly one **Life total** (and may have a **Shield** buffer).
- Each fighting **Player** has one **Loadout** of **Items** for a **Match**.
- An **Item** is **fire-only**, **Passive**-only, or **hybrid**; it must have a **fire effect**, a **Passive**, or both.
- An **Item** may carry at most one **Passive**.
- Each **Passive** declares a seat target (**own**, **enemy**, or **both**), an **Item** filter (**all**, or by **effect kind**), and one or more stat changes to **Cooldown** and/or **potency**.
- Every fire-capable **Item** in a **Loadout** charges in parallel on the shared **Match** clock; **Passive**-only slots do not schedule wakes. **effective Cooldown** / **effective potency** are recomputed on every wake and whenever **Passive** eligibility is re-evaluated (future condition triggers call that re-eval).
- When **effective Cooldown** changes mid-charge, rewrite `nextReadyAt` by preserving charge progress fraction: `nextReadyAt = now + (1 − progress) × newEffectiveCooldown`.
- **Match start** assigns both **Loadout**s and starts the live server sim; those **Loadout**s do not carry over to the next **Match**.
- Clients never invent **Match** outcomes; they apply **Match update**s (with **animation hint**s) from the server.
- The server does **not** ship a full precomputed fight replay for a separate client animation layer.

## Flagged ambiguities

- Legacy D&D sheet / battle-map / turn-order language is retired for this product direction.
- Combat transport shape is recorded in [ADR 0001](docs/adr/0001-live-event-driven-match-updates.md).
- **Passive** effective-stat recompute / mid-charge `nextReadyAt` rewrite is recorded in [ADR 0002](docs/adr/0002-passive-effective-stats-reeval.md).
- “Item card” in UI talk means the Match **Loadout** slot presentation of an **Item**, not a separate domain object. There is no shop/inventory card surface in the prototype.
- “Passive Item” as a never-firing slot was **reopened**: **Passive**-only **Items** are valid; they occupy a **Loadout** slot, never charge/fire, and only contribute their **Passive**.
- Seat targeting for **Passive**s is declared per catalog **Passive** (**own** / **enemy** / **both**), not a single product-wide rule.
- **Item** filtering for **Passive**s is likewise per catalog entry (**all** or by **effect kind**); no tag/key filters in this slice.
- A **Passive** may only rewrite **Cooldown** and/or **potency** in this slice — not new combat verbs or on-fire extras.
- Each **Passive** stat change is authored as either **flat** or **percent** (not both layers on one change).
- After stacking, clamp **effective Cooldown** at **500ms** minimum and **effective potency** at **0** minimum; no extra maxima (heal still caps at 100 **Life total** on apply).
- A **Passive** that matches its own carrier includes that carrier among recipients (no-op for stats the carrier lacks).
- When several **Passive**s hit the same **Item** and stat, stack with `effective = (base × (1 + Σpercent)) + Σflat`, then clamp to **effective Cooldown** ≥ **500ms** and **effective potency** ≥ **0**; each duplicate copy contributes.
- **Passive** conditions are out of scope for this slice (all present carriers are eligible); the every-wake recompute plus an eligibility re-eval hook is the forward-compatible path. Mid-charge `nextReadyAt` rewrite is required when that hook changes **effective Cooldown**.
- “Trigger” on a **Passive** condition means “eligibility changed, run re-eval” — not a second **Item** fire. Fire-capable **Items** still only fire via the **Cooldown** loop.
- The catalog may mix **fire-only**, **Passive**-only, and **hybrid** **Items**; existing six stay **fire-only** unless later retrofitted.
- First **Passive** slice adds `haste_charm` (**Passive**-only: own-seat damage **−20% Cooldown**) and `vital_spark` (**hybrid**: heal 5 / 3.0s + own-seat heal **+2** potency).
- **Match start** draws three **Items** uniformly with replacement from all eight catalog keys (no **Passive**-specific pool caps or fire guarantees).
- **Passive**-only **Loadout** slots use a distinct face (no charge bar); **hybrid** slots keep the fire face/bar and disclose the **Passive** in the popover.
- Match UI shows **effective Cooldown** / **effective potency** (client-derived; server remains authoritative for fires and `nextReadyAt`).

## Example dialogue

> **Dev:** "Is the person who creates the **Session** just a facilitator?"
> **Domain expert:** "No — they are the **Host**: seat 1 and the only one who can start the **Match**."

> **Dev:** "When a fight ends, do we tear down the **Session**?"
> **Domain expert:** "No — they go back to the **Lobby**. The **Host** can start another **Match** with the same seats."

> **Dev:** "Do the **Items** themselves have HP?"
> **Domain expert:** "No — seats have a **Life total**. **Items** only trigger effects; first **Life total** to 0 loses."

> **Dev:** "Can an **Item** trigger on hit or only on a timer?"
> **Domain expert:** "Timers only in v1 — charge, fire, reset. No conditional triggers yet."

> **Dev:** "Do players keep their **Items** between fights?"
> **Domain expert:** "Not in the prototype — **Match start** re-rolls three random **Items** for each seat every time."

> **Dev:** "Can the **Host** start alone to test?"
> **Domain expert:** "Not in this prototype — start needs exactly two admitted **Players**."

> **Dev:** "Whose machine decides who won?"
> **Domain expert:** "The server, live. It pushes **Match update**s with **animation hint**s; clients don't pre-receive a full replay to animate."

> **Dev:** "How much HP do we start with?"
> **Domain expert:** "100 **Life total**, 0 **Shield**, every **Match**."

> **Dev:** "What **Items** exist in the prototype?"
> **Domain expert:** "Six **fire-only** in the **Item catalog (v1)**, plus `haste_charm` (**Passive**-only damage tempo) and `vital_spark` (heal hybrid). **Match start** rolls three per seat uniformly with replacement from all eight — yes, you can get unlucky with three charms."

> **Dev:** "Does heal go above 100? Does shield stack?"
> **Domain expert:** "Heal caps at 100. Shield stacks by adding and only goes down when damage hits it."

> **Dev:** "What if we both die on the same tick?"
> **Domain expert:** "That's a **Draw** — no winner, back to the **Lobby**."

> **Dev:** "What if both sides only heal forever?"
> **Domain expert:** "At 60 seconds of sim time the **Match time cap** ends it — higher **Life total** wins, or **Draw** if tied."

> **Dev:** "If two **Items** fire at the same time, who resolves first?"
> **Domain expert:** "Whatever **seat resolve order** was rolled for that **Match**, then slot index. Seat priority is random per **Match**, not always the **Host**."

> **Dev:** "Can a third friend join and watch?"
> **Domain expert:** "Not in this prototype — **Session** is full at 2/2 fighting **Players**; no spectators yet."

> **Dev:** "Do I see their **Items** during the fight?"
> **Domain expert:** "Yes — both **Loadout**s and both bars are shared while **Match update**s stream in."

> **Dev:** "Who decides when we go back to the **Lobby**?"
> **Domain expert:** "The server — after the live **Match** ends plus a short results beat. Clients don't have to click Continue."

> **Dev:** "If I close the tab mid-fight, do I lose?"
> **Domain expert:** "No — the server keeps simulating. Reconnect to whatever state the **Session** is in."

> **Dev:** "Do we precompute the whole fight for a frontend animation player?"
> **Domain expert:** "No — live server countdown, small **Match update**s, **animation hint**s included."

> **Dev:** "Does the server tick every frame?"
> **Domain expert:** "No — event-driven. Wake at the next **Item** ready-time (or time cap), resolve, push a **Match update**, schedule the next wake."

> **Dev:** "Who animates the cooldown bars?"
> **Domain expert:** "The frontend, optimistically from `nextReadyAt`. The server only confirms fires via **Match update**s."

> **Dev:** "Can an **Item** only fire, or can it also buff other **Items**?"
> **Domain expert:** "All three shapes are legal — **fire-only**, **Passive**-only, or **hybrid**. **Passive**-only never charges; it just contributes its **Passive** from the **Loadout** slot."

> **Dev:** "If two **Passive**s both shorten the same **Item**'s **Cooldown**, how do they combine?"
> **Domain expert:** "Add the percents, add the flats, then `effective = (base × (1 + Σpercent)) + Σflat` and clamp. Two copies of the same **Item** each add their **Passive**."

> **Dev:** "Do we bake effective stats once at **Match start**?"
> **Domain expert:** "No — recompute on every wake, and re-evaluate when a future **Passive** condition trigger fires. If **effective Cooldown** changes mid-charge, rewrite `nextReadyAt` by keeping the same progress fraction on the new **Cooldown**."

> **Dev:** "How do I tell a **Passive**-only slot from a charging one?"
> **Domain expert:** "Different face — **Passive** glyph and a short cue, no charge bar. Hybrids still look like fire **Items**; read the popover for the **Passive**."

> **Dev:** "Does the popover show catalog **Cooldown** or the hasted one?"
> **Domain expert:** "**Effective** — same stacking math as the server. The bar already follows `nextReadyAt`; the label should not contradict it."

> **Dev:** "How do we shut the room down for the night?"
> **Domain expert:** "From the **Lobby**, the **Host** ends the **Session** into an **Archived session**. Not mid-**Match**."
