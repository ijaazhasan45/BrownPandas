import { useCallback, useEffect, useRef, useState } from "react";

/** Keeps the screen on while assembling (hands are busy). Silently does nothing where unsupported. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const l = await (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        /* denied or unsupported */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}

/** Read text aloud with the device's speech engine. `supported` is false where it isn't available. */
export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  const [speaking, setSpeaking] = useState(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    current.current = null;
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.onend = u.onerror = () => {
        if (current.current === u) {
          current.current = null;
          setSpeaking(false);
        }
      };
      current.current = u;
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  useEffect(() => stop, [stop]);
  return { supported, speaking, speak, stop };
}

/** A short tap of vibration where the device supports it. */
export function tapFeedback() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}
