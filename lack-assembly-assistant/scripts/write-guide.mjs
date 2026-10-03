// One-off generator for src/data/lack-guide.v1.json. Edit wording here, rerun,
// then commit the JSON. The JSON is the reviewed catalog the app loads.
import { writeFileSync } from "node:fs";

const DOC = "AA-2606170-1";
const fromManual = { documentId: DOC, page: 1, basis: "manual_diagram" };
const supplementary = { documentId: DOC, page: 1, basis: "supplementary_guidance" };
const corner = { 1: "front-left", 2: "front-right", 3: "back-right", 4: "back-left" };
const ordinal = { 1: "first", 2: "second", 3: "third", 4: "fourth" };

const steps = [];
steps.push({
  id: "prepare",
  partsUsed: ["tabletop", "leg-1", "leg-2", "leg-3", "leg-4", "fastener-1", "fastener-2", "fastener-3", "fastener-4"],
  title: "Lay out the parts",
  instruction:
    "Spread a blanket or the flattened box on the floor. Lay the tabletop on it with the finished top facing down, so the side with a hole near each corner faces up. Set the four legs and four fasteners beside it.",
  completionCheck:
    "The tabletop lies on a soft surface with four corner holes facing up, and you have four legs and four fasteners.",
  source: fromManual,
  animationId: "prepare-overview",
  highlightedPartIds: ["tabletop"],
  skills: ["part_identification", "part_orientation"],
  substeps: [
    {
      id: "prepare-identify",
      instruction:
        "Find the parts: one large square tabletop, four square legs, and four short metal fasteners threaded at both ends (part 115980).",
      animationId: "prepare-overview",
      highlightedPartIds: ["leg-1", "leg-2", "leg-3", "leg-4", "fastener-1", "fastener-2", "fastener-3", "fastener-4"],
      skills: ["part_identification"],
    },
    {
      id: "prepare-protect",
      instruction: "Put down a blanket or the flattened cardboard box so the finished top doesn't get scratched.",
      animationId: "prepare-overview",
      highlightedPartIds: ["tabletop"],
      skills: ["part_orientation"],
    },
    {
      id: "prepare-flip",
      instruction: "Lay the tabletop finished side down. You should now see a hole near each corner.",
      animationId: "prepare-overview",
      highlightedPartIds: ["tabletop"],
      skills: ["part_orientation"],
    },
  ],
});

for (const n of [1, 2, 3, 4]) {
  const c = corner[n];
  steps.push({
    id: `fastener-${n}`,
    partsUsed: [`fastener-${n}`],
    title: `Start the ${ordinal[n]} fastener`,
    instruction: `Set one end of a fastener into the ${c} corner hole and turn it clockwise by hand until it holds firmly and stands straight up. The other threaded end stays exposed for the leg.`,
    completionCheck: `The fastener stands straight up in the ${c} hole, doesn't wobble, and its other end sticks out.`,
    source: fromManual,
    animationId: `fastener-${n}-insert`,
    highlightedPartIds: [`fastener-${n}`, "tabletop"],
    skills: ["fastener_alignment", "hand_tightening"],
    substeps: [
      {
        id: `fastener-${n}-align`,
        instruction: `Hold the fastener upright and set one threaded end into the ${c} hole. Keep it straight up and down, not tilted.`,
        animationId: `fastener-${n}-align`,
        highlightedPartIds: [`fastener-${n}`, "tabletop"],
        skills: ["fastener_alignment"],
      },
      {
        id: `fastener-${n}-start`,
        instruction:
          "Turn it clockwise by hand. If it doesn't catch within one turn, lift it out and set it straight again instead of pushing harder.",
        animationId: `fastener-${n}-start`,
        highlightedPartIds: [`fastener-${n}`],
        skills: ["fastener_alignment", "hand_tightening"],
      },
      {
        id: `fastener-${n}-tighten`,
        instruction: "Keep turning until it holds firmly. Stop when it gets hard to turn. Don't use tools or force it.",
        animationId: `fastener-${n}-tighten`,
        highlightedPartIds: [`fastener-${n}`],
        skills: ["hand_tightening"],
      },
    ],
  });
  steps.push({
    id: `leg-${n}`,
    partsUsed: [`leg-${n}`],
    title: `Attach the ${ordinal[n]} leg`,
    instruction: `Hold a leg straight up with its hole facing down over the fastener in the ${c} corner. Turn the leg clockwise by hand until it sits flat against the tabletop.`,
    completionCheck: `The leg sits flat against the tabletop with no gap and doesn't wobble when you push it gently.`,
    source: fromManual,
    animationId: `leg-${n}-attach`,
    highlightedPartIds: [`leg-${n}`, `fastener-${n}`],
    skills: ["leg_alignment", "hand_tightening"],
    substeps: [
      {
        id: `leg-${n}-align`,
        instruction: `Find the hole in one end of the leg. Hold the leg straight up and lower that hole onto the fastener sticking out of the ${c} corner.`,
        animationId: `leg-${n}-align`,
        highlightedPartIds: [`leg-${n}`, `fastener-${n}`],
        skills: ["leg_alignment"],
      },
      {
        id: `leg-${n}-start`,
        instruction:
          "Keep the leg straight up and down as you start turning it clockwise. If it tilts or scrapes, lift it off and line it up again.",
        animationId: `leg-${n}-start`,
        highlightedPartIds: [`leg-${n}`, `fastener-${n}`],
        skills: ["leg_alignment", "hand_tightening"],
      },
      {
        id: `leg-${n}-tighten`,
        instruction: "Keep turning until the end of the leg sits flat on the tabletop. Stop when it's snug; don't force it.",
        animationId: `leg-${n}-tighten`,
        highlightedPartIds: [`leg-${n}`],
        skills: ["hand_tightening"],
      },
    ],
  });
}

steps.push({
  id: "upright",
  partsUsed: [],
  title: "Turn the table over",
  instruction:
    "Lift the table by the tabletop, with a second person if you can, and turn it over so it stands on its legs. Set it down gently on all four legs at once.",
  completionCheck: "The table stands on all four legs with the finished top facing up.",
  source: supplementary,
  animationId: "table-upright",
  highlightedPartIds: ["tabletop"],
  skills: ["part_orientation"],
  substeps: [
    {
      id: "upright-lift",
      instruction: "Hold the edges of the tabletop rather than the legs while you lift.",
      animationId: "table-upright",
      highlightedPartIds: ["tabletop"],
      skills: ["part_orientation"],
    },
    {
      id: "upright-set",
      instruction: "Turn it over and lower it so all four legs touch the floor together.",
      animationId: "table-upright",
      highlightedPartIds: ["leg-1", "leg-2", "leg-3", "leg-4"],
      skills: ["part_orientation"],
    },
  ],
});

steps.push({
  id: "final-check",
  partsUsed: [],
  title: "Check the table",
  instruction:
    "Look at each leg from the side; each should sit flat against the tabletop. If one is loose, turn the table back over and tighten that leg by hand.",
  completionCheck: "All four legs are snug and the table doesn't rock when you press on a corner.",
  source: supplementary,
  animationId: "table-final",
  highlightedPartIds: ["leg-1", "leg-2", "leg-3", "leg-4"],
  skills: [],
  substeps: [
    {
      id: "final-press",
      instruction: "Press gently on each corner of the top. The table should stay steady.",
      animationId: "table-final",
      highlightedPartIds: ["tabletop"],
      skills: [],
    },
  ],
});

const guide = {
  schemaVersion: 1,
  id: "lack-aa2606170-v1",
  productId: "ikea-lack-30449908",
  productName: "LACK side table, white, 21 5/8 x 21 5/8\"",
  productArticleNumber: "304.499.08",
  manualDocumentId: DOC,
  manualUrl: "https://www.ikea.com/us/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf",
  guideVersion: "1.0.0",
  parts: [
    { id: "tabletop", label: "Tabletop" },
    ...[1, 2, 3, 4].map((n) => ({ id: `leg-${n}`, label: `Leg ${n} (${corner[n]})` })),
    ...[1, 2, 3, 4].map((n) => ({ id: `fastener-${n}`, label: `Fastener ${n} (part 115980)` })),
  ],
  steps: steps.map((s, i) => ({ id: s.id, order: i, ...s })),
  hardware: [
    {
      code: "115980",
      name: "Double-ended screw",
      shape: "double-ended-screw",
      quantity: 4,
      partIds: ["fastener-1", "fastener-2", "fastener-3", "fastener-4"],
      // Estimated, not measured. Measure a real 115980 and set sizeVerified: true.
      sizeMm: { length: 60, diameter: 6 },
      sizeVerified: false,
      sizeNote: "Estimated size. Our team hasn't measured a real 115980 yet.",
    },
  ],
  usageNotes: [
    "Don't sit on the table.",
    "Keep the load on the tabletop to 22 lb (10 kg) or less.",
  ],
};

writeFileSync(new URL("../src/data/lack-guide.v1.json", import.meta.url), JSON.stringify(guide, null, 2) + "\n");
console.log(`wrote ${guide.steps.length} steps`);
