// Lightweight registry: safe to import from the server, the instruction
// service, and tests (no WebGL or React).
import { SM_ANIMATION_IDS } from "../smastad/timeline";
import { CLIPS } from "./sceneStates";

export const ANIMATION_IDS: readonly string[] = Object.freeze([...Object.keys(CLIPS), ...SM_ANIMATION_IDS.flatMap(id=>[id,id+"-inspect",id+"-detail"])]);

export function hasAnimation(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLIPS, id) || SM_ANIMATION_IDS.some(a=>id===a||id===a+"-inspect"||id===a+"-detail");
}
