#!/bin/sh
# Builds Oak (the tutorial v2 prototype as it is in the working tree) into public/ for its shareable
# stand. Open v1 in the prototype bar points at the v1 stand, since this one doesn't carry v1
set -e
cd "$(dirname "$0")"

(cd ../.. && VITE_V1_URL="https://playground-tutorial-prototype.vercel.app/prototype/tutorial/" npx vite build -c vite.prototype-v2.config.ts)
rm -rf public && cp -R ../../dist-prototype-v2 public
