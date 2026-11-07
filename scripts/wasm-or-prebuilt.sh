#!/usr/bin/env sh
# Color & Noise fork: build the WASM engine from the Rust crates when a nightly toolchain is present,
# otherwise install the prebuilt binaries committed under prebuilt/ (built from this same commit).
# Set OPENDAW_PREBUILT_WASM=1 to force the prebuilt path (e.g. on Vercel, which has no Rust nightly).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$1" # core-wasm | matchering
have_rust() { command -v cargo >/dev/null 2>&1 && command -v rustup >/dev/null 2>&1 && rustup run nightly rustc --version >/dev/null 2>&1; }
if [ -z "$OPENDAW_PREBUILT_WASM" ] && have_rust; then
  case "$TARGET" in
    core-wasm) exec sh "$ROOT/packages/studio/core-wasm/build-wasm.sh" ;;
    matchering) exec sh "$ROOT/packages/studio/matchering/build-wasm.sh" ;;
  esac
fi
case "$TARGET" in
  core-wasm)
    DIST="$ROOT/packages/studio/core-wasm/dist/wasm"; mkdir -p "$DIST"
    cp -R "$ROOT/prebuilt/wasm-engine/." "$DIST/"
    echo "core-wasm: using prebuilt engine binaries from prebuilt/wasm-engine" ;;
  matchering)
    DIST="$ROOT/packages/studio/matchering/dist"; mkdir -p "$DIST"
    cp "$ROOT/prebuilt/matchering/"*.wasm "$DIST/"
    echo "matchering: using prebuilt device module from prebuilt/matchering" ;;
  *) echo "unknown target $TARGET"; exit 1 ;;
esac
