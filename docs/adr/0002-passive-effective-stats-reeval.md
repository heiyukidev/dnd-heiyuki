# Passive effective stats recompute every wake

**Passive**s rewrite matching **Items**' **Cooldown** and/or potency into **effective** values. Even though this slice ships only unconditional **Passive**s (always eligible while the carrier is in the **Loadout**), the live sim **recomputes** those effective stats on every wake—and exposes an eligibility re-eval hook for future **Passive** conditions—rather than snapshotting once at **Match start**. When a re-eval changes **effective Cooldown** mid-charge, `nextReadyAt` is rewritten by preserving charge progress fraction: `nextReadyAt = now + (1 − progress) × newEffectiveCooldown`.

## Considered Options

- **Snapshot effective stats at Match start** — Rejected: cheaper today, but forces a model change (and likely mid-charge policy rework) the moment conditional **Passive**s land.
- **Recompute only after each fire** — Rejected: misses eligibility flips that happen between fires.
- **Recompute every wake + re-eval hook; mid-charge rescale by progress fraction** — Accepted: keeps ADR 0001’s event-driven wake loop, stays correct once conditions exist, and avoids surprising charge resets when a **Passive** turns on or off.
