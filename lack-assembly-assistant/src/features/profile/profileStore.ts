/**
 * Block 4: profile memory, build progress, and adaptive detail.
 * The only module that touches browser storage. Memory lives on this browser/device only.
 */
import type {
  AssemblyGuide,
  BuildSession,
  SkillId,
  UserProfile,
} from "../../shared/contracts";
import { isSkillId } from "../../shared/skills";
import { calibrationMatches, isCalibration, makeCalibration, type ScaleCalibration, type ScreenInfo } from "../scale/scaleMath";
export { getAdaptation } from "./adaptation";

export const PROFILE_KEY = "assembly-assistant:profile:v1";
export const SESSION_KEY = "assembly-assistant:session:v1";
export const SCALE_KEY = "assembly-assistant:scale:v1";
const MAX_EVENT_IDS = 300;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class StoreError extends Error {}

interface ProfileEnvelope {
  version: 1;
  profile: UserProfile;
  processedEventIds: string[];
}

interface SessionEnvelope {
  version: 1;
  session: BuildSession;
}

function defaultId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function firstIncompleteIndex(guide: AssemblyGuide, session: BuildSession): number {
  const done = new Set(session.completedStepIds);
  const index = guide.steps.findIndex((s) => !done.has(s.id));
  return index === -1 ? guide.steps.length : index;
}

/** Completed steps plus the first incomplete one. Later steps stay locked. */
export function accessibleStepIds(guide: AssemblyGuide, session: BuildSession): Set<string> {
  const frontier = firstIncompleteIndex(guide, session);
  return new Set(guide.steps.slice(0, Math.min(frontier + 1, guide.steps.length)).map((s) => s.id));
}

export function isBuildComplete(guide: AssemblyGuide, session: BuildSession): boolean {
  return firstIncompleteIndex(guide, session) >= guide.steps.length;
}

export class ProfileStore {
  private storage: StorageLike | null;
  private now: () => Date;
  private newId: () => string;
  private profileEnv: ProfileEnvelope | null = null;
  private session: BuildSession | null = null;
  private guide: AssemblyGuide | null = null;
  private memoryCalibration: ScaleCalibration | null = null;
  /** False when the browser refuses storage; the app still works for this visit. */
  persistenceAvailable: boolean;

  constructor(opts: { storage?: StorageLike | null; now?: () => Date; newId?: () => string } = {}) {
    this.storage = opts.storage ?? null;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? defaultId;
    this.persistenceAvailable = this.storage !== null && this.probe();
  }

  private probe(): boolean {
    try {
      const k = "assembly-assistant:probe";
      this.storage!.setItem(k, "1");
      this.storage!.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  private read<T>(key: string): T | null {
    if (!this.persistenceAvailable) return null;
    try {
      const raw = this.storage!.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null; // corrupt JSON or blocked storage: recover with fresh state
    }
  }

  private write(key: string, value: unknown): void {
    if (!this.persistenceAvailable) return;
    try {
      this.storage!.setItem(key, JSON.stringify(value));
    } catch {
      this.persistenceAvailable = false;
    }
  }

  // --- Profile -------------------------------------------------------

  private freshProfile(): ProfileEnvelope {
    return { version: 1, profile: { schemaVersion: 1, id: this.newId(), learningNeeds: {} }, processedEventIds: [] };
  }

  private envelope(): ProfileEnvelope {
    if (this.profileEnv) return this.profileEnv;
    const stored = this.read<ProfileEnvelope>(PROFILE_KEY);
    let env = this.freshProfile();
    if (stored && stored.version === 1 && stored.profile?.schemaVersion === 1 && typeof stored.profile.id === "string") {
      const needs: UserProfile["learningNeeds"] = {};
      for (const [skill, need] of Object.entries(stored.profile.learningNeeds ?? {})) {
        if (isSkillId(skill) && need && typeof need.helpEventCount === "number" && need.helpEventCount > 0) {
          needs[skill] = { helpEventCount: need.helpEventCount, lastObservedAt: String(need.lastObservedAt) };
        }
      }
      env = {
        version: 1,
        profile: { schemaVersion: 1, id: stored.profile.id, learningNeeds: needs },
        processedEventIds: Array.isArray(stored.processedEventIds) ? stored.processedEventIds.filter((x) => typeof x === "string") : [],
      };
    }
    this.profileEnv = env;
    return env;
  }

  loadProfile(): UserProfile {
    return structuredClone(this.envelope().profile);
  }

  recordDifficulty(input: { eventId: string; sessionId: string; guideId: string; stepId: string; skillId: SkillId }): UserProfile {
    if (!isSkillId(input.skillId)) throw new StoreError(`Unknown skill ${String(input.skillId)}`);
    const guide = this.requireGuide(input.guideId);
    const session = this.requireSession(input.sessionId);
    if (session.guideId !== guide.id) throw new StoreError("Session doesn't belong to this guide");
    const step = guide.steps.find((s) => s.id === input.stepId);
    if (!step) throw new StoreError(`Unknown step ${input.stepId}`);
    if (!step.skills.includes(input.skillId)) throw new StoreError(`Step ${step.id} doesn't use ${input.skillId}`);

    const env = this.envelope();
    if (env.processedEventIds.includes(input.eventId)) return this.loadProfile();

    const prior = env.profile.learningNeeds[input.skillId];
    env.profile.learningNeeds[input.skillId] = {
      helpEventCount: (prior?.helpEventCount ?? 0) + 1,
      lastObservedAt: this.now().toISOString(),
    };
    env.processedEventIds = [...env.processedEventIds, input.eventId].slice(-MAX_EVENT_IDS);
    this.write(PROFILE_KEY, env);
    return this.loadProfile();
  }

  resetLearningNeeds(): UserProfile {
    const env = this.envelope();
    env.profile.learningNeeds = {};
    env.processedEventIds = [];
    this.write(PROFILE_KEY, env);
    return this.loadProfile();
  }

  // --- Device: actual-size calibration -------------------------------

  /** The saved calibration if it was made on this screen at this zoom; otherwise null. */
  loadScaleCalibration(screen: ScreenInfo): ScaleCalibration | null {
    const stored = this.memoryCalibration ?? this.read<ScaleCalibration>(SCALE_KEY);
    if (!isCalibration(stored)) return null;
    return calibrationMatches(stored, screen) ? { ...stored } : null;
  }

  saveScaleCalibration(pxPerMm: number, screen: ScreenInfo): ScaleCalibration {
    const cal = makeCalibration(pxPerMm, screen, this.now());
    this.memoryCalibration = cal;
    this.write(SCALE_KEY, cal);
    return { ...cal };
  }

  clearScaleCalibration(): void {
    this.memoryCalibration = null;
    if (!this.persistenceAvailable) return;
    try {
      this.storage!.removeItem(SCALE_KEY);
    } catch {
      /* ignore */
    }
  }

  // --- Sessions ------------------------------------------------------

  private freshSession(guide: AssemblyGuide): BuildSession {
    return {
      id: this.newId(),
      productId: guide.productId,
      guideId: guide.id,
      guideVersion: guide.guideVersion,
      startedAt: this.now().toISOString(),
      completedStepIds: [],
      viewedStepId: guide.steps[0].id,
    };
  }

  private isUsable(stored: BuildSession, guide: AssemblyGuide): boolean {
    if (stored.guideId !== guide.id || stored.guideVersion !== guide.guideVersion) return false;
    if (!Array.isArray(stored.completedStepIds) || typeof stored.id !== "string") return false;
    const ids = guide.steps.map((s) => s.id);
    // Completed steps must be a prefix of the guide order.
    if (!stored.completedStepIds.every((id, i) => ids[i] === id)) return false;
    const accessible = accessibleStepIds(guide, stored);
    return accessible.has(stored.viewedStepId);
  }

  /** The stored session for this guide, without creating one. */
  peekSession(guide: AssemblyGuide): BuildSession | null {
    const stored = this.read<SessionEnvelope>(SESSION_KEY)?.session;
    return stored && this.isUsable(stored, guide) ? structuredClone(stored) : null;
  }

  loadOrCreateSession(guide: AssemblyGuide): BuildSession {
    this.guide = guide;
    const stored = this.peekSession(guide);
    this.session = stored ?? this.freshSession(guide);
    if (!stored) this.saveSession();
    return structuredClone(this.session);
  }

  startNewBuild(guide: AssemblyGuide): BuildSession {
    this.guide = guide;
    this.session = this.freshSession(guide);
    this.saveSession();
    return structuredClone(this.session);
  }

  saveViewedStep(sessionId: string, stepId: string): BuildSession {
    const session = this.requireSession(sessionId);
    const guide = this.requireGuide(session.guideId);
    if (!guide.steps.some((s) => s.id === stepId)) throw new StoreError(`Unknown step ${stepId}`);
    if (!accessibleStepIds(guide, session).has(stepId)) throw new StoreError("That step is locked until earlier steps are complete");
    session.viewedStepId = stepId;
    this.saveSession();
    return structuredClone(session);
  }

  completeStep(sessionId: string, stepId: string): BuildSession {
    const session = this.requireSession(sessionId);
    const guide = this.requireGuide(session.guideId);
    const index = guide.steps.findIndex((s) => s.id === stepId);
    if (index === -1) throw new StoreError(`Unknown step ${stepId}`);
    if (session.completedStepIds.includes(stepId)) return structuredClone(session); // idempotent
    if (index !== firstIncompleteIndex(guide, session)) throw new StoreError("Complete the earlier steps first");
    session.completedStepIds = [...session.completedStepIds, stepId];
    this.saveSession();
    return structuredClone(session);
  }

  private saveSession() {
    if (this.session) this.write(SESSION_KEY, { version: 1, session: this.session } satisfies SessionEnvelope);
  }

  private requireSession(sessionId: string): BuildSession {
    if (!this.session || this.session.id !== sessionId) throw new StoreError("That build session isn't active");
    return this.session;
  }

  private requireGuide(guideId: string): AssemblyGuide {
    if (!this.guide || this.guide.id !== guideId) throw new StoreError("That guide isn't loaded");
    return this.guide;
  }
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** App-wide instance. */
export const profileStore = new ProfileStore({ storage: browserStorage() });
