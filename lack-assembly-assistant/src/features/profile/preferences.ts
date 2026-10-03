import { useSyncExternalStore } from "react";
import type { StorageLike } from "./profileStore";
export interface BuilderPreferences {
  version: 1;
  speed: 0.5 | 1 | 1.5;
  detail: "adaptive" | "always";
  scene: "room" | "focus";
  textSize: 100 | 115 | 130;
  autoplay: boolean;
}
export const PREFERENCES_KEY = "buildwise:preferences:v1";
export const DEFAULT_PREFERENCES: BuilderPreferences = {version:1, speed:0.5, detail:"adaptive", scene:"room", textSize:100, autoplay:true};
export class PreferencesStore {
  private value: BuilderPreferences;
  private listeners = new Set<() => void>();
  persistent: boolean;
  constructor(private storage: StorageLike | null) {
    this.persistent = !!storage;
    this.value = {...DEFAULT_PREFERENCES};
    try {
      const raw = storage?.getItem(PREFERENCES_KEY);
      const p = raw ? JSON.parse(raw) : null;
      if (p?.version === 1) {
        if ([0.5,1,1.5].includes(p.speed)) this.value.speed=p.speed;
        if (["adaptive","always"].includes(p.detail)) this.value.detail=p.detail;
        if (["room","focus"].includes(p.scene)) this.value.scene=p.scene;
        if ([100,115,130].includes(p.textSize)) this.value.textSize=p.textSize;
        if (typeof p.autoplay === "boolean") this.value.autoplay=p.autoplay;
      }
    } catch { /* Retain defaults when saved JSON is damaged. */ }
  }
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => {this.listeners.delete(listener);}; };
  update(patch: Partial<Omit<BuilderPreferences,"version">>) {
    const next={...this.value,...patch};
    if (![0.5,1,1.5].includes(next.speed) || !["adaptive","always"].includes(next.detail) || !["room","focus"].includes(next.scene) || ![100,115,130].includes(next.textSize) || typeof next.autoplay!=="boolean") throw new Error("Invalid builder preference");
    this.value=next;
    try {this.storage?.setItem(PREFERENCES_KEY,JSON.stringify(next));} catch {this.persistent=false;}
    this.listeners.forEach(l=>l());
  }
  reset() {this.update(DEFAULT_PREFERENCES);}
}
let storage: StorageLike | null=null;
try {storage=window.localStorage;} catch {/* In-memory preferences remain usable. */}
export const preferencesStore = new PreferencesStore(storage);
export const useBuilderPreferences = () => useSyncExternalStore(preferencesStore.subscribe,preferencesStore.getSnapshot,preferencesStore.getSnapshot);
