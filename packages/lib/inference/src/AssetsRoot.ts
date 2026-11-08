// Color & Noise fork: assets.opendaw.studio only answers CORS for opendaw.studio, so the host serves the same files
// same-origin at /opendaw-assets (a rewrite to https://assets.opendaw.studio). Without a location (node) the
// upstream host is kept.
export const AssetsRoot: string = typeof location === "undefined"
    ? "https://assets.opendaw.studio"
    : `${location.origin}/opendaw-assets`
