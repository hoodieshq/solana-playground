#!/bin/bash
# Put the design system and the product on one site, and publish it:
# https://solana-playground-ds.vercel.app
#
#   bash scripts/site.sh            build everything, then deploy
#   NO_DEPLOY=1 bash scripts/site.sh   assemble only, into the stage below
#
# The product is the proposal's own build, copied from its deploy stage, so
# this site shows exactly what solana-playground-proposal shows. No review
# tools ever go onto the public site.
set -euo pipefail
export PATH="$HOME/.local/share/pnpm/bin:$HOME/Library/pnpm/bin:$PATH"
DS="$(cd "$(dirname "$0")/.." && pwd)"
PRODUCT="${PRODUCT:-$HOME/.solana-playground-proposal/site}"
STAGE="${STAGE:-$HOME/.solana-playground-ds/solana-playground-ds}"

cd "$DS"
[ -n "${SKIP_BUILD:-}" ] || npm run build

mkdir -p "$STAGE"
rsync -a --delete --exclude '.vercel' --exclude 'vercel.json' "$PRODUCT/" "$STAGE/"
rsync -a --delete "$DS/dist/" "$STAGE/design-system/"
rsync -a --delete "$DS/registry-dist/r/" "$STAGE/r/"
rm -f "$STAGE/design-system/studio.config.js"

cat > "$STAGE/vercel.json" <<'JSON'
{
  "rewrites": [
    { "source": "/design-system", "destination": "/design-system/index.html" },
    { "source": "/((?!design-system/|r/).*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/r/(.*)", "headers": [{ "key": "Access-Control-Allow-Origin", "value": "*" }] },
    { "source": "/design-system/index.html", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] }
  ]
}
JSON

echo "assembled: $STAGE"
[ -z "${NO_DEPLOY:-}" ] || exit 0

# No review tools may reach the public site
if [ -e "$STAGE/studio" ] || grep -rqlE 'studio\.config|/studio/|StudioConfig' "$STAGE"/index.html "$STAGE/design-system" 2>/dev/null; then
  echo "the stage still carries the review tools: not deploying" >&2
  exit 1
fi
cd "$STAGE"
npx --yes vercel@latest deploy --prod --yes --scope hoodies
