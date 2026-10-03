// Canonical v1 contracts shared by every block. Change only by team agreement.

export type SkillId =
  | "part_identification"
  | "part_orientation"
  | "fastener_alignment"
  | "leg_alignment"
  | "hand_tightening";

export type PartId =
  | "tabletop"
  | "leg-1" | "leg-2" | "leg-3" | "leg-4"
  | "fastener-1" | "fastener-2" | "fastener-3" | "fastener-4";

// Strings must also be checked against the prepared animation registry.
export type AnimationId = string;

export interface ManualReference {
  documentId: string;
  page: number; // Human-readable PDF page, starting at 1.
  basis: "manual_diagram" | "supplementary_guidance";
}

export interface InstructionSubstep {
  id: string;
  instruction: string;
  animationId: AnimationId;
  highlightedPartIds: PartId[];
  skills: SkillId[];
}

export interface AssemblyStep {
  id: string;
  order: number; // Zero-based, consecutive.
  title: string;
  instruction: string;
  completionCheck: string; // Observable check the user performs.
  source: ManualReference;
  animationId: AnimationId;
  highlightedPartIds: PartId[];
  skills: SkillId[];
  substeps: InstructionSubstep[];
}

export interface AssemblyGuide {
  schemaVersion: 1;
  id: string;
  productId: string;
  productName: string;
  productArticleNumber: string;
  manualDocumentId: string;
  manualUrl: string;
  guideVersion: string;
  parts: { id: PartId; label: string }[];
  steps: AssemblyStep[];
  usageNotes: string[];
}

export interface LearningNeed {
  helpEventCount: number;
  lastObservedAt: string; // ISO timestamp.
}

export interface UserProfile {
  schemaVersion: 1;
  id: string;
  learningNeeds: Partial<Record<SkillId, LearningNeed>>;
}

export interface BuildSession {
  id: string;
  productId: string;
  guideId: string;
  guideVersion: string;
  startedAt: string;
  completedStepIds: string[];
  viewedStepId: string;
}

export type HelpChoice = SkillId | "other";

export interface HelpRequest {
  requestId: string; // Reuse for retries of this same help event.
  guideId: string;
  stepId: string;
  choice?: HelpChoice;
  message?: string;
  relevantLearningNeeds: SkillId[];
}

export interface HelpResponse {
  requestId: string;
  guideId: string;
  stepId: string;
  explanation: string;
  substeps: InstructionSubstep[];
  difficulty: {
    skillId: SkillId | null;
    status: "confirmed" | "needs_confirmation" | "unknown";
  };
  origin: "ai" | "prepared_fallback";
}

export interface AdaptationResult {
  expanded: boolean;
  matchedSkills: SkillId[];
  reason: string | null;
}

export interface ApiError {
  code:
    | "INVALID_PDF"
    | "UNSUPPORTED_MANUAL"
    | "PROCESSING_FAILED"
    | "INVALID_HELP_REQUEST"
    | "HELP_UNAVAILABLE";
  message: string;
}
