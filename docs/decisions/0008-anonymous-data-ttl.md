# 0008 - Sweeping abandoned anonymous data on a TTL

Status: accepted (issue #68)

## Context

Guest mode (ADR 0005) mints a real `user` row per anonymous visitor, flagged
`isAnonymous`, owning its résumés through the same boundary as any account. When
a guest converts, BetterAuth's anonymous plugin deletes that row on link, and
`onLinkAccount` has already moved its résumés onto the target, so conversion
leaves nothing behind.

Guests who never convert do. Each abandoned session is a `user` row plus its
résumés, sessions, and accounts, sitting in the shared database indefinitely.
ADR 0005 named this the job for #68 and deferred it; this is that decision.

Three things have to be settled:

1. **When is a guest "abandoned"** - what activity signal, and how stale.
2. **What runs the sweep**, given no scheduled-job infra exists in the repo yet.
3. **How the trigger is kept private**, since a sweep endpoint that anyone can
   call is both a deletion lever and needless compute.

## Decision

**A daily Vercel Cron hits an internal route that deletes every never-converted
anonymous user whose last activity is older than a 30-day TTL; the cascade does
the rest.**

### Who gets swept, and when

A row still flagged `isAnonymous` is by definition one that never converted (the
plugin deletes the converted ones), so the only question is whether it has gone
cold. **Last activity is the most recent of the user's own `updatedAt` and their
newest résumé's `updatedAt`.** A guest's activity is editing résumés, and editing
a résumé does not touch the user row, so the résumé timestamp is what actually
protects an active long-lived guest; the user timestamp covers a guest who never
created one. We express this without a join: delete when the user row is itself
stale **and** no résumé of theirs was touched since the cutoff (a correlated
`NOT EXISTS` over `resume_user_id_idx`). Deleting the user cascades its résumés,
sessions, and accounts away, since every foreign key to `user.id` is
`ON DELETE CASCADE` - the same cascade `truncateAll` relies on.

We do **not** key off the `session` table. Sessions expire after 7 days and may
be cleaned up, so "has a live session" is a 7-day signal, not a retention one;
the résumé timestamp is the durable record of work that the policy is meant to
protect.

**The TTL is 30 days.** It sits comfortably past the 7-day session lifetime, so a
guest who has not touched their work in a month is unambiguously gone rather than
mid-edit, while still bounding how long abandoned rows accumulate. It is a single
constant (`ANONYMOUS_TTL_MS` in `server/anonymous/cleanup.ts`); changing the
number changes the policy, and this ADR with it.

### What runs it

This introduces the repo's first scheduled job. **Vercel Cron** is the natural
fit (we already deploy there, no new service), configured in
`apps/web/vercel.json` to GET `/api/cron/cleanup-anonymous` once a day. The
deletion itself lives in `deleteAbandonedAnonymousUsers(db, cutoff)` next to
`reassignResumes`, not in the route: like the reassign, it is a sanctioned write
across the ownership boundary that `ownedResumes` enforces, kept out of any
router, called only by the cron and tested directly against the pglite DB. The
route is the thin trigger that computes the cutoff from the server clock and logs
the count.

### Keeping the trigger private

Vercel attaches `Authorization: Bearer ${CRON_SECRET}` to cron invocations **only
when `CRON_SECRET` is set on the project**. The route refuses any request whose
header does not match, which includes refusing every request when the secret is
unset - so a forgotten secret fails closed (the sweep silently never runs) rather
than leaving an open deletion endpoint. `CRON_SECRET` is optional in the env
schema because the whole schema is parsed on first access of any var (the eager
db singleton reads `DATABASE_URL` at import); a required field would force the
secret into dev, tests, and `next build`, none of which run the cron.

## Consequences

- A never-converted guest has 30 days of inactivity before their data is removed;
  a returning guest who edits within the window is kept indefinitely. There is no
  warning or soft-delete - the data is anonymous and unclaimed, so a hard delete
  is the right cost.
- The sweep runs only in environments where `CRON_SECRET` is set on Vercel.
  Locally and in tests it does nothing, which is intended; the deletion logic is
  covered by the pglite test, not by invoking the route.
- Vercel's Root Directory for this project is `apps/web`, so `vercel.json` lives
  there. If that ever moves to the repo root, the cron config moves with it or the
  schedule silently stops firing.
- Rate limiting the volume a single anonymous session can write before it is
  swept is a separate lever (#69), not this policy.
