// Color & Noise fork: assets.opendaw.studio and api.opendaw.studio only answer CORS for opendaw.studio, so the host
// serves them same-origin at /opendaw-assets and /opendaw-api (rewrites to the upstream hosts). Without a location
// (node tests) the upstream hosts are kept.
const hosted = typeof location !== "undefined"

export const AssetsRoot: string = hosted ? `${location.origin}/opendaw-assets` : "https://assets.opendaw.studio"
export const ApiRoot: string = hosted ? `${location.origin}/opendaw-api` : "https://api.opendaw.studio"

// Error reports and the visitor count are upstream's own telemetry, accepted only from opendaw.studio.
export const isUpstreamOrigin = (): boolean => hosted && location.origin === "https://opendaw.studio"
