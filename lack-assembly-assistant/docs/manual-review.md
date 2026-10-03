# Manual review checklist

The catalog in `src/data/lack-guide.v1.json` was written from the team brief and a
text-only read of the PDF. The diagram on page 1 still needs a human check before the
demo. Edit `scripts/write-guide.mjs`, run `node scripts/write-guide.mjs`, then `npm test`.

| # | Check against page 1 of AA-2606170-1 | Where it lives |
| --- | --- | --- |
| 1 | Does each fastener go into the **tabletop** first, then the leg turns onto it? (If the manual shows the fastener going into the leg first, swap the fastener/leg step wording and the clip order.) | catalog steps `fastener-N`, `leg-N`; `sceneStates.ts` |
| 2 | Turning direction. The app says **clockwise** and the arrows spin clockwise seen from above. Confirm against the diagram's arrow. | catalog wording; `SpinArrow` rotation sign |
| 3 | Is protecting the surface (blanket/box) shown? The prepare step is tagged "From the manual". If not shown, change its basis to `supplementary_guidance`. | `prepare` step `source.basis` |
| 4 | Part number 115980 × 4. | parts list, prepare substep |
| 5 | Usage notes on the completion screen: "Don't sit on the table" and the 22 lb (10 kg) load limit came from a text read of the PDF. Confirm the wording and number. | `usageNotes` |
| 6 | Corner numbering is the app's own (1 front-left, 2 front-right, 3 back-right, 4 back-left, viewed from above with the underside up). The manual doesn't number corners; keep it consistent. | `sceneStates.ts` `CORNERS` |

Turn counts and depths in the animations are illustrative. Don't present them as
specifications.
