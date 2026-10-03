import { describe, expect, it } from "vitest";
import request from "supertest";
import rawGuide from "../src/data/lack-guide.v1.json";
import { parseGuide } from "../src/shared/schemas";
import { buildPreparedHelp, classifyMessage } from "../src/shared/preparedHelp";
import { createApp } from "../server/app";
import { mergeModelOutput, type HelpRefiner } from "../server/instructions/aiRefiner";
import type { HelpRequest } from "../src/shared/contracts";

const guide = parseGuide(rawGuide);
const guides = { [guide.id]: guide };
const leg1 = guide.steps.find((s) => s.id === "leg-1")!;
const base: HelpRequest = { requestId: "req-00000001", guideId: guide.id, stepId: "leg-1", relevantLearningNeeds: [] };

describe("prepared help", () => {
  it("classifies the demo sentence as leg alignment, pending confirmation", () => {
    expect(classifyMessage("I can't line up the leg with the screw", leg1)).toBe("leg_alignment");
    const help = buildPreparedHelp(guide, { ...base, message: "I can't line up the leg with the screw" });
    expect(help.difficulty).toEqual({ skillId: "leg_alignment", status: "needs_confirmation" });
    expect(help.substeps.every((s) => s.skills.includes("leg_alignment"))).toBe(true);
  });

  it("treats a picked category as confirmed", () => {
    const help = buildPreparedHelp(guide, { ...base, choice: "hand_tightening" });
    expect(help.difficulty.status).toBe("confirmed");
  });

  it("doesn't invent a category for unrelated text", () => {
    const help = buildPreparedHelp(guide, { ...base, message: "my cat keeps sitting on the box" });
    expect(help.difficulty).toEqual({ skillId: null, status: "unknown" });
    expect(help.substeps.length).toBeGreaterThan(0);
  });

  it("won't confirm a skill the step doesn't use", () => {
    const help = buildPreparedHelp(guide, { ...base, choice: "part_identification" });
    expect(help.difficulty.status).toBe("unknown");
  });
});

describe("AI output validation", () => {
  const prepared = buildPreparedHelp(guide, { ...base, message: "the leg keeps tilting" });
  it("keeps catalog clips and parts, only adopting wording", () => {
    const merged = mergeModelOutput(leg1, {
      explanation: "Lower it slowly.",
      substeps: [{ id: "leg-1-align", instruction: "Lower the leg gently." }],
      suggestedSkill: "leg_alignment",
    }, prepared, { ...base, message: "the leg keeps tilting" });
    expect(merged.substeps[0].animationId).toBe("leg-1-align");
    expect(merged.substeps[0].instruction).toBe("Lower the leg gently.");
    expect(merged.origin).toBe("ai");
  });

  it("rejects invented substeps and skills", () => {
    expect(() => mergeModelOutput(leg1, { explanation: "x", substeps: [{ id: "use-drill", instruction: "y" }], suggestedSkill: null }, prepared, base)).toThrow();
    expect(() => mergeModelOutput(leg1, { explanation: "x", substeps: [{ id: "leg-1-align", instruction: "y" }], suggestedSkill: "part_identification" }, prepared, { ...base, message: "hi" })).toThrow();
  });
});

describe("server", () => {
  const pdf = Buffer.from("%PDF-1.7\nfake content for tests\n%%EOF");
  const registry = {
    // sha256 of the fake PDF above, computed in the test below
  } as Record<string, { guideId: string; documentId: string; registeredAt: string }>;

  it("recognizes only a registered PDF", async () => {
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update(pdf).digest("hex");
    const app = createApp({ guides, registry: { ...registry, [hash]: { guideId: guide.id, documentId: "AA-2606170-1", registeredAt: "x" } }, refiner: null });
    const ok = await request(app).post("/api/manuals/recognize").attach("file", pdf, "anything.pdf");
    expect(ok.status).toBe(200);
    expect(ok.body.guide.id).toBe(guide.id);

    const other = await request(app).post("/api/manuals/recognize").attach("file", Buffer.from("%PDF-1.4 IKEA LACK"), "lack.pdf");
    expect(other.status).toBe(422);
    expect(other.body.error.code).toBe("UNSUPPORTED_MANUAL");

    const notPdf = await request(app).post("/api/manuals/recognize").attach("file", Buffer.from("hello"), "lack.pdf");
    expect(notPdf.body.error.code).toBe("INVALID_PDF");

    const big = await request(app).post("/api/manuals/recognize").attach("file", Buffer.alloc(10 * 1024 * 1024 + 10, 37), "big.pdf");
    expect(big.status).toBe(413);
  });

  it("falls back to prepared help when the AI fails", async () => {
    const failing: HelpRefiner = { refine: async () => { throw new Error("boom"); } };
    const app = createApp({ guides, registry: {}, refiner: failing });
    const res = await request(app).post("/api/help").send({ ...base, choice: "leg_alignment" });
    expect(res.status).toBe(200);
    expect(res.body.help.origin).toBe("prepared_fallback");
    expect(res.body.help.difficulty.status).toBe("confirmed");
  });

  it("lets the mobile app shell call the API and nobody else", async () => {
    const app = createApp({ guides, registry: {}, refiner: null });
    const ok = await request(app).options("/api/help").set("Origin", "capacitor://localhost");
    expect(ok.status).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe("capacitor://localhost");
    const other = await request(app).options("/api/help").set("Origin", "https://evil.example");
    expect(other.status).toBe(403);
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects unknown steps and malformed bodies", async () => {
    const app = createApp({ guides, registry: {}, refiner: null });
    expect((await request(app).post("/api/help").send({ ...base, stepId: "drawer-1" })).body.error.code).toBe("INVALID_HELP_REQUEST");
    expect((await request(app).post("/api/help").send({ nope: true })).status).toBe(400);
  });
});
