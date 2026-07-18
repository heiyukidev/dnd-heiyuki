# Live event-driven Match updates with animation hints

The auto-battler **Match** must stay server-authoritative without shipping a full precomputed fight for a separate client replay/animation layer. We run an **event-driven** live sim on the server (wake at the next **Item** ready-time or **Match time cap**, resolve, push a **Match update**, reschedule), and each update carries a compact **animation hint** plus combat deltas. Clients subscribe and react; cooldown bars animate **optimistically** on the frontend from each slot’s `nextReadyAt`, then reconcile when a fire **Match update** arrives.

## Considered Options

- **Precompute full timeline at Match start** — Rejected: forces a client-side replay/animation player over a finished log.
- **Fixed tick loop (e.g. every 100ms)** — Rejected: wasteful wakeups and noisy updates when nothing fired.
- **Client-simulated cooldowns as source of truth** — Rejected: desync and disputed outcomes.
- **Event-driven server sim + Match updates + animation hints + optimistic cooldown UI** — Accepted.
