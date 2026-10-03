import { lazy, Suspense, useRef, useState } from "react";
import type { AssemblyGuide } from "../../shared/contracts";
import { ServiceError, loadManual, loadSampleGuide } from "../instructions/instructionService";

import { SM_GUIDE } from "../smastad/guide";
import { BuildIcon } from "./BuildIcon";
import { CheckIcon } from "./icons";
const AssemblyViewer = lazy(() => import("../viewer/AssemblyViewer").then(m => ({ default: m.AssemblyViewer })));
const MANUAL_URL = "https://www.ikea.com/us/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf";

export function StartScreen({ onGuide,onPreview }: { onPreview?: (guide:AssemblyGuide)=>void; onGuide: (guide: AssemblyGuide, source: "upload" | "sample") => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [selected,setSelected]=useState<"lack"|"smastad">("lack");
  const guide = selected==="lack"?loadSampleGuide():SM_GUIDE;
  const isSmastad=selected==="smastad";
  const finalStep = guide.steps[guide.steps.length - 1];

  async function handle(file: File | undefined) {
    if (!file) return;
    setStatus("reading");
    setMessage(`Checking ${file.name}…`);
    try {
      const guide = await loadManual(file);
      onGuide(guide, "upload");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof ServiceError ? e.error.message : "That file couldn't be read. Try again or use the sample guide.");
    }
  }

  return (
    <main className="welcome" id="main">
      <div className="welcome-heading"><div><p className="eyebrow">Your assembly companion</p><h1>Let’s build something.</h1><p>Choose a product. Watch every action in 3D.</p></div><button className="btn upload-button" onClick={() => input.current?.click()} disabled={status === "reading"}><BuildIcon name="upload" />{status === "reading" ? "Checking manual…" : "Upload manual"}</button></div>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Upload a supported IKEA manual" onChange={e => {void handle(e.target.files?.[0]); e.target.value="";}} />
      {message && <p className={`status ${status === "error" ? "status-error" : ""}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
      <div className="two-product-catalogue" aria-label="Product catalogue"><button className={selected==="lack"?"selected":""} onClick={()=>{setSelected("lack");onPreview?.(loadSampleGuide());}}><strong>LACK</strong><span>Side table · 11 animated steps</span></button><button className={isSmastad?"selected":""} onClick={()=>{setSelected("smastad");onPreview?.(SM_GUIDE);}}><strong>SMÅSTAD</strong><span>Desk + storage · 17 animated steps</span></button></div>
      <div className="welcome-grid">
        <section className="product-preview" aria-label="Interactive preview of the finished table">
          <header><strong><BuildIcon name="box"/>{isSmastad?"SMÅSTAD desk + storage":"LACK side table"}</strong><span>Live 3D room</span></header>
          <div className="welcome-stage"><p className="preview-caption">{isSmastad?"• Your completed desk layout · existing frame shown for context":"• Your finished table · room simulation"}</p><Suspense fallback={<div className="viewer-fallback">Loading your table…</div>}><AssemblyViewer guideId={guide.id} stepId={finalStep.id} animationId={finalStep.animationId} highlightedPartIds={[]} replayToken={0}/></Suspense></div>
          <footer><span><BuildIcon name="hand"/>Built at your pace</span><span>{isSmastad?"17 manual actions · individual animations":"9 pieces · 11 guided steps"}</span></footer>
        </section>
        <section className="welcome-card"><p className="eyebrow">A good place to start</p><h2>{isSmastad?"Your desk starts here.":"Your table starts here."}</h2><p className="welcome-description">Follow each connection in 3D. If something feels tricky, we’ll break it into smaller steps.</p>
          <ul className="welcome-benefits"><li><span><BuildIcon name="box"/></span><div><strong>{isSmastad?"Panels + coded hardware":"9 pieces"}</strong><p>{isSmastad?"Connectors, cams, dowels and covers":"1 top, 4 legs, 4 screws"}</p></div></li><li><span><BuildIcon name="hand"/></span><div><strong>{isSmastad?"Watch the tool in 3D":"Hand assembly"}</strong><p>{isSmastad?"Screwdriver, hammer and supplied hex key":"Follow the turning motion"}</p></div></li><li><span><BuildIcon name="brain"/></span><div><strong>Help that remembers</strong><p>Your struggles and preferences, saved</p></div></li></ul>
          <button className="btn btn-primary start-build" onClick={() => onGuide(guide, "sample")}><CheckIcon/>Use {isSmastad?"SMÅSTAD":"LACK"} guide</button><p className="welcome-note">{isSmastad?"First desk layout from manual AA-2200883-3, pages 5–15. The loft-bed frame must already be assembled.":"Reviewed guide for manual AA-2606170-1."} <a href={isSmastad?"/manuals/loft/manual.pdf":MANUAL_URL} target="_blank" rel="noreferrer">View source manual</a>.</p>
        </section>
      </div>
    </main>
  );
}
