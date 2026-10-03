import { beforeEach, describe, expect, it } from "vitest";
import rawGuide from "../src/data/lack-guide.v1.json";
import { parseGuide } from "../src/shared/schemas";
import { PROFILE_KEY, ProfileStore, SESSION_KEY, StoreError, accessibleStepIds, getAdaptation, type StorageLike } from "../src/features/profile/profileStore";

const guide = parseGuide(rawGuide);
const step = (id: string) => guide.steps.find((s) => s.id === id)!;

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

let storage: MemoryStorage;
let counter = 0;
const makeStore = () => new ProfileStore({ storage, newId: () => `id-${++counter}` });

beforeEach(() => {
  storage = new MemoryStorage();
});

function completeThrough(store: ProfileStore, sessionId: string, lastId: string) {
  for (const s of guide.steps) {
    store.completeStep(sessionId, s.id);
    if (s.id === lastId) break;
  }
}

describe("progress", () => {
  it("enforces guide order and is idempotent", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    expect(() => store.completeStep(session.id, "leg-1")).toThrow(StoreError);
    store.completeStep(session.id, "prepare");
    const again = store.completeStep(session.id, "prepare");
    expect(again.completedStepIds).toEqual(["prepare"]);
  });

  it("only lets you view completed steps and the next one", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    store.completeStep(session.id, "prepare");
    expect(() => store.saveViewedStep(session.id, "leg-1")).toThrow(StoreError);
    expect(store.saveViewedStep(session.id, "fastener-1").viewedStepId).toBe("fastener-1");
    expect(store.saveViewedStep(session.id, "prepare").viewedStepId).toBe("prepare");
    const s = store.loadOrCreateSession(guide);
    expect([...accessibleStepIds(guide, s)]).toEqual(["prepare", "fastener-1"]);
  });

  it("resumes after reload", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    completeThrough(store, session.id, "fastener-1");
    store.saveViewedStep(session.id, "leg-1");
    const reloaded = makeStore().loadOrCreateSession(guide);
    expect(reloaded.id).toBe(session.id);
    expect(reloaded.completedStepIds).toEqual(["prepare", "fastener-1"]);
    expect(reloaded.viewedStepId).toBe("leg-1");
  });

  it("starts fresh when the guide version changes but keeps memory", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    completeThrough(store, session.id, "leg-1");
    store.recordDifficulty({ eventId: "e1", sessionId: session.id, guideId: guide.id, stepId: "leg-1", skillId: "leg_alignment" });
    const v2 = { ...guide, guideVersion: "2.0.0" };
    const next = makeStore();
    const s2 = next.loadOrCreateSession(v2);
    expect(s2.id).not.toBe(session.id);
    expect(s2.completedStepIds).toEqual([]);
    expect(next.loadProfile().learningNeeds.leg_alignment?.helpEventCount).toBe(1);
  });
});

describe("learning memory", () => {
  it("one confirmed alignment request at leg 1 expands leg 2", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    completeThrough(store, session.id, "fastener-1");
    expect(getAdaptation(step("leg-2"), store.loadProfile()).expanded).toBe(false);
    const profile = store.recordDifficulty({ eventId: "e1", sessionId: session.id, guideId: guide.id, stepId: "leg-1", skillId: "leg_alignment" });
    const result = getAdaptation(step("leg-2"), profile);
    expect(result.expanded).toBe(true);
    expect(result.matchedSkills).toEqual(["leg_alignment"]);
    expect(result.reason).toContain("lining up a leg");
  });

  it("counts the same help event once", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    const input = { eventId: "dup", sessionId: session.id, guideId: guide.id, stepId: "leg-1", skillId: "leg_alignment" as const };
    store.recordDifficulty(input);
    store.recordDifficulty(input);
    expect(makeStore().loadProfile().learningNeeds.leg_alignment?.helpEventCount).toBe(1);
    const reloaded = makeStore();
    expect(reloaded.loadHelpHistory()).toHaveLength(1);
    expect(reloaded.loadHelpHistory()[0].stepTitle).toBe(step("leg-1").title);
    reloaded.resetLearningNeeds();
    expect(makeStore().loadHelpHistory()).toEqual([]);
  });

  it("doesn't expand unrelated skills", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    const profile = store.recordDifficulty({ eventId: "e1", sessionId: session.id, guideId: guide.id, stepId: "prepare", skillId: "part_orientation" });
    expect(getAdaptation(step("leg-2"), profile).expanded).toBe(false);
    expect(getAdaptation(step("upright"), profile).matchedSkills).toEqual(["part_orientation"]);
  });

  it("rejects skills the step doesn't use", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    expect(() =>
      store.recordDifficulty({ eventId: "e1", sessionId: session.id, guideId: guide.id, stepId: "prepare", skillId: "hand_tightening" }),
    ).toThrow(StoreError);
    expect(() =>
      store.recordDifficulty({ eventId: "e2", sessionId: session.id, guideId: guide.id, stepId: "prepare", skillId: "bogus" as never }),
    ).toThrow(StoreError);
  });

  it("a new build clears progress but keeps learning needs", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    completeThrough(store, session.id, "leg-1");
    store.recordDifficulty({ eventId: "e1", sessionId: session.id, guideId: guide.id, stepId: "leg-1", skillId: "leg_alignment" });
    const fresh = store.startNewBuild(guide);
    expect(fresh.completedStepIds).toEqual([]);
    expect(fresh.viewedStepId).toBe("prepare");
    expect(getAdaptation(step("leg-1"), store.loadProfile()).expanded).toBe(true);
  });

  it("reset clears memory without touching build progress", () => {
    const store = makeStore();
    const session = store.loadOrCreateSession(guide);
    completeThrough(store, session.id, "fastener-1");
    store.recordDifficulty({ eventId: "e1", sessionId: session.id, guideId: guide.id, stepId: "fastener-1", skillId: "hand_tightening" });
    expect(store.resetLearningNeeds().learningNeeds).toEqual({});
    expect(store.loadOrCreateSession(guide).completedStepIds).toEqual(["prepare", "fastener-1"]);
  });
});

describe("storage failures", () => {
  it("recovers from corrupt JSON", () => {
    storage.setItem(PROFILE_KEY, "{not json");
    storage.setItem(SESSION_KEY, "[1,2");
    const store = makeStore();
    expect(store.loadProfile().learningNeeds).toEqual({});
    expect(store.loadOrCreateSession(guide).completedStepIds).toEqual([]);
  });

  it("works in memory when storage throws", () => {
    const throwing: StorageLike = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    const store = new ProfileStore({ storage: throwing });
    expect(store.persistenceAvailable).toBe(false);
    const session = store.loadOrCreateSession(guide);
    expect(store.completeStep(session.id, "prepare").completedStepIds).toEqual(["prepare"]);
  });
});
