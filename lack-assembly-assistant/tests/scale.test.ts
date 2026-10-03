import { describe, expect, it } from "vitest";
import rawGuide from "../src/data/lack-guide.v1.json";
import { parseGuide } from "../src/shared/schemas";
import { validateGuide } from "../src/shared/guideValidation";
import { hasAnimation } from "../src/features/viewer/animationRegistry";
import {
  ID1_CARD_MM,
  calibrationMatches,
  chooseOrientation,
  drawingSizeMm,
  makeCalibration,
  mmToPx,
  pxPerMmFromCardWidth,
} from "../src/features/scale/scaleMath";
import { calloutItems, hardwareForParts } from "../src/features/assembly-ui/PartsCallout";
import { ProfileStore, type StorageLike } from "../src/features/profile/profileStore";
import type { HardwareSpec } from "../src/shared/contracts";

const guide = parseGuide(rawGuide);
const step = (id: string) => guide.steps.find((s) => s.id === id)!;
const phone = { width: 390, height: 844, dpr: 3 };

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

describe("scale math", () => {
  it("derives px per mm from a matched card", () => {
    const ppm = pxPerMmFromCardWidth(ID1_CARD_MM.width * 6.3);
    expect(ppm).toBeCloseTo(6.3, 5);
    expect(mmToPx(60, ppm)).toBeCloseTo(378, 3);
  });

  it("clamps impossible calibrations", () => {
    expect(pxPerMmFromCardWidth(1)).toBe(2);
    expect(pxPerMmFromCardWidth(100000)).toBe(12);
  });

  it("keeps a calibration across rotation but not across screens or zoom", () => {
    const cal = makeCalibration(6.3, phone, new Date(0));
    expect(calibrationMatches(cal, { width: 844, height: 390, dpr: 3 })).toBe(true);
    expect(calibrationMatches(cal, { width: 430, height: 932, dpr: 3 })).toBe(false);
    expect(calibrationMatches(cal, { width: 390, height: 844, dpr: 2 })).toBe(false);
  });

  it("turns a drawing upright when it is wider than the screen", () => {
    expect(chooseOrientation({ width: 60, height: 6 }, 6.3, 360)).toBe("vertical");
    expect(chooseOrientation({ width: 60, height: 6 }, 3.78, 360)).toBe("horizontal");
  });

  it("sizes washer and nut drawings with both views", () => {
    const washer: HardwareSpec = {
      code: "x", name: "Washer", shape: "washer", quantity: 1, partIds: [],
      sizeMm: { diameter: 16, innerDiameter: 6.4, thickness: 1.5 }, sizeVerified: true,
    };
    expect(drawingSizeMm(washer)).toEqual({ width: 16 + 6 + 1.5, height: 16 });
  });
});

describe("hardware catalog", () => {
  it("is valid and covers all four fasteners", () => {
    expect(validateGuide(guide, hasAnimation)).toEqual([]);
    const hw = guide.hardware!;
    expect(hw).toHaveLength(1);
    expect(hw[0].code).toBe("115980");
    expect(hw[0].partIds).toEqual(["fastener-1", "fastener-2", "fastener-3", "fastener-4"]);
  });

  it("is honest that the size is an estimate until measured", () => {
    expect(guide.hardware![0].sizeVerified).toBe(false);
    expect(guide.hardware![0].sizeNote).toBeTruthy();
  });

  it("flags hardware missing the dimensions its shape needs", () => {
    const broken = structuredClone(guide);
    broken.hardware![0].sizeMm = { length: 60 };
    expect(validateGuide(broken, hasAnimation).join(" ")).toContain("needs diameter");
  });

  it("builds LEGO-style callouts per step", () => {
    expect(calloutItems(guide, step("prepare")).map((i) => `${i.count}x ${i.key}`)).toEqual(["1x tabletop", "4x legs", "4x 115980"]);
    expect(calloutItems(guide, step("fastener-2")).map((i) => `${i.count}x ${i.key}`)).toEqual(["1x 115980"]);
    expect(calloutItems(guide, step("leg-3")).map((i) => `${i.count}x ${i.key}`)).toEqual(["1x legs"]);
    expect(calloutItems(guide, step("upright"))).toEqual([]);
    expect(hardwareForParts(guide, step("leg-1").partsUsed!)).toEqual([]);
  });
});

describe("calibration storage", () => {
  it("saves per screen and survives reload", () => {
    const storage = new MemoryStorage();
    new ProfileStore({ storage }).saveScaleCalibration(6.25, phone);
    const again = new ProfileStore({ storage });
    expect(again.loadScaleCalibration(phone)?.pxPerMm).toBe(6.25);
    expect(again.loadScaleCalibration({ width: 1440, height: 900, dpr: 2 })).toBeNull();
    again.clearScaleCalibration();
    expect(new ProfileStore({ storage }).loadScaleCalibration(phone)).toBeNull();
  });

  it("ignores corrupt values", () => {
    const storage = new MemoryStorage();
    storage.setItem("assembly-assistant:scale:v1", JSON.stringify({ pxPerMm: 999 }));
    expect(new ProfileStore({ storage }).loadScaleCalibration(phone)).toBeNull();
  });
});
