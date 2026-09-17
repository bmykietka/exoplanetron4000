# Exoplanetron 4000

Explore known exoplanet systems in 3D or as a proportionally-scaled 2D side
view, with each system's habitable zone shaded in. Built with Nuxt 3,
[TresJS](https://tresjs.org/) (Vue + Three.js) and GLSL shaders, backed by
the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/)
TAP API.

## Features

- Search/autocomplete over every known host star system (fuzzy match).
- **3D view**: fly around the system with OrbitControls; the star uses a
  custom GLSL shader (procedural turbulence + fresnel glow, colored by
  effective temperature), planets orbit at a distance-compressed scale so
  inner and outer planets are both visible, and the habitable zone is a
  shaded, shader-driven annulus.
- **2D side view**: planets plotted at their true (linear, zoomable)
  distance from the star, with the habitable zone shown as a shaded band.
  Body sizes use a separate, clearly-labeled visibility scale.
- Habitable zone boundaries (conservative + optimistic) computed from
  stellar temperature and luminosity using Kopparapu et al. (2013), with a
  Stefan-Boltzmann luminosity fallback when the archive doesn't report it
  directly. Each planet is flagged in/out of the zone.

## Getting started

```bash
npm install
npx playwright install chromium   # one-time browser download, see note below
npm run dev
```

Then open http://localhost:3000.

## Architecture

- `server/api/systems/list.get.ts` / `server/api/systems/[name].get.ts` —
  Nuxt server routes that query the NASA Exoplanet Archive's TAP `sync`
  endpoint (ADQL against the `pscomppars` table) and cache results
  in-memory. This keeps the archive's API off the client (avoids CORS and
  lets us cache) — the browser only ever talks to `/api/systems/*`.
- `server/utils/browserFetch.ts` — see "Why Playwright?" below.
- `shared/utils/habitableZone.ts`, `shared/utils/orbit.ts` — pure
  astrophysics helpers (habitable zone flux model, Kepler's third law
  fallback for missing semi-major axis) shared by the server.
- `components/SystemViewer3D.vue`, `components/SystemViewer2D.vue` — the
  two viewers described above.
- `shaders/*.glsl` — the star surface and habitable-zone shaders.

## Why Playwright?

`exoplanetarchive.ipac.caltech.edu` sits behind Cloudflare, which serves a
JS challenge page ("Just a moment...") to plain HTTP clients instead of the
TAP response — confirmed even when the request sends a full realistic
browser header set, so this isn't a header-sniffing heuristic that can be
worked around with `fetch`/`curl`/`axios` alone.

`server/utils/browserFetch.ts` works around this by keeping one persistent,
headless Chromium page (via Playwright) warm for the life of the server
process. It solves the Cloudflare challenge once by navigating to the
archive, then makes the actual TAP requests as same-origin `fetch()` calls
run *inside* that page, so they ride on the browser's own cookie jar
automatically. `server/utils/tap.ts` calls this instead of a bare
server-side fetch.

Practical implications of this:

- **One-time setup**: `npx playwright install chromium` downloads a
  Chromium binary (~150–300 MB). This happens once per machine, not per
  request.
- **Deployment**: this needs a real, persistent Node server (the default
  `node-server` Nitro preset this project uses) — it will not work on
  typical serverless/edge runtimes that can't run a headless browser
  (Cloudflare Workers, most edge functions). A regular VM/container host
  (or `npm run dev` locally) is fine.
- **First request is slow**: launching Chromium and solving the challenge
  takes a few seconds; subsequent requests reuse the same warm page and
  are fast until the Cloudflare clearance cookie expires, at which point
  it re-solves automatically.
- If you'd rather avoid bundling a browser at all, an alternative
  architecture is to stop querying TAP live per-request and instead serve
  from a periodically-refreshed static snapshot of the data (e.g. a CSV
  exported from the archive's website UI) — a reasonable trade if you don't
  need live data and want a lighter deployment.

## Known limitation from this development environment

This project was built in a sandboxed environment whose outbound network
policy blocks `exoplanetarchive.ipac.caltech.edu` entirely (at the network
layer, before any HTTP request is even made), so the actual
Cloudflare-challenge-solving step could not be exercised end-to-end here.
What *was* verified in this environment: the Playwright browser launches,
navigates, and runs in-page `fetch()` calls correctly (checked against an
allow-listed host), and the whole pipeline degrades cleanly — a real
network/navigation failure returns a clean 502 with the underlying error
rather than crashing or leaking browser processes. The one thing that can
only be confirmed on a machine with real internet access is whether solving
the Cloudflare challenge actually succeeds against the live archive.
