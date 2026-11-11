#!/bin/bash
# Put the design system and the product on one site, and publish it:
# https://solana-playground-ds.vercel.app
#
#   bash scripts/site.sh            build everything, then deploy
#   NO_DEPLOY=1 bash scripts/site.sh   assemble only, into the stage below
#   INCLUDE_STUDIO=1 NO_DEPLOY=1 bash scripts/site.sh
#                                   also add the private review tools, for a
#                                   local stage only (never deployed)
#
# The product is the proposal's own build, copied from its deploy stage, so
# this site shows exactly what solana-playground-proposal shows. The review
# tools are private and stay out of the public site.
set -euo pipefail
export PATH="/Users/treptsov/playground/.node/bin:$HOME/Library/pnpm/bin:$PATH"
DS="$(cd "$(dirname "$0")/.." && pwd)"
PRODUCT="${PRODUCT:-$HOME/.solana-playground-proposal/site}"
STUDIO="${STUDIO:-$HOME/Studio/tools}"
STAGE="${STAGE:-$HOME/.solana-playground-ds/solana-playground-ds}"

if [ -n "${INCLUDE_STUDIO:-}" ] && [ -z "${NO_DEPLOY:-}" ]; then
  echo "INCLUDE_STUDIO is for a local stage only: add NO_DEPLOY=1" >&2
  exit 1
fi

cd "$DS"
[ -n "${SKIP_BUILD:-}" ] || npm run build

mkdir -p "$STAGE"
rsync -a --delete --exclude '.vercel' --exclude 'vercel.json' "$PRODUCT/" "$STAGE/"
rsync -a --delete "$DS/dist/" "$STAGE/design-system/"
rsync -a --delete "$DS/registry-dist/r/" "$STAGE/r/"
rm -f "$STAGE/design-system/studio.config.js"

if [ -n "${INCLUDE_STUDIO:-}" ]; then
  # Local only: the five tags the review server would add, at the end of each page's body
  mkdir -p "$STAGE/studio"
  cp "$STUDIO"/*.js "$STUDIO"/*.css "$STAGE/studio/"
  node "$DS/scripts/studio-config.mjs" "$STAGE/studio/studio.config.js"
  node - "$STAGE/index.html" "$STAGE/design-system/index.html" <<'JS'
const fs = require("fs")
const TAGS = ["studio.config.js", "annotate.js", "components.js", "narrate.js", "studio.js"]
  .map((f) => `<script src="/studio/${f}"></script>`).join("\n")
for (const file of process.argv.slice(2)) {
  let html = fs.readFileSync(file, "utf8")
  if (html.includes("/studio/studio.js")) continue
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => TAGS + "\n</body>")
  fs.writeFileSync(file, html)
}
JS
fi

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

# Nothing of the review tools may reach the public site
if [ -e "$STAGE/studio" ] || grep -rqlE 'studio\.config|/studio/|StudioConfig' "$STAGE"/index.html "$STAGE/design-system" 2>/dev/null; then
  echo "the stage still carries the review tools: not deploying" >&2
  exit 1
fi
cd "$STAGE"
npx --yes vercel@latest deploy --prod --yes --scope hoodies
