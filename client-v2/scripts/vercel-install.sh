#!/usr/bin/env bash
set -euo pipefail

# Vercel install hook for the client.
#
# Order matters: client/package.json has file-deps like "../wasm/anchor-cli/pkg"
# which don't exist until wasm-pack runs, so we must compile wasm BEFORE yarn install.

# Rust state exceeds the Build Cache size limit, so only the wasm packages go into node_modules.
RUST_ROOT="$PWD/.cache/rust"
export CARGO_HOME="$RUST_ROOT/cargo"
export RUSTUP_HOME="$RUST_ROOT/rustup"
export CARGO_TARGET_DIR="$RUST_ROOT/target"
export PATH="$CARGO_HOME/bin:$PATH"

WASM_CACHE="$PWD/node_modules/.cache/wasm-pkg"
INSTALL_MARK="node_modules/.cache/install-key"

DEFAULT_CRATES_CACHE="$PWD/node_modules/.cache/default-crates"
CRATES_DIR="$PWD/public/crates"
# What generate-default-crates writes; clearSupportedCrates in generate-crates.mjs keeps the same list.
DEFAULT_CRATE_FILES=(core.rs core.rs.br alloc.rs alloc.rs.br std.rs std.rs.br .default-crates-key)

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
    if [ -n "${!name:-}" ]; then echo ">>> Remote Cache: $name set"; else echo ">>> Remote Cache: $name unset"; fi
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

# $1: artifact key. Succeeds only when Remote Cache holds it.
remote_has() {
  remote_enabled && remote_curl -I -o /dev/null "$(remote_url "$1")" 2>/dev/null
}

# $1: artifact key, $2: destination. A failed download leaves no partial file to be read as a hit.
remote_fetch() {
  remote_enabled || return 1
  mkdir -p "$(dirname "$2")"
  remote_curl -o "$2.part" "$(remote_url "$1")" 2>/dev/null && mv "$2.part" "$2"
}

# $1: artifact key, $2: file, $3: what the file holds, for the log. Never fails the build.
remote_upload() {
  remote_enabled || return 0
  remote_curl -X PUT -H 'Content-Type: application/octet-stream' \
    --data-binary @"$2" -o /dev/null "$(remote_url "$1")" \
    || echo ">>> $3: Remote Cache upload failed; a build without the Build Cache copy rebuilds" >&2
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

# $1: tar to write. Older archives cannot match again and count against the Build Cache size limit.
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
    echo ">>> wasm packages: HIT in Build Cache ($key)"
    # A build restored from Build Cache seeds Remote Cache when it lacks the tar.
    remote_has "$key" || remote_upload "$key" "$archive" "wasm packages"
  elif remote_fetch "$key" "$archive"; then
    echo ">>> wasm packages: HIT in Remote Cache ($key)"
  else
    echo ">>> wasm packages: MISS in Build Cache and Remote Cache ($key), building"
    build_wasm_packages
    pack_wasm_packages "$archive"
    # Uploaded before yarn install and the client build, so a build that later
    # exceeds Vercel's time limit still leaves the packages behind for the next one.
    remote_upload "$key" "$archive" "wasm packages"
  fi

  tar -xf "$archive" -C ../wasm
}

# rustup without a default toolchain: generate-default-crates installs the one it reads.
ensure_rustup() {
  mkdir -p "$CARGO_HOME" "$RUSTUP_HOME"
  [ -x "$CARGO_HOME/bin/rustup" ] && return
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --no-modify-path --default-toolchain none --profile minimal
}

# Leaves the default crates in public/crates, from the cheapest source that has them. The
# generator's own key covers its inputs; hashed again with a prefix so it never equals a wasm key.
restore_default_crates() {
  local inputs key archive
  # Its own line: set -e ignores a failure inside a command substitution used as an argument.
  inputs=$(node scripts/generate-default-crates.mjs --key)
  key=$(printf 'default-crates-%s' "$inputs" | sha256 | cut -d' ' -f1)
  archive="$DEFAULT_CRATES_CACHE/$key.tar.gz"

  if [ -f "$archive" ]; then
    echo ">>> default crates: HIT in Build Cache ($key)"
    remote_has "$key" || remote_upload "$key" "$archive" "default crates"
  elif remote_fetch "$key" "$archive"; then
    echo ">>> default crates: HIT in Remote Cache ($key)"
  else
    echo ">>> default crates: MISS in Build Cache and Remote Cache ($key), generating"
    ensure_rustup
    node scripts/generate-default-crates.mjs
    rm -rf "$DEFAULT_CRATES_CACHE"
    mkdir -p "$DEFAULT_CRATES_CACHE"
    (cd "$CRATES_DIR" && tar -czf "$archive" "${DEFAULT_CRATE_FILES[@]}")
    du -sh "$archive"
    remote_upload "$key" "$archive" "default crates"
  fi

  mkdir -p "$CRATES_DIR"
  tar -xzf "$archive" -C "$CRATES_DIR"
}

# $1: wasm key. Yarn copies the ../wasm packages into node_modules, so a restored copy is
# current only for the same lockfile, manifest, wasm packages, and Node version.
install_node_modules() {
  local key
  key=$(cat yarn.lock package.json | sha256 | cut -d' ' -f1)-$1-$(node --version)

  if [ -f "$INSTALL_MARK" ] && [ "$(cat "$INSTALL_MARK")" = "$key" ]; then
    echo ">>> node_modules: current copy in Build Cache, skipping yarn install"
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
  restore_default_crates
  install_node_modules "$wasm_key"
}

main "$@"
