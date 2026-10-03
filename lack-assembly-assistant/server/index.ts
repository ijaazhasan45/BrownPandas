import express from "express";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { loadGuides, loadRegistry } from "./instructions/catalog";
import { createAnthropicRefiner } from "./instructions/aiRefiner";

// Minimal .env loader so no extra dependency is needed.
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const model = process.env.HELP_MODEL?.trim() || "claude-haiku-4-5-20251001";
const registry = loadRegistry();
const app = createApp({
  guides: loadGuides(),
  registry,
  refiner: apiKey ? createAnthropicRefiner(apiKey, model) : null,
  corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
});

if (process.env.NODE_ENV === "production") {
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(`${dist}index.html`));
}

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
  console.log(`[server] AI help: ${apiKey ? `on (${model})` : "off, using prepared help"}`);
  if (Object.keys(registry).length === 0) {
    console.log("[server] No manual PDF registered yet. Run: npm run register-manual -- <path to LACK pdf>");
  }
});
