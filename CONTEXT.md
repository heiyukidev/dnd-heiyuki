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
An authenticated user in a **Session** who is not the **Dungeon Master**; in v1 there are no spectators and no co-GMs—only **Dungeon Master** and **Player** roles. If a **Player** is only **temporarily disconnected** (for example network loss or closing the browser) but remains admitted to that **Session**, v1 persists their **Binding** to their current **Session character** so reconnecting restores the same seat without **Dungeon Master** rework. When a user **ceases to be a Player** in that **Session** (for example their seat is revoked by the **Dungeon Master** or the **Session** becomes an **Archived session**, ending live membership), their **Binding** to any **Session character** there clears in v1 as part of that change.

**Binding**:
Which **Session character** an admitted **Player** is attached to in a **Session** for v1 (what they may view and, when added, act through); only the **Dungeon Master** may set or change it. **Binding** persists across a **temporary disconnect**; when a user **ceases to be a Player** (see **Ceases to be a Player**), **Binding** clears with live membership. Seat labels preserved in an **Archived session** are read-only history (exact retention is a product implementation detail).

**Temporary disconnect**:
An admitted **Player**’s client losing live connection or the tab closing without that user having **ceased to be a Player** in the **Session** (v1); **Binding** persists so the same seat applies when they return.

**Ceases to be a Player**:
No longer admitted to live play in that **Session** as a **Player** in v1—for example **Dungeon Master** revokes the seat or the **Session** becomes an **Archived session** (live membership ends). **Binding** clears accordingly.

**Session nickname**:
An optional display name for a **Player**'s seat in a specific **Session**; only the **Dungeon Master** may set or change it. When set, every participant sees it wherever that **Player** is named in **Session** UI; when unset, the product falls back to the account-backed label (for example from Clerk).

**Join link**:
A shareable URL the **Dungeon Master** gives out so an authenticated user can start a **Join request** for that **Session**.

**Join request**:
An authenticated user's pending entry into a **Session** opened via its **Join link**; they are not a **Player** until the **Dungeon Master** approves the request (v1). While pending, they see almost nothing beyond a clear waiting state and optionally the **Session** display name—no sheets, board, or other participants' identities (v1). The **Dungeon Master** may instead **reject** the request; the user is not admitted but may start a new **Join request** to the same **Session** later (v1).

**Session play shell**:
The live **Session** participant layout places a thin **top bar** carrying **Session** identity and **session-wide** cues (for example **Archived session** read-only or connection status) above a **full-bleed** **Battle map**: the **hex** grid uses the full viewport width available below the **top bar** in this desktop-class slice (handheld and small-tablet reflow remain out of scope), with no flex columns carved out of that canvas for side chrome and no narrow “card” cap on the map width—the tactical surface runs edge to edge under the overlays. **Dungeon Master**-only **Session** management (**Player** roster / admission, **Battle map** footprint and related controls, **Figures** / **unplaced** placement affordances, **Join** requests, and the like) lives in a **fixed-width**, **edge-anchored overlay** pinned to the **leading** screen edge in LTR; it draws **on top of** the map, is **not** a free-floating window the user drags to arbitrary positions in v1, and the product may use a light backdrop dim when open so it reads clearly against the grid. **Players** do **not** get this leading overlay in v1. **Turn order** is shown in a separate **fixed-width**, **edge-anchored overlay** pinned to the **trailing** edge, **persistent** in live play for every admitted participant, **read-only** for **Players**, with **Dungeon Master**-only reorder and **Spotlight** controls per rules elsewhere in this document; it also sits **on top of** the map (same “no arbitrary drag” rule). **Turn order** and **Player** roster therefore stay **distinct surfaces**—queue on the trailing overlay, seats only in the **Dungeon Master** leading overlay—not merged into one list. Each participant may **collapse** or **expand** the overlays on their own screen to reduce occlusion of the grid; those choices are **per device**, **not** part of **Session** state, and do not change what anyone else sees. When **collapsed**, each overlay leaves a small **edge-anchored handle** on the map (for example a chevron or narrow strip) so **expand** stays one obvious click without using the **top bar** as the only recovery path. The **Turn order** overlay defaults **expanded** on first visit per device, and the product **remembers** each participant’s last **expanded** vs **collapsed** choice for later **Session** joins; on first visit per device, the **Dungeon Master**’s leading overlay defaults **open** (**expanded**) and the product similarly **remembers** its last open/closed state for that participant. **Players** have no leading overlay. Neither overlay is user-resizable in this slice. A user with only a **pending Join request** does **not** enter this shell in v1—they stay on the dedicated join / waiting experience until they become a **Player**.

**Battle map**:
The combat-facing play surface the **Dungeon Master** prepares inside a **Session**. **Map placement** follows **Session character** figures, not whether a **Player**’s client is momentarily connected (v1): a **temporary disconnect** does not by itself remove that figure’s token from the grid. In v1 it is a **plain hex grid** only—no **Dungeon Master**-supplied background image or map art layer under the **hex**es, and no printed **hex** coordinate labels or axis markings on the grid for anyone (fully unlabeled in v1). The **Battle map footprint** (width and height in **hex**es) is set by the **Dungeon Master** within a product-enforced maximum; convenience presets are fine, but the **Dungeon Master** is still the source of truth for the size. Each **Session character** may occupy at most one **hex** at a time for placement purposes (party and **NPC** alike), and at most one **Session character** may occupy a given **hex** at a time—no shared or stacked **hex**es in v1. Positions on the **Battle map** represent where that figure stands in the fight—not where a **Player** account sits; the **Player** roster stays separate. Every participant in the **Session** sees the same **placed** tokens on the **Battle map** in v1—no **Dungeon Master**-only hidden figures or fog-of-war on the grid; if a **Session character** has **map placement**, everyone at the table sees that token there, labeled with that figure’s usual **Session character** display name. A roster or palette of **unplaced** figures for **map placement** is **Dungeon Master**-only in v1—**Players** do not see which **Session character**s exist off the grid through that UI (they may still learn of figures through other **Session** surfaces such as **Character sheet** visibility rules). This does not change who may open which **Character sheet**—sheet visibility can still differ; the **Battle map** is a shared tactical picture for **placed** figures. Only the **Dungeon Master** may change a figure’s **map placement** (including first placing figures that are not yet on the grid); **Players** observe the **Battle map** but do not drag tokens in v1. Pan and zoom on the **Battle map** are **per device** in v1—not part of the **Session**’s shared state—while **Map placement**, **Battle map footprint**, and the grid itself remain the same for everyone. **Pan** uses **Alt/Option+drag** on the grid (including **hex**es and **token**s), or **drag** on empty **viewport** margin without **Alt**; **Space** recenters a **Player**’s view on that **Player**’s **bound** figure when that **Session character** is **placed** on the grid, while **Dungeon Master** **Space** does nothing.
_Avoid_: Using "map" to mean the joinable **Session** itself; saying "players on the map" when you mean **Session character** tokens.

**Battle map footprint**:
How many **hex** columns and rows the **Battle map** grid has for that **Session** in v1; only the **Dungeon Master** may set or change it, and the product enforces an upper bound so layouts stay usable. The **Battle map** keeps a fixed **grid origin** in v1: growth adds empty **hex**es only beyond the previous farthest column and farthest row (append on the **trailing** column edge and **bottom** row edge in the product’s default layout); shrink removes **hex**es from those same outer edges first, so any **hex** that still exists keeps the same coordinates and **placed** figures do not slide. If the **Dungeon Master** shrinks the footprint, any **Session character** whose **map placement** referenced a **hex** that no longer exists becomes **unplaced** until the **Dungeon Master** sets a valid **hex** again.

**Map placement**:
Which **hex** (if any) each **Session character** occupies on the **Battle map** for the current fight; authoritative in the **Session** and editable only by the **Dungeon Master** in v1. The **Dungeon Master** may place or move **any Session character** in the **Session**; **map placement** is not limited to figures that appear in **Turn order**. To choose which figure the next **hex** action applies to, the **Dungeon Master** uses one shared placement selection in the UI—either the **Figures** / **unplaced** surfaces in the leading **Dungeon Master** overlay or a row click on the **Turn order** overlay; both paths set the same state, and **hex** placement or clear behaves the same afterward. **Players** do not receive that selection or **hex** editing in v1 (see **Session play shell**). Placement is **free** in v1—the **Dungeon Master** may put a token on any **unoccupied hex** within the **Battle map footprint** in one action, with no enforced movement range, speed, or pathing rules. A figure with no **hex** is **unplaced**. A **hex** may hold at most one figure; placing or moving a token onto an occupied **hex** is invalid in v1. **New fight** clears **Map placement** so every **Session character** is **unplaced** until the **Dungeon Master** positions them again.

**Unplaced**:
A **Session character** has no **hex** on the **Battle map**—for example never positioned yet, reset by **New fight**, or left without a valid **hex** after the **Dungeon Master** shrank the **Battle map footprint**.

**Character class**:
A D&D-style archetype package (including baseline stats the table cares about) configured for a **Session**; the product provides defaults and the **Dungeon Master** controls how many/options exist for that **Session** as the session’s **template library**.
_Avoid_: Saying "class" without context when you mean this archetype — not a programming **class**.

**PHB class roster (v1)**:
For v1 the product treats the _Player’s Handbook_ **twelve base classes** as the single canonical roster. That roster is the shared vocabulary for both the **Session** **Character class** template keys (`characterClassKey` on **Session character**s) and the class picked on each **Character sheet** multiclass row (`classLevels`); the table is not offering other official books’ classes (for example Artificer) until that choice is revisited. Stored multiclass rows keep a **stable class key** from that roster only—**not** a separate free-text class display string; PHB labels are derived when rendering. Rows that still carry legacy free-text values **resolve best-effort** to a roster key (for example case-insensitive match on key or label); **unmappable rows are dropped** on load without blocking the sheet, and the next successful save persists the cleaned rows so the **Dungeon Master** can re-add anything missing using the roster pickers.
_Avoid_: Using “PHB class” to mean “any 5e class the group might play at the table” when you mean this **PHB class roster (v1)** product list.

**PHB race roster (v1)**:
For v1 the product treats the _Player’s Handbook_ **nine base playable races** as the single canonical roster for the **Character sheet** `race` field (stable key only; PHB labels when rendering). Legacy free-text values **resolve best-effort** to a roster key; **unmappable values clear** to empty on load without blocking the sheet, and the next successful save persists the cleaned value so the participant can pick from the roster.

**Session character**:
A concrete figure in a **Session** (name, numbers, inventory as modeled) using **one shared schema** for every figure at the table—party members and **NPC**s alike. People may still say "player sheet" in conversation for any of them, including **NPC**s, but the domain term is **Session character**. When first added to a **Session** in v1, a **Session character** starts **unplaced** with no automatic **Turn order** entry; the **Dungeon Master** applies **map placement** and adds them to **Turn order** when they decide. If a **Session character** is removed from the **Session** in v1, they disappear from every live **Session** mechanic that referenced them (**Map placement**, **Turn order**, **Spotlight** when it was on that figure, and the like)—no ghost token or dangling entry for a missing figure.
_Avoid_: Treating **NPC** as a different data type from a party member; the difference is **story role** and **who may control** the figure, not the shape of the record.

**Character sheet**:
The **Session character** data as shown in the UI; the **Dungeon Master** can see every **Character sheet** in the **Session**, while a **Player** only sees the sheets they are permitted to see (v1: typically their bound **Session character**). In the **Session play shell**, both the **Dungeon Master** and **Players** open **Character sheet**s from the **top bar** in v1—the **Dungeon Master**’s control lists every **Session character**, while a **Player**’s lists only permitted sheets—so sheet access is not tied to receiving the leading **Dungeon Master** overlay; the product may still offer optional shortcuts from that overlay (for example while managing a figure). Each participant has at most one **Character sheet** view open at a time on a device in v1; choosing a different figure replaces that view rather than stacking multiple sheets. The intended full **Character sheet** layout and section labels follow **D&D 5th edition** Player’s Handbook style (abilities, saves, skills, combat numbers, attacks, equipment, features, spellcasting where applicable, personality blocks, etc.) as the table’s shared visual and vocabulary reference—not a claim that the app implements every 5e rule automatically.

**D&D 5th edition sheet (reference)**:
The **Character sheet** presentation and field groupings the product targets, aligned with the D&D 5e PHB **Character sheet** for naming and familiar section order. Domain experts may still say “5e sheet” in conversation.

**Sheet numbers (v1)**:
Values on a **Character sheet** (totals, modifiers, DCs, passives, and similar) are whatever participants enter for that **Session character**—the product does **not** automatically recompute them from other fields as if it were enforcing full 5e math in v1; the table treats the sheet like paper for arithmetic authority. The product may still show a **read-only XP progress hint** next to **Experience points**: it parses the typed total XP and compares it to the _Player’s Handbook_ cumulative XP threshold for the **next** level, using the sum of **classLevels** as the character’s total level for that hint only—it does **not** automatically level the **Session character** or override what the table agrees.

**Character sheet editing (v1)**:
In a live **Session**, the **Dungeon Master** may edit every **Character sheet** field the product exposes for any **Session character**. An admitted **Player** may edit **Character sheet** fields only for the **Session character** they are **bound** to; they do not edit other figures’ sheets. **Archived session** freezes these edits like all other live mutations.

**Dungeon Master–only sheet fields (v1)**:
Some **Character sheet** fields are controlled only by the **Dungeon Master** regardless of **Character sheet editing (v1)**. In v1, multiclass **classes & levels** (`classLevels`) follows that rule: **Players** with **Character sheet** access see them **read-only**; the server ignores **Player** patches that would change those values.

**Character sheet sync (v1)**:
In live play, **Character sheet** edits are persisted on **debounced autosave** after the editor pauses (not withheld until a separate **Save** action in v1), so the **Session** stays the shared source of truth without a manual commit step for routine typing.

**Character sheet concurrency (v1)**:
When more than one client writes overlapping changes to the same **Session character**, v1 resolves them by **last write wins** at the server—no operational-transform merge, field locks, or special automatic precedence beyond each editor’s normal **Character sheet editing (v1)** rights.

**Character sheet import (v1)**:
The product does not offer import of **Character sheet** data from external character builders, files, or APIs in v1; tables enter information in the product or paste **plain text** into the provided fields.

**Character sheet sections (v1)**:
The **Character sheet** mixes **structured fields** for the compact, always-present combat-facing header (for example identity line, armor class, hit points, speed, initiative, ability scores, proficiency bonus, hit dice, death saves—exact set follows the PHB-style layout) with **multi-line text areas** for list-heavy PHB blocks (attacks and spellcasting summary, features and traits, personality text, spell lists, and similar) so v1 stays easy to ship without modeling every line item as its own record. Those multi-line areas accept **plain text** only in v1—line breaks are fine; the product does not interpret Markdown or other rich markup for rendering. Deeper structure or formatted text for those lists can arrive later if the table needs it.

**Equipment (v1)**:
Equipment is split for the sheet UI: **`equippedLoadout`** holds at most one bundled **SRD / OGL** item per **equip slot**—optional catalog slugs (`weapon`, `armor`, `shield`, `gear`; each a lowercase kebab **`catalogIndex`** or absent / “none” in the UI). **`equipmentItems`** is the **carried** list (consumables, **other**, and uncategorized rows): each row has client-stable `id`, `name`, optional free-text `quantity`, optional `weightLb` (filled from the catalog when a row is catalog-backed and otherwise treated as plain text if ever present), optional `category` (the carried editor exposes consumable / other / unset only), optional **`catalogIndex`**, and optional **`equipped`** (still in the schema; not shown in the current carried layout—slots replace the old “equip checkbox” story for weapon/armor/shield/gear). Carried **name** choices come from SRD catalog subsets that omit the four equip-slot categories except the consumable-only list when the row is consumable. On load, legacy rows whose `category` was a slot category are migrated into **`equippedLoadout`** when possible (first match per slot), with any extras reclassified to **other** so nothing is silently dropped. The in-repo catalog is **SRD-only on purpose** so the product does not ship proprietary PHB/DMG-style item dumps (see **Wizards of the Coast and IP guardrails**). Blank-name rows are dropped on persist. Optional free-text **equipment notes** remain in the legacy `equipment` field (for example container contents or narrative). The typed **Armor class** line stays authoritative; an optional hint may use **equipped** armor and shield from this equipment model (see **Armor class (v1)**).

**Armor class (v1)**:
**Armor class** on the **Character sheet** is whatever total the table agrees is correct for the moment—entered as **plain text** (usually a number, sometimes a note). The product does **not** overwrite that field from equipment or stats; a **read-only** hint may show an SRD-only total from **equipped** armor, shield, and **Dexterity** for convenience—natural armor, class features, magic, and temp effects stay manual, same spirit as **Speed (v1)**.

**Initiative (v1)**:
The **Initiative** field in the combat-facing header is **plain text** the table maintains as **combat-order support**—for example a modifier, the last rolled total, advantage or other roll notes, or a scratch value—not a stat the product derives from **Dexterity**, features, or equipment. It is **not** a second source of truth for who goes when: reordering **Turn order** does **not** read or update this field, and editing the field does **not** change **Turn order**. **Turn order** for a fight remains a **Dungeon Master**-ordered list that reflects whatever **Table roll**s or table talk the group used (see **Turn order**), not an automated initiative sort.

**Speed (v1)**:
In D&D-style play, **speed** is how far a creature can usually move on its own turn (commonly given in feet per round, before halving for difficult terrain or other effects), as set by ancestry, class features, armor, spells, and conditions. On the **Character sheet** the typed **speed** stays **plain text** the table keeps as the authoritative value for whatever they track (walking plus swim/fly notes, spells, temporary effects)—the product **does not** overwrite it from other fields (same spirit as **Armor class (v1)**’s separation of manual totals from hints). A **read-only** **walking speed** hint in feet may appear next to the field as a convenience: PHB roster **race** base (25 ft for dwarf/halfling/gnome, 30 ft for others; empty or unrecognized **race** falls back to 30 ft for the hint only), −10 ft when wearing **heavy** body armor whose SRD **`str_minimum`** exceeds the **`Strength` score** (from `score` only; missing/invalid score counts as **0** for that comparison)—**dwarf** ancestry omits that reduction in this hint—and optional **Monk Unarmored Movement** / **Barbarian Fast Movement** where the modeled rules apply. The hint is **narrow**: SRD-catalog **equipped** armor and shield slots only—no encumbrance, other items, spells, conditions, subclass riders, terrain, climbing, mounts, speeds other than walking, nor full rules fidelity to every edge case. **Map placement** and token moves on the **Battle map** do **not** enforce **speed**, movement ranges, or pathing (see **Map placement**).

**Hit points (v1)**:
Each **Session character** carries exactly one authoritative **current hit points** and **maximum hit points** pair for the **Session**; the **Character sheet**’s hit point block is that same pair in the UI, not a second copy that could disagree with tokens, **Turn order**, or other surfaces.

**Session character display name (v1)**:
Each **Session character** has a single table-facing **display name** in v1; it is the same string on the **Battle map**, in **Turn order** and other participant-visible lists, and on the **Character sheet** header—there is no separate shorter token label or formal name field that may disagree.

**NPC**:
A **Session character** used as a non-party figure (monster, ally, patron, etc.). The **Dungeon Master** may run it alone or bind a **Player** (for example a guest for the night) to act it—same **Character sheet** shape in all cases.

**Table roll**:
A dice resolution the **Dungeon Master** triggers for everyone at the **Session** to witness (v1). The final outcome is **authoritative for the table** (not privately invented on one device), and v1 **requires** a shared **animated presentation** on a **synchronized beat**—shared start and reveal timing—so every participant sees the **same result** the **Dungeon Master** rolled, not staggered per-device finishes. In v1 every **Table roll** is **public**: all **Players** in the **Session** see the outcome (no **Dungeon Master**-only hidden **Table roll** yet).
_Avoid_: Generating the final value only on the client in a way that could disagree with what others see.

**Turn order**:
A **Dungeon Master**-controlled, manually reorderable list for the current fight (v1): entries are **Session character**s in one **mixed** strip—party members and **NPC**s together—reflecting who acts when, ordered after whatever **Table roll**s or table talk the group uses. The app does not auto-enforce full D&D initiative rules; the **Dungeon Master** is the source of truth for sequence. Newly added **Session character**s are not automatically inserted into **Turn order** in v1. Between fights, v1 gives the **Dungeon Master** an explicit control (for example **New fight**) to clear **Turn order**, **Spotlight**, and **Map placement** together before building the next encounter’s list.

**Spotlight**:
A **Dungeon Master** action in v1 that quickly **highlights** one **Session character** on the table so everyone sees whose moment is in focus (paired with **Turn order** but not the same thing: order is the queue, **Spotlight** is the immediate visual cue). When that figure has **map placement**, **Spotlight** uses **motion or a pulse** on their token and **hex** on the **Battle map** to draw the table’s attention, then leaves a **calm persistent** cue on that token and **hex** until **Spotlight** moves to a different **Session character**; when **unplaced**, the highlight appears only outside the grid (for example in the **Turn order** overlay) wherever the product already surfaces **Spotlight**.

**Archived session**:
A **Session** the **Dungeon Master** has formally ended (v1): the table becomes **read-only**—no continued play in that same space, no mutations to sheets, **Battle map** (including **Battle map footprint** and **Map placement**), **Turn order**, or live play mechanics. Live **Player** membership ends; **Binding** for ongoing play does not continue (see **Binding**); **Players** retain **the same read visibility they had during live play** (nothing new is revealed to them in archive). Participants stay in the same **Session play shell** as during live play—the **Battle map** and the **Turn order** overlay (and any **Dungeon Master** leading overlay the **Dungeon Master** leaves visible) are **read-only**; **Dungeon Master**-only management affordances (for example **Player** roster / admission) are not offered as live controls.

## Relationships

- A **Session** has exactly one **Dungeon Master** (the creator / owner for v1 unless you decide otherwise later).
- A **Session** has zero or more **Players** (v1: no spectators, no co-GMs).
- A **Join link** identifies exactly one **Session** for the purpose of starting a **Join request** there.
- The **Dungeon Master** may **reject** a pending **Join request**; the requester sees a clear “not admitted” outcome and may later send a new **Join request** through the same **Join link** (v1).
- A user becomes a **Player** only after the **Dungeon Master** approves their **Join request** (v1). They should leave the **Join link** waiting experience as soon as they are a **Player** (for example automatic entry into the **Session**).
- The **Dungeon Master** may approve a **Join request** before binding a **Session character**; binding or changing the figure can happen afterward from the **Player** roster in the **Session**.
- Only the **Dungeon Master** may set or change a **Session nickname**; **Players** do not edit their own table-facing name in the product (v1).
- The **Dungeon Master**'s **Player** roster in a **Session** lists **Players** only; the **Dungeon Master** does not appear as a row in that list (v1). **Players** are listed in admission order (earliest **Join request** approval first) unless a later version adds explicit reordering of roster rows.
- **Session setup (v1, intended flow)**: the **Dungeon Master** creates a **Session**, prepares the **Battle map** (including **Battle map footprint**), configures the **Character class** template library and the set of **Session character** records—including party figures and **NPC**s (two separate knobs for templates vs how many figures exist), then generates a **Join link** for **Players** to request entry.
- A **Player** is bound to exactly one **Session character** at a time for what they may view, edit on the **Character sheet** (see **Character sheet editing (v1)**), and (when you add it) act on; the **Dungeon Master** may change which **Session character** that is, including binding a guest **Player** to an **NPC** for part of a **Session**.
- A **temporary disconnect** for an admitted **Player** in v1 keeps the same **Binding** to their **Session character** and does not by itself change **map placement** for that figure; the token stays **placed** until the **Dungeon Master** moves or **unplace**s it like any other token. When a user **ceases to be a Player** in that **Session** (including when the **Session** becomes an **Archived session**), their **Binding** clears with live membership; **map placement** for the figure is still unchanged unless the **Dungeon Master** edits it.
- Removing a **Session character** from the **Session** in v1 clears that figure from **Map placement**, **Turn order**, and **Spotlight** (and any similar live references) so nothing points at a missing figure.
- A **Session character** added to a **Session** in v1 starts **unplaced** with no automatic **Turn order** entry; the **Dungeon Master** applies **map placement** and adds them to **Turn order** when they decide.
- **Table roll** events belong to a **Session** and are visible to everyone who is already in that **Session** (v1: after **Join request** approval for **Players**).
- **Turn order** and **Spotlight** state belong to a **Session** (v1); only the **Dungeon Master** may reorder the **Turn order** or trigger **Spotlight**.
- **Map placement** (which **hex** each **Session character** occupies, if any) belongs to the **Session** (v1); only the **Dungeon Master** may assign or change it. **Players** see the same **Battle map** layout and token positions the **Dungeon Master** sets. **New fight** clears **Map placement** together with **Turn order** and **Spotlight** (v1). The **Battle map footprint** also belongs to the **Session** (v1); only the **Dungeon Master** may change it. Pan and zoom on the **Battle map** are not **Session** state in v1—each participant may move their own view independently on their device (**Alt/Option+drag** or **drag** on empty margin to **pan**; **Space** recenters a **Player**’s **bound** figure when **placed**; **Dungeon Master** **Space** does nothing).
- A **Session** becomes an **Archived session** when the **Dungeon Master** ends it (v1); **Join link**s stop admitting new play, and the record is kept for history.

## Wizards of the Coast and IP guardrails

This product is inspired by how many tables play **D&D-style** games; it is **not** affiliated with Wizards of the Coast. The following is **project guidance for contributors and future publishing**, not legal advice. Before any **commercial release** or wide **public distribution** of rules text, art, or marketing, obtain a qualified legal review against then-current Wizards licenses and policies.

**Deliberate copyright avoidance (project stance)**  
The codebase and **shipped bundles** must **not** embed **Wizards-copyrighted expression**—for example full _Player's Handbook_ / _Dungeon Master's Guide_ (or adventure) item lists, stat blocks, long descriptive passages, or “we typed out the book” substitutes. **Completeness is never a reason** to paste proprietary content into the repo. Prefer **SRD/OGL/CC-licensed** sources with clear attribution, **original** wording and data we own, and **user-entered** table text over infringing convenience.

**Copyright (expression)**  
Wizards holds copyright in their **specific published works**: book wording, stat blocks as published, adventures, art, layout, and similar creative expression. Do **not** copy, closely paraphrase for reuse, or ship **proprietary Wizards book content** in the codebase, bundled data, or user-visible defaults intended for redistribution.

**Trademarks (branding)**  
Names and marks such as **Dungeons & Dragons**, **D&D**, the **dragon ampersand**, and many **official product and setting names** are protected. The product must **not** imply official Wizards endorsement, look like an official D&D product, or use Wizards marks in commerce without permission. Store listings, domains, ads, and in-app copy should use **our own product name and voice**, not Wizards-owned branding, unless a future explicit agreement says otherwise.

**Private play vs publishing**  
**Private tables** using the app among friends are normal hobby use; still avoid building workflows that **encourage** uploading or sharing **pirated** or **full-book** Wizards PDFs or large proprietary excerpts. When the project **sells or publishes** software or content to others, treat everything that is not **clearly licensed for reuse** as **off limits** unless Wizards grants permission.

**What we build on (allowed bundles)**  
Where the product ships **game content** (for example **equipment** tied to `catalogIndex` on **`equipmentItems`** and **`equippedLoadout`** per **Equipment (v1)**), it must come only from **explicitly reusable** sources the project has rights to use—e.g. **SRD / OGL / Creative Commons** materials as published and attributed under their terms—and **our own** original text and art. Do **not** treat the _Player’s Handbook_, _Monster Manual_, or other non-open books as sources of copy-pastable text for shipped content.

**Engineering habits**  
- Prefer **original wording** for user-facing descriptions, tooltips, and bundled lore; if content is derived from an open license bundle, **track the license and source** in code or internal docs.  
- Do **not** embed long **Wizards-proprietary** passages as seed data, defaults, or imports.  
- **Character sheet** “PHB-style” layout and labels in this document mean **familiar section order and vocabulary tables already use**, not permission to ship **verbatim PHB text** at scale.  
- Before launch, audit **shipped strings, images, and imports** and marketing for **proprietary expression** and **trademark** issues.

## Example dialogue

> **Dev:** "When someone opens a **Join link**, are they already a **Player**?"
> **Domain expert:** "No — they have a **Join request** until the **Dungeon Master** approves; then they become a **Player**."

> **Dev:** "Can a **Table roll** be numbers-only on screen?"
> **Domain expert:** "No for v1 — we want the **animation**; the number still has to match what the **Session** recorded so nobody argues about it."

> **Dev:** "Do **Players** ever see a different number than the **Dungeon Master** rolled?"
> **Domain expert:** "No — they see the **Session** outcome from the **Dungeon Master**'s roll, on the same beat as everyone else."

> **Dev:** "Does the app sort initiative for us?"
> **Domain expert:** "No — we roll with **Table roll**, then the **Dungeon Master** drags the **Turn order**; there is also a **Spotlight** button to highlight whose beat it is."
