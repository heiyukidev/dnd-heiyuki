Type: grilling
Status: resolved

# Draft → spend → fight phase sync

## Question

How does the **Match** phase machine express per-seat spend after **Draft** picks?

Decide: seat-local state after five picks (spending vs ready); when the live fight may start (both confirmed spend); what **Match cancel** clears; whether a finished spender sees the other still drafting/spending. Keep Lobby shop and Session gold out of scope.

## Answer

- **Global phase:** Stay in `playPhase: draft` through picking and spending. No new global `spend` phase.
- **Seat-local:** picking (five **Boon** picks) → spending (**Gold** realloc on **Soul**) → ready (after **Confirm**). A seat may be spending while the other is still picking.
- **Fight start:** When **both** seats are ready (confirmed spend), flip to `playPhase: match` and start the live sim. Combat **Soul** = rolled stats + confirmed bumps.
- **Waiting UX:** Ready (or still-picking) seats see a wait banner if the opponent isn’t ready yet — same pattern as today’s Draft `waitingForOpponent`. No reveal of opponent Loadout / Soul / **Gold** / bumps until the fight.
- **Match cancel:** Host may cancel during Draft including mid-spend or one-seat-ready → Lobby. Clears Loadouts, God pools, Souls, Equipment, **Gold**, and pending bumps (extend today’s wipe).
