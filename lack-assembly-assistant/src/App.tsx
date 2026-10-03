import { useCallback, useEffect, useState } from "react";
import type { AssemblyGuide, BuildSession, UserProfile } from "./shared/contracts";
import { StartScreen } from "./features/assembly-ui/StartScreen";
import { AssemblyScreen } from "./features/assembly-ui/AssemblyScreen";
import { CompleteScreen } from "./features/assembly-ui/CompleteScreen";
import { MemoryPanel } from "./features/assembly-ui/MemoryPanel";
import { isBuildComplete, profileStore } from "./features/profile/profileStore";
import { loadSampleGuide } from "./features/instructions/instructionService";

type Screen = "start" | "assembly" | "complete";

function initialState(): { screen: Screen; guide: AssemblyGuide | null; session: BuildSession | null } {
  // Resume an active build after reload. The reviewed guide is bundled with the app.
  const guide = loadSampleGuide();
  if (!profileStore.peekSession(guide)) return { screen: "start", guide: null, session: null };
  const session = profileStore.loadOrCreateSession(guide);
  return { screen: isBuildComplete(guide, session) ? "complete" : "assembly", guide, session };
}

export default function App() {
  const [{ screen, guide, session }, setState] = useState(initialState);
  const [profile, setProfile] = useState<UserProfile>(() => profileStore.loadProfile());
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const announce = useCallback((text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);

  const begin = useCallback(
    (g: AssemblyGuide) => {
      const s = profileStore.loadOrCreateSession(g);
      setState({ screen: isBuildComplete(g, s) ? "complete" : "assembly", guide: g, session: s });
      announce(`Opened the ${g.productName} guide.`);
    },
    [announce],
  );

  const newBuild = useCallback(() => {
    const g = guide ?? loadSampleGuide();
    const s = profileStore.startNewBuild(g);
    setState({ screen: "assembly", guide: g, session: s });
    setMemoryOpen(false);
    announce("New build started at step 1. What you found tricky is still remembered.");
  }, [guide, announce]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, session?.id]);

  useEffect(() => {
    document.title = screen === "start" ? "LACK Assembly Assistant" : `${guide?.productName.split(",")[0] ?? "LACK"} · Assembly Assistant`;
  }, [screen, guide]);

  const needCount = Object.keys(profile.learningNeeds).length;
  const doneCount = session?.completedStepIds.length ?? 0;

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Assembly Assistant</span>
          {guide && screen !== "start" ? <span className="brand-product">{guide.productName.split(",")[0]}</span> : null}
        </div>
        {guide && session && screen !== "start" ? (
          <div className="progress" aria-label={`${doneCount} of ${guide.steps.length} steps complete`}>
            <span className="progress-bar" aria-hidden="true">
              <span style={{ width: `${(doneCount / guide.steps.length) * 100}%` }} />
            </span>
            <span className="mono">
              {doneCount}/{guide.steps.length}
            </span>
          </div>
        ) : null}
        <div className="topbar-actions">
          {guide && screen !== "start" ? (
            <a className="link-btn" href={guide.manualUrl} target="_blank" rel="noreferrer">
              Manual PDF
            </a>
          ) : null}
          <button type="button" className="btn btn-small" onClick={() => setMemoryOpen((o) => !o)} aria-expanded={memoryOpen}>
            Memory{needCount ? ` (${needCount})` : ""}
          </button>
        </div>
      </header>

      {memoryOpen ? (
        <MemoryPanel
          profile={profile}
          persistent={profileStore.persistenceAvailable}
          onReset={() => {
            setProfile(profileStore.resetLearningNeeds());
            announce("Memory cleared.");
          }}
          onNewBuild={newBuild}
          onClose={() => setMemoryOpen(false)}
        />
      ) : null}

      {screen === "start" || !guide || !session ? (
        <StartScreen onGuide={(g) => begin(g)} />
      ) : screen === "assembly" ? (
        <AssemblyScreen
          key={session.id}
          guide={guide}
          session={session}
          profile={profile}
          onSession={(s) => setState((st) => ({ ...st, session: s }))}
          onProfile={setProfile}
          onComplete={() => {
            setState((st) => ({ ...st, screen: "complete" }));
            announce("All steps complete.");
          }}
          onAnnounce={announce}
        />
      ) : (
        <CompleteScreen
          guide={guide}
          profile={profile}
          onNewBuild={newBuild}
          onReview={() => {
            const s = profileStore.saveViewedStep(session.id, guide.steps[guide.steps.length - 1].id);
            setState({ screen: "assembly", guide, session: s });
          }}
        />
      )}

      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  );
}
