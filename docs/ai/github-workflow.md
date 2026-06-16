---
title: GitHub Workflow for AI Agents
status: active
tags:
    - ai
    - github
    - workflow
ai_summary: 'How to create, link, and manage GitHub issues for thomasar-cv via the gh CLI'
---

# GitHub Workflow for AI Agents

Conventions for turning work into GitHub issues, linking them, and managing them with the `gh` CLI. Repo: `thomasreichmann/thomasar-cv`.

## Issue style

write issues like a dev jotting a note, not a formal spec.

- **title**: lowercase, imperative, specific. no prefix or emoji.
- **description**: one line, what's being done. nothing the other sections already say.
- **acceptance criteria**: specific deliverables only. never "it builds / works / passes", that's assumed for every issue. each item is a concrete artifact or outcome, not an implementation step.
- **out of scope**: only boundaries a reader would assume are in. drop the section when there are none.
- **voice**: plain dev shorthand. no flourish, no padding, no redundancy across sections.
- **no em / en dashes**, ever. use a comma, parens, or " - ". `scripts/gh-issue.sh` strips them as a backstop, but write clean anyway.
- **labels**: one area + one type + one status + one priority.

issue #1 is the canonical example; match it.

## Creating Issues

1. **Get explicit approval** - draft content, present to the user first.
2. **Check duplicates** - `gh issue list --search "keyword"`.
3. **One issue per coherent unit of work.**

Create and edit issues with `scripts/gh-issue.sh`, a thin wrapper over `gh issue` that strips em / en dashes from the title and body. Don't call `gh issue create|edit` directly.

```bash
scripts/gh-issue.sh create --title "brief title" --label "area,type,status,priority: x" --body "$(cat <<'EOF'
## Description
what and why.

## Acceptance Criteria
- [ ] criterion

## Out of Scope
- not covered
EOF
)"
```

### Labels

| Area           | Type          | Status          | Priority             |
| -------------- | ------------- | --------------- | -------------------- |
| `frontend`     | `feature`     | `needs-details` | `priority: critical` |
| `backend`      | `bug`         | `ready`         | `priority: high`     |
| `infra`        | `chore`       | `in-progress`   | `priority: medium`   |
| `docs`         | `refactor`    | `needs-triage`  | `priority: low`      |
| `architecture` | `enhancement` |                 |                      |

- Every issue MUST have exactly one status label (`needs-details` or `ready`).
- Give each issue a `priority:` label for backlog ordering.
- Use `architecture` for foundational work other issues depend on.
- There is no `blocked` label. Blocking is a relationship (see below), GitHub surfaces it in the UI, and a label would only drift out of sync.

### Prerequisites Checklist

Before creating an implementation issue: check what modules / tables / patterns it needs. If a prerequisite doesn't exist, create the foundational issue first (label `architecture`) and wire it as a blocker.

## Issue Relationships

### GraphQL Helper Pattern

Relationships are set by node ID. Fetch IDs for the issues you want to link:

```bash
gh api graphql -f query='
query {
  repository(owner: "thomasreichmann", name: "thomasar-cv") {
    a: issue(number: NUM_A) { id }
    b: issue(number: NUM_B) { id }
  }
}'
```

### Sub-Issues (Parent / Child)

Use when B is *part of* A (epic → tasks, feature → follow-up work).

```bash
gh api graphql -f query='
mutation { addSubIssue(input: { issueId: "PARENT_ID", subIssueId: "CHILD_ID" }) { issue { number } } }'

# Remove:
gh api graphql -f query='
mutation { removeSubIssue(input: { issueId: "PARENT_ID", subIssueId: "CHILD_ID" }) { issue { number } } }'
```

### Blocking (Dependencies)

Use when B must complete *before* A can start.

```bash
gh api graphql -f query='
mutation { addBlockedBy(input: { issueId: "BLOCKED_ID", blockingIssueId: "BLOCKING_ID" }) { issue { number } } }'

# Remove:
gh api graphql -f query='
mutation { removeBlockedBy(input: { issueId: "BLOCKED_ID", blockingIssueId: "BLOCKING_ID" }) { issue { number } } }'
```

`addBlockedBy` is called on the **blocked** issue, naming the issue that blocks it. Don't add a label for this; the relationship is the source of truth and shows in the UI.

### Check Relationships

```bash
gh api graphql -f query='
query {
  repository(owner: "thomasreichmann", name: "thomasar-cv") {
    issue(number: NUM) {
      title
      parent { number title }
      subIssues(first: 20) { nodes { number title state } }
    }
  }
}'
```

## Updating Issues

```bash
gh issue comment 42 --body "Status update"
gh issue edit 42 --add-label "ready" --remove-label "needs-details"
gh issue close 42 --comment "Completed in PR #45"
```

## Referencing Issues

| Context      | Format                       |
| ------------ | ---------------------------- |
| Commit       | `feat: add login form (#42)` |
| PR (closing) | `Closes #42`                 |
| PR (related) | `Related to #42`             |

## Token Efficiency

- Fetch only needed fields: `--json title,body,state`.
- Don't re-fetch issues already read.
- Use `--limit` when listing.
