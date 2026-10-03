import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildCatalog, type ManualRegistry } from "../../src/shared/manuals";
import { hasAnimation } from "../../src/features/viewer/animationRegistry";
import type { AssemblyGuide } from "../../src/shared/contracts";

const dataDir = fileURLToPath(new URL("../../src/data/", import.meta.url));

export function loadGuides(): Record<string, AssemblyGuide> {
  const raw = JSON.parse(readFileSync(`${dataDir}lack-guide.v1.json`, "utf8"));
  return buildCatalog([raw], hasAnimation);
}

export function loadRegistry(): ManualRegistry {
  return JSON.parse(readFileSync(`${dataDir}registered-manuals.json`, "utf8")) as ManualRegistry;
}

export const REGISTRY_PATH = `${dataDir}registered-manuals.json`;
