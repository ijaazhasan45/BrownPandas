import { describe, expect, it } from "vitest";
import { SM_GUIDE } from "../src/features/smastad/guide";
import rawGuide from "../src/data/lack-guide.v1.json";
import { buildCatalog } from "../src/shared/manuals";
import { validateGuide } from "../src/shared/guideValidation";
import { parseGuide } from "../src/shared/schemas";
import { ANIMATION_IDS, hasAnimation } from "../src/features/viewer/animationRegistry";
import { CLIPS, evaluateClip } from "../src/features/viewer/sceneStates";

const guide = parseGuide(rawGuide);

describe("guide catalog", () => {
  it("is valid against the animation registry", () => {
    expect(validateGuide(guide, hasAnimation)).toEqual([]);
    expect(() => buildCatalog([rawGuide], hasAnimation)).not.toThrow();
  });

  it("covers the full LACK assembly in order", () => {
    expect(guide.steps.map((s) => s.id)).toEqual([
      "prepare", "fastener-1", "leg-1", "fastener-2", "leg-2",
      "fastener-3", "leg-3", "fastener-4", "leg-4", "upright", "final-check",
    ]);
  });

  it("never mentions tools the manual doesn't show", () => {
    const text = JSON.stringify(guide).toLowerCase();
    for (const word of ["screwdriver", "allen", "hex key", "drill", "drawer"]) expect(text).not.toContain(word);
  });

  it("flags an unknown animation", () => {
    const broken = structuredClone(guide);
    broken.steps[1].substeps[0].animationId = "made-up-clip";
    expect(validateGuide(broken, hasAnimation).join(" ")).toContain("made-up-clip");
  });

  it("every registered clip is used by the catalog", () => {
    const used = new Set([...guide.steps,...SM_GUIDE.steps].flatMap((s) => [s.animationId, ...s.substeps.map((x) => x.animationId)]));
    expect(ANIMATION_IDS.filter((id) => !used.has(id))).toEqual([]);
  });
});

describe("scene clips", () => {
  it("are deterministic and never accumulate", () => {
    for (const clip of Object.values(CLIPS)) {
      const a = evaluateClip(clip, 0.37);
      evaluateClip(clip, 1);
      evaluateClip(clip, 0.9);
      expect(evaluateClip(clip, 0.37)).toEqual(a);
    }
  });

  it("each leg clip moves only its own leg", () => {
    for (const n of [1, 2, 3, 4]) {
      const clip = CLIPS[`leg-${n}-attach`];
      expect(clip.tracks.map((t) => t.partId)).toEqual([`leg-${n}`]);
      const end = evaluateClip(clip, 1).parts[`leg-${n}` as "leg-1"];
      // Seated leg sits on the tabletop underside at its own corner.
      const start = evaluateClip(clip, 0).parts[`leg-${n}` as "leg-1"];
      expect(end.pos).not.toEqual(start.pos);
    }
    const corners = [1, 2, 3, 4].map((n) => evaluateClip(CLIPS[`leg-${n}-attach`], 1).parts[`leg-${n}` as "leg-1"].pos.join());
    expect(new Set(corners).size).toBe(4);
  });

  it("starts each leg step with earlier legs already attached", () => {
    const frame = evaluateClip(CLIPS["leg-3-attach"], 0);
    expect(frame.parts["leg-1"].rot[2]).toBe(0); // upright, attached
    expect(frame.parts["leg-2"].rot[2]).toBe(0);
    expect(frame.parts["leg-4"].rot[2]).not.toBe(0); // still lying on the floor
  });

  it("main and focused clips end in the same pose", () => {
    for (const kind of ["leg", "fastener"]) {
      for (const n of [1, 2, 3, 4]) {
        const main = kind === "leg" ? `leg-${n}-attach` : `fastener-${n}-insert`;
        const tighten = `${kind}-${n}-tighten`;
        const id = `${kind}-${n}` as "leg-1";
        expect(evaluateClip(CLIPS[tighten], 1).parts[id]).toEqual(evaluateClip(CLIPS[main], 1).parts[id]);
      }
    }
  });

  it("turns the table fully upright", () => {
    expect(evaluateClip(CLIPS["table-upright"], 1).group.rot[0]).toBeCloseTo(Math.PI);
    expect(evaluateClip(CLIPS["table-final"], 0).group.rot[0]).toBeCloseTo(Math.PI);
  });
});
