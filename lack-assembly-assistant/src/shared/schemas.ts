import { z } from "zod";
import type { AssemblyGuide, HelpRequest, HelpResponse } from "./contracts";
import { PART_IDS, SKILL_IDS } from "./skills";

const skillId = z.enum(SKILL_IDS as unknown as [string, ...string[]]);
const partId = z.enum(PART_IDS as unknown as [string, ...string[]]);

export const manualReferenceSchema = z.object({
  documentId: z.string().min(1),
  page: z.number().int().min(1),
  basis: z.enum(["manual_diagram", "supplementary_guidance"]),
});

export const substepSchema = z.object({
  id: z.string().min(1),
  instruction: z.string().min(1).max(400),
  animationId: z.string().min(1),
  highlightedPartIds: z.array(partId),
  skills: z.array(skillId),
});

export const stepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
  title: z.string().min(1),
  instruction: z.string().min(1),
  completionCheck: z.string().min(1),
  source: manualReferenceSchema,
  animationId: z.string().min(1),
  highlightedPartIds: z.array(partId),
  skills: z.array(skillId),
  substeps: z.array(substepSchema),
});

export const guideSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  productArticleNumber: z.string().min(1),
  manualDocumentId: z.string().min(1),
  manualUrl: z.string().url(),
  guideVersion: z.string().min(1),
  parts: z.array(z.object({ id: partId, label: z.string().min(1) })),
  steps: z.array(stepSchema).min(1),
  usageNotes: z.array(z.string()),
});

export const helpRequestSchema = z.object({
  requestId: z.string().min(8).max(80),
  guideId: z.string().min(1).max(80),
  stepId: z.string().min(1).max(80),
  choice: z.union([skillId, z.literal("other")]).optional(),
  message: z.string().max(500).optional(),
  relevantLearningNeeds: z.array(skillId).max(10),
});

export const helpResponseSchema = z.object({
  requestId: z.string(),
  guideId: z.string(),
  stepId: z.string(),
  explanation: z.string().min(1).max(600),
  substeps: z.array(substepSchema).max(4),
  difficulty: z.object({
    skillId: skillId.nullable(),
    status: z.enum(["confirmed", "needs_confirmation", "unknown"]),
  }),
  origin: z.enum(["ai", "prepared_fallback"]),
});

export const parseGuide = (data: unknown): AssemblyGuide => guideSchema.parse(data) as AssemblyGuide;
export const parseHelpRequest = (data: unknown): HelpRequest =>
  helpRequestSchema.parse(data) as HelpRequest;
export const parseHelpResponse = (data: unknown): HelpResponse =>
  helpResponseSchema.parse(data) as HelpResponse;
