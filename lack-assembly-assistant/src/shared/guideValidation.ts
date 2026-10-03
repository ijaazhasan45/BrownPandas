import type { AssemblyGuide } from "./contracts";

/** Checks the catalog against the animation registry and its own part list. Returns problems; empty means valid. */
export function validateGuide(guide: AssemblyGuide, hasAnimation: (id: string) => boolean): string[] {
  const problems: string[] = [];
  const partIds = new Set(guide.parts.map((p) => p.id));
  const stepIds = new Set<string>();
  const substepIds = new Set<string>();

  guide.steps.forEach((step, index) => {
    if (step.order !== index) problems.push(`Step ${step.id} has order ${step.order}, expected ${index}.`);
    if (stepIds.has(step.id)) problems.push(`Duplicate step id ${step.id}.`);
    stepIds.add(step.id);
    if (!hasAnimation(step.animationId)) problems.push(`Step ${step.id} uses unknown animation ${step.animationId}.`);
    for (const part of step.highlightedPartIds) {
      if (!partIds.has(part)) problems.push(`Step ${step.id} highlights unknown part ${part}.`);
    }
    for (const part of step.partsUsed ?? []) {
      if (!partIds.has(part)) problems.push(`Step ${step.id} uses unknown part ${part}.`);
    }
    for (const sub of step.substeps) {
      if (substepIds.has(sub.id)) problems.push(`Duplicate substep id ${sub.id}.`);
      substepIds.add(sub.id);
      if (!hasAnimation(sub.animationId)) problems.push(`Substep ${sub.id} uses unknown animation ${sub.animationId}.`);
      for (const part of sub.highlightedPartIds) {
        if (!partIds.has(part)) problems.push(`Substep ${sub.id} highlights unknown part ${part}.`);
      }
      for (const skill of sub.skills) {
        if (!step.skills.includes(skill)) problems.push(`Substep ${sub.id} uses skill ${skill} that its step doesn't list.`);
      }
    }
  });

  const claimed = new Set<string>();
  for (const hw of guide.hardware ?? []) {
    for (const part of hw.partIds) {
      if (!partIds.has(part)) problems.push(`Hardware ${hw.code} maps to unknown part ${part}.`);
      if (claimed.has(part)) problems.push(`Part ${part} belongs to more than one hardware entry.`);
      claimed.add(part);
    }
    if (hw.partIds.length && hw.partIds.length !== hw.quantity) {
      problems.push(`Hardware ${hw.code} lists ${hw.quantity} pieces but maps to ${hw.partIds.length} parts.`);
    }
    const missing = missingDimensions(hw.shape, hw.sizeMm);
    if (missing.length) problems.push(`Hardware ${hw.code} (${hw.shape}) needs ${missing.join(", ")}.`);
  }
  return problems;
}

const REQUIRED: Record<NonNullable<AssemblyGuide["hardware"]>[number]["shape"], string[]> = {
  "double-ended-screw": ["length", "diameter"],
  screw: ["length", "diameter", "headDiameter"],
  dowel: ["length", "diameter"],
  washer: ["diameter", "innerDiameter", "thickness"],
  nut: ["diameter", "innerDiameter", "thickness"],
};

export function missingDimensions(shape: keyof typeof REQUIRED, size: Record<string, number | undefined>): string[] {
  return REQUIRED[shape].filter((key) => !(typeof size[key] === "number" && (size[key] as number) > 0));
}
