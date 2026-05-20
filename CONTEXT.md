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
Which **Session character** an admitted **Player** is attached to in a **Session** for v1 (what they may view and act through); only the **Dungeon Master** may set or change it. When the **Dungeon Master** **binds** a **Player** to a **Character**, that **Character** becomes **Playable** if it was **non-playable**—including **Guest control** and approving a **Join request** with a character pick. **Binding** persists across a **temporary disconnect**; when a user **ceases to be a Player** (see **Ceases to be a Player**), **Binding** clears with live membership. Seat labels preserved in an **Archived session** are read-only history (exact retention is a product implementation detail).

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
Which **hex** (if any) each **Session character** occupies on the **Battle map** for the current fight; authoritative in the **Session** and editable only by the **Dungeon Master** in v1, except when **Binding** **places** a **Playable character** automatically (see below). **Non-playable** **Characters** stay **unplaced** until the **Dungeon Master** places them. When a **Character** becomes **Playable** through **Binding** and is still **unplaced**, the product **places** it on the **first empty hex** in row-major order from grid origin (0,0) within the **Battle map footprint**—if the map is full, the **Character** stays **unplaced** until the **Dungeon Master** frees a **hex** or expands the footprint. The **Dungeon Master** may place or move **any Session character** afterward; **map placement** is not limited to entries in **Turn order**. To choose which **Character** the next **hex** action applies to, the **Dungeon Master** uses one shared placement selection in the UI—either the **Characters** / **unplaced** surfaces in the leading **Dungeon Master** overlay or a row click on the **Turn order** overlay. **Players** do not receive that selection or **hex** editing in v1 (see **Session play shell**). Placement is **free** in v1—no enforced movement range, speed, or pathing. A **Character** with no **hex** is **unplaced**. A **hex** may hold at most one **Character**. **New fight** clears **Map placement** for everyone; the next **Binding** to a **Playable character** may auto-**place** again using the same first-empty rule.

**Unplaced**:
A **Session character** has no **hex** on the **Battle map**—for example never positioned yet, reset by **New fight**, or left without a valid **hex** after the **Dungeon Master** shrank the **Battle map footprint**.

**Character class**:
A D&D-style archetype package (including baseline stats the table cares about) configured for a **Session**; the product provides defaults and the **Dungeon Master** controls how many/options exist for that **Session** as the session’s **template library**.
_Avoid_: Saying "class" without context when you mean this archetype — not a programming **class**.

**PHB class roster (v1)**:
For v1 the product treats the _Player’s Handbook_ **twelve base classes** as the single canonical roster. Class on a **Character** lives only on the **Character sheet** as rows on **classes & levels** (`classLevels`); multiple rows may be stored in v1, but **Multiclass (v2)** governs automated combination rules. The table is not offering other official books’ classes (for example Artificer) until that choice is revisited. Stored multiclass rows keep a **stable class key** from that roster only—**not** a separate free-text class display string; PHB labels are derived when rendering. Rows that still carry legacy free-text values **resolve best-effort** to a roster key (for example case-insensitive match on key or label); **unmappable rows are dropped** on load without blocking the sheet, and the next successful save persists the cleaned rows so the **Dungeon Master** can re-add anything missing using the roster pickers.
_Avoid_: Using “PHB class” to mean “any 5e class the group might play at the table” when you mean this **PHB class roster (v1)** product list.

**PHB race roster (v1)**:
For v1 the product treats the _Player’s Handbook_ **nine base playable races** as the single canonical roster for the **Character sheet** `race` field (stable key only; PHB labels when rendering). Legacy free-text values **resolve best-effort** to a roster key; **unmappable values clear** to empty on load without blocking the sheet, and the next successful save persists the cleaned value so the participant can pick from the roster.

**Session character** (UI: **Character**):
A concrete **Character** in a **Session**—the table’s unit for anyone who can appear on the **Battle map**, sit in **Turn order**, and have stats. One shared schema for every **Character**; people may still say “player sheet” in conversation, but the domain term is **Session character** (product UI may shorten to **Character**). Each **Session character** has a **Character sheet** from the moment the **Dungeon Master** creates them (see **Character sheet**); the sheet is not a separate entity you attach later. When first added, a **Character** starts **unplaced** with no automatic **Turn order** entry unless placement rules below apply. If removed from the **Session**, they disappear from every live mechanic that referenced them (**Map placement**, **Turn order**, **Spotlight**, and the like).
_Avoid_: **Figure** for this concept (retired UI label); treating **NPC** as a different data type—the difference is **playable** vs **non-playable** and **Binding**, not the record shape.

**Playable character**:
A **Session character** eligible for the party roster—someone a **Player** may be **bound** to when joining or from the **Player** roster. **Playable** characters are what the **Dungeon Master** offers when approving a **Join request** or assigning a seat. A **Character** becomes **Playable** when the **Dungeon Master** promotes it explicitly or when any **Player** is **bound** to it (see **Binding**). When **Binding** leaves a **Playable character** **unplaced**, the product auto-**places** it on the first empty **hex** (see **Map placement**). A **non-playable** **Character** may still have a **Character sheet** and appear in **Turn order**; the **Dungeon Master** places them manually on the map.
_Avoid_: Saying “PC” in product copy when you mean **Playable character**—tables also say “PC” for “player-controlled at the table,” which can include a guest **bound** to a **non-playable** **Character**.

**Non-playable character** (UI may still say **NPC**):
A **Session character** not in the default party roster—monsters, allies, patrons, or anyone the **Dungeon Master** runs until they promote them. The **Dungeon Master** applies **Map placement** manually; they are not auto-**placed** on **Binding**. At **Character** creation the **Dungeon Master** sets **Playable** with a single control (for example a “Playable character” checkbox—replacing the old NPC-only toggle). **Playable** **Characters** appear in join and bind pickers before anyone is **bound**; **Binding** still promotes a **non-playable** **Character** to **Playable** when needed (see **Binding**). Toggling **Playable** off after creation (demote) is not required for v1 unless the table asks for it later.
_Avoid_: “NPC” as a permanent category—promotion and guest **Binding** can change who controls whom without a new record.

**Guest control**:
A **use case**, not a separate roster type: the **Dungeon Master** **binds** a **Player** who is not a long-term party member (for example a one-night friend, or someone who mainly runs monsters) to a **Character**. **Binding** always promotes that **Character** to **Playable** (see **Binding**)—there is no lasting “guest-bound but still non-playable” state in v1.

**Character sheet**:
The **Session character**’s sheet data (abilities, class rows, equipment, and the rest)—created empty (defaults) when the **Dungeon Master** adds the **Character**, always present in storage for v1. Shown in the UI as the PHB-style **Character sheet**; the **Dungeon Master** can see every sheet in the **Session**, while a **Player** only sees sheets they are permitted to see (typically their **bound** **Character**). In the **Session play shell**, both the **Dungeon Master** and **Players** open **Character sheet**s from the **top bar** in v1—the **Dungeon Master**’s control lists every **Session character**, while a **Player**’s lists only permitted sheets—so sheet access is not tied to receiving the leading **Dungeon Master** overlay; the product may still offer optional shortcuts from that overlay (for example while managing a figure). Each participant has at most one **Character sheet** view open at a time on a device in v1; choosing a different figure replaces that view rather than stacking multiple sheets. The intended full **Character sheet** layout and section labels follow **D&D 5th edition** Player’s Handbook style (abilities, saves, skills, combat numbers, attacks, equipment, features, spellcasting where applicable, personality blocks, etc.) as the table’s shared visual and vocabulary reference—not a claim that the app implements every 5e rule in code; the only automated arithmetic is the narrow **read-only hints** summarized in **Sheet numbers (v1)** (with detail under **Armor class (v1)**, **Speed (v1)**, and **Hit points (v1)** where relevant).

**D&D 5th edition sheet (reference)**:
The **Character sheet** presentation and field groupings the product targets, aligned with the D&D 5e PHB **Character sheet** for naming and familiar section order. Domain experts may still say “5e sheet” in conversation.

**Sheet numbers (v1)**:
Most values on a **Character sheet** (totals, modifiers, DCs, passives, and similar) are whatever participants enter—the typed fields stay **authoritative** in v1, and the product does **not** overwrite them from equipment, stats, or a full auto-5e engine. Narrow **read-only hints** may appear next to some fields instead: **Experience points** vs the next _Player’s Handbook_ cumulative threshold using parsed XP and summed **classLevels** (it does **not** auto-level the **Session character**); **Armor class** from SRD **equipped** armor, shield, and **Dexterity** (see **Armor class (v1)**); **walking speed** in feet (see **Speed (v1)**); **maximum hit points** for **single-class** PHB fixed hit points plus **Constitution** each level (see **Hit points (v1)**). Those hints do **not** enforce complete 5e math (for example **Multiclass (v2)** max HP, rolled HP, feats, or items) or **Battle map** movement—the table still decides what goes in the main fields. As fields enroll in the **Derived stat pipeline**, they follow **Calculated sheet stat** + **Stat override** instead of hint-only display (see **Armor class (v1)** for the intended end state on AC).

**Calculated sheet stat**:
A **Character sheet** combat number the product derives from modeled inputs (for example **classes & levels**, ability scores, **Equipment (v1)**, **PHB race roster (v1)**) and writes into the stored field by default.
_Avoid_: “Hint” for a value that already replaces the stored field under the **Derived stat pipeline**.

**Stat override**:
A per-field flag that the stored value is pinned by the table and must not be replaced by the **Derived stat pipeline** until cleared—used for magic, temporary effects, feats, DM rulings, or gaps in modeled rules.
_Avoid_: Treating every manual edit as permanent; participants should be able to return to the calculated default.

**Derived stat pipeline**:
The product rules layer that produces **Calculated sheet stat** values and refreshes enrolled fields on autosave when inputs change, unless a **Stat override** is active on that field. When **Active effect (sheet)** rows are present, their **Effect definition** modifiers run after base class/gear/race math and before **Stat override** on each enrolled stat.

**Active effect (sheet)**:
A row on the **Character sheet** meaning “this modifier package is on right now,” stored as instances (for example `activeEffects[]`) each referencing an **Effect definition** by stable key. Optional link to an SRD spell `catalogIndex` when the buff came from a spell; same shape later for feats, items, or DM-granted buffs.
_Avoid_: Storing full spell rules prose on the row—instances point at definitions, not duplicate text.

**Effect definition**:
Bundled, versioned rules data (SRD-safe) keyed by `effectKey` that describes how to change **Calculated sheet stat**s using a **modifier operation list** (not prose parsing): an ordered array of typed ops, for example `{ "op": "acFloor", "value": 16 }`. Each `op` is a known instruction the **Derived stat pipeline** understands; new combat rules add ops in code plus definitions, not expression strings. v1 of the effect model targets **full combat-header coverage**: armor class, walking speed, maximum and current hit points, saving throws, skills, ability scores and modifiers, **Proficiency bonus (sheet)**, and related totals—so any SRD spell that matters in combat can be represented **once** a definition exists. Optional fields include default `durationRounds` for **Active effect duration (sheet)**. The first shipped bundle is **Effect vertical slice (v1)** (ten spells, ten ops—see [ADR 0003](docs/adr/0003-effect-vertical-slice-ten-ops-ten-spells.md)). Not participant-editable; definitions ship with the app like equipment JSON.
_Avoid_: Calling a spell name in a text area an **Effect definition**—that remains plain text until tied to a keyed definition. Avoid `eval`-style expression fields (for example `"max(ac, 16)"`).

**Modifier operation (v1 vertical slice)**:
One of ten typed `op` strings the pipeline implements first: `acSet`, `acFloor`, `acBonus`, `speedAdjust`, `maxHpBonus`, `saveBonusAll`, `skillBonus`, `initiativeBonus`, `abilityModBonus`, `tempHpGrant`. Shapes and stacking rules are fixed in [ADR 0003](docs/adr/0003-effect-vertical-slice-ten-ops-ten-spells.md). `initiativeBonus` and `abilityModBonus` are in the interpreter for header coverage but have no spell in **Effect vertical slice (v1)** yet.
_Avoid_: Dice or prose-derived ops in this slice (for example `+1d4`); add new op kinds in a later ADR.

**Effect vertical slice (v1)**:
The first ten SRD spells that ship bundled **Effect definition**s in v1 (`effectKey` = spell `index`): `barkskin`, `mage-armor`, `shield-of-faith`, `shield`, `haste`, `longstrider`, `aid`, `pass-without-trace`, `warding-bond`, `false-life`. All other catalog spells list without pipeline math until authored.
_Avoid_: Treating catalog presence as automated combat stats for spells outside this set.

**Spell duration default (v1)**:
Bundled `durationRounds` on **Effect definition** (combat approximations: 1 round ≈ one turn, 1 minute ≈ 10 rounds, 1 hour ≈ 60, 8 hours ≈ 600). `null` means no auto-expiry on **advance round**—instances stay until removed or the **Dungeon Master** sets `endsAtRound`. Per-spell defaults are in [ADR 0003](docs/adr/0003-effect-vertical-slice-ten-ops-ten-spells.md).
_Avoid_: Parsing SRD duration strings at runtime in v1.

**Temp HP grant (sheet)**:
A one-time bump to current hit points when an **Active effect (sheet)** with `tempHpGrant` is added (`false-life` in **Effect vertical slice (v1)** uses a flat value, not a roll). Does not re-apply on stat recalc or **advance round**; does not raise **Maximum hit points (sheet)**.
_Avoid_: Treating `tempHpGrant` like `maxHpBonus` or re-granting temp HP every save.

**SRD spell catalog (v1)**:
Structured SRD spell list (like **Equipment (v1)**): pick by `catalogIndex`, fill name/level/school on the sheet. When a spell alters combat stats, **effectKey** equals that spell’s SRD `index` (one definition per spell, 1:1) so players see the same name/key in the catalog, on **Active effect (sheet)** rows, and in rules data. Spells without a shipped definition yet appear in the catalog only—no pipeline change until the matching definition ships. Book-only and homebrew spells stay manual text or ad hoc instances until given their own keys.
_Avoid_: Shared opaque effect keys (for example `ac-floor-16`) when a spell name is what players recognize at the table.

**Spell system (v1)**:
The product layer for **spellbook + resources** on a **Character sheet**—structured spell rows from **SRD spell catalog (v1)**, optional slot tracking, and a **Cast** action that adds or refreshes **Active effect (sheet)** when a bundled **Effect definition** exists. It does **not** own combat math; **Derived stat pipeline** and **Effect definition** ops stay in the effect layer. Replacing free-text **Spellcasting** lists is in scope; concentration automation, upcasting, and class-derived slot totals are out unless a later slice explicitly adds them.
_Avoid_: Calling combat-header effect toggles “the spell system”—those are shortcuts; normal play is pick from the character’s spell list then **Cast**.

**Spell list (sheet)**:
Structured rows on the **Character sheet** (v1 spell inventory), each referencing **SRD spell catalog (v1)** by `catalogIndex` when possible, with optional free-text name for homebrew. Optional per-row **`isPrepared`** flag: omitted or true means the spell appears in the **Cast** picker; false keeps the row on the sheet (for example spellbook entries not prepared today) but hides it from **Cast**. One array only—no separate known vs prepared lists in v1.
_Avoid_: Two parallel lists (`spellsKnown` + `spellsPrepared`) in v1 unless a later slice explicitly adds dual-list UX.

**Spell effect key**:
For SRD spells with combat automation, `effectKey` is the spell’s SRD `index` slug (same string as **SRD spell catalog (v1)** `catalogIndex`). **Active effect (sheet)** instances use that key; **Effect definition** lookup is 1:1.

**Effect stacking (sheet)**:
When several **Active effect (sheet)** rows modify the same stat, the **Derived stat pipeline** applies **Effect definition** operations in phases (not last-write-wins). For armor class in v1: mundane gear + Dex, then take the **highest** result among **set formula** effects (`acSet`, for example Mage Armor), then apply each **floor** (`acFloor`, for example Barkskin), then sum **bonuses** (`acBonus`, for example Shield of Faith and Haste). For **Walking speed (sheet)** in v1: mundane speed (race, armor, class features), then each `speedAdjust` in definition order on the running total (`multiply` then `add` per op). **Maximum hit points (sheet)** sums all `maxHpBonus`; save and skill mods sum matching `saveBonusAll` / `skillBonus` ops. **Stat override** on that stat still wins if pinned. Stricter PHB non-stacking (incompatible armor calculations) may add `stackingGroup` on definitions later.

**Active effect duration (sheet)**:
How long an **Active effect (sheet)** row stays on. Each instance stores `startedRound` and `endsAtRound`. **Effect definition** supplies a default `durationRounds`; the **Dungeon Master** may edit `endsAtRound` on the instance when table pacing differs. On **advance round**, remove instances where `endsAtRound < newRound`, then recalculate stats. Instances with no round end (manual-only definitions) stay until removed by hand. Mid-fight add uses the current **round number** as `startedRound`. Round counts use the table’s bundled SRD conversion (for example approximations for “1 minute” in combat)—not live parsing of spell prose.

**New fight (effects)**:
When the **Dungeon Master** runs **New fight**, clear **Active effect (sheet)** on every **Session character** in that **Session**, reset **Combat round clock (session)** (inactive or round 1 per implementation), and recalculate enrolled stats. **End combat** pauses the clock only—does **not** clear effects.

**Active effect editing (sheet)**:
Adding or removing **Active effect (sheet)** rows follows **Character sheet editing (v1)** (bound **Player** or **Dungeon Master** for any **Session character**). Editing `endsAtRound` on an instance is **Dungeon Master**–only so players can toggle Barkskin on/off without silently extending duration.

**Multiclass (v2)**:
A **Character sheet** with more than one row on **classes & levels** (two or more PHB classes, or multiple die sizes / combined class rules). The sheet may still **store** multiple class rows in v1, but v1 **Derived stat pipeline** automation assumes **single-class** where noted; full multiclass behavior (proficiency union, **Hit die pool** per die size, multiclass max HP, cross-class expertise slots, and similar) is **v2**, not v1.
_Avoid_: Shipping multiclass-derived totals in v1 while calling the product “single-class only.”

**Ability base score (sheet)**:
The participant- or preset-filled ability value before **Racial ability bonus (sheet)**—for example from point buy, rolled scores, or **Standard array abilities preset (v1)**.
_Avoid_: Calling this “final score” when racial bonuses still apply.

**Racial ability bonus (sheet)**:
Per-ability increments from **PHB race roster (v1)** (and participant choices for flexible races such as Half-Elf). The **Derived stat pipeline** updates these when `race` changes without overwriting **Ability base score (sheet)**.

**Ability score (sheet)**:
Effective value used for modifiers: **Ability base score (sheet)** plus **Racial ability bonus (sheet)** (each treated as integers when valid). **Ability modifier (sheet)** derives from this total unless **Stat override** on the modifier. Editing the displayed score may update base, pin base from race recalc, or both—exact UX is implementation detail; storage keeps base and racial bonus separate.
_Avoid_: Treating **Ability modifier** as an independent second source of truth without an override flag.

**Ability modifier (sheet)**:
For each ability, `floor((ability score − 10) / 2)` from the stored **Ability score (sheet)** by default. When the table pins a different value, that cell is under **Stat override** until cleared.
_Avoid_: “Modifier” meaning proficiency bonus or save bonus—use **Proficiency bonus** or name the specific total.

**Proficiency bonus (sheet)**:
A **Calculated sheet stat** from total character level (sum of **classes & levels**, PHB thresholds +2 through +6). Class features that change how proficiency applies on specific rolls (for example expertise, Jack of All Trades) are modeled on those rows, not by changing this header value. Tables pin a different header value with **Stat override** when needed.
_Avoid_: Putting double proficiency or half-proficiency into this field instead of on the relevant save or skill.

**Class proficiency (sheet)**:
The save and skill proficiency flags the **Derived stat pipeline** derives from **classes & levels** using PHB class tables. In v1 this applies only for **single-class** (exactly one class row); **Multiclass (v2)** adds the union of proficiencies from all class rows.
_Avoid_: “Proficiency” without saying whether you mean the checkbox, the bonus value, or **Proficiency bonus (sheet)**.

**Proficiency pin**:
When a participant toggles a save or skill proficiency checkbox away from the current **Class proficiency (sheet)** value, that row’s prof flag is pinned until cleared or reset from class—so later class edits do not change it until unpinned.
_Avoid_: Calling every manual checkbox click a **Stat override**; numeric overrides and proficiency pins are separate mechanisms on the same **Derived stat pipeline** model.

**Save modifier (sheet)**:
A **Calculated sheet stat** per saving throw: linked **Ability modifier (sheet)** plus **Proficiency bonus (sheet)** when that save’s prof flag is on (from **Class proficiency (sheet)** unless **Proficiency pin**). Pinned totals use **Stat override** on that row’s mod.
_Avoid_: Storing proficiency bonus again inside each save row.

**Skill modifier (sheet)**:
A **Calculated sheet stat** per skill: linked **Ability modifier (sheet)** plus **Proficiency bonus (sheet)** when proficient, plus another full **Proficiency bonus (sheet)** when **Expertise (sheet)** is on for that skill. Pinned totals use **Stat override** on that row’s mod.

**Expertise (sheet)**:
A per-skill flag meaning the character adds double **Proficiency bonus (sheet)** on that skill (not on saves). Only applies when the skill is proficient.

**Expertise slot (sheet)**:
How many skills may have **Expertise (sheet)** at once, derived from **classes & levels** via PHB class rules. Participants assign flags manually up to that cap among proficient skills; changing flags off defaults uses the same pin spirit as **Proficiency pin**.
_Avoid_: Unlimited expertise toggles with no slot accounting.

**Standard array abilities preset (v1)**:
When **classes & levels** resolves to **exactly one** PHB roster row with level at least **1**, and **every** ability **score** and **modifier** cell on the sheet is still blank, the product **one time** fills the six **Ability base score (sheet)** values using the _Player’s Handbook_ **standard array** (15, 14, 13, 12, 10, 8) with a **fixed allocation per class** (for example **Wizard** always receives the same assignment); matching **Ability modifier (sheet)** values follow from the formula unless later overridden. This is a convenience default only: it does **not** apply **racial** ability adjustments, it does **not** run for **Multiclass (v2)** (more than one class row), and participants may change scores or pin modifier overrides afterward.

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
Equipment is split for the sheet UI: **`equippedLoadout`** holds at most one bundled **SRD / OGL** item per **equip slot**—optional catalog slugs (`weapon`, `armor`, `shield`, `gear`; each a lowercase kebab **`catalogIndex`** or absent / “none” in the UI). **`equipmentItems`** is the **carried** list (consumables, **other**, and uncategorized rows): each row has client-stable `id`, `name`, optional free-text `quantity`, optional `weightLb` (filled from the catalog when a row is catalog-backed and otherwise treated as plain text if ever present), optional `category` (the carried editor exposes consumable / other / unset only), optional **`catalogIndex`**, and optional **`equipped`** (still in the schema; not shown in the current carried layout—slots replace the old “equip checkbox” story for weapon/armor/shield/gear). Carried **name** choices come from SRD catalog subsets that omit the four equip-slot categories except the consumable-only list when the row is consumable. On load, legacy rows whose `category` was a slot category are migrated into **`equippedLoadout`** when possible (first match per slot), with any extras reclassified to **other** so nothing is silently dropped. The in-repo catalog is **SRD-only on purpose** so the product does not ship proprietary PHB/DMG-style item dumps (see **Wizards of the Coast and IP guardrails**). Blank-name rows are dropped on persist. Optional free-text **equipment notes** remain in the legacy `equipment` field (for example container contents or narrative). **Armor class (sheet)** uses **equipped** armor and shield from this equipment model when the pipeline slice ships (see **Armor class (v1)** legacy).

**Armor class (sheet)**:
A **Calculated sheet stat** stored as an integer on `sheet.armorClass`, from SRD **equipped** armor, shield, and **Dexterity** (**Ability modifier (sheet)**) via the existing mundane AC rules. **Stat override** pins a different integer for Barkskin, magic armor, natural armor, and other unmodeled effects. Supersedes hint-only **Armor class (v1)** when the AC / speed / max HP pipeline slice ships.

**Armor class (v1)**:
Legacy: typed authoritative field plus read-only hint. Replaced by **Armor class (sheet)** for enrolled sheets.

**Initiative modifier (sheet)**:
A **Calculated sheet stat** in the combat header: default value is the **Dexterity** **Ability modifier (sheet)** (class features such as Alert may be added in code later). **Stat override** pins a different value for feats, magic, or table choice. Rolled initiative totals and advantage notes stay outside this field—in **Turn order** and table talk, not as a second queue source.
_Avoid_: Treating this field as the result of an initiative **Table roll**; it is the modifier added to the d20.

**Initiative (v1)**:
Superseded for enrolled sheets by **Initiative modifier (sheet)**. Reordering **Turn order** does **not** read or update this field, and editing it does **not** change **Turn order**. **Turn order** remains a **Dungeon Master**-ordered list, not an automated initiative sort.

**Passive Perception (sheet)**:
A **Calculated sheet stat**: `10 +` the **Skill modifier (sheet)** for Perception, using that row’s total (including **Expertise (sheet)** and **Stat override** on the skill). **Stat override** on passive when feats or effects change passive without changing the skill line.
_Avoid_: Maintaining a separate manual Perception math path that can drift from the Perception skill row.

**Walking speed (sheet)**:
A **Calculated sheet stat** for **walking speed in feet** stored as an integer on `sheet.speed` (feet only): PHB roster **race** base, −10 ft for **heavy** armor when **Strength** **Ability score (sheet)** is below the SRD armor `str_minimum` (dwarf omits this reduction), plus modeled **Monk Unarmored Movement** / **Barbarian Fast Movement** when applicable—same narrow rules as legacy **Speed (v1)** hints. **Stat override** pins a different walking speed. Non-walking movement (fly, swim, climb, mounts) belongs in **Speed notes (sheet)**, not mixed into the integer. **Map placement** does **not** enforce movement (see **Map placement**).

**Speed notes (sheet)**:
Optional plain-text line beside **Walking speed (sheet)** for fly/swim/climb and similar (for example `fly 60`). Does not affect **Derived stat pipeline** math in v1.

**Speed (v1)**:
Legacy: plain-text **speed** plus walking hint. Replaced by **Walking speed (sheet)** for enrolled sheets when the AC / speed / max HP pipeline slice ships.

**AC speed max HP enrollment (sheet)**:
No legacy migration: greenfield **Session** data only. On enrollment, `armorClass` and `speed` are integers from calculators; **Speed notes (sheet)** starts empty. `maxHp` follows **Maximum hit points (sheet)** rules. Any obsolete test characters may be deleted rather than converted.

**Maximum hit points (sheet)**:
On the **Session character**’s `maxHp` (same authority as **Hit points (v1)**—not a second sheet-only copy). The UI **always** shows a calculated line (for example `Calculated: 32` or `Calculated: —`) so participants see what the pipeline derived even when it does not apply that value. When the calculator returns a number (**single-class** in v1 of this slice: PHB fixed HP per level + **Constitution** **Ability modifier (sheet)** each level), that value is the default stored `maxHp` unless **Stat override** is active. When the calculator cannot derive (including **Multiclass (v2)** until that ships), the product **does not** overwrite stored `maxHp`—manual max stays authoritative while the calculated line still appears. **Stat override** for Tough, items, and other extras. **Multiclass (v2)** will extend the calculator so the calculated line can show a real total instead of **—**. After a successful recalc without override, if **current hit points** exceed the new maximum, set **current hit points** to the new maximum (clamp only—no free healing when max increases).

**Hit points (v1)**:
Each **Session character** carries exactly one authoritative **current hit points** and **maximum hit points** pair for the **Session**; the **Character sheet** hit point block is that pair in the UI. **Current hit points** stay participant-edited in v1 except the max-HP clamp described under **Maximum hit points (sheet)**. **Maximum hit points** uses **Maximum hit points (sheet)** when the AC / speed / max HP pipeline slice ships (replaces max HP hint-only behavior).

**Hit die pool (sheet)**:
Structured hit dice tracked **by die size**—each row has a **total** count and a **spent** count. **Total** is a **Calculated sheet stat** from **classes & levels** unless **Pool pin** on that row’s total (for example bonus hit dice). **Spent** is participant-edited; when **total** drops, **spent** clamps to `min(spent, total)`. Remaining dice for a size is `total − spent`.
_Avoid_: One **Hit dice (v1)** free-text field as the source of truth once this model ships.

**Hit die pool single-class scope (v1)**:
The first shipped **Hit die pool (sheet)** applies only when **classes & levels** resolves to **exactly one** PHB class row with level at least **1**—one die type, one pool row, `total` equals that row’s level. **Multiclass (v2)** adds multiple rows by die size and die-size pickers for **Short rest spend (sheet)**; until then, multiclass sheets keep legacy **Hit dice (v1)** text or no structured pool (implementation must not guess wrong totals).
_Avoid_: Designing pickers and per-size rows for **Multiclass (v2)** in the same slice as single-class rest actions.

**Pool pin**:
On a **Hit die pool (sheet)** row, pins the **total** so **classes & levels** changes do not recalculate it until cleared—same override spirit as **Stat override**, scoped to pool totals.

**Long rest (sheet)**:
A **Character sheet** action on one **Session character** that sets **spent** to `0` on every **Hit die pool (sheet)** row. Does not change **current hit points** or **maximum hit points** in v1—the table still adjusts HP separately.
_Avoid_: Calling it a full 5e long rest automation when only hit dice pools reset.

**Short rest spend (sheet)**:
A **Character sheet** action that spends **one** hit die (only when `spent < total`): increment **spent** by 1 and show a read-only healing reminder (`dX + Constitution modifier`) without automatically changing **current hit points**. Under **Hit die pool single-class scope (v1)**, there is no die-size picker—only the single pool row.
_Avoid_: Spending multiple dice in one action unless a future feature explicitly models it.

**Hit die pool editing (sheet)**:
**Short rest spend (sheet)**, **Long rest (sheet)**, and editing **spent** follow **Character sheet editing (v1)** (bound **Player** or **Dungeon Master** for any). **Pool pin** on **total** is **Dungeon Master**–only. **Total** changes come from **classes & levels** (DM-only) unless pinned—not direct participant typing in v1.

**Hit die pool migration (sheet)**:
Greenfield only (same as **AC speed max HP enrollment (sheet)**): initialize the pool from **classes & levels** with **spent** `0` when **Hit die pool single-class scope (v1)** applies. Do not parse legacy `hitDice` text.

**Hit die pool display (sheet)**:
Combat header shows each pool as `{die} {remaining}/{total}` (for example `d10 2/5`) where **remaining** is `total − spent`. Under **Hit die pool single-class scope (v1)** that is a single line; **Multiclass (v2)** may show one line per die size.

**Hit dice (v1)**:
Superseded by **Hit die pool (sheet)** for enrolled sheets. Legacy plain-text `hitDice` may remain during migration only.

**Session character display name (v1)**:
Each **Session character** has a single table-facing **display name** in v1; it is the same string on the **Battle map**, in **Turn order** and other participant-visible lists, and on the **Character sheet** header—there is no separate shorter token label or formal name field that may disagree.

**Table roll**:
A dice resolution the **Dungeon Master** triggers for everyone at the **Session** to witness (v1). The final outcome is **authoritative for the table** (not privately invented on one device), and v1 **requires** a shared **animated presentation** on a **synchronized beat**—shared start and reveal timing—so every participant sees the **same result** the **Dungeon Master** rolled, not staggered per-device finishes. In v1 every **Table roll** is **public**: all **Players** in the **Session** see the outcome (no **Dungeon Master**-only hidden **Table roll** yet).
_Avoid_: Generating the final value only on the client in a way that could disagree with what others see.

**Turn order**:
A **Dungeon Master**-controlled, manually reorderable list for the current fight (v1): entries are **Session character**s in one **mixed** strip—party members and **NPC**s together—reflecting who acts when, ordered after whatever **Table roll**s or table talk the group uses. The app does not auto-enforce full D&D initiative rules; the **Dungeon Master** is the source of truth for sequence. Newly added **Session character**s are not automatically inserted into **Turn order** in v1. Between fights, v1 gives the **Dungeon Master** an explicit control (for example **New fight**) to clear **Turn order**, **Spotlight**, **Map placement**, and **Combat round clock** together before building the next encounter’s list.

**Combat round clock**:
Shared **Session** state (**Combat round clock (session)**): whether combat timing is active, the current **round number** (integer ≥ 1 while active), and **Dungeon Master**–only controls to **start combat** (set active, round = 1), **advance round** (+1 while active), and **end combat** (set inactive—pause timing). Visible to all participants in the **Session play shell** (for example near **Turn order**). **Turn order** reorder and **Spotlight** do **not** advance the round. Drives **Active effect duration (sheet)** for round-based expiry.
_Avoid_: Inferring rounds from “everyone in **Turn order** went once”—action surge, held actions, and table pacing do not match that reliably.

**Combat round clock (session)**:
Authoritative fields on the **Session** document: combat active flag + current round. Not per-device; archived **Session**s freeze the last values read-only.

**Combat round clock (UI)**:
**Round number** and **Dungeon Master** start / advance / end combat controls live in the **Turn order** overlay (visible to all participants). **Active effect (sheet)** chips live on the **Character sheet** combat header so stats and buffs stay together.

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
- The **Dungeon Master** may approve a **Join request** with an optional **Playable character** from the **Session** roster, or approve first and **bind** from the **Player** roster afterward; only **Playable** **Characters** appear in those pickers (v1).
- Only the **Dungeon Master** may set or change a **Session nickname**; **Players** do not edit their own table-facing name in the product (v1).
- The **Dungeon Master**'s **Player** roster in a **Session** lists **Players** only; the **Dungeon Master** does not appear as a row in that list (v1). **Players** are listed in admission order (earliest **Join request** approval first) unless a later version adds explicit reordering of roster rows.
- **Session setup (v1, intended flow)**: the **Dungeon Master** creates a **Session**, prepares the **Battle map** (including **Battle map footprint**), adds **Characters** (marking each **Playable** or not at create) each with a **Character sheet**, then generates a **Join link** for **Players** to request entry and assigns **Playable** **Characters** from the roster.
- A **Player** is **bound** to exactly one **Session character** at a time for sheet access and control; the **Dungeon Master** may change **Binding**. **Binding** to a **non-playable** **Character** makes it **Playable** (v1).
- A **temporary disconnect** for an admitted **Player** in v1 keeps the same **Binding** to their **Session character** and does not by itself change **map placement** for that figure; the token stays **placed** until the **Dungeon Master** moves or **unplace**s it like any other token. When a user **ceases to be a Player** in that **Session** (including when the **Session** becomes an **Archived session**), their **Binding** clears with live membership; **map placement** for the figure is still unchanged unless the **Dungeon Master** edits it.
- Removing a **Session character** from the **Session** in v1 clears that figure from **Map placement**, **Turn order**, and **Spotlight** (and any similar live references) so nothing points at a missing figure.
- A **Session character** added to a **Session** starts **unplaced** with no automatic **Turn order** entry; **non-playable** **Characters** stay **unplaced** until the **Dungeon Master** **places** them; **Playable** **Characters** are auto-**placed** on **Binding** using the first empty **hex** (row-major from origin) when still **unplaced**.
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

## Flagged ambiguities

- **Schema**: Replace `isNpc` with `isPlayable` (or equivalent) on `sessionCharacters`; domain language is **Playable** / **non-playable**, set at create via checkbox (v1).
- **`characterClassKey`**: Remove; class lives only in `sheet.classLevels` (see **PHB class roster (v1)**).
- **Multiclass**: Multiple `classLevels` rows may exist in v1 storage; **Derived stat pipeline** combination rules (proficiency union, hit die pools, multiclass max HP, and similar) are **Multiclass (v2)**—resolved.

## Example dialogue

> **Dev:** "When someone opens a **Join link**, are they already a **Player**?"
> **Domain expert:** "No — they have a **Join request** until the **Dungeon Master** approves; then they become a **Player**."

> **Dev:** "Can a **Table roll** be numbers-only on screen?"
> **Domain expert:** "No for v1 — we want the **animation**; the number still has to match what the **Session** recorded so nobody argues about it."

> **Dev:** "Do **Players** ever see a different number than the **Dungeon Master** rolled?"
> **Domain expert:** "No — they see the **Session** outcome from the **Dungeon Master**'s roll, on the same beat as everyone else."

> **Dev:** "Does the app sort initiative for us?"
> **Domain expert:** "No — we roll with **Table roll**, then the **Dungeon Master** drags the **Turn order**; there is also a **Spotlight** button to highlight whose beat it is."
