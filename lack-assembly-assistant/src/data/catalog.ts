// Client-side catalog: the reviewed guide bundled with the app, plus the
// registry of exact PDF hashes that map to it (used by the static build).
import { SM_GUIDE } from "../features/smastad/guide";
import rawGuide from "./lack-guide.v1.json";
import registry from "./registered-manuals.json";
import { buildCatalog, type ManualRegistry } from "../shared/manuals";
import { hasAnimation } from "../features/viewer/animationRegistry";

export const GUIDES = buildCatalog([rawGuide,SM_GUIDE], hasAnimation);
export const SAMPLE_GUIDE_ID = "lack-aa2606170-v1";
export const MANUAL_REGISTRY = registry as ManualRegistry;
