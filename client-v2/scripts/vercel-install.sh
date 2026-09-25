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

if command -v sha256sum >/dev/null 2>&1; then
  sha=(sha256sum)
else
  sha=(shasum -a 256)
fi

# Build output is excluded so that a build does not change the key it is stored under.
wasm_key=$(
  find ../wasm -type f \
    -not -path '*/target/*' -not -path '*/pkg/*' -not -path '*/node_modules/*' \
    -not -name '.DS_Store' -print0 \
    | LC_ALL=C sort -z | xargs -0 "${sha[@]}" | "${sha[@]}" | cut -d' ' -f1
)
wasm_tar="$WASM_CACHE/$wasm_key.tar"

# The public Blob store shared by every build; Vercel sets BLOB_STORE_ID once the
# store is connected (see docs/deploy-client-vercel.md, "Build cache").
blob_path="wasm-pkg/$wasm_key.tar"
blob_url=""
if [ -n "${BLOB_STORE_ID:-}" ]; then
  store_host=$(printf '%s' "${BLOB_STORE_ID#store_}" | tr '[:upper:]' '[:lower:]')
  blob_url="https://$store_host.public.blob.vercel-storage.com/$blob_path"
fi

fetch_blob() {
  [ -n "$blob_url" ] || return 1
  mkdir -p "$WASM_CACHE"
  # A failed download must not leave a partial file where the next run finds a hit.
  curl -fsSL -o "$wasm_tar.part" "$blob_url" && mv "$wasm_tar.part" "$wasm_tar"
}

blob_has() {
  [ -n "$blob_url" ] && curl -fsI -o /dev/null "$blob_url"
}

upload_blob() {
  [ -n "$blob_url" ] || return 0
  local vercel=(npx --yes vercel@latest)
  command -v vercel >/dev/null 2>&1 && vercel=(vercel)
  # Bash 3.2 (macOS) treats an empty array as unset under `set -u`, hence the `+` expansion.
  local auth=()
  [ -n "${BLOB_READ_WRITE_TOKEN:-}" ] && auth=(--rw-token "$BLOB_READ_WRITE_TOKEN")
  "${vercel[@]}" blob put "$wasm_tar" --pathname "$blob_path" --access public \
    --content-type application/x-tar ${auth[@]+"${auth[@]}"} \
    || echo ">>> wasm cache upload failed; the next build with these sources rebuilds" >&2
}

if [ -f "$wasm_tar" ]; then
  echo ">>> wasm cache HIT, local ($wasm_key)"
  # A laptop that built before the store existed is what seeds it.
  [ -z "$blob_url" ] || blob_has || upload_blob
elif fetch_blob; then
  echo ">>> wasm cache HIT, blob ($wasm_key)"
else
  echo ">>> wasm cache MISS ($wasm_key): building wasm packages"
  mkdir -p "$CARGO_HOME" "$RUSTUP_HOME" "$CARGO_TARGET_DIR"

  # Matches wasm/build.sh's parsing of the same file.
  RUST_VERSION=$(awk '/channel/{gsub(/"/, ""); print $3 }' ../wasm/rust-toolchain.toml)

  if [ ! -x "$CARGO_HOME/bin/rustup" ]; then
    # Version comes from wasm/rust-toolchain.toml so the initial `cargo install wasm-pack`
    # has a working toolchain before per-package rust-toolchain.toml files apply.
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --no-modify-path --default-toolchain "$RUST_VERSION" --profile minimal --target wasm32-unknown-unknown
  fi
  rustup default "$RUST_VERSION"

  bash ../wasm/build.sh

  # Older archives cannot match again and count against the cache size limit.
  rm -rf "$WASM_CACHE"
  mkdir -p "$WASM_CACHE"
  (cd ../wasm && tar -cf "$wasm_tar" */pkg)
  du -sh "$wasm_tar"

  # Uploaded before yarn install and the client build, so a build that later
  # exceeds Vercel's time limit still leaves the packages behind for the next one.
  upload_blob
fi

tar -xf "$wasm_tar" -C ../wasm

yarn install --frozen-lockfile
