# Demo checklist

## Setup (before presenting)

- [ ] `npm run register-manual -- <the exact LACK PDF>` and commit the registry
- [ ] `npm run build && npm start` on the demo laptop; open http://localhost:8787
- [ ] Optional: `ANTHROPIC_API_KEY` in `.env` for AI-refined help (prepared help works without it)
- [ ] Fresh profile: open Memory → Reset memory, and Start a new build
- [ ] Phone on the same Wi-Fi: open http://<laptop-ip>:8787 to show the responsive layout
- [ ] Measure a real 115980 and update its size (manual-review.md item 6)
- [ ] Install the app on a phone: Android Chrome menu → Install app; iPhone Safari Share → Add to Home Screen (needs HTTPS hosting)
- [ ] Backup: the static build in `dist-static/` works with no server

## Script (about 3 minutes)

1. Upload the PDF. Point out that the guide is for LACK and the source manual link is in the header.
2. Rotate and zoom the 3D view on the prepare step. Tap **Step complete**.
3. Complete the first fastener. On **Attach the first leg**, tap **I need help**.
4. Type "I can't line up the leg with the screw" → **Ask**. Show the highlighted leg and fastener and the focused alignment clip. Tap **Yes, remember this**.
5. Complete leg 1 and fastener 2. On **Attach the second leg**, the "For you" note and the alignment detail open automatically.
6. On a fastener step, tap **Check at actual size**. Match the outline to a bank card once, then lay a real 115980 on the screen. Mention the size is an estimate until measured (see manual-review.md).
7. Open **Memory** to show what's saved and that it stays on this device.
8. Finish the table: turn it over, final check, completion screen with the manual's usage notes.
9. **Start a new build**. Progress resets; at leg 1 the extra alignment detail is already open.

## Say precisely

- One supported product with prepared 3D assets matched to the manual.
- Recognition checks for the exact supported file, then opens a reviewed guide. It doesn't generate 3D from arbitrary PDFs.
- Memory is per browser/device. No accounts.

## Acceptance (from the brief) — verified by tests or the walkthrough

- [x] Supported PDF hash → correct guide; unknown/invalid/oversized PDFs → clear errors (tests)
- [x] Every step and substep animation ID resolves in the registry (tests)
- [x] Rotate, zoom, replay, scrub, reset view, step navigation
- [x] New steps locked until the prerequisite is checked; animation end never completes a step
- [x] "I need help" keeps you on the step and shows help immediately
- [x] Confirmed leg-alignment help → later leg steps expand (tests + walkthrough)
- [x] Stale help responses are ignored after switching steps
- [x] Reload restores progress and memory; new build keeps memory (tests + walkthrough)
- [x] Malformed or failed AI output falls back to prepared help (tests)
- [x] Replay/navigation can't drift or duplicate geometry (tests)
- [ ] Manual diagram review (see manual-review.md)
