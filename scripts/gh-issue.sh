#!/usr/bin/env bash
# wrapper for `gh issue create|edit|comment` that runs --title / --body /
# --body-file through scripts/strip-dashes first, so em dashes can never reach
# github no matter what the draft contained. use this instead of calling
# `gh issue create|edit` directly.
#
#   scripts/gh-issue.sh create --title "..." --label "a,b" --body "..."
#   scripts/gh-issue.sh edit 12 --body-file body.md
#   scripts/gh-issue.sh comment 12 --body "..."
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
strip() { "$here/strip-dashes"; }

args=()
while [ $# -gt 0 ]; do
  case "$1" in
    -t|--title)      args+=( "$1" "$(printf '%s' "$2" | strip)" ); shift 2 ;;
    -b|--body)       args+=( "$1" "$(printf '%s' "$2" | strip)" ); shift 2 ;;
    -F|--body-file)  args+=( --body "$(strip < "$2")" ); shift 2 ;;
    --title=*)       args+=( "--title=$(printf '%s' "${1#--title=}" | strip)" ); shift ;;
    --body=*)        args+=( "--body=$(printf '%s' "${1#--body=}" | strip)" ); shift ;;
    --body-file=*)   args+=( "--body=$(strip < "${1#--body-file=}")" ); shift ;;
    *)               args+=( "$1" ); shift ;;
  esac
done

exec gh issue "${args[@]}"
