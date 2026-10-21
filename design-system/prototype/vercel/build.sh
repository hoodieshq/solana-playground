#!/bin/sh
# Builds the stand into public/: the prototype itself, and under /source/ its code as of the
# last commit, for whoever picks it up while the branch isn't on GitHub. Only committed files go
# in, so nothing gitignored (credentials, .env) can end up on the stand
set -e
cd "$(dirname "$0")"
here=$(pwd)
repo=$(git rev-parse --show-toplevel)
# Our branch sits on Nikita's saving-chats-history, so the bundle carries only what comes after it
base=$(git merge-base HEAD origin/saving-chats-history)
head=$(git rev-parse --short HEAD)
branch=$(git branch --show-current)

(cd ../.. && npm run build:prototype)
rm -rf public && cp -R ../../dist-prototype public
mkdir -p public/source

git -C "$repo" archive --format=zip --prefix=design-system/ -o "$here/public/source/design-system.zip" HEAD:design-system
git -C "$repo" bundle create "$here/public/source/tutorial-prototype.bundle" "$base..$branch"

sed -e "s/{{HEAD}}/$head/g" -e "s/{{BASE}}/$(echo "$base" | cut -c1-8)/g" -e "s/{{BRANCH}}/$branch/g" -e "s/{{DATE}}/$(date +%Y-%m-%d)/g" \
  source.html > public/source/index.html
