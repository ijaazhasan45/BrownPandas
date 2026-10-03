import type { PartId, SkillId } from "./contracts";

export const SKILL_IDS: readonly SkillId[] = [
  "part_identification",
  "part_orientation",
  "fastener_alignment",
  "leg_alignment",
  "hand_tightening",
] as const;

export const PART_IDS: readonly PartId[] = [
  "tabletop",
  "leg-1", "leg-2", "leg-3", "leg-4",
  "fastener-1", "fastener-2", "fastener-3", "fastener-4",
] as const;

/** What a person recognizes, used in help choices and the memory panel. */
export const SKILL_LABELS: Record<SkillId, string> = {
  part_identification: "Telling the parts apart",
  part_orientation: "Which way a part faces",
  fastener_alignment: "Lining up a fastener",
  leg_alignment: "Lining up a leg",
  hand_tightening: "Turning by hand",
};

/** Short phrase used inside sentences ("...help with ___ earlier"). */
export const SKILL_PHRASES: Record<SkillId, string> = {
  part_identification: "telling the parts apart",
  part_orientation: "orienting a part",
  fastener_alignment: "lining up a fastener",
  leg_alignment: "lining up a leg",
  hand_tightening: "turning parts by hand",
};

export function isSkillId(value: unknown): value is SkillId {
  return typeof value === "string" && (SKILL_IDS as readonly string[]).includes(value);
}

export function isPartId(value: unknown): value is PartId {
  return typeof value === "string" && (PART_IDS as readonly string[]).includes(value);
}
