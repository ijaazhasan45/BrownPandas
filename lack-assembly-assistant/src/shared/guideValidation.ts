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
  return problems;
}
