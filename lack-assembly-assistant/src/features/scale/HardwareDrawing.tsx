import type { HardwareSpec } from "../../shared/contracts";
import { drawingSizeMm } from "./scaleMath";

/**
 * Side-profile drawings of small hardware, authored in millimeters.
 * The SVG viewBox is in mm and the element size is mm x pxPerMm, so the same
 * drawing serves as a small icon or as a true-to-scale outline.
 * Thread lines are illustrative; they do not show the real pitch.
 */

const STROKE = 0.3; // mm

function DoubleEndedScrew({ L, D }: { L: number; D: number }) {
  const r = D / 2;
  const plain = L * 0.18; // smooth middle section
  const threadLen = (L - plain) / 2;
  const pitch = Math.max(0.8, D * 0.18);
  const threads: JSX.Element[] = [];
  for (const [start, end] of [
    [0, threadLen],
    [threadLen + plain, L],
  ]) {
    for (let x = start + pitch * 0.6; x + D * 0.28 < end - 0.3; x += pitch) {
      threads.push(<line key={`t${x.toFixed(2)}`} x1={x} y1={0.15} x2={x + D * 0.28} y2={D - 0.15} />);
    }
  }
  const chamfer = Math.min(r * 0.5, 1);
  return (
    <g>
      <path
        className="hw-body"
        d={`M${chamfer},0 H${L - chamfer} L${L},${chamfer} V${D - chamfer} L${L - chamfer},${D} H${chamfer} L0,${D - chamfer} V${chamfer} Z`}
      />
      <rect className="hw-plain" x={threadLen} y={0} width={plain} height={D} />
      <g className="hw-thread">{threads}</g>
    </g>
  );
}

function Screw({ L, D, H }: { L: number; D: number; H: number }) {
  const headLen = Math.max(1.5, D * 0.6);
  const top = (H - D) / 2;
  const tip = Math.min(D * 0.9, L * 0.2);
  const pitch = Math.max(0.8, D * 0.2);
  const threads: JSX.Element[] = [];
  for (let x = headLen + D * 0.6; x + D * 0.28 < L - tip; x += pitch) {
    threads.push(<line key={x.toFixed(2)} x1={x} y1={top + 0.15} x2={x + D * 0.28} y2={top + D - 0.15} />);
  }
  return (
    <g>
      <rect className="hw-body" x={0} y={0} width={headLen} height={H} rx={Math.min(headLen, H) * 0.3} />
      <path className="hw-body" d={`M${headLen},${top} H${L - tip} L${L},${H / 2} L${L - tip},${top + D} H${headLen} Z`} />
      <g className="hw-thread">{threads}</g>
    </g>
  );
}

function Dowel({ L, D }: { L: number; D: number }) {
  const c = Math.min(D * 0.25, 1.2);
  const flutes: JSX.Element[] = [];
  for (let y = D * 0.25; y < D; y += D * 0.25) flutes.push(<line key={y} x1={c * 2} y1={y} x2={L - c * 2} y2={y} />);
  return (
    <g>
      <path className="hw-body hw-wood" d={`M${c},0 H${L - c} L${L},${c} V${D - c} L${L - c},${D} H${c} L0,${D - c} V${c} Z`} />
      <g className="hw-thread">{flutes}</g>
    </g>
  );
}

function hexPoints(cx: number, cy: number, acrossFlats: number) {
  const R = acrossFlats / Math.sqrt(3); // circumradius
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + R * Math.cos(a)).toFixed(3)},${(cy + R * Math.sin(a)).toFixed(3)}`;
  }).join(" ");
}

function RingPart({ D, d, T, hex }: { D: number; d: number; T: number; hex: boolean }) {
  const c = D / 2;
  return (
    <g>
      {hex ? (
        <polygon className="hw-body" points={hexPoints(c, c, D)} />
      ) : (
        <circle className="hw-body" cx={c} cy={c} r={c - STROKE / 2} />
      )}
      <circle className="hw-hole" cx={c} cy={c} r={d / 2} />
      <rect className="hw-body" x={D + 6} y={0} width={T} height={D} />
    </g>
  );
}

function Shape({ hw }: { hw: HardwareSpec }) {
  const s = hw.sizeMm;
  switch (hw.shape) {
    case "double-ended-screw":
      return <DoubleEndedScrew L={s.length!} D={s.diameter!} />;
    case "screw":
      return <Screw L={s.length!} D={s.diameter!} H={s.headDiameter!} />;
    case "dowel":
      return <Dowel L={s.length!} D={s.diameter!} />;
    case "washer":
      return <RingPart D={s.diameter!} d={s.innerDiameter!} T={s.thickness!} hex={false} />;
    case "nut":
      return <RingPart D={s.diameter!} d={s.innerDiameter!} T={s.thickness!} hex />;
  }
}

export function HardwareDrawing({
  hw,
  pxPerMm,
  vertical = false,
  title,
}: {
  hw: HardwareSpec;
  pxPerMm: number;
  vertical?: boolean;
  title?: string;
}) {
  const { width, height } = drawingSizeMm(hw);
  const pad = STROKE; // keep the outline stroke inside the box
  const vbW = width + pad * 2;
  const vbH = height + pad * 2;
  const outW = vertical ? vbH : vbW;
  const outH = vertical ? vbW : vbH;
  return (
    <svg
      className="hw-drawing"
      width={outW * pxPerMm}
      height={outH * pxPerMm}
      viewBox={`0 0 ${outW} ${outH}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ strokeWidth: STROKE }}
    >
      <g transform={vertical ? `translate(${outW} 0) rotate(90) translate(${pad} ${pad})` : `translate(${pad} ${pad})`}>
        <Shape hw={hw} />
      </g>
    </svg>
  );
}

/** Fits the drawing in a square box of `boxPx` CSS pixels (not to scale). */
export function HardwareIcon({ hw, boxPx }: { hw: HardwareSpec; boxPx: number }) {
  const { width, height } = drawingSizeMm(hw);
  const scale = Math.min(boxPx / (width + 1), boxPx / (height + 1));
  return <HardwareDrawing hw={hw} pxPerMm={scale} />;
}

/** A millimeter ruler drawn at the given scale. */
export function ScaleRuler({ pxPerMm, lengthMm }: { pxPerMm: number; lengthMm: number }) {
  const w = lengthMm * pxPerMm;
  const ticks: JSX.Element[] = [];
  for (let mm = 0; mm <= lengthMm; mm++) {
    const x = mm * pxPerMm + 0.5;
    const len = mm % 10 === 0 ? 16 : mm % 5 === 0 ? 11 : 6;
    ticks.push(<line key={mm} x1={x} y1={0} x2={x} y2={len} />);
    if (mm % 10 === 0) {
      ticks.push(
        <text key={`l${mm}`} x={x} y={30} textAnchor={mm === 0 ? "start" : "middle"}>
          {mm}
        </text>,
      );
    }
  }
  return (
    <svg className="ruler" width={w + 34} height={36} viewBox={`0 0 ${w + 34} 36`} role="img" aria-label={`Ruler, ${lengthMm} millimeters`}>
      <line x1={0} y1={0.5} x2={w + 1} y2={0.5} />
      {ticks}
      <text x={w + 8} y={14}>mm</text>
    </svg>
  );
}
