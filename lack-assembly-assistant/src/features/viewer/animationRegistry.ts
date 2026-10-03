// Lightweight registry: safe to import from the server, the instruction
// service, and tests (no WebGL or React).
import { CLIPS } from "./sceneStates";

export const ANIMATION_IDS: readonly string[] = Object.freeze(Object.keys(CLIPS));

export function hasAnimation(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLIPS, id);
}
