# D&D-style combat sessions

This context covers a digital table where a facilitator runs combat-heavy play: one facilitator creates a **Session**, players join with accounts, and state changes are authoritative from the facilitator in early versions.

## Language

**Session**:
A facilitator-created space that other people join to play together for a stretch of time; it is the canonical unit of membership and shared state. In v1 the **Dungeon Master** may **end** it into an **Archived session** state: read-only record, no new **Join request**s, no live edits—preserved for history rather than deleted.
_Avoid_: "Room" for this concept (reserve **room** for in-fiction locations such as a dungeon room where a fight happens).

**Dungeon Master**:
The authenticated user who creates a **Session** and is trusted to change any values the product exposes for that session (including every character sheet). Many people say **Game Master** or **GM** interchangeably; v1 product language uses **Dungeon Master** as the canonical label.
_Avoid_: Using "room" when you mean **Session**.

**Player**:
An authenticated user in a **Session** who is not the **Dungeon Master**; in v1 there are no spectators and no co-GMs—only **Dungeon Master** and **Player** roles.

**Join link**:
A shareable URL the **Dungeon Master** gives out so an authenticated user can start a **Join request** for that **Session**.

**Join request**:
An authenticated user's pending entry into a **Session** opened via its **Join link**; they are not a **Player** until the **Dungeon Master** approves the request (v1). While pending, they see almost nothing beyond a clear waiting state and optionally the **Session** display name—no sheets, board, or other participants' identities (v1).

**Battle map**:
The combat-facing play surface the **Dungeon Master** prepares inside a **Session** (layout and whatever tokens or positions v1 supports).
_Avoid_: Using "map" to mean the joinable **Session** itself.

**Character class**:
A D&D-style archetype package (including baseline stats the table cares about) configured for a **Session**; the product provides defaults and the **Dungeon Master** controls how many/options exist for that **Session** as the session’s **template library**.
_Avoid_: Saying "class" without context when you mean this archetype — not a programming **class**.

**Session character**:
A concrete figure in a **Session** (name, numbers, inventory as modeled) using **one shared schema** for every figure at the table—party members and **NPC**s alike. People may still say "player sheet" in conversation for any of them, including **NPC**s, but the domain term is **Session character**.
_Avoid_: Treating **NPC** as a different data type from a party member; the difference is **story role** and **who may control** the figure, not the shape of the record.

**Character sheet**:
The **Session character** data as shown in the UI; the **Dungeon Master** can see every **Character sheet** in the **Session**, while a **Player** only sees the sheets they are permitted to see (v1: typically their bound **Session character**).

**NPC**:
A **Session character** used as a non-party figure (monster, ally, patron, etc.). The **Dungeon Master** may run it alone or bind a **Player** (for example a guest for the night) to act it—same **Character sheet** shape in all cases.

**Table roll**:
A dice resolution the **Dungeon Master** triggers for everyone at the **Session** to witness (v1). The final outcome is **authoritative for the table** (not privately invented on one device), and v1 **requires** a shared **animated presentation** on a **synchronized beat**—shared start and reveal timing—so every participant sees the **same result** the **Dungeon Master** rolled, not staggered per-device finishes. In v1 every **Table roll** is **public**: all **Players** in the **Session** see the outcome (no **Dungeon Master**-only hidden **Table roll** yet).
_Avoid_: Generating the final value only on the client in a way that could disagree with what others see.

**Turn order**:
A **Dungeon Master**-controlled, manually reorderable list for the current fight (v1): entries are **Session character**s in one **mixed** strip—party members and **NPC**s together—reflecting who acts when, ordered after whatever **Table roll**s or table talk the group uses. The app does not auto-enforce full D&D initiative rules; the **Dungeon Master** is the source of truth for sequence. Between fights, v1 gives the **Dungeon Master** an explicit control (for example **New fight**) to clear **Turn order** and **Spotlight** together before building the next encounter’s list.

**Spotlight**:
A **Dungeon Master** action in v1 that quickly **highlights** one **Session character** on the table so everyone sees whose moment is in focus (paired with **Turn order** but not the same thing: order is the queue, **Spotlight** is the immediate visual cue).

**Archived session**:
A **Session** the **Dungeon Master** has formally ended (v1): the table becomes **read-only**—no continued play in that same space, no mutations to sheets, map, **Turn order**, or live play mechanics. **Players** retain **the same read visibility they had during live play** (nothing new is revealed to them in archive).

## Relationships

- A **Session** has exactly one **Dungeon Master** (the creator / owner for v1 unless you decide otherwise later).
- A **Session** has zero or more **Players** (v1: no spectators, no co-GMs).
- A **Join link** identifies exactly one **Session** for the purpose of starting a **Join request** there.
- A user becomes a **Player** only after the **Dungeon Master** approves their **Join request** (v1).
- **Session setup (v1, intended flow)**: the **Dungeon Master** creates a **Session**, prepares the **Battle map**, configures the **Character class** template library and the set of **Session character** records—including party figures and **NPC**s (two separate knobs for templates vs how many figures exist), then generates a **Join link** for **Players** to request entry.
- A **Player** is bound to exactly one **Session character** at a time for what they may view and (when you add it) act on; the **Dungeon Master** may change which **Session character** that is, including binding a guest **Player** to an **NPC** for part of a **Session**.
- **Table roll** events belong to a **Session** and are visible to everyone who is already in that **Session** (v1: after **Join request** approval for **Players**).
- **Turn order** and **Spotlight** state belong to a **Session** (v1); only the **Dungeon Master** may reorder the **Turn order** or trigger **Spotlight**.
- A **Session** becomes an **Archived session** when the **Dungeon Master** ends it (v1); **Join link**s stop admitting new play, and the record is kept for history.

## Example dialogue

> **Dev:** "When someone opens a **Join link**, are they already a **Player**?"
> **Domain expert:** "No — they have a **Join request** until the **Dungeon Master** approves; then they become a **Player**."

> **Dev:** "Can a **Table roll** be numbers-only on screen?"
> **Domain expert:** "No for v1 — we want the **animation**; the number still has to match what the **Session** recorded so nobody argues about it."

> **Dev:** "Do **Players** ever see a different number than the **Dungeon Master** rolled?"
> **Domain expert:** "No — they see the **Session** outcome from the **Dungeon Master**'s roll, on the same beat as everyone else."

> **Dev:** "Does the app sort initiative for us?"
> **Domain expert:** "No — we roll with **Table roll**, then the **Dungeon Master** drags the **Turn order**; there is also a **Spotlight** button to highlight whose beat it is."
