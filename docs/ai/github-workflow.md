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

## Creating Issues

1. **Get explicit approval** — draft content, present to the user first.
2. **Check duplicates** — `gh issue list --search "keyword"`.
3. **One issue per coherent unit of work.**

```bash
gh issue create --title "Brief title" --label "area,type,status,priority: x" --body "$(cat <<'EOF'
## Description
What and why.

## Acceptance Criteria
- [ ] Criterion

## Out of Scope
- Not covered
EOF
)"
```

### Labels

| Area           | Type          | Status        | Priority             |
| -------------- | ------------- | ------------- | -------------------- |
| `frontend`     | `feature`     | `needs-details` | `priority: critical` |
| `backend`      | `bug`         | `ready`       | `priority: high`     |
| `infra`        | `chore`       | `blocked`     | `priority: medium`   |
| `docs`         | `refactor`    | `in-progress` | `priority: low`      |
| `architecture` | `enhancement` | `needs-triage` |                      |

- Every issue MUST have exactly one status label (`needs-details` or `ready`).
- Give each issue a `priority:` label for backlog ordering.
- Use `architecture` for foundational work other issues depend on.
- `blocked` marks an issue waiting on a dependency (pair it with a blocking relationship below).

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

`addBlockedBy` is called on the **blocked** issue, naming the issue that blocks it.

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
