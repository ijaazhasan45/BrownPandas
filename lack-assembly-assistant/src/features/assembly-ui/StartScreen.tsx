import { useRef, useState } from "react";
import type { AssemblyGuide } from "../../shared/contracts";
import { SERVICE_MODE, ServiceError, loadManual, loadSampleGuide } from "../instructions/instructionService";

const MANUAL_URL = "https://www.ikea.com/us/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf";

export function StartScreen({ onGuide }: { onGuide: (guide: AssemblyGuide, source: "upload" | "sample") => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

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
    <main className="start" id="main">
      <section className="start-intro">
        <p className="eyebrow">Flat-pack assembly assistant</p>
        <h1>Build your LACK side table one small step at a time</h1>
        <p className="lede">
          Upload the IKEA instructions and follow a 3D walkthrough you can turn, zoom, and replay. When a step is tricky,
          tap <strong>I need help</strong>. The app remembers what you found hard and adds extra detail the next time that
          action comes up.
        </p>
        <dl className="spec">
          <div>
            <dt>Supports</dt>
            <dd>LACK side table, white, 21⅝ × 21⅝″</dd>
          </div>
          <div>
            <dt>Article</dt>
            <dd className="mono">304.499.08</dd>
          </div>
          <div>
            <dt>Manual</dt>
            <dd className="mono">AA-2606170-1</dd>
          </div>
        </dl>
      </section>

      <section className="start-actions" aria-labelledby="upload-heading">
        <h2 id="upload-heading">Start with your manual</h2>
        <div
          className={`dropzone${dragging ? " is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handle(e.dataTransfer.files?.[0]);
          }}
        >
          <p>Drop the instructions PDF here, or</p>
          <button type="button" className="btn btn-primary" onClick={() => input.current?.click()} disabled={status === "reading"}>
            Choose PDF
          </button>
          <input
            ref={input}
            id="manual-upload"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              void handle(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="small">
            Use the file exactly as downloaded from{" "}
            <a href={MANUAL_URL} target="_blank" rel="noreferrer">
              IKEA's LACK instructions page
            </a>
            . Up to 10 MB.
          </p>
        </div>
        <p className={`status ${status === "error" ? "status-error" : ""}`} role={status === "error" ? "alert" : "status"}>
          {message}
        </p>

        <div className="sample">
          <h3>No PDF handy?</h3>
          <p>Open the same reviewed LACK guide without uploading. Nothing is read from a file.</p>
          <button type="button" className="btn" onClick={() => onGuide(loadSampleGuide(), "sample")}>
            Use the sample guide
          </button>
        </div>
        <p className="fine">
          How recognition works: the app checks that your PDF is the exact supported file, then opens a guide our team
          prepared from its diagrams. It doesn't generate 3D models from arbitrary manuals.
          {SERVICE_MODE === "static" ? " This preview runs without a server, so help uses prepared content only." : ""}
        </p>
      </section>
    </main>
  );
}
