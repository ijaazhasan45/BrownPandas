import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HardwareSpec } from "../../shared/contracts";
import { profileStore } from "../profile/profileStore";
import { HardwareDrawing, ScaleRuler } from "./HardwareDrawing";
import {
  ID1_CARD_MM,
  NOMINAL_PX_PER_MM,
  PX_PER_MM_RANGE,
  chooseOrientation,
  clampPxPerMm,
  drawingSizeMm,
  type ScreenInfo,
} from "./scaleMath";

function readScreen(): ScreenInfo {
  return {
    width: Math.round(window.screen?.width ?? window.innerWidth),
    height: Math.round(window.screen?.height ?? window.innerHeight),
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
  };
}

function isPinchZoomed(): boolean {
  return (window.visualViewport?.scale ?? 1) > 1.01;
}

function formatSize(hw: HardwareSpec): string {
  const s = hw.sizeMm;
  const approx = hw.sizeVerified ? "" : "about ";
  const parts: string[] = [];
  if (s.length) parts.push(`${approx}${s.length} mm long`);
  if (s.diameter) parts.push(`${hw.shape === "washer" || hw.shape === "nut" ? "outside " : ""}${approx}${s.diameter} mm across`);
  if (s.innerDiameter) parts.push(`hole ${approx}${s.innerDiameter} mm`);
  if (s.thickness) parts.push(`${approx}${s.thickness} mm thick`);
  return parts.join(", ");
}

function Calibrate({
  initial,
  onDone,
  onSkip,
}: {
  initial: number;
  onDone: (pxPerMm: number) => void;
  onSkip: () => void;
}) {
  const [ppm, setPpm] = useState(initial);
  const nudge = (factor: number) => setPpm((v) => clampPxPerMm(v * factor));
  return (
    <div className="cal">
      <p>
        Hold a bank card or ID card flat against the screen, <strong>short side across</strong>, with its left edge on
        the box's left edge. Adjust until the box is exactly as wide as the card.
      </p>
      <div className="cal-stage">
        <div
          className="cal-card"
          style={{ width: ID1_CARD_MM.height * ppm, height: ID1_CARD_MM.width * ppm }}
          aria-hidden="true"
        >
          <span>Card width</span>
        </div>
      </div>
      <div className="cal-controls">
        <button type="button" className="btn btn-small" onClick={() => nudge(1 / 1.01)} aria-label="Make the box narrower">
          Narrower
        </button>
        <label className="cal-slider" htmlFor="cal-ppm">
          <span className="sr-only">Box width</span>
          <input
            id="cal-ppm"
            type="range"
            min={PX_PER_MM_RANGE.min}
            max={PX_PER_MM_RANGE.max}
            step={0.01}
            value={ppm}
            onChange={(e) => setPpm(Number(e.target.value))}
          />
        </label>
        <button type="button" className="btn btn-small" onClick={() => nudge(1.01)} aria-label="Make the box wider">
          Wider
        </button>
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => onDone(ppm)}>
          It matches my card
        </button>
        <button type="button" className="btn" onClick={onSkip}>
          Skip for now
        </button>
      </div>
      <p className="fine">
        Bank and ID cards share one standard size (85.60 × 53.98 mm), so any of them works. The setting is saved for this
        screen only.
      </p>
    </div>
  );
}

export function ActualSizeSheet({ hardware, onClose }: { hardware: HardwareSpec[]; onClose: () => void }) {
  const [screen] = useState(readScreen);
  const [calibration, setCalibration] = useState(() => profileStore.loadScaleCalibration(screen));
  const [mode, setMode] = useState<"view" | "calibrate">(calibration ? "view" : "calibrate");
  const [skipped, setSkipped] = useState(false);
  const [availablePx, setAvailablePx] = useState(320);
  const [zoomed, setZoomed] = useState(isPinchZoomed);
  const body = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const ppm = calibration?.pxPerMm ?? NOMINAL_PX_PER_MM;
  const trueScale = !!calibration;

  useLayoutEffect(() => {
    const measure = () => setAvailablePx((body.current?.clientWidth ?? 320) - 8);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && body.current) ro.observe(body.current);
    return () => ro?.disconnect();
  }, [mode]);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onZoom = () => setZoomed(isPinchZoomed());
    window.addEventListener("keydown", onKey);
    window.visualViewport?.addEventListener("resize", onZoom);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.visualViewport?.removeEventListener("resize", onZoom);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const rulerMm = Math.max(20, Math.min(150, Math.floor((availablePx - 24) / ppm)));

  return (
    <div className="actual" role="dialog" aria-modal="true" aria-labelledby="actual-title">
      <div className="actual-head">
        <h2 id="actual-title">{mode === "calibrate" ? "Set up actual size" : "Actual size"}</h2>
        <button ref={closeBtn} type="button" className="btn btn-small" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="actual-body" ref={body}>
        {zoomed ? (
          <p className="actual-warn" role="alert">
            The page is zoomed in. Pinch to zoom all the way out so sizes are accurate.
          </p>
        ) : null}

        {mode === "calibrate" ? (
          <Calibrate
            initial={calibration?.pxPerMm ?? NOMINAL_PX_PER_MM}
            onDone={(value) => {
              setCalibration(profileStore.saveScaleCalibration(value, screen));
              setSkipped(false);
              setMode("view");
            }}
            onSkip={() => {
              setSkipped(true);
              setMode("view");
            }}
          />
        ) : (
          <>
            {!trueScale ? (
              <p className="actual-warn">
                {skipped ? "Not set up yet, so" : "This screen isn't set up, so"} drawings are only roughly life-size.{" "}
                <button type="button" className="link-btn" onClick={() => setMode("calibrate")}>
                  Set up actual size
                </button>
              </p>
            ) : null}
            <p className="lede-sm">Lay your part on its outline. A matching part covers the outline exactly.</p>
            {hardware.map((hw) => {
              const size = drawingSizeMm(hw);
              const vertical = chooseOrientation(size, ppm, availablePx) === "vertical";
              return (
                <section key={hw.code} className="actual-item" aria-label={`${hw.name}, part ${hw.code}`}>
                  <header>
                    <h3>
                      {hw.name} <span className="mono">{hw.code}</span>
                    </h3>
                    <p className="small">
                      {hw.quantity} in the box · {formatSize(hw)}
                    </p>
                  </header>
                  <div className={`actual-drawing${vertical ? " is-vertical" : ""}`}>
                    <HardwareDrawing hw={hw} pxPerMm={ppm} vertical={vertical} title={`${hw.name} outline, ${formatSize(hw)}`} />
                  </div>
                  {!hw.sizeVerified ? (
                    <p className="unverified">
                      {hw.sizeNote ?? "This size is an estimate."} Measure yours with the ruler below if it doesn't match.
                    </p>
                  ) : null}
                </section>
              );
            })}
            <div className="actual-ruler">
              <p className="small">{trueScale ? "Ruler at actual size" : "Ruler (approximate until set up)"}</p>
              <ScaleRuler pxPerMm={ppm} lengthMm={rulerMm} />
            </div>
            {trueScale ? (
              <button type="button" className="link-btn" onClick={() => setMode("calibrate")}>
                Adjust the screen setup
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
