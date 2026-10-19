#!/usr/bin/env bash
# Vercel REST calls for the preview workflows: point the Preview deployments of
# one git branch at that branch's own database. The REST API rather than the
# CLI, whose `env` subcommands prompt and whose output is meant for people.
#
#   vercel.sh env-set <git-branch>              set DATABASE_URL for <git-branch>'s Preview deployments to
#                                               stdin, unless it already holds that; print when it last changed (ms)
#   vercel.sh env-rm <git-branch>               remove that variable; absence is a pass
#   vercel.sh redeploy-if-stale <sha> <since>   wait for the Preview deployment of <sha>; if it was created
#                                               before <since> (ms), redeploy it and print the new URL
#
# A deployment reads its variables when it is built, so one built before the
# variable changed still points at the old database; that is what
# redeploy-if-stale is for.
set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN secret is unset}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID variable is unset}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID variable is unset}"
KEY=${VERCEL_DATABASE_KEY:-DATABASE_URL}
# How long to wait for Vercel's Git integration to create the deployment.
WAIT_SECONDS=${VERCEL_WAIT_SECONDS:-600}

API=https://api.vercel.com
TEAM="teamId=$VERCEL_ORG_ID"
PROJECT=projects/$VERCEL_PROJECT_ID

# Same retry policy as neon.sh: a write is retried only on 429, which refuses
# it unprocessed; after a 5xx or a dropped connection it may have landed.
api() {
  local attempt status body retry='^(429|5..|000)$'
  [[ " $* " == *" -X POST "* || " $* " == *" -X PATCH "* ]] && retry='^429$'
  body=$(mktemp)
  for attempt in 1 2 3 4 5 6; do
    status=$(curl -sS --connect-timeout 10 --max-time 60 -o "$body" -w '%{http_code}' \
      -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' "$@") || status=000
    [[ "$status" == 2?? ]] && { cat "$body"; rm -f "$body"; return 0; }
    [[ "$status" =~ $retry ]] && [ "$attempt" -lt 6 ] || break
    echo "vercel: HTTP $status, retry $attempt" >&2
    sleep $((attempt * 5))
  done
  echo "vercel: HTTP $status for $*" >&2
  cat "$body" >&2
  rm -f "$body"
  return 1
}

# The Preview variable scoped to exactly this git branch, as one JSON object,
# or nothing. Filtered here as well as by the query: an unscoped Preview
# variable of the same name (the Neon integration's) must never match.
env_entry() {
  api -G --data-urlencode "$TEAM" --data-urlencode "gitBranch=$1" "$API/v10/$PROJECT/env" |
    jq -c --arg key "$KEY" --arg branch "$1" \
      'first(.envs[] | select(.key == $key and .gitBranch == $branch and (.target | index("preview")))) // empty'
}

changed_at() {
  jq -er '.updatedAt // .createdAt' <<<"$1"
}

cmd_env_set() {
  local branch=$1 value entry id current
  # From stdin, so the connection string never appears in a process listing.
  value=$(cat)
  [ -n "$value" ] || { echo "vercel: empty value for $KEY" >&2; return 1; }
  entry=$(env_entry "$branch")
  if [ -n "$entry" ]; then
    id=$(jq -er .id <<<"$entry")
    # The listing does not decrypt; reading one variable does.
    current=$(api "$API/v1/$PROJECT/env/$id?$TEAM" | jq -r '.value // ""')
    if [ "$current" = "$value" ]; then
      echo "vercel: $KEY for $branch unchanged" >&2
    else
      api -X PATCH "$API/v9/$PROJECT/env/$id?$TEAM" \
        -d "$(jq -n --arg value "$value" '{value: $value}')" >/dev/null
      echo "vercel: $KEY for $branch updated" >&2
    fi
  else
    api -X POST "$API/v10/$PROJECT/env?$TEAM" -d "$(jq -n --arg key "$KEY" --arg value "$value" --arg branch "$branch" \
      '{key: $key, value: $value, type: "encrypted", target: ["preview"], gitBranch: $branch}')" >/dev/null
    echo "vercel: $KEY for $branch created" >&2
  fi
  # Read back rather than trust a write's response: its shape differs between
  # create and update, and the time must be the server's.
  entry=$(env_entry "$branch")
  [ -n "$entry" ] || { echo "vercel: $KEY for $branch missing after the write" >&2; return 1; }
  changed_at "$entry"
}

cmd_env_rm() {
  local branch=$1 entry id
  entry=$(env_entry "$branch")
  if [ -z "$entry" ]; then
    echo "no Vercel $KEY for $branch, nothing to remove"
    return 0
  fi
  id=$(jq -er .id <<<"$entry")
  api -X DELETE "$API/v9/$PROJECT/env/$id?$TEAM" >/dev/null
  echo "removed Vercel $KEY for $branch"
}

# The newest Preview deployment of <sha>, as one JSON object, or nothing.
deployment_of() {
  api -G --data-urlencode "$TEAM" --data-urlencode "projectId=$VERCEL_PROJECT_ID" \
    --data-urlencode target=preview --data-urlencode limit=100 "$API/v6/deployments" |
    jq -c --arg sha "$1" \
      '[.deployments[] | select(.meta.githubCommitSha == $sha)] | max_by(.created) // empty'
}

cmd_redeploy_if_stale() {
  local sha=$1 since=$2 deployment waited=0 created name url
  until deployment=$(deployment_of "$sha") && [ -n "$deployment" ]; do
    if [ "$waited" -ge "$WAIT_SECONDS" ]; then
      echo "vercel: no Preview deployment of $sha after ${WAIT_SECONDS}s" >&2
      return 1
    fi
    sleep 15
    waited=$((waited + 15))
  done
  created=$(jq -er .created <<<"$deployment")
  if [ "$created" -ge "$since" ]; then
    echo "vercel: $(jq -r .url <<<"$deployment") was built after $KEY changed, nothing to redeploy" >&2
    return 0
  fi
  name=$(api "$API/v9/$PROJECT?$TEAM" | jq -er .name)
  url=$(api -X POST "$API/v13/deployments?$TEAM&forceNew=1" \
    -d "$(jq -n --arg name "$name" --arg id "$(jq -er .uid <<<"$deployment")" '{name: $name, deploymentId: $id}')" |
    jq -er .url)
  echo "vercel: redeployed $(jq -r .url <<<"$deployment") as $url" >&2
  printf 'https://%s\n' "$url"
}

case "${1:-}" in
  env-set) cmd_env_set "$2" ;;
  env-rm) cmd_env_rm "$2" ;;
  redeploy-if-stale) cmd_redeploy_if_stale "$2" "$3" ;;
  *) echo "usage: vercel.sh env-set <branch> < value | env-rm <branch> | redeploy-if-stale <sha> <since-ms>" >&2; exit 2 ;;
esac
