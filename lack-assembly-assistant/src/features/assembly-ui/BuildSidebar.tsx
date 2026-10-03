import type { AssemblyGuide, BuildSession } from "../../shared/contracts";
import { accessibleStepIds } from "../profile/profileStore";
import { CheckIcon, LockIcon } from "./icons";
import { BuildIcon } from "./BuildIcon";
const labels = ["Prepare your parts", "Screw 1", "Leg 1", "Screw 2", "Leg 2", "Screw 3", "Leg 3", "Screw 4", "Leg 4", "Turn upright", "Final check"];
export function BuildSidebar({guide, session, onSelect, onNewBuild}: {guide: AssemblyGuide; session: BuildSession | null; onSelect: (id: string) => void; onNewBuild: () => void}) {
 const done = session?.completedStepIds.length ?? 0;
 const percent = Math.round(done / guide.steps.length * 100);
 const accessible = session ? accessibleStepIds(guide, session) : new Set<string>();
 return <aside className="build-sidebar" aria-label="Your build">
   <div className="sidebar-product"><p className="eyebrow">Your build</p><h2>{guide.productName.split(" · ")[0]}</h2><p>{guide.id.startsWith("smastad-")?"IKEA · White · first desk layout":"IKEA · White · 55 × 55 cm"}</p></div>
   <div className="sidebar-progress"><div><span>{done} of {guide.steps.length} steps</span><strong>{percent}%</strong></div><progress value={done} max={guide.steps.length} aria-label="Assembly progress" /></div>
   <nav aria-label="Assembly steps"><ol className="sidebar-steps">{guide.steps.map((step, i) => {
    const current = session ? step.id === session.viewedStepId : i === 0;
    const complete = session?.completedStepIds.includes(step.id);
    return <li key={step.id}><button className={`sidebar-step${current ? " active" : ""}`} disabled={!accessible.has(step.id)} aria-current={current ? "step" : undefined} onClick={() => onSelect(step.id)}><span className="sidebar-number">{complete ? <CheckIcon width={16} height={16}/> : current ? String(i+1).padStart(2,"0") : <LockIcon/>}</span><span>{guide.id.startsWith("smastad-")?step.title:labels[i] ?? step.title}</span>{current && <span className="current-dot">•</span>}</button></li>;
   })}</ol></nav>
   <div className="sidebar-footer"><a href={guide.manualUrl} target="_blank" rel="noreferrer"><BuildIcon name="book"/>Original IKEA manual</a><button disabled={!session} onClick={onNewBuild}><BuildIcon name="reset"/>Start a new build</button><p>Manual {guide.manualDocumentId}</p></div>
 </aside>;
}
