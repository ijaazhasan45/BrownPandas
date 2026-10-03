// Registers the exact LACK PDF by its SHA-256 hash.
// Usage: npm run register-manual -- path/to/lack-side-table-white__AA-2606170-1-100.pdf
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { looksLikePdf, type ManualRegistry } from "../src/shared/manuals";
import { REGISTRY_PATH } from "../server/instructions/catalog";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run register-manual -- <path to the LACK PDF>");
  process.exit(1);
}
const bytes = new Uint8Array(readFileSync(file));
if (!looksLikePdf(bytes)) {
  console.error("That file isn't a PDF.");
  process.exit(1);
}
const latin = Buffer.from(bytes).toString("latin1");
if (!latin.includes("2606170")) {
  console.warn("Warning: couldn't find the text 2606170 in the raw file (it may be compressed).");
  console.warn("Open the PDF and confirm it is document AA-2606170-1 before committing the registry.");
}
const hash = createHash("sha256").update(bytes).digest("hex");
const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as ManualRegistry;
registry[hash] = { guideId: "lack-aa2606170-v1", documentId: "AA-2606170-1", registeredAt: new Date().toISOString() };
writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");
console.log(`Registered ${hash} -> lack-aa2606170-v1 (${bytes.byteLength} bytes).`);
console.log("Commit src/data/registered-manuals.json so everyone's build recognizes it.");
