import { useState } from "react";
import type { AssemblyStep, HelpChoice, HelpResponse, InstructionSubstep, SkillId } from "../../shared/contracts";
import { SKILL_LABELS } from "../../shared/skills";

export function SubstepList({
  substeps,
  activeId,
  emphasize,
  onSelect,
  markText = "extra detail for you",
}: {
  substeps: InstructionSubstep[];
  activeId: string | null;
  emphasize: SkillId[];
  onSelect: (id: string) => void;
  markText?: string;
}) {
  return (
    <ol className="substeps">
      {substeps.map((sub, i) => {
        const marked = sub.skills.some((s) => emphasize.includes(s));
        const active = activeId === sub.id;
        return (
          <li key={sub.id} className={`${active ? "is-active" : ""} ${marked ? "is-marked" : ""}`}>
            <button type="button" className="substep" onClick={() => onSelect(sub.id)} aria-pressed={active}>
              <span className="substep-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="substep-text">
                {sub.instruction}
                <span className="substep-meta">
                  {active ? "Playing this part" : "Show this part"}
                  {marked ? ` · ${markText}` : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export interface HelpState {
  requestId: string;
  stepId: string;
  response: HelpResponse;
  refining: boolean;
  /** Skill waiting for the user's yes/no before it is remembered. */
  pendingSkill: SkillId | null;
  recordedSkill: SkillId | null;
}

export function HelpPanel({
  step,
  help,
  activeSubstepId,
  onSelectSubstep,
  onChoose,
  onSend,
  onConfirm,
  onClose,
}: {
  step: AssemblyStep;
  help: HelpState;
  activeSubstepId: string | null;
  onSelectSubstep: (id: string) => void;
  onChoose: (choice: HelpChoice) => void;
  onSend: (text: string) => void;
  onConfirm: (yes: boolean) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const choices: HelpChoice[] = [...step.skills, "other"];
  const r = help.response;

  return (
    <section className="help" aria-labelledby="help-heading">
      <div className="help-head">
        <h3 id="help-heading">Let's slow this step down</h3>
        <button type="button" className="link-btn" onClick={onClose}>
          Hide help
        </button>
      </div>
      <p className="help-explain" aria-live="polite">
        {r.explanation}
        {help.refining ? <span className="pending"> Getting a more specific answer…</span> : null}
      </p>

      <SubstepList substeps={r.substeps} activeId={activeSubstepId} emphasize={r.difficulty.skillId ? [r.difficulty.skillId] : []} onSelect={onSelectSubstep} markText="matches your question" />

      {help.pendingSkill ? (
        <div className="confirm" role="group" aria-labelledby="confirm-q">
          <p id="confirm-q">
            Is this about <strong>{SKILL_LABELS[help.pendingSkill].toLowerCase()}</strong>? If so, I'll add extra detail
            whenever it comes up again.
          </p>
          <div className="row">
            <button type="button" className="btn btn-small btn-primary" onClick={() => onConfirm(true)}>
              Yes, remember this
            </button>
            <button type="button" className="btn btn-small" onClick={() => onConfirm(false)}>
              No
            </button>
          </div>
        </div>
      ) : null}
      {help.recordedSkill ? (
        <p className="saved" role="status">
          Noted: {SKILL_LABELS[help.recordedSkill].toLowerCase()}. Later steps that involve it will open with extra detail.
        </p>
      ) : null}

      <fieldset className="choices">
        <legend>What's giving you trouble?</legend>
        <div className="chips">
          {choices.map((c) => (
            <button key={c} type="button" className="chip" onClick={() => onChoose(c)}>
              {c === "other" ? "Something else" : SKILL_LABELS[c]}
            </button>
          ))}
        </div>
      </fieldset>

      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (!value) return;
          onSend(value);
          setText("");
        }}
      >
        <label htmlFor="help-text">Or describe it in your own words</label>
        <div className="ask-row">
          <input
            id="help-text"
            type="text"
            value={text}
            maxLength={500}
            placeholder="For example: I can't line up the leg with the screw"
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn btn-small">
            Ask
          </button>
        </div>
      </form>
      {r.origin === "ai" ? <p className="fine">Wording adjusted by AI from the reviewed steps. Actions and animations are unchanged.</p> : null}
    </section>
  );
}
