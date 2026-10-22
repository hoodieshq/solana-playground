#!/bin/sh
# Builds the stand into public/: the product from client-v2 (WASM stubbed, so no Rust toolchain)
# and the Studio ribbon over it, as on solana-playground-ds. The code lives in the branch
# almaz/tutorial-in-product in hoodieshq/solana-playground
set -e
cd "$(dirname "$0")"

# The build server lets in only the origins it knows, so the stand reaches it through its own
# origin: vercel.json rewrites /build-server/ to it
(cd ../client-v2 && REACT_APP_SERVER_URL="${STAND_URL:-https://playground-tutorial-product.vercel.app}/build-server" yarn build-fast)
rm -rf public && cp -R ../client-v2/build public
mkdir -p public/studio && cp ../design-system/studio/tools/*.js ../design-system/studio/tools/*.css public/studio/
node studio-config.mjs public/studio/studio.config.js

# The ribbon's scripts go last in the body, in the order the site uses
tags='<script src="/studio/studio.config.js"></script><script src="/studio/annotate.js"></script><script src="/studio/components.js"></script><script src="/studio/narrate.js"></script><script src="/studio/studio.js"></script>'
node -e 'const f=process.argv[1],t=process.argv[2],fs=require("fs");const h=fs.readFileSync(f,"utf8");const i=h.lastIndexOf("</body>");fs.writeFileSync(f,h.slice(0,i)+t+h.slice(i))' public/index.html "$tags"
