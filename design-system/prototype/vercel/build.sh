#!/bin/sh
# Builds the stand into public/. The code itself lives in the branch almaz/tutorial-prototype in
# hoodieshq/solana-playground
set -e
cd "$(dirname "$0")"

(cd ../.. && npm run build:prototype)
rm -rf public && cp -R ../../dist-prototype public
