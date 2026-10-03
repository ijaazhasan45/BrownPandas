import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssemblyGuide, BuildSession, HelpChoice, HelpRequest, SkillId, UserProfile } from "../../shared/contracts";
import { AssemblyViewer } from "../viewer/AssemblyViewer";
import { SERVICE_MODE, getHelp, getPreparedHelp } from "../instructions/instructionService";
import { accessibleStepIds, firstIncompleteIndex, getAdaptation, isBuildComplete, profileStore } from "../profile/profileStore";
import { HelpPanel, SubstepList, type HelpState } from "./HelpPanel";
import { CheckIcon, LockIcon, XIcon } from "./icons";

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function AssemblyScreen({
  guide,
  session,
  profile,
  onSession,
  onProfile,
  onComplete,
  onAnnounce,
}: {
  guide: AssemblyGuide;
  session: BuildSession;
  profile: UserProfile;
  onSession: (s: BuildSession) => void;
  onProfile: (p: UserProfile) => void;
  onComplete: () => void;
  onAnnounce: (text: string) => void;
}) {
  const step = guide.steps.find((s) => s.id === session.viewedStepId) ?? guide.steps[0];
  const index = step.order;
  const frontier = firstIncompleteIndex(guide, session);
  const accessible = useMemo(() => accessibleStepIds(guide, session), [guide, session]);
  const isDone = session.completedStepIds.includes(step.id);
  const adaptation = useMemo(() => getAdaptation(step, profile), [step, profile]);

  const [help, setHelp] = useState<HelpState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeSubstepId, setActiveSubstepId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(adaptation.expanded);
  const [replayToken] = useState(0);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const active = useRef<{ requestId: string; stepId: string; controller: AbortController | null } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Reset per-step UI when the viewed step changes. Old help requests are aborted and ignored.
  useEffect(() => {
    active.current?.controller?.abort();
    active.current = null;
    setHelp(null);
    setHelpOpen(false);
    setActiveSubstepId(null);
    setDetailsOpen(getAdaptation(step, profileStore.loadProfile()).expanded);
    if (!firstRender.current) headingRef.current?.focus();
    firstRender.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  useEffect(() => () => active.current?.controller?.abort(), []);

  const visibleSubsteps = help?.response.substeps ?? step.substeps;
  const activeSub = activeSubstepId ? [...visibleSubsteps, ...step.substeps].find((s) => s.id === activeSubstepId) : undefined;
  const animationId = activeSub?.animationId ?? step.animationId;
  const highlights = activeSub?.highlightedPartIds ?? step.highlightedPartIds;

  const goTo = useCallback(
    (stepId: string) => {
      if (!accessible.has(stepId)) return;
      const next = profileStore.saveViewedStep(session.id, stepId);
      onSession(next);
      const target = guide.steps.find((s) => s.id === stepId)!;
      onAnnounce(`Step ${target.order + 1} of ${guide.steps.length}: ${target.title}`);
    },
    [accessible, session.id, onSession, guide, onAnnounce],
  );

  function complete() {
    if (!isDone) {
      const updated = profileStore.completeStep(session.id, step.id);
      if (isBuildComplete(guide, updated)) {
        onSession(updated);
        onComplete();
        return;
      }
      const next = guide.steps[index + 1];
      onSession(profileStore.saveViewedStep(session.id, next.id));
      onAnnounce(`Step ${index + 1} marked complete. Now step ${next.order + 1}: ${next.title}`);
      return;
    }
    const next = guide.steps[index + 1];
    if (next) goTo(next.id);
    else onComplete();
  }

  function remember(skill: SkillId, eventId: string): boolean {
    try {
      onProfile(
        profileStore.recordDifficulty({ eventId, sessionId: session.id, guideId: guide.id, stepId: step.id, skillId: skill }),
      );
      return true;
    } catch {
      return false;
    }
  }

  function ask(choice?: HelpChoice, message?: string) {
    active.current?.controller?.abort();
    const requestId = newRequestId();
    const request: HelpRequest = {
      requestId,
      guideId: guide.id,
      stepId: step.id,
      choice,
      message,
      relevantLearningNeeds: adaptation.matchedSkills,
    };
    const prepared = getPreparedHelp(request);
    let recorded: SkillId | null = null;
    if (prepared.difficulty.status === "confirmed" && prepared.difficulty.skillId) {
      if (remember(prepared.difficulty.skillId, requestId)) recorded = prepared.difficulty.skillId;
    }
    const pending = prepared.difficulty.status === "needs_confirmation" ? prepared.difficulty.skillId : null;
    const refining = SERVICE_MODE === "server" && (choice !== undefined || !!message);
    setHelp({ requestId, stepId: step.id, response: prepared, refining, pendingSkill: pending, recordedSkill: recorded });
    setHelpOpen(true);
    setActiveSubstepId(prepared.substeps[0]?.id ?? null);
    onAnnounce("Help is open below the step.");

    if (!refining) {
      active.current = { requestId, stepId: step.id, controller: null };
      return;
    }
    const controller = new AbortController();
    active.current = { requestId, stepId: step.id, controller };
    getHelp(request, controller.signal)
      .then((resp) => {
        const cur = active.current;
        if (!cur || cur.requestId !== resp.requestId || cur.stepId !== resp.stepId) return; // stale
        setHelp((h) => {
          if (!h || h.requestId !== resp.requestId) return h;
          const pendingSkill = h.recordedSkill
            ? null
            : resp.difficulty.status === "needs_confirmation"
              ? resp.difficulty.skillId
              : h.pendingSkill;
          return { ...h, response: resp, refining: false, pendingSkill };
        });
        setActiveSubstepId((id) => (id && resp.substeps.some((s) => s.id === id) ? id : resp.substeps[0]?.id ?? null));
      })
      .catch(() => {
        setHelp((h) => (h && h.requestId === requestId ? { ...h, refining: false } : h));
      });
  }

  function confirm(yes: boolean) {
    if (!help?.pendingSkill) return;
    const skill = help.pendingSkill;
    const ok = yes && remember(skill, help.requestId);
    setHelp({ ...help, pendingSkill: null, recordedSkill: ok ? skill : help.recordedSkill });
  }

  const basisLabel =
    step.source.basis === "manual_diagram"
      ? `From the manual, page ${step.source.page}`
      : "Added guidance, not shown in the manual";

  return (
    <main className="bench" id="main">
      <section className="stage" aria-label="3D view">
        <AssemblyViewer
          guideId={guide.id}
          stepId={step.id}
          animationId={animationId}
          highlightedPartIds={highlights}
          replayToken={replayToken}
          onViewerError={setViewerError}
        />
        {viewerError ? (
          <p className="viewer-error" role="alert">
            {viewerError}
          </p>
        ) : null}
        {activeSub ? (
          <div className="stage-focus">
            <span>Showing part of this step</span>
            <button type="button" className="link-btn" onClick={() => setActiveSubstepId(null)}>
              Show the whole step
            </button>
          </div>
        ) : null}
      </section>

      <section className="sheet" aria-labelledby="step-title">
        <div className="sheet-head">
          <p className="eyebrow">
            <span className="mono">
              Step {index + 1} / {guide.steps.length}
            </span>
            <span className={`basis basis-${step.source.basis}`}>{basisLabel}</span>
            {isDone ? <span className="done-pill">Done</span> : null}
          </p>
          <h2 id="step-title" ref={headingRef} tabIndex={-1}>
            {step.title}
          </h2>
        </div>

        <p className="instruction">{step.instruction}</p>

        {adaptation.expanded && !helpOpen ? (
          <div className="adapt">
            <p className="adapt-note">
              <span className="adapt-badge">For you</span> {adaptation.reason}
            </p>
            <button type="button" className="link-btn" onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen}>
              {detailsOpen ? "Hide the detail" : "Show the detail"}
            </button>
          </div>
        ) : null}

        {!helpOpen && (detailsOpen || (!adaptation.expanded && activeSubstepId)) ? (
          <SubstepList
            substeps={step.substeps}
            activeId={activeSubstepId}
            emphasize={adaptation.matchedSkills}
            onSelect={(id) => setActiveSubstepId(id === activeSubstepId ? null : id)}
          />
        ) : null}
        {!helpOpen && !detailsOpen && !adaptation.expanded && step.substeps.length > 1 ? (
          <button type="button" className="link-btn" onClick={() => setDetailsOpen(true)}>
            Break this step into {step.substeps.length} smaller parts
          </button>
        ) : null}

        <div className="check">
          <p className="check-label">Before you continue</p>
          <p>{step.completionCheck}</p>
        </div>

        <div className="actions">
          <button type="button" className="btn btn-done" onClick={complete}>
            <CheckIcon /> Step complete
          </button>
          <button
            type="button"
            className="btn btn-help"
            aria-expanded={helpOpen}
            onClick={() => (helpOpen ? setHelpOpen(false) : ask())}
          >
            <XIcon /> I need help
          </button>
        </div>

        {helpOpen && help ? (
          <HelpPanel
            step={step}
            help={help}
            activeSubstepId={activeSubstepId}
            onSelectSubstep={(id) => setActiveSubstepId(id)}
            onChoose={(c) => ask(c)}
            onSend={(text) => ask(undefined, text)}
            onConfirm={confirm}
            onClose={() => {
              setHelpOpen(false);
              setActiveSubstepId(null);
            }}
          />
        ) : null}

        <nav className="stepnav" aria-label="Step navigation">
          <button type="button" className="btn btn-small" disabled={index === 0} onClick={() => goTo(guide.steps[index - 1].id)}>
            Previous
          </button>
          <button
            type="button"
            className="btn btn-small"
            disabled={index >= frontier || index === guide.steps.length - 1}
            onClick={() => goTo(guide.steps[index + 1].id)}
          >
            Next
          </button>
        </nav>
        {index === frontier ? <p className="fine center">Next unlocks after you tap Step complete.</p> : null}

        <div className="steplist">
          <button type="button" className="link-btn" aria-expanded={stepsOpen} aria-controls="all-steps" onClick={() => setStepsOpen((o) => !o)}>
            {stepsOpen ? "Hide all steps" : "See all steps"}
          </button>
          {stepsOpen ? (
            <ol id="all-steps" className="steps">
              {guide.steps.map((s) => {
                const done = session.completedStepIds.includes(s.id);
                const open = accessible.has(s.id);
                const current = s.id === step.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`stepitem${current ? " is-current" : ""}`}
                      disabled={!open}
                      aria-current={current ? "step" : undefined}
                      onClick={() => goTo(s.id)}
                    >
                      <span className="mono stepitem-num">{s.order + 1}</span>
                      <span className="stepitem-title">{s.title}</span>
                      <span className="stepitem-state">
                        {done ? "Done" : open ? "Up next" : <><LockIcon /> Locked</>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </section>
    </main>
  );
}
