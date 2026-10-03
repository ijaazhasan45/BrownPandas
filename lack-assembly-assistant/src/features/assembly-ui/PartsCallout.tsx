import type { AssemblyGuide, AssemblyStep, HardwareSpec, PartId } from "../../shared/contracts";
import { HardwareIcon } from "../scale/HardwareDrawing";

interface CalloutItem {
  key: string;
  label: string;
  count: number;
  code?: string;
  hardware?: HardwareSpec;
  icon: "tabletop" | "leg" | "hardware";
}

export function hardwareForParts(guide: AssemblyGuide, parts: PartId[]): HardwareSpec[] {
  return (guide.hardware ?? []).filter((hw) => hw.partIds.some((id) => parts.includes(id)));
}

/** Groups a step's parts the way LEGO callouts do: one entry per kind, with a count. */
export function calloutItems(guide: AssemblyGuide, step: AssemblyStep): CalloutItem[] {
  const parts = step.partsUsed ?? [];
  const items: CalloutItem[] = [];
  const tabletops = parts.filter((p) => p === "tabletop").length;
  if (tabletops) items.push({ key: "tabletop", label: "Tabletop", count: tabletops, icon: "tabletop" });
  const legs = parts.filter((p) => p.startsWith("leg-")).length;
  if (legs) items.push({ key: "legs", label: legs === 1 ? "Leg" : "Legs", count: legs, icon: "leg" });
  for (const hw of guide.hardware ?? []) {
    const count = parts.filter((p) => hw.partIds.includes(p)).length;
    if (count) items.push({ key: hw.code, label: hw.name, count, code: hw.code, hardware: hw, icon: "hardware" });
  }
  return items;
}

function PartIcon({ item }: { item: CalloutItem }) {
  if (item.hardware) return <HardwareIcon hw={item.hardware} boxPx={44} />;
  if (item.icon === "tabletop") {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="part-icon">
        <path d="M4 20 L22 11 L40 20 L22 29 Z" />
        <path d="M4 20 V24 L22 33 V29 Z M22 33 L40 24 V20 L22 29 Z" className="part-icon-side" />
      </svg>
    );
  }
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="part-icon">
      <path d="M18 4 L24 2 L28 4 V40 L24 42 L18 40 Z" />
      <path d="M24 2 L28 4 V40 L24 42 Z" className="part-icon-side" />
    </svg>
  );
}

export function PartsCallout({
  guide,
  step,
  onActualSize,
}: {
  guide: AssemblyGuide;
  step: AssemblyStep;
  onActualSize: (hardware: HardwareSpec[]) => void;
}) {
  const items = calloutItems(guide, step);
  if (!items.length) return null;
  const hardware = items.flatMap((i) => (i.hardware ? [i.hardware] : []));
  return (
    <section className="callout" aria-label="Parts for this step">
      <ul className="callout-items">
        {items.map((item) => (
          <li key={item.key} className="callout-item">
            <span className="callout-icon">
              <PartIcon item={item} />
            </span>
            <span className="callout-count mono">{item.count}×</span>
            <span className="callout-label">
              {item.label}
              {item.code ? <span className="mono callout-code">{item.code}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {hardware.length ? (
        <button type="button" className="btn btn-small callout-btn" onClick={() => onActualSize(hardware)}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 8h20v8H2z M6 8v4 M10 8v3 M14 8v4 M18 8v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Check at actual size
        </button>
      ) : null}
    </section>
  );
}
