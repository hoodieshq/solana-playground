#!/bin/sh
# Puts the files toggle prototype (DES-205) into public/. It's one static page, nothing to build
set -e
cd "$(dirname "$0")"

rm -rf public && mkdir public && cp ../files-toggle/index.html public/index.html
