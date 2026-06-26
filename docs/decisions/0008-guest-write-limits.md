# 0008 - Guest write limits: server-enforce one résumé per guest

Status: accepted (issue #69)

## Context

Guest mode (ADR 0005) lets a visitor use the editor with no sign-up. A guest is
a real `user` row flagged `isAnonymous: true` with a normal session, so their
résumés are owned through the same boundary as any account's, and every résumé
mutation already runs through `protectedProcedure` with a non-null
`ctx.session`. This is the strength of the design and also the exposure: an
anonymous session is free to mint (`signIn.anonymous()`), yet it carries the
same write access to the résumé router as a signed-up user. ADR 0005 flagged
this and deferred the bound to here ("the volume of writes a single anonymous
session can make before converting is bounded by the rate limiting in #69").

The issue framed it as "rate limit anonymous résumé writes." Looking at what
actually causes durable harm separates three vectors that want different tools:

- **Row growth** - one guest calling `resume.create` repeatedly, filling the
  shared database with junk rows. This is the only vector that grows data, and
  it is exactly what the TTL sweep in #68 exists to clean up. It is bounded by a
  *count*, not a frequency.
- **Session churn** - an attacker minting unlimited anonymous sessions, each
  writing under its own user. A per-user bound does nothing here; only a throttle
  on session creation does. That throttle is BetterAuth's auth-endpoint rate
  limiting on `/api/auth` (`/sign-in/anonymous`), which the issue scopes out as
  already covered.
- **Write amplification** - hammering `update` on one owned row. No data grows
  (the same row is rewritten), only database CPU/IO is spent. This is an edge /
  platform concern, not application logic, and `update` already validates content
  through `resumeContent` so the payload size is bounded.

The decisive observation is what a *legitimate* guest actually produces. Guest
entry is already idempotent (`try-guest-button.tsx`): it reads
`resume.list`, reopens `existing[0]` if there is one, and only calls
`resume.create` for a fresh session. There is no second create path - a guest
has no dashboard (hitting `/dashboard` routes back to their one résumé), so the
dashboard's create button is unreachable. A legitimate guest therefore creates
**exactly one résumé, ever.** The "one résumé per guest" rule is a real product
invariant ("Guest mode is deliberately one résumé with no dashboard") - but
today it is enforced only in the client. The server has no guard, so a scripted
caller can `resume.create` under a guest session without limit.

## Decision

**Server-enforce the one-résumé-per-guest invariant on `create`.** When the
caller's session is anonymous and they already own a résumé, reject the create.
This is not a chosen quota number - the cap *is* the invariant, and the number is
1 because that is the legitimate ceiling the product already imposes.

Concretely:

- **`create` guard, keyed on `ctx.session.user.isAnonymous`.** A guest with zero
  résumés creates their one; a guest who already owns one is refused. A
  non-anonymous user is unaffected (an account may own many). The count is read
  through `ownedResumes(ctx.db, userId)`, not a direct `db` query, so the issue
  #5 rule that routers never touch `resume` outside the ownership boundary holds.
- **Reject with `FORBIDDEN`** and a clear message ("Guest mode is limited to one
  résumé."). A legitimate guest never reaches this branch - the client reuses
  `existing[0]` and never calls create when one exists - so the error is for the
  scripted / non-UI caller, and `FORBIDDEN` reads truer than `TOO_MANY_REQUESTS`
  because this is a standing rule, not a time-window throttle.
- **Defer `update`-frequency limiting.** It is the write-amplification vector: no
  data grows, payloads are already validated, and a guest can only hammer their
  own single row. Building a frequency limiter for it now would add machinery to
  defend against a cost we do not observe. The documented trigger is below.
- **Delegate the other two vectors to existing layers.** Session churn is bounded
  by BetterAuth's `/api/auth` rate limiting (out of scope per the issue);
  abandoned guest data is swept by #68. The composition is the actual defense:
  the auth limiter bounds sessions per IP, this guard bounds rows per session, so
  rows per IP are bounded without us building an IP limiter.

## Why a count guard, not a rate limiter

The issue's third acceptance criterion is to decide and record the approach
between a DB-backed counter, an external KV, or a per-user count cap. The count
guard wins here on every axis that matters for this project:

- **It needs no shared store, yet holds across serverless invocations.** The
  count lives in Postgres - the résumé rows themselves - which is already the
  source of truth. There is nothing in-process to lose between Vercel lambdas, so
  the "in-memory counters do not survive lambdas" failure mode never applies. No
  new table, no Redis, no TTL bookkeeping.
- **It bounds the growth vector exactly.** A window counter or an Upstash /
  Vercel KV sliding window would limit *frequency* of all mutations - solving the
  write-amplification vector we are deliberately deferring, at the cost of a new
  table-with-its-own-cleanup or a new external service plus secret, to defend a
  single-user CV tool. That is machinery out of proportion to the threat.
- **It makes a real product rule true.** Promoting the one-résumé invariant from
  UI convention to a server-enforced fact is worth doing on its own; the abuse
  bound falls out of it for free, rather than being a separate mechanism bolted
  on.

## The guard is best-effort against races

The check is read-then-insert: count the guest's résumés, refuse if ≥ 1, else
insert. Two concurrent creates can both read zero and both insert, yielding two
rows. This is accepted. Airtight enforcement would need an advisory lock, a
serializable transaction, or a partial unique index - and the index would mean
denormalizing `is_anonymous` onto the `resume` row, since the flag lives on
`user`. That is real complexity for a marginal gain, because a best-effort guard
already bounds an attacker to roughly their concurrency, and BetterAuth's
per-IP throttle on `/sign-in/anonymous` bounds how many sessions they can be
concurrent across. The composed bound is small without the lock.

The trigger for revisiting: if abuse appears in practice - guest rows climbing
past the single-digit-per-session the race allows, or update-frequency actually
loading the database - the next step is the airtight enforcement (advisory lock
or denormalized partial unique index) for create, and a per-user fixed-window
counter for update. Both are additive to this decision, not a rewrite of it.

## Consequences

- A guest's row growth is bounded to one (best-effort: a small constant under
  concurrent abuse). Combined with #68's sweep and the auth-endpoint limiter,
  the shared database's exposure to anonymous writes is bounded end to end.
- The "one résumé per guest" invariant is now enforced where it is guaranteed -
  the server - rather than only suggested by the client. The client check in
  `try-guest-button.tsx` stays as the happy-path optimization (reuse rather than
  fail), but is no longer the only thing standing between a guest and a second
  row.
- `update`-frequency remains unbounded by application logic. This is a conscious
  gap, not an oversight: it is the no-growth vector, defended by content
  validation and the single-row blast radius, with a documented trigger to add a
  window counter if it ever bites.
- The conversion path is unaffected. On sign-up / sign-in the guest's résumé is
  reassigned (ADR 0005) and the user is no longer anonymous, so the guard stops
  applying; the resulting account may own many résumés as before.
