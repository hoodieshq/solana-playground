#!/usr/bin/env bash
set -euo pipefail

# Vercel install hook for the client.
#
# Order matters: client/package.json has file-deps like "../wasm/anchor-cli/pkg"
# which don't exist until wasm-pack runs, so we must compile wasm BEFORE yarn install.

# Rust state exceeds Vercel's build cache limit, so only the wasm packages go into node_modules.
RUST_ROOT="$PWD/.cache/rust"
export CARGO_HOME="$RUST_ROOT/cargo"
export RUSTUP_HOME="$RUST_ROOT/rustup"
export CARGO_TARGET_DIR="$RUST_ROOT/target"
export PATH="$CARGO_HOME/bin:$PATH"

WASM_CACHE="$PWD/node_modules/.cache/wasm-pkg"
INSTALL_MARK="node_modules/.cache/install-key"

# Vercel Remote Cache, shared by every build of the team (see docs/deploy-client-vercel.md,
# "Build cache"). Outside a Vercel build the token is unset and only the local tar is used.
REMOTE_TOKEN="${VERCEL_ARTIFACTS_TOKEN:-}"

# An array, not only a function: xargs runs programs and cannot call a shell function.
if command -v sha256sum >/dev/null 2>&1; then SHA256=(sha256sum); else SHA256=(shasum -a 256); fi

sha256() {
  "${SHA256[@]}" "$@"
}

# Hash of every file under wasm/; build output is excluded so a build does not change its own key.
wasm_source_key() {
  find ../wasm -type f \
    -not -path '*/target/*' -not -path '*/pkg/*' -not -path '*/node_modules/*' \
    -not -name '.DS_Store' -print0 \
    | LC_ALL=C sort -z | xargs -0 "${SHA256[@]}" | sha256 | cut -d' ' -f1
}

# Names only, never values: says which credentials this build received.
report_remote_credentials() {
  local name
  for name in VERCEL_ARTIFACTS_TOKEN VERCEL_ARTIFACTS_OWNER; do
    if [ -n "${!name:-}" ]; then echo ">>> remote cache: $name set"; else echo ">>> remote cache: $name unset"; fi
  done
}

remote_enabled() {
  [ -n "$REMOTE_TOKEN" ]
}

# $1: artifact key.
remote_url() {
  printf '%s' "https://api.vercel.com/v8/artifacts/$1${VERCEL_ARTIFACTS_OWNER:+?teamId=$VERCEL_ARTIFACTS_OWNER}"
}

remote_curl() {
  curl -fsS -H "Authorization: Bearer $REMOTE_TOKEN" "$@"
}

# $1: artifact key. Succeeds only when the remote cache holds it.
remote_has() {
  remote_enabled && remote_curl -I -o /dev/null "$(remote_url "$1")" 2>/dev/null
}

# $1: artifact key, $2: destination. A failed download leaves no partial file to be read as a hit.
remote_fetch() {
  remote_enabled || return 1
  mkdir -p "$(dirname "$2")"
  remote_curl -o "$2.part" "$(remote_url "$1")" 2>/dev/null && mv "$2.part" "$2"
}

# $1: artifact key, $2: file. Never fails the build; the next build with these sources rebuilds.
remote_upload() {
  remote_enabled || return 0
  remote_curl -X PUT -H 'Content-Type: application/octet-stream' \
    --data-binary @"$2" -o /dev/null "$(remote_url "$1")" \
    || echo ">>> wasm cache upload failed; the next build with these sources rebuilds" >&2
}

build_wasm_packages() {
  mkdir -p "$CARGO_HOME" "$RUSTUP_HOME" "$CARGO_TARGET_DIR"

  # Matches wasm/build.sh's parsing of the same file.
  local rust_version
  rust_version=$(awk '/channel/{gsub(/"/, ""); print $3 }' ../wasm/rust-toolchain.toml)

  if [ ! -x "$CARGO_HOME/bin/rustup" ]; then
    # Version comes from wasm/rust-toolchain.toml so the initial `cargo install wasm-pack`
    # has a working toolchain before per-package rust-toolchain.toml files apply.
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --no-modify-path --default-toolchain "$rust_version" --profile minimal --target wasm32-unknown-unknown
  fi
  rustup default "$rust_version"

  bash ../wasm/build.sh
}

# $1: tar to write. Older archives cannot match again and count against the cache size limit.
pack_wasm_packages() {
  rm -rf "$WASM_CACHE"
  mkdir -p "$WASM_CACHE"
  (cd ../wasm && tar -cf "$1" */pkg)
  du -sh "$1"
}

# $1: wasm key. Leaves the packages under ../wasm, from the cheapest source that has them.
restore_wasm_packages() {
  local key="$1" archive="$WASM_CACHE/$1.tar"

  if [ -f "$archive" ]; then
    echo ">>> wasm cache HIT, local ($key)"
    # A build restored from the build cache seeds the remote cache when it lacks the tar.
    remote_has "$key" || remote_upload "$key" "$archive"
  elif remote_fetch "$key" "$archive"; then
    echo ">>> wasm cache HIT, remote ($key)"
  else
    echo ">>> wasm cache MISS ($key): building wasm packages"
    build_wasm_packages
    pack_wasm_packages "$archive"
    # Uploaded before yarn install and the client build, so a build that later
    # exceeds Vercel's time limit still leaves the packages behind for the next one.
    remote_upload "$key" "$archive"
  fi

  tar -xf "$archive" -C ../wasm
}

# $1: wasm key. Yarn copies the ../wasm packages into node_modules, so a restored copy is
# current only for the same lockfile, manifest, wasm packages, and Node version.
install_node_modules() {
  local key
  key=$(cat yarn.lock package.json | sha256 | cut -d' ' -f1)-$1-$(node --version)

  if [ -f "$INSTALL_MARK" ] && [ "$(cat "$INSTALL_MARK")" = "$key" ]; then
    echo ">>> node_modules up to date, skipping yarn install"
    return
  fi
  yarn install --frozen-lockfile
  mkdir -p "$(dirname "$INSTALL_MARK")"
  printf '%s' "$key" >"$INSTALL_MARK"
}

main() {
  local wasm_key
  wasm_key=$(wasm_source_key)
  report_remote_credentials
  restore_wasm_packages "$wasm_key"
  install_node_modules "$wasm_key"
}

main "$@"
