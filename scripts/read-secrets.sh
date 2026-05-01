#!/usr/bin/env bash
#
# read-secrets.sh — Read deploy secrets from GCP Secret Manager.
#
# Writes key=value pairs to $GITHUB_OUTPUT and masks secret values
# in CI logs.  Designed to be called from a GH Actions step:
#
#   run: ./scripts/read-secrets.sh
#   env:
#     GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
#     ENABLE_API_KEY: ${{ vars.GCP_ENABLE_API_KEY }}
#
# Outputs (via $GITHUB_OUTPUT):
#   mongo     — MongoDB connection URI
#   api_key   — latest API key (for the web proxy to send)
#   api_keys  — comma-separated list of enabled keys (for the server to accept;
#               includes current + previous to support zero-downtime rotation)

set -euo pipefail
set +x  # prevent secret values from leaking via xtrace
set -f  # disable glob expansion for gcloud output

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
: "${GITHUB_OUTPUT:?must run inside GitHub Actions}"

################################### HELPERS ####################################

emit() {
  echo "$1=$2" >> "$GITHUB_OUTPUT"
}

# Mask a secret value in CI logs and abort if empty.
mask() {
  local val="$1" name="$2"
  if [ -z "$val" ]; then
    echo "::error::Secret '${name}' is empty"
    exit 1
  fi
  echo "::add-mask::${val}"
}

################################# MONGODB URI ##################################

MONGO=$(gcloud secrets versions access latest --secret=mongodb-uri \
  --project="$GCP_PROJECT_ID" 2>/dev/null) || {
  echo "::error::Failed to read secret 'mongodb-uri'"
  exit 1
}
mask "$MONGO" "mongodb-uri"
emit "mongo" "$MONGO"

################################## API KEYS ####################################

# Fail-open when ENABLE_API_KEY != "true" to preserve existing unauthenticated
# flows. The web server logs a warning when no key is configured.
if [ "${ENABLE_API_KEY:-}" != "true" ]; then
  emit "api_key" ""
  emit "api_keys" ""
  exit 0
fi

# Latest key — used by the web proxy (PG_API_KEY).
APIKEY=$(gcloud secrets versions access latest --secret=api-key \
  --project="$GCP_PROJECT_ID" 2>/dev/null) || {
  echo "::error::Failed to read secret 'api-key'"
  exit 1
}
mask "$APIKEY" "api-key"
emit "api_key" "$APIKEY"

# Collect up to 2 enabled versions so the server accepts both current and
# previous keys during a rolling deploy / rotation window (PG_API_KEYS).
# gcloud returns full resource paths; basename extracts the version number.
ENABLED_VERSIONS=$(gcloud secrets versions list api-key \
  --project="$GCP_PROJECT_ID" \
  --filter="state=ENABLED" \
  --sort-by="~createTime" \
  --limit=2 \
  --format="value(name)") || {
  echo "::error::Failed to list api-key versions"
  exit 1
}

API_KEYS=""
for VER in $ENABLED_VERSIONS; do
  VID=$(basename "$VER")
  VAL=$(gcloud secrets versions access "$VID" --secret=api-key \
    --project="$GCP_PROJECT_ID" 2>/dev/null) || {
    echo "::error::Failed to read api-key version '${VID}'"
    exit 1
  }
  mask "$VAL" "api-key/${VID}"
  if [ -n "$API_KEYS" ]; then
    API_KEYS="$API_KEYS,$VAL"
  else
    API_KEYS="$VAL"
  fi
done

if [ -z "$API_KEYS" ]; then
  echo "::error::ENABLE_API_KEY=true but no enabled api-key versions found"
  exit 1
fi

emit "api_keys" "$API_KEYS"
