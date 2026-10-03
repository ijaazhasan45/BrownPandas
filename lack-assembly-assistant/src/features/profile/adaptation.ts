import type { AdaptationResult, AssemblyStep, UserProfile } from "../../shared/contracts";
import { SKILL_PHRASES } from "../../shared/skills";

/** One prior confirmed help event for a skill the step uses is enough to open extra detail. */
export function getAdaptation(step: AssemblyStep, profile: UserProfile): AdaptationResult {
  const matchedSkills = step.skills.filter((skill) => (profile.learningNeeds[skill]?.helpEventCount ?? 0) > 0);
  if (!matchedSkills.length) return { expanded: false, matchedSkills: [], reason: null };
  const phrases = matchedSkills.map((s) => SKILL_PHRASES[s]);
  const joined = phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
  return {
    expanded: true,
    matchedSkills,
    reason: `Extra detail is open because you asked for help with ${joined} earlier.`,
  };
}
