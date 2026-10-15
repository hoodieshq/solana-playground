#!/usr/bin/env bash
# Write the PR's one preview comment, editing it in place on every later run so
# a PR pushed to twenty times carries one comment, not twenty.
#
#   preview-comment.sh [--edit-only] <pr-number> <body>
#
# --edit-only changes an existing comment and posts none, for the teardown of a
# PR that may never have had a preview. Needs GH_TOKEN with
# pull-requests: write and GITHUB_REPOSITORY.
set -euo pipefail

edit_only=false
if [ "${1:-}" = --edit-only ]; then
  edit_only=true
  shift
fi

MARKER='<!-- preview-deploy -->'
pr=$1
body="$MARKER
$2"

id=$(gh api --paginate "repos/$GITHUB_REPOSITORY/issues/$pr/comments" \
  --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | startswith(\"$MARKER\"))) | .id" | head -1)

if [ -n "$id" ]; then
  gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" -f body="$body" >/dev/null
elif [ "$edit_only" = false ]; then
  gh api "repos/$GITHUB_REPOSITORY/issues/$pr/comments" -f body="$body" >/dev/null
fi
