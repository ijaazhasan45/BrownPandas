# Mobile

The app ships three ways from one codebase. Pick by how people will get it.

| Option | Command | Best for | Needs |
| --- | --- | --- | --- |
| Installable web app (PWA) | `npm run build && npm start` | Demo day, fastest path to phones | HTTPS hosting (or localhost) |
| Native shell (Capacitor) | `npm run cap:ios` / `npm run cap:android` | App Store / Play Store builds | Xcode (Mac) or Android Studio |
| Server-free page | `npm run build:static` | Backup demo, hosted preview | Nothing |

## 1. Installable web app

The default build adds a web app manifest, icons, and a service worker that caches the
app for offline use (the bundled guide and prepared help work with no connection).

- **Android (Chrome):** open the site, then menu → *Install app*.
- **iPhone (Safari):** Share → *Add to Home Screen*.

Service workers only run on HTTPS or `localhost`. For a phone on the same Wi-Fi during
development, `npm run dev` listens on your LAN address (Vite prints it), which is fine
for testing everything except install and offline.

## 2. Native app with Capacitor

Capacitor wraps the `app` build (`dist-app/`) in a native iOS/Android shell. The
native project folders are generated on your machine and are git-ignored.

```bash
npx cap add ios        # once, on a Mac with Xcode
npx cap add android    # once, with Android Studio
npm run cap:ios        # builds, syncs, opens Xcode
npm run cap:android    # builds, syncs, opens Android Studio
```

In the app build the PDF is recognized on the device, so no server is needed. Help uses
the prepared content unless you point it at a running server:

```bash
VITE_API_BASE=https://your-server.example npm run build:app
```

The server already allows the Capacitor origins (`capacitor://localhost`,
`http://localhost`, `https://localhost`). Add others with `CORS_ORIGINS` in `.env`.
Keep `ANTHROPIC_API_KEY` on the server only; never in a `VITE_` variable.

App IDs live in `capacitor.config.ts` (`com.brownpandas.assembly`). Change it before
publishing to a store.

## What changed for phones

- **Battery and heat:** the 3D view renders only while something moves (animation,
  camera drag, focus easing) instead of 60 times a second. Real-time shadows were
  replaced with one cheap contact shadow, and pixel density is capped at 1.75×.
- **Load time:** three.js (about 230 KB gzipped) loads in the background after the
  start screen appears, instead of blocking it. First load is roughly 80 KB gzipped.
- **Screen stays on** during a build (Screen Wake Lock), since hands are busy.
- **Read this step aloud** uses the phone's speech engine where available.
- **Short vibration** confirms *Step complete* on Android.
- **Sideways phones** get the 3D view and the steps side by side.
- The 3D view stays pinned at the top while the steps scroll underneath.

## Actual size (1:1 parts)

Like the 1:1 callouts in LEGO instructions, every step lists the parts it uses, and
small hardware has a *Check at actual size* button that draws the part life-size so a
builder can lay the real piece on the screen.

Phones don't report their physical pixel size, so the first time it opens, the app
asks the user to match an outline to any bank or ID card (all are 85.60 × 53.98 mm).
That setting is saved per screen and rechecked if the screen or zoom changes. A
true-scale ruler is shown too, so people can measure any part.

**Before relying on it:** the 115980 size in the catalog (60 mm × 6 mm) is an
estimate. Measure a real one, update `hardware` in `scripts/write-guide.mjs`, set
`sizeVerified: true`, and run `node scripts/write-guide.mjs && npm test`. Until then
the app labels the size as an estimate.

Adding hardware for another product: add an entry to `hardware` with one of the
supported shapes (`double-ended-screw`, `screw`, `dowel`, `washer`, `nut`), its size
in millimeters, and the 3D part IDs it corresponds to. Validation fails if a shape is
missing a dimension it needs.
