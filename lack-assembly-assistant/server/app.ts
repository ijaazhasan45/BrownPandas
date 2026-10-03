import { createHash } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import type { ApiError, AssemblyGuide, HelpResponse } from "../src/shared/contracts";
import { MAX_UPLOAD_BYTES, recognize, type ManualRegistry } from "../src/shared/manuals";
import { buildPreparedHelp } from "../src/shared/preparedHelp";
import { helpRequestSchema } from "../src/shared/schemas";
import type { HelpRefiner } from "./instructions/aiRefiner";

export interface AppDeps {
  guides: Record<string, AssemblyGuide>;
  registry: ManualRegistry;
  refiner: HelpRefiner | null;
  aiTimeoutMs?: number;
  /** Extra origins allowed to call the API, e.g. the Capacitor app shell. */
  corsOrigins?: string[];
}

const DEFAULT_APP_ORIGINS = ["capacitor://localhost", "http://localhost", "https://localhost"];

function sendError(res: Response, status: number, error: ApiError) {
  res.status(status).json({ error });
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  const allowed = new Set([...DEFAULT_APP_ORIGINS, ...(deps.corsOrigins ?? [])]);
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(origin && allowed.has(origin) ? 204 : 403);
    next();
  });
  app.use("/api", express.json({ limit: "16kb" }));

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ai: deps.refiner !== null, registeredManuals: Object.keys(deps.registry).length });
  });

  app.post("/api/manuals/recognize", (req, res) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return sendError(res, 413, { code: "INVALID_PDF", message: "That file is larger than 10 MB. The LACK instructions are much smaller." });
      }
      if (err) return sendError(res, 400, { code: "PROCESSING_FAILED", message: "The upload couldn't be read. Try choosing the file again." });
      const file = req.file;
      if (!file) return sendError(res, 400, { code: "INVALID_PDF", message: "No file arrived. Choose a PDF to upload." });

      const bytes = new Uint8Array(file.buffer);
      const hash = createHash("sha256").update(bytes).digest("hex");
      const result = recognize(bytes, hash, deps.registry, deps.guides);
      if (!result.ok) return sendError(res, 422, { code: result.code, message: result.message });
      res.json({ guide: result.guide });
    });
  });

  app.post("/api/help", async (req, res) => {
    const parsed = helpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, { code: "INVALID_HELP_REQUEST", message: "The help request was incomplete." });
    }
    const request = parsed.data as import("../src/shared/contracts").HelpRequest;
    const guide = deps.guides[request.guideId];
    const step = guide?.steps.find((s) => s.id === request.stepId);
    if (!guide || !step) {
      return sendError(res, 400, { code: "INVALID_HELP_REQUEST", message: "That step isn't part of a supported guide." });
    }

    const prepared = buildPreparedHelp(guide, request);
    let help: HelpResponse = prepared;

    if (deps.refiner) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), deps.aiTimeoutMs ?? 8000);
      const onClose = () => controller.abort();
      res.on("close", onClose);
      try {
        help = await deps.refiner.refine(guide, step, request, prepared, controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) console.warn("[help] AI refinement rejected; using prepared help:", (error as Error).message);
        help = prepared;
      } finally {
        clearTimeout(timer);
        res.off("close", onClose);
      }
    }
    if (!res.headersSent && !res.writableEnded) res.json({ help });
  });

  app.use("/api", (_req, res) => sendError(res, 404, { code: "PROCESSING_FAILED", message: "Unknown API route." }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if ((err as { type?: string }).type === "entity.parse.failed") {
      return sendError(res, 400, { code: "INVALID_HELP_REQUEST", message: "The request body wasn't valid JSON." });
    }
    console.error(err);
    sendError(res, 500, { code: "PROCESSING_FAILED", message: "Something went wrong on the server." });
  });

  return app;
}
