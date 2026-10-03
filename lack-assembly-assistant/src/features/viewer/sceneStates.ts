/**
 * Pure scene data for the LACK viewer (Block 2). No three.js or React imports,
 * so the registry, server, and tests can use it.
 *
 * Coordinates: meters, Y up, X/Z in the tabletop plane. +Z faces the default camera.
 * Dimensions are approximate visual estimates, not measured specifications.
 *
 * Frozen corner map (viewed from above with the tabletop underside up):
 *   4 (back-left)   3 (back-right)
 *   1 (front-left)  2 (front-right)
 * Leg N and fastener N always belong to corner N.
 */
import type { PartId } from "../../shared/contracts";

export type Vec3 = [number, number, number];

export interface Pose {
  pos: Vec3;
  rot: Vec3; // Euler XYZ, radians
}

export interface Keyframe extends Pose {
  t: number; // normalized 0..1
}

export interface PartTrack {
  partId: PartId;
  keys: Keyframe[];
}

export interface Indicator {
  kind: "spin" | "guide-line";
  partId: PartId;
  from: number;
  to: number;
  /** guide-line only: point the part should meet. */
  target?: Vec3;
}

export interface Clip {
  id: string;
  duration: number; // seconds at normal speed
  baseline: Record<PartId, Pose>;
  tracks: PartTrack[];
  /** Whole-assembly transform (used to turn the table upright). */
  group: { pivot: Vec3; keys: Keyframe[] };
  indicators: Indicator[];
  /** Point the camera target may ease toward for focused help clips. */
  focus: Vec3 | null;
}

export interface SceneFrame {
  parts: Record<PartId, Pose>;
  group: Pose;
  groupPivot: Vec3;
  indicators: Indicator[];
}

export const DIM = {
  topSize: 0.55,
  topThickness: 0.05,
  legSize: 0.05,
  legLength: 0.4,
  fastenerRadius: 0.0045,
  fastenerLength: 0.07,
} as const;

const TOP_Y = DIM.topThickness; // underside surface height while upside down
const HALF_FASTENER = DIM.fastenerLength / 2;
const HALF_LEG = DIM.legLength / 2;
const INSET = DIM.topSize / 2 - DIM.legSize / 2;

export const CORNERS: Record<1 | 2 | 3 | 4, { x: number; z: number; name: string }> = {
  1: { x: -INSET, z: INSET, name: "front-left" },
  2: { x: INSET, z: INSET, name: "front-right" },
  3: { x: INSET, z: -INSET, name: "back-right" },
  4: { x: -INSET, z: -INSET, name: "back-left" },
};

export const PART_LABELS: Record<PartId, string> = {
  tabletop: "Tabletop",
  "leg-1": "Leg 1",
  "leg-2": "Leg 2",
  "leg-3": "Leg 3",
  "leg-4": "Leg 4",
  "fastener-1": "Fastener 1",
  "fastener-2": "Fastener 2",
  "fastener-3": "Fastener 3",
  "fastener-4": "Fastener 4",
};

type N = 1 | 2 | 3 | 4;
const NS: N[] = [1, 2, 3, 4];
const TURN = Math.PI * 2;

// --- Poses -------------------------------------------------------------

const TABLETOP_UNDERSIDE_UP: Pose = { pos: [0, DIM.topThickness / 2, 0], rot: [0, 0, 0] };
const TABLETOP_TOP_UP: Pose = { pos: [0, DIM.topThickness / 2, 0], rot: [Math.PI, 0, 0] };

const fastenerPose = {
  tray: (n: N): Pose => ({
    pos: [-0.12 + 0.08 * (n - 1), DIM.fastenerRadius, 0.45],
    rot: [0, 0, Math.PI / 2],
  }),
  hover: (n: N): Pose => ({ pos: [CORNERS[n].x, TOP_Y + HALF_FASTENER + 0.07, CORNERS[n].z], rot: [0, 0, 0] }),
  tip: (n: N): Pose => ({ pos: [CORNERS[n].x, TOP_Y + HALF_FASTENER, CORNERS[n].z], rot: [0, 0, 0] }),
  started: (n: N): Pose => ({ pos: [CORNERS[n].x, TOP_Y + HALF_FASTENER - 0.01, CORNERS[n].z], rot: [0, -TURN, 0] }),
  seated: (n: N): Pose => ({ pos: [CORNERS[n].x, TOP_Y, CORNERS[n].z], rot: [0, -3 * TURN, 0] }),
};

const FASTENER_TIP_Y = TOP_Y + HALF_FASTENER; // exposed end once seated

const legPose = {
  floor: (n: N): Pose => ({
    pos: [0, DIM.legSize / 2, -0.44 - 0.075 * (n - 1)],
    rot: [0, 0, Math.PI / 2],
  }),
  hover: (n: N): Pose => ({ pos: [CORNERS[n].x, FASTENER_TIP_Y + HALF_LEG + 0.1, CORNERS[n].z], rot: [0, 0, 0] }),
  resting: (n: N): Pose => ({ pos: [CORNERS[n].x, FASTENER_TIP_Y + HALF_LEG, CORNERS[n].z], rot: [0, 0, 0] }),
  started: (n: N): Pose => ({ pos: [CORNERS[n].x, FASTENER_TIP_Y + HALF_LEG - 0.01, CORNERS[n].z], rot: [0, -TURN, 0] }),
  seated: (n: N): Pose => ({ pos: [CORNERS[n].x, TOP_Y + HALF_LEG, CORNERS[n].z], rot: [0, -3 * TURN, 0] }),
};

const IDENTITY: Pose = { pos: [0, 0, 0], rot: [0, 0, 0] };
const GROUP_PIVOT: Vec3 = [0, (DIM.topThickness + DIM.legLength) / 2, 0];
const UPRIGHT: Pose = { pos: [0, 0, 0], rot: [Math.PI, 0, 0] };

/** Seated spin angles are whole turns, so installed parts can start at rot 0 without a visible jump. */
function normalizeInstalled(p: Pose): Pose {
  return { pos: p.pos, rot: [p.rot[0], 0, p.rot[2]] };
}

// --- Baselines ---------------------------------------------------------

interface BuildState {
  tabletopUp: boolean; // underside up
  fasteners: number; // how many installed, in corner order
  legs: number;
}

function baselineFor(state: BuildState): Record<PartId, Pose> {
  const parts = {} as Record<PartId, Pose>;
  parts.tabletop = state.tabletopUp ? TABLETOP_UNDERSIDE_UP : TABLETOP_TOP_UP;
  for (const n of NS) {
    parts[`fastener-${n}`] = n <= state.fasteners ? normalizeInstalled(fastenerPose.seated(n)) : fastenerPose.tray(n);
    parts[`leg-${n}`] = n <= state.legs ? normalizeInstalled(legPose.seated(n)) : legPose.floor(n);
  }
  return parts;
}

function key(t: number, p: Pose): Keyframe {
  return { t, pos: [...p.pos], rot: [...p.rot] };
}

function cornerFocus(n: N): Vec3 {
  return [CORNERS[n].x, FASTENER_TIP_Y, CORNERS[n].z];
}

const STATIC_GROUP = { pivot: GROUP_PIVOT, keys: [key(0, IDENTITY), key(1, IDENTITY)] };

// --- Clip builders -----------------------------------------------------

function clip(partial: Omit<Clip, "group"> & { group?: Clip["group"] }): Clip {
  return { group: STATIC_GROUP, ...partial };
}

function fastenerClips(n: N): Clip[] {
  const baseline = baselineFor({ tabletopUp: true, fasteners: n - 1, legs: n - 1 });
  const id = `fastener-${n}` as PartId;
  const p = fastenerPose;
  const holeTarget: Vec3 = [CORNERS[n].x, TOP_Y, CORNERS[n].z];
  return [
    clip({
      id: `fastener-${n}-insert`,
      duration: 6,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.tray(n)), key(0.3, p.hover(n)), key(0.45, p.tip(n)), key(0.65, p.started(n)), key(1, p.seated(n))] }],
      indicators: [
        { kind: "guide-line", partId: id, from: 0.22, to: 0.45, target: holeTarget },
        { kind: "spin", partId: id, from: 0.45, to: 1 },
      ],
      focus: null,
    }),
    clip({
      id: `fastener-${n}-align`,
      duration: 2.6,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.tray(n)), key(0.6, p.hover(n)), key(1, p.tip(n))] }],
      indicators: [{ kind: "guide-line", partId: id, from: 0.45, to: 1, target: holeTarget }],
      focus: cornerFocus(n),
    }),
    clip({
      id: `fastener-${n}-start`,
      duration: 2,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.tip(n)), key(1, p.started(n))] }],
      indicators: [{ kind: "spin", partId: id, from: 0, to: 1 }],
      focus: cornerFocus(n),
    }),
    clip({
      id: `fastener-${n}-tighten`,
      duration: 2.8,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.started(n)), key(1, p.seated(n))] }],
      indicators: [{ kind: "spin", partId: id, from: 0, to: 1 }],
      focus: cornerFocus(n),
    }),
  ];
}

function legClips(n: N): Clip[] {
  const baseline = baselineFor({ tabletopUp: true, fasteners: n, legs: n - 1 });
  const id = `leg-${n}` as PartId;
  const p = legPose;
  const tip: Vec3 = [CORNERS[n].x, FASTENER_TIP_Y, CORNERS[n].z];
  return [
    clip({
      id: `leg-${n}-attach`,
      duration: 6.5,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.floor(n)), key(0.3, p.hover(n)), key(0.45, p.resting(n)), key(0.62, p.started(n)), key(1, p.seated(n))] }],
      indicators: [
        { kind: "guide-line", partId: id, from: 0.22, to: 0.45, target: tip },
        { kind: "spin", partId: id, from: 0.45, to: 1 },
      ],
      focus: null,
    }),
    clip({
      id: `leg-${n}-align`,
      duration: 2.8,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.floor(n)), key(0.6, p.hover(n)), key(1, p.resting(n))] }],
      indicators: [{ kind: "guide-line", partId: id, from: 0.4, to: 1, target: tip }],
      focus: cornerFocus(n),
    }),
    clip({
      id: `leg-${n}-start`,
      duration: 2,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.resting(n)), key(1, p.started(n))] }],
      indicators: [{ kind: "spin", partId: id, from: 0, to: 1 }],
      focus: cornerFocus(n),
    }),
    clip({
      id: `leg-${n}-tighten`,
      duration: 3,
      baseline,
      tracks: [{ partId: id, keys: [key(0, p.started(n)), key(1, p.seated(n))] }],
      indicators: [{ kind: "spin", partId: id, from: 0, to: 1 }],
      focus: cornerFocus(n),
    }),
  ];
}

function buildClips(): Record<string, Clip> {
  const list: Clip[] = [
    clip({
      id: "prepare-overview",
      duration: 4,
      baseline: baselineFor({ tabletopUp: false, fasteners: 0, legs: 0 }),
      tracks: [
        {
          partId: "tabletop",
          keys: [
            key(0, TABLETOP_TOP_UP),
            key(0.15, TABLETOP_TOP_UP),
            key(0.55, { pos: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0] }),
            key(1, TABLETOP_UNDERSIDE_UP),
          ],
        },
      ],
      indicators: [],
      focus: null,
    }),
    ...NS.flatMap((n) => [...fastenerClips(n), ...legClips(n)]),
    clip({
      id: "table-upright",
      duration: 4,
      baseline: baselineFor({ tabletopUp: true, fasteners: 4, legs: 4 }),
      tracks: [],
      group: {
        pivot: GROUP_PIVOT,
        keys: [key(0, IDENTITY), key(0.5, { pos: [0, 0.18, 0], rot: [Math.PI / 2, 0, 0] }), key(1, UPRIGHT)],
      },
      indicators: [],
      focus: null,
    }),
    clip({
      id: "table-final",
      duration: 2,
      baseline: baselineFor({ tabletopUp: true, fasteners: 4, legs: 4 }),
      tracks: [],
      group: { pivot: GROUP_PIVOT, keys: [key(0, UPRIGHT), key(1, UPRIGHT)] },
      indicators: [],
      focus: null,
    }),
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}

export const CLIPS: Readonly<Record<string, Clip>> = buildClips();

// --- Evaluation (pure, deterministic) ---------------------------------

const ease = (u: number) => u * u * (3 - 2 * u);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export function sampleKeys(keys: Keyframe[], t: number): Pose {
  const tc = Math.min(1, Math.max(0, t));
  if (tc <= keys[0].t) return { pos: [...keys[0].pos], rot: [...keys[0].rot] };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (tc <= b.t) {
      const u = ease(b.t === a.t ? 1 : (tc - a.t) / (b.t - a.t));
      return {
        pos: [lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], u), lerp(a.pos[2], b.pos[2], u)],
        rot: [lerp(a.rot[0], b.rot[0], u), lerp(a.rot[1], b.rot[1], u), lerp(a.rot[2], b.rot[2], u)],
      };
    }
  }
  const last = keys[keys.length - 1];
  return { pos: [...last.pos], rot: [...last.rot] };
}

/** Full scene at normalized time t. Always computed from the baseline, never accumulated. */
export function evaluateClip(c: Clip, t: number): SceneFrame {
  const parts = {} as Record<PartId, Pose>;
  for (const [id, pose] of Object.entries(c.baseline) as [PartId, Pose][]) {
    parts[id] = { pos: [...pose.pos], rot: [...pose.rot] };
  }
  for (const track of c.tracks) parts[track.partId] = sampleKeys(track.keys, t);
  return {
    parts,
    group: sampleKeys(c.group.keys, t),
    groupPivot: c.group.pivot,
    indicators: c.indicators.filter((ind) => t >= ind.from && t < ind.to),
  };
}
