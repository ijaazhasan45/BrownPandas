/**
 * Instruction service adapter (Block 3, frontend side).
 * - "server" mode: talks to /api; help falls back to prepared content if the server is unreachable.
 * - "static" mode (npm run build:static): no server; hashes the PDF in the browser
 *   and serves prepared help only. Nothing here ever calls an AI provider directly.
 */
import type { ApiError, AssemblyGuide, HelpRequest, HelpResponse } from "../../shared/contracts";
import { recognize } from "../../shared/manuals";
import { buildPreparedHelp } from "../../shared/preparedHelp";
import { parseGuide, parseHelpResponse } from "../../shared/schemas";
import { GUIDES, MANUAL_REGISTRY, SAMPLE_GUIDE_ID } from "../../data/catalog";

/** Server origin for app builds (e.g. https://assist.example.com). Empty means same origin. */
const API_BASE = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
/** Offline builds (static preview, mobile app) recognize the PDF on the device. */
const LOCAL_RECOGNITION = __STATIC_DEMO__;
export const SERVICE_MODE: "server" | "static" = __STATIC_DEMO__ && !API_BASE ? "static" : "server";

export class ServiceError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.message);
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function readError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error?.code && body?.error?.message) return body.error as ApiError;
  } catch {
    /* fall through */
  }
  return { code: "PROCESSING_FAILED", message: `The server answered with an error (${res.status}).` };
}

export async function loadManual(file: File, signal?: AbortSignal): Promise<AssemblyGuide> {
  if (file.size > 10 * 1024 * 1024) {
    throw new ServiceError({ code: "INVALID_PDF", message: "That file is larger than 10 MB. The LACK instructions are much smaller." });
  }
  if (LOCAL_RECOGNITION) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = recognize(bytes, await sha256Hex(bytes), MANUAL_REGISTRY, GUIDES);
    if (!result.ok) throw new ServiceError({ code: result.code, message: result.message });
    return result.guide;
  }
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/manuals/recognize`, { method: "POST", body, signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ServiceError({ code: "PROCESSING_FAILED", message: "Couldn't reach the app server. Check that it's running, or use the sample guide." });
  }
  if (!res.ok) throw new ServiceError(await readError(res));
  const data = await res.json();
  return parseGuide(data.guide);
}

/** The bundled reviewed guide, for the clearly labeled no-upload path. */
export function loadSampleGuide(): AssemblyGuide {
  return GUIDES[SAMPLE_GUIDE_ID];
}

export function guideById(id: string): AssemblyGuide | undefined {
  return GUIDES[id];
}

/** Instant, offline help from the reviewed catalog. */
export function getPreparedHelp(request: HelpRequest): HelpResponse {
  const guide = GUIDES[request.guideId];
  if (!guide) throw new ServiceError({ code: "INVALID_HELP_REQUEST", message: "Unknown guide." });
  return buildPreparedHelp(guide, request);
}

export async function getHelp(request: HelpRequest, signal?: AbortSignal): Promise<HelpResponse> {
  if (SERVICE_MODE === "static") return getPreparedHelp(request);
  try {
    const res = await fetch(`${API_BASE}/api/help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    if (!res.ok) throw new ServiceError(await readError(res));
    const data = await res.json();
    const help = parseHelpResponse(data.help);
    if (help.requestId !== request.requestId || help.stepId !== request.stepId) {
      throw new Error("Help response doesn't match the request");
    }
    return help;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return getPreparedHelp(request);
  }
}
