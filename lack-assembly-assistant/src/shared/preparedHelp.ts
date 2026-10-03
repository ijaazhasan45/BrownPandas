/**
 * Prepared help: deterministic, offline help built only from the reviewed catalog.
 * Used directly in the static build, as the server's fallback, and as the
 * instant first answer the UI shows before any AI refinement arrives.
 */
import type {
  AssemblyGuide,
  AssemblyStep,
  HelpRequest,
  HelpResponse,
  InstructionSubstep,
  SkillId,
} from "./contracts";
import { isSkillId } from "./skills";

const EXPLANATIONS: Record<SkillId, string> = {
  part_identification:
    "There are three kinds of parts: the large square tabletop, four identical legs, and four identical metal fasteners. Any leg fits any corner, and any fastener fits any hole.",
  part_orientation:
    "During assembly the smooth, finished side of the tabletop faces down on the blanket. You build on the side with the corner holes.",
  fastener_alignment:
    "Hold the fastener straight up so it enters the hole squarely. If it starts at an angle it will bind, so lift it out and set it straight again.",
  leg_alignment:
    "Go slowly here. Find the hole in the end of the leg first, hold the leg straight up, and lower it until you feel the fastener tip slip into the hole. Start turning only once the leg sits straight.",
  hand_tightening:
    "Turn clockwise with a relaxed grip and re-grip after each half turn. Stop when it's snug; forcing it can damage the threads or the hole.",
};

const UPRIGHT_ORIENTATION =
  "Hold the tabletop by its edges and turn the whole table over in one smooth motion, then lower it so all four legs touch the floor together.";

const GENERIC =
  "Here is this step in smaller pieces. Select a piece to watch only that part of the animation.";

export function explanationFor(step: AssemblyStep, skill: SkillId | null, hasHardware = false): string {
  if (!skill) return GENERIC;
  if (skill === "part_orientation" && step.id === "upright") return UPRIGHT_ORIENTATION;
  if (skill === "part_identification" && hasHardware) {
    return `${EXPLANATIONS[skill]} To check a small part, use Compare a part at actual size and lay it on the outline.`;
  }
  return EXPLANATIONS[skill];
}

/** Substeps that practice a skill, or every substep when none match. */
export function substepsFor(step: AssemblyStep, skill: SkillId | null): InstructionSubstep[] {
  const matching = skill ? step.substeps.filter((s) => s.skills.includes(skill)) : [];
  return (matching.length ? matching : step.substeps).slice(0, 4);
}

const ALIGN_WORDS = /\b(line|lines|lining|lined|align|aligned|aligning|straight|tilt|tilted|tilts|crooked|angle|angled|fit|fits|centered|hole|holes|slip|slips)\b/;
const TURN_WORDS = /\b(turn|turns|turning|tight|tighten|tightening|loose|twist|twisting|stuck|spin|spins|spinning|wobble|wobbles|wobbly|hard|snug|stops?)\b/;
const IDENTIFY_WORDS = /\b(which (part|piece|one)|identify|tell (them )?apart|missing|what is|what's this|extra|same)\b/;
const ORIENT_WORDS = /\b(upside|side|sides|face|faces|facing|flip|over|orientation|front|back|top|bottom|direction)\b/;
const LEG_WORDS = /\b(leg|legs)\b/;
const FASTENER_WORDS = /\b(fastener|fasteners|screw|screws|bolt|bolts|dowel|pin|115980)\b/;

/**
 * Suggests which skill free text is about, limited to the current step's skills.
 * The suggestion must be confirmed by the user before it is remembered.
 */
export function classifyMessage(message: string, step: AssemblyStep): SkillId | null {
  const text = message.toLowerCase();
  const scores: Record<SkillId, number> = {
    part_identification: IDENTIFY_WORDS.test(text) ? 2 : 0,
    part_orientation: ORIENT_WORDS.test(text) ? 1 : 0,
    fastener_alignment: (ALIGN_WORDS.test(text) ? 1 : 0) + (FASTENER_WORDS.test(text) ? 1 : 0),
    leg_alignment: (ALIGN_WORDS.test(text) ? 1 : 0) + (LEG_WORDS.test(text) ? 1 : 0),
    hand_tightening: TURN_WORDS.test(text) ? 1.5 : 0,
  };
  let best: SkillId | null = null;
  let bestScore = 0;
  // Ties go to the earlier skill in the step's own list.
  for (const skill of step.skills) {
    if (scores[skill] > bestScore) {
      best = skill;
      bestScore = scores[skill];
    }
  }
  return bestScore >= 1 ? best : null;
}

export function buildPreparedHelp(guide: AssemblyGuide, request: HelpRequest): HelpResponse {
  const step = guide.steps.find((s) => s.id === request.stepId);
  if (!step) throw new Error(`Unknown step ${request.stepId}`);

  let skill: SkillId | null = null;
  let status: HelpResponse["difficulty"]["status"] = "unknown";

  if (isSkillId(request.choice) && step.skills.includes(request.choice)) {
    skill = request.choice;
    status = "confirmed";
  } else if (request.message && request.message.trim()) {
    skill = classifyMessage(request.message, step);
    status = skill ? "needs_confirmation" : "unknown";
  }

  return {
    requestId: request.requestId,
    guideId: guide.id,
    stepId: step.id,
    explanation: explanationFor(step, skill, !!guide.hardware?.length),
    substeps: substepsFor(step, skill),
    difficulty: { skillId: skill, status },
    origin: "prepared_fallback",
  };
}
