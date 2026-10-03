# LACK Assembly Assistant

A responsive web app that walks a first-time builder through the IKEA LACK side table
(article 304.499.08) with 3D animations, check-gated steps, contextual help, and
learning memory: when you confirm what was hard, later steps that use the same skill
open with extra detail, including in your next build on the same browser.

Built from the team brief. All four blocks live in one app.

## Run it

Requires Node 20+.

```bash
npm install
cp .env.example .env        # optional: add ANTHROPIC_API_KEY for AI-refined help
npm run dev                 # web on http://localhost:5173, API on :8787 (proxied)
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | 31 tests: catalog vs animation registry, clip determinism, progress rules, memory dedupe/adaptation, help validation, API |
| `npm run typecheck` | Client and server type checks |
| `npm run build && npm start` | Production build served by the Express server on :8787 |
| `npm run build:static` | Server-free build in `dist-static/` (browser-side recognition, prepared help only) |
| `npm run register-manual -- <pdf>` | Registers the exact LACK PDF by SHA-256 (see below) |

## Before the demo: register the real PDF

Recognition matches the **exact** file by hash, so nothing is registered until someone
downloads it:

1. Download https://www.ikea.com/us/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf
2. `npm run register-manual -- ~/Downloads/lack-side-table-white__AA-2606170-1-100.pdf`
3. Commit `src/data/registered-manuals.json`.

Until then, uploads are rejected with a clear message and the clearly labeled
**Use the sample guide** button opens the same reviewed guide without reading a file.

## Where things live

```
src/shared/            contracts.ts (canonical v1), schemas (zod), skills, prepared help, manual recognition
src/data/              lack-guide.v1.json (reviewed catalog), registered-manuals.json
src/features/viewer/   Block 2: AssemblyViewer, sceneStates (pure clip data), animationRegistry
src/features/instructions/  Block 3 frontend adapter (server + static modes)
src/features/profile/  Block 4: profileStore, adaptation
src/features/assembly-ui/   Block 1: screens, help panel, memory panel
server/                Block 3: Express app, AI refiner, catalog loading
scripts/               register-manual.ts, write-guide.mjs (regenerates the catalog JSON)
docs/                  manual-review.md, demo-checklist.md
```

## How the pieces keep each other honest

- The catalog is validated against the animation registry at startup and in tests. An
  unknown clip, part, or out-of-order step fails loudly.
- Every clip is a pure function of normalized time from its own baseline, so replay,
  scrubbing, and step switching can't drift or duplicate parts.
- AI help can only reword the current step's existing substeps and suggest one of that
  step's skills. The server rebuilds substeps from the catalog and falls back to
  prepared help on any timeout, error, or off-catalog output. AI never changes progress
  or memory directly.
- Memory records a skill only after the user picks a help topic or confirms a
  suggestion ("Yes, remember this"). Event IDs are deduplicated.
- Help shows prepared content instantly; any AI refinement replaces it only if it still
  matches the active step and request.

## What this demo does and doesn't claim

It supports one product with prepared 3D assets matched to the manual and local,
per-browser personalization. It does not generate 3D from arbitrary manuals, sync
across devices, or detect the physical table. Dimensions and turn counts in the
animations are visual approximations, not specifications.

See `docs/manual-review.md` for the items a teammate must confirm against the PDF.
