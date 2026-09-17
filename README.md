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
npm run dev
```

Then open http://localhost:3000.

## Architecture

- `server/api/systems/list.get.ts` / `server/api/systems/[name].get.ts` —
  Nuxt server routes that query the NASA Exoplanet Archive's TAP `sync`
  endpoint (ADQL against the `pscomppars` table) and cache results
  in-memory. This keeps the archive's API off the client (avoids CORS and
  lets us cache) — the browser only ever talks to `/api/systems/*`.
- `shared/utils/habitableZone.ts`, `shared/utils/orbit.ts` — pure
  astrophysics helpers (habitable zone flux model, Kepler's third law
  fallback for missing semi-major axis) shared by the server.
- `components/SystemViewer3D.vue`, `components/SystemViewer2D.vue` — the
  two viewers described above.
- `shaders/*.glsl` — the star surface and habitable-zone shaders.

## Known limitation from this development environment

This project was built in a sandboxed environment whose outbound network
policy blocks `exoplanetarchive.ipac.caltech.edu`, so the live API calls
could not be exercised end-to-end here — only validated up to the point of
confirming the ADQL queries reach that host correctly (verified via a
502 that reports the network denial, not a query error). Run `npm run dev`
and search for a system (e.g. "TRAPPIST-1") on a machine/deployment with
normal internet access to see live data. If anything about the archive's
`pscomppars` column set has changed since this was written, the query
columns are all in one place in `server/api/systems/[name].get.ts` and
`server/api/systems/list.get.ts`.
