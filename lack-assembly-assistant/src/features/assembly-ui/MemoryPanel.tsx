import { PreferencesPanel } from "./PreferencesPanel";
import { useState } from "react";
import type { SkillId, UserProfile } from "../../shared/contracts";
import { profileStore } from "../profile/profileStore";
import { SKILL_LABELS } from "../../shared/skills";

export function MemoryPanel({
  profile,
  persistent,
  onReset,
  onNewBuild,
  onClose,
}: {
  profile: UserProfile;
  persistent: boolean;
  onReset: () => void;
  onNewBuild: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<"reset" | "new" | null>(null);
  const needs = Object.entries(profile.learningNeeds) as [SkillId, { helpEventCount: number; lastObservedAt: string }][];

  return (
    <aside className="memory" aria-labelledby="memory-heading">
      <div className="memory-head">
        <h2 id="memory-heading">Your builder profile</h2>
        <button type="button" className="link-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="small">
        {persistent
          ? "Saved in this browser on this device only. Nothing is sent to an account."
          : "This browser isn't allowing storage, so memory lasts only until you close the page."}
      </p>
      <PreferencesPanel />
      <h3>Your saved struggles</h3>
      {needs.length ? (
        <ul className="needs">
          {needs.map(([skill, need]) => (
            <li key={skill}>
              <span className="need-name">{SKILL_LABELS[skill]}</span>
              <span className="need-meta">
                Asked for help {need.helpEventCount === 1 ? "once" : `${need.helpEventCount} times`} · last on{" "}
                {new Date(need.lastObservedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Nothing yet. When you confirm what a step's trouble was, it shows up here.</p>
      )}

      {profileStore.loadHelpHistory().length > 0 && <section className="help-history"><h3>Recent learning moments</h3><ol>{profileStore.loadHelpHistory().slice(-5).reverse().map(item=><li key={item.eventId}><strong>{item.stepTitle}</strong><span>{SKILL_LABELS[item.skillId]} · {new Date(item.observedAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span></li>)}</ol></section>}
      <div className="memory-actions">
        {confirming === "new" ? (
          <div className="confirm" role="group" aria-label="Confirm new build">
            <p>Start over at the first step? Your progress resets; what you found tricky is kept.</p>
            <div className="row">
              <button type="button" className="btn btn-small btn-primary" onClick={onNewBuild}>
                Start new build
              </button>
              <button type="button" className="btn btn-small" onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-small" onClick={() => setConfirming("new")}>
            Start a new build
          </button>
        )}
        {confirming === "reset" ? (
          <div className="confirm" role="group" aria-label="Confirm reset">
            <p>Forget everything listed above? Your current build progress stays.</p>
            <div className="row">
              <button type="button" className="btn btn-small btn-danger" onClick={() => { onReset(); setConfirming(null); }}>
                Forget it all
              </button>
              <button type="button" className="btn btn-small" onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-small" onClick={() => setConfirming("reset")} disabled={!needs.length}>
            Reset memory
          </button>
        )}
      </div>
    </aside>
  );
}
