import type { AssemblyGuide, SkillId, UserProfile } from "../../shared/contracts";
import { SKILL_LABELS } from "../../shared/skills";
import { CheckIcon } from "./icons";

export function CompleteScreen({
  guide,
  profile,
  onReview,
  onNewBuild,
}: {
  guide: AssemblyGuide;
  profile: UserProfile;
  onReview: () => void;
  onNewBuild: () => void;
}) {
  const needs = Object.keys(profile.learningNeeds) as SkillId[];
  return (
    <main className="complete" id="main">
      <div className="complete-mark" aria-hidden="true">
        <CheckIcon width={40} height={40} />
      </div>
      <h1 tabIndex={-1}>Your LACK side table is assembled</h1>
      <p className="lede">All {guide.steps.length} steps are checked off.</p>

      <section className="notes" aria-labelledby="notes-heading">
        <h2 id="notes-heading">Using your table</h2>
        <p className="small">From the usage notes in the IKEA manual ({guide.manualDocumentId}):</p>
        <ul>
          {guide.usageNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <a href={guide.manualUrl} target="_blank" rel="noreferrer">
          Open the original manual (PDF)
        </a>
      </section>

      <section className="notes" aria-labelledby="learned-heading">
        <h2 id="learned-heading">Next time</h2>
        {needs.length ? (
          <p>
            Steps involving {needs.map((s) => SKILL_LABELS[s].toLowerCase()).join(" and ")} will open with extra detail
            in your next build on this device.
          </p>
        ) : (
          <p>You didn't flag anything as tricky, so the next build starts with the standard steps.</p>
        )}
      </section>

      <div className="row">
        <button type="button" className="btn btn-primary" onClick={onNewBuild}>
          Start a new build
        </button>
        <button type="button" className="btn" onClick={onReview}>
          Review the steps
        </button>
      </div>
    </main>
  );
}
