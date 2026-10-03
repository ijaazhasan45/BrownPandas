import { useCallback, useEffect, useState } from "react";
import type { AssemblyGuide, BuildSession, UserProfile } from "./shared/contracts";
import { StartScreen } from "./features/assembly-ui/StartScreen";
import { AssemblyScreen, loadViewer } from "./features/assembly-ui/AssemblyScreen";
import { CompleteScreen } from "./features/assembly-ui/CompleteScreen";
import { MemoryPanel } from "./features/assembly-ui/MemoryPanel";
import { accessibleStepIds, isBuildComplete, profileStore } from "./features/profile/profileStore";
import { GUIDES } from "./data/catalog";
import { loadSampleGuide } from "./features/instructions/instructionService";

import { BuildSidebar } from "./features/assembly-ui/BuildSidebar";
import { BuildIcon } from "./features/assembly-ui/BuildIcon";

import { useBuilderPreferences } from "./features/profile/preferences";

type Screen = "start" | "assembly" | "complete";

function initialState(): { screen: Screen; guide: AssemblyGuide | null; session: BuildSession | null } {
  // Resume an active build after reload. The reviewed guide is bundled with the app.
  const savedId=(()=>{try{return localStorage.getItem("buildwise:active-guide");}catch{return null;}})();
  const guide = savedId&&GUIDES[savedId]?GUIDES[savedId]:loadSampleGuide();
  if (!profileStore.peekSession(guide)) return { screen: "start", guide: null, session: null };
  const session = profileStore.loadOrCreateSession(guide);
  return { screen: isBuildComplete(guide, session) ? "complete" : "assembly", guide, session };
}

export default function App() {
  const preferences = useBuilderPreferences();
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
      try {localStorage.setItem("buildwise:active-guide",g.id);}catch {/* Visit remains usable. */}
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

  // Fetch the 3D code in the background so opening a guide feels instant.
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const start = () => void loadViewer().catch(() => undefined);
    if (idle) idle(start);
    else setTimeout(start, 1500);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, session?.id]);

  useEffect(() => {
    document.title = screen === "start" ? "buildwise · LACK Assembly Guide" : `${guide?.productName.split(",")[0] ?? "LACK"} · Assembly Assistant`;
  }, [screen, guide]);

  const needCount = Object.keys(profile.learningNeeds).length;

  return (
    <div className="app" data-text-size={preferences.textSize}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><BuildIcon name="layers" /></span><span className="brand-name">buildwise<span>.</span></span></div>
        <button type="button" className="btn catalog-nav" onClick={() => setState({screen:"start",guide:null,session:null})}>Catalogue</button>
        <p className="brand-tagline">A little guidance. A lot of confidence.</p>
        <button type="button" className="learning-button" onClick={() => setMemoryOpen((o) => !o)} aria-expanded={memoryOpen}><BuildIcon name="brain" /> Your profile <span>{needCount}</span></button>
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

      <div className="build-layout">
      <BuildSidebar guide={guide ?? loadSampleGuide()} session={session} onNewBuild={newBuild} onSelect={(id) => {
        if (!guide || !session || !accessibleStepIds(guide, session).has(id)) return;
        setState({screen: "assembly", guide, session: profileStore.saveViewedStep(session.id, id)});
      }} />
      <div className="build-content">
      {screen === "start" || !guide || !session ? (
        <StartScreen onPreview={g=>setState(st=>({...st,guide:g}))} onGuide={(g) => begin(g)} />
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

      </div></div>
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  );
}
