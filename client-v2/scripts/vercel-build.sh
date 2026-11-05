#!/usr/bin/env bash
# Vercel's build, kept here because vercel.json caps `buildCommand` at 256
# characters and a longer one fails every deployment before it starts.
set -euo pipefail

node scripts/check-agent-env.mjs
node scripts/check-unstable-env.mjs

REACT_APP_VERCEL_ENV="${VERCEL_ENV:-}" \
  REACT_APP_VERCEL_GIT_COMMIT_SHA="${VERCEL_GIT_COMMIT_SHA:-}" \
  NODE_OPTIONS='--max-old-space-size=6144' \
  yarn build:bundle

node scripts/wasm-stubs.mjs check-build build
