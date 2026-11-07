# openDAW, Color & Noise integration branch

This fork of [andremichelle/opendaw](https://github.com/andremichelle/opendaw)
(AGPL-3.0-or-later) is the Sound environment of Color & Noise, served as a
Vercel Microfrontends child under `/sound` on the same origin as the host app.
`main` tracks upstream; `color-and-noise` is the deployed integration branch,
pinned to the upstream commit whose engine binaries ship under `prebuilt/`.

## What differs from upstream

Routing and packaging only. No DAW logic is changed.

| Change | Where | Why |
|---|---|---|
| Base-aware SPA router | `packages/lib/jsx/src/routes.ts` | The router matched `location.pathname` literally and showed a 404 under any sub-path. The base is read from the module script's own URL. |
| Base-relative paths for fonts, `build-info.json`, sponsor images | `packages/app/studio/src/ui/Fonts.ts`, `src/boot.ts`, `src/ui/dashboard/SampleProviders.tsx` | Root-absolute paths would resolve to the host app under `/sound`. |
| `OPENDAW_BASE` and the Microfrontends Vite plugin | `packages/app/studio/vite.config.ts` | Builds everything under `/sound/`; the plugin writes `dist/sound/` and the asset prefix. |
| Prebuilt engine binaries | `prebuilt/`, `scripts/wasm-or-prebuilt.sh` | Vercel has no Rust nightly. With `OPENDAW_PREBUILT_WASM=1` the build copies the binaries built from this same commit instead of compiling the crates. Rebuild them from source whenever this branch moves. |
| Two bridge scripts in `index.html` | `packages/app/studio/public/colornoise/` | `colornoise-tap.js` mirrors master output into a MediaStream for the host's analysis; `colornoise-transport.js` publishes play state, position, whether a project is open (from the body's `no-project` class) and the header's tempo value (from the UnitDisplay DOM) on a BroadcastChannel, and accepts play/stop. Both wrap Web Audio and the console-command surface openDAW already exposes. |
| `vercel.json`, `microfrontends.json` | repo root | SPA fallback under `/sound/*`, COOP/COEP headers, build and output settings; a copy of the host app's Microfrontends config for the Vite plugin. |

## Updating from upstream

```sh
git fetch upstream
git merge upstream/main   # resolve, then rebuild prebuilt/ from source at the new commit
```

The engine binaries and the TypeScript must come from the same commit, or the
engine fails on first play.
