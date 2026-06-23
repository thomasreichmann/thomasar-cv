# 0005 - Guest conversion: merge anonymous résumés into the target account

Status: accepted (issue #67)

## Context

Guest mode (issue #67) lets a visitor use the editor without signing up. The
work persists server-side under an anonymous user minted by BetterAuth's
anonymous plugin, which is a real `user` row (flagged `isAnonymous: true`) with a
normal session, so an anonymous résumé is just a `resume` whose `userId` points
at that anonymous user. The whole ownership boundary, `ownedResumes(db, userId)`
filtering every query by `id AND userId`, holds with no parallel code path,
because the anonymous user *is* the owner.

Conversion to a real account has two entry points, and they need defined
behavior:

- **Sign-up.** The guest creates a brand-new account. Acceptance criterion 3:
  their anonymous résumés are reassigned to the new account.
- **Sign-in to an existing account.** The guest already has an account (with its
  own résumés, possibly) and signs into it from the guest session. Acceptance
  criterion 4, and the open question this ADR answers: what happens to the work
  the guest just did, when the destination is not empty.

The anonymous plugin gives us one hook for both: `onLinkAccount({ anonymousUser,
newUser })` fires from an `after` hook on `/sign-in` and `/sign-up` whenever the
prior session was anonymous and authentication issued a new session. It runs
before the plugin deletes the anonymous user. That ordering and that single hook
are the levers this decision pulls.

## Decision

On conversion, **reassign the guest's résumés to the target user**, in both
entry points, inside `onLinkAccount`. Sign-up and sign-in collapse to the same
operation; the only difference is whether the target started with résumés of its
own.

- **Sign-in to an existing account merges by appending.** The account ends up
  owning its own résumés plus the guest's, as distinct rows. No content is
  combined, no row is dropped. The guest never loses the work they just did, and
  the cost is that the account can momentarily hold near-duplicates the user
  deletes later.
- **No dedup.** Two résumés with the same name are allowed (they already can be).
  We do not try to combine two JSONB documents by name, which is ambiguous and
  would risk dropping the guest's newer edits. If same-name collisions ever read
  badly in the list, the escape hatch is a `(n)` suffix on the merged copy's
  name, deferred until it is an actual problem.
- **Silent and reversible.** The merge happens without a prompt or a blocking
  confirmation. It leans on the result being reversible: an unwanted extra
  résumé is one delete away. A confirmation step is deliberately not required,
  because the safe-by-default outcome (keep the work) is also the one the user
  almost always wants.

## Both paths are one operation

The reassign is a single statement, scoped to the guest's own rows:

```
update resume set user_id = :newUserId where user_id = :anonUserId
```

It is naturally atomic (all the guest's rows move or none do) and idempotent
(running it twice is a no-op the second time, since nothing still matches the
anonymous id). Reassigning into an empty account is the sign-up case;
reassigning into a populated one is the sign-in-to-existing case. There is no
second code path. résumé ids are random UUIDs, so moving rows between owners
never collides on a primary key, and afterwards `ownedResumes(newUserId)` sees
the merged set with no other change.

## Why merge, not prompt

Prompting the guest to keep-or-discard at sign-in was the alternative. It loses
on two counts. First, the safe default already matches intent: a guest who just
built a résumé and signs in wants to keep it, so the prompt would mostly ask a
question with one sensible answer. Second, it fights the plugin. `onLinkAccount`
is a server-side hook fired mid-auth, with no natural point to pause and ask, so
a real prompt means intercepting on the client before the auth call, detecting
guest work, and showing a modal, which is meaningfully more surface for a choice
that rarely needs making. Discarding guest work silently was rejected outright:
it is the one outcome that loses what the visitor came to do.

## On failure

The reassign and the cleanup are ordered so a failure cannot lose data, which is
how the "atomic, or retry" intent is actually delivered.

`onLinkAccount` runs first; only after it resolves does the plugin delete the
anonymous user. The résumé foreign key is `on delete cascade`, so if the
anonymous user were deleted with résumés still pointing at it, those rows would
be dropped. Reassigning inside the hook moves them off the anonymous user before
it is deleted, so the cascade finds nothing to drop.

If the reassign throws, the plugin's deletion never runs (it is gated behind the
hook resolving), so the anonymous user and its résumés stay intact and the work
is recoverable, not lost. The reassign being a single idempotent statement means
a retry, or a later re-link, completes the move cleanly with no half-applied
state.

One honesty note about the mechanism: because `onLinkAccount` is an `after` hook,
authentication has already succeeded and the new session is already issued by the
time it runs, so a thrown reassign does not roll the sign-in back the way a
wrapping transaction would. What it guarantees is narrower and sufficient: the
move is all-or-nothing, and a failure preserves the guest's data rather than
destroying it. The drafts simply remain under the anonymous session until a
successful retry attaches them.

## What this needs

- **Schema.** The anonymous plugin requires an `isAnonymous` boolean on the
  `user` table. That is the one additive migration, generated through the
  existing drizzle-kit flow and exercised by the pglite test DB like any other.
- **Plugin config.** Keep the plugin default that deletes the anonymous user
  after a successful link, so converted guests leave no empty shell behind. The
  reassign lives in `onLinkAccount`; nothing else in the auth config changes.
- **Edge cases that need no special handling.** A guest with zero résumés
  converts as a plain no-op move. A sign-up against an email that already exists
  fails as an ordinary sign-up (no new session, the hook does not fire), and the
  visitor stays anonymous and can sign in instead.

## Consequences

- An account can briefly hold duplicate-looking résumés after a guest signs into
  it. That is accepted as the reversible cost of never losing work; the user
  prunes what they do not want.
- Converting guests are cleaned up by the plugin's own deletion. Guests who
  never convert are a separate concern: their abandoned data is swept by the TTL
  job in #68, and the volume of writes a single anonymous session can make
  before converting is bounded by the rate limiting in #69. Neither is in scope
  here.
- The decision is intentionally generous to the guest. If abuse via merge ever
  matters (a guest mass-creating résumés then merging them into a victim account
  is not possible, since merge only ever moves the guest's *own* rows into the
  account they authenticated as), the lever is #69, not this policy.
