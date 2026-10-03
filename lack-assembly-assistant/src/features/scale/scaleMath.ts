/**
 * Pure math for drawing parts at actual size. No DOM access here so it can be tested.
 *
 * CSS pixels are not a fixed physical size on phones, so true scale needs a
 * per-device calibration: the user matches an on-screen outline to a bank or ID
 * card, which is ISO/IEC 7810 ID-1 (85.60 mm x 53.98 mm) worldwide.
 */
import type { HardwareSpec } from "../../shared/contracts";

export const ID1_CARD_MM = { width: 85.6, height: 53.98 } as const;

/** The CSS reference pixel (1/96 inch). Close on desktop monitors, often wrong on phones. */
export const NOMINAL_PX_PER_MM = 96 / 25.4;

export const PX_PER_MM_RANGE = { min: 2, max: 12 } as const;

export interface ScaleCalibration {
  pxPerMm: number;
  /** Screen the calibration was made on; any change means it may be wrong. */
  screenShort: number;
  screenLong: number;
  dpr: number;
  savedAt: string;
}

export interface ScreenInfo {
  width: number;
  height: number;
  dpr: number;
}

export function clampPxPerMm(value: number): number {
  return Math.min(PX_PER_MM_RANGE.max, Math.max(PX_PER_MM_RANGE.min, value));
}

export function pxPerMmFromCardWidth(cardWidthPx: number): number {
  return clampPxPerMm(cardWidthPx / ID1_CARD_MM.width);
}

export const mmToPx = (mm: number, pxPerMm: number) => mm * pxPerMm;

export function makeCalibration(pxPerMm: number, screen: ScreenInfo, now: Date): ScaleCalibration {
  return {
    pxPerMm: clampPxPerMm(pxPerMm),
    screenShort: Math.min(screen.width, screen.height),
    screenLong: Math.max(screen.width, screen.height),
    dpr: screen.dpr,
    savedAt: now.toISOString(),
  };
}

/** Valid only on the same screen at the same zoom (rotation is fine). */
export function calibrationMatches(cal: ScaleCalibration, screen: ScreenInfo): boolean {
  return (
    cal.screenShort === Math.min(screen.width, screen.height) &&
    cal.screenLong === Math.max(screen.width, screen.height) &&
    Math.abs(cal.dpr - screen.dpr) < 0.01
  );
}

export function isCalibration(value: unknown): value is ScaleCalibration {
  const v = value as ScaleCalibration;
  return (
    !!v &&
    typeof v.pxPerMm === "number" &&
    v.pxPerMm >= PX_PER_MM_RANGE.min &&
    v.pxPerMm <= PX_PER_MM_RANGE.max &&
    typeof v.screenShort === "number" &&
    typeof v.screenLong === "number" &&
    typeof v.dpr === "number"
  );
}

/** Size of a part's drawing in millimeters, including the views it shows. */
export function drawingSizeMm(hw: HardwareSpec): { width: number; height: number } {
  const s = hw.sizeMm;
  switch (hw.shape) {
    case "double-ended-screw":
    case "dowel":
      return { width: s.length ?? 0, height: s.diameter ?? 0 };
    case "screw":
      return { width: s.length ?? 0, height: Math.max(s.headDiameter ?? 0, s.diameter ?? 0) };
    case "washer":
    case "nut": {
      // Top view plus a side view, with a 6 mm gap between them.
      const d = s.diameter ?? 0;
      return { width: d + 6 + (s.thickness ?? 0), height: d };
    }
  }
}

/** Whether to draw the long axis vertically so it fits the available width. */
export function chooseOrientation(sizeMm: { width: number; height: number }, pxPerMm: number, availableWidthPx: number) {
  return mmToPx(sizeMm.width, pxPerMm) <= availableWidthPx ? "horizontal" : "vertical";
}
