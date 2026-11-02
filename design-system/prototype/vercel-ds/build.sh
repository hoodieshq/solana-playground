#!/bin/sh
# Builds the design system's page into public/design-system/ for its preview stand. Only the page:
# the live site (scripts/site.sh) also carries the proposal's product and Studio, which this stand
# leaves out, so it can be deployed from any machine without wiping them
set -e
cd "$(dirname "$0")"

(cd ../.. && npx tsc -b && npx vite build --base=/design-system/)
rm -rf public && mkdir -p public && cp -R ../../dist public/design-system
