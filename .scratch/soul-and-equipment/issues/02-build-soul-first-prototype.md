Type: task
Status: resolved
Blocked by: 01

# Build Soul-first prototype

## Question

Implement Match-scoped **Soul** per `CONTEXT.md`: both seats share total **15**, independently partitioned into Strength/Speed/Vitality (each 0–10); apply combat math (Strength flat damage, Speed −2%/pt Cooldown, Vitality starting Life 100+V); Soul after Passive stacking; own Soul visible in Draft with soft panel guidance (see Soft Draft guidance for Soul), opponent redacted until fight; clear on Match end / cancel.

Done when a two-player Match shows Soul, Draft cues, and Soul-affected fight numbers end-to-end.

## Answer

Shipped Match-scoped **Soul** end-to-end:

- Roll at `startMatch`: independent partitions of total **15** into Strength/Speed/Vitality (0–10); persisted on draft/match seats; cleared with other match fields on end/cancel.
- Combat after Passive: Strength `+flat` damage potency; Speed `−(Speed×2)%` Cooldown (500ms floor); starting Life and heal cap both `100 + Vitality`.
- Draft: own-seat Soul panel + favor line (Strength → “Favors damage kits”; Speed → “Favors Hermes tempo”; Vitality → “Favors sustain”; ties or top &lt; 6 → “Balanced”); no offer highlights; opponent Soul fog until fight.
- UI: Draft panel; fight reveals both Souls; life bar scales to seat max life.

Locked favor-line copy / Balanced threshold and heal-cap = starting max in `CONTEXT.md`.
