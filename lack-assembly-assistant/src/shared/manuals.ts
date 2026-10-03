import type { AssemblyGuide } from "./contracts";
import { validateGuide } from "./guideValidation";
import { parseGuide } from "./schemas";

export interface RegisteredManual {
  guideId: string;
  documentId: string;
  registeredAt: string;
}

export type ManualRegistry = Record<string, RegisteredManual>; // key: lowercase sha256 hex

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** True when the bytes carry a PDF header near the start of the file. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  let head = "";
  const end = Math.min(bytes.byteLength, 1024);
  for (let i = 0; i < end; i++) head += String.fromCharCode(bytes[i]);
  return head.includes("%PDF-");
}

export type Recognition =
  | { ok: true; guide: AssemblyGuide }
  | { ok: false; code: "INVALID_PDF" | "UNSUPPORTED_MANUAL"; message: string };

export function recognize(
  bytes: Uint8Array,
  sha256Hex: string,
  registry: ManualRegistry,
  guides: Record<string, AssemblyGuide>,
): Recognition {
  if (bytes.byteLength === 0 || !looksLikePdf(bytes)) {
    return { ok: false, code: "INVALID_PDF", message: "That file isn't a readable PDF. Choose the PDF you downloaded from IKEA." };
  }
  const entry = registry[sha256Hex.toLowerCase()];
  const guide = entry ? guides[entry.guideId] : undefined;
  if (!guide) {
    return {
      ok: false,
      code: "UNSUPPORTED_MANUAL",
      message:
        "This PDF isn't one we support yet. Upload the LACK side table instructions (document AA-2606170-1) exactly as downloaded from IKEA, or use the sample guide.",
    };
  }
  return { ok: true, guide };
}

/** Parses and checks raw guide JSON. Throws if the catalog is invalid, so problems surface at startup. */
export function buildCatalog(raw: unknown[], hasAnimation: (id: string) => boolean): Record<string, AssemblyGuide> {
  const out: Record<string, AssemblyGuide> = {};
  for (const item of raw) {
    const guide = parseGuide(item);
    const problems = validateGuide(guide, hasAnimation);
    if (problems.length) throw new Error(`Guide ${guide.id} is invalid:\n- ${problems.join("\n- ")}`);
    out[guide.id] = guide;
  }
  return out;
}
