import { createContext, useContext, Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Edges, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { SmastadViewer } from "../smastad/SmastadViewer";
import { AssemblyRoom } from "./AssemblyRoom";
import { useBuilderPreferences } from "../profile/preferences";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { PartId } from "../../shared/contracts";
import { CLIPS, DIM, PART_LABELS, evaluateClip, type Clip, type Vec3 } from "./sceneStates";

export interface AssemblyViewerProps {
  guideId: string;
  stepId: string;
  animationId: string;
  highlightedPartIds: PartId[];
  replayToken: number; // Increment to replay the same selected clip.
  prepared?: boolean;
  closeUp?: boolean;
  xray?: boolean;
  finishToken?: number;
  onReplay?: () => void;
  onAnimationFinished?: () => void;
  onViewerError?: (message: string) => void;
}

const XrayContext = createContext(false);
const DEFAULT_CAMERA: Vec3 = [1.0, 0.9, 1.3];
const DEFAULT_TARGET: Vec3 = [0, 0.1, -0.04];
const PART_IDS = Object.keys(PART_LABELS) as PartId[];

const COLORS = {
  finish: "#f4f4f1",
  raw: "#d9d6cf",
  hole: "#2b2f33",
  metal: "#8d949b",
  blanket: "#9fb0c4",
  highlight: "#f2a93b",
  outline: "#c46b00",
  guide: "#1d6fd8",
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// --- Parts -----------------------------------------------------------

function Highlight({ on }: { on: boolean }) {
  return on ? <Edges color={COLORS.outline} lineWidth={2} threshold={15} /> : null;
}

function Tabletop({ highlighted }: { highlighted: boolean }) {
  const xray = useContext(XrayContext);
  const materials = useMemo(() => {
    const finish = new THREE.MeshStandardMaterial({ color: COLORS.finish, roughness: 0.38 });
    const raw = new THREE.MeshStandardMaterial({ color: COLORS.raw, roughness: 0.9 });
    // Box face order: +x, -x, +y (underside, where the holes are), -y (finished top), +z, -z
    return [finish, finish, raw, finish, finish, finish];
  }, []);
  useEffect(() => {
    for (const m of materials) {
      m.transparent=xray; m.opacity=xray?.18:1; m.depthWrite=!xray;
      m.emissive.set(highlighted ? COLORS.highlight : "#000000");
      m.emissiveIntensity = highlighted ? 0.18 : 0;
    }
  }, [highlighted, materials, xray]);
  const inset = DIM.topSize / 2 - DIM.legSize / 2;
  return (
    <group>
      <mesh material={materials} castShadow receiveShadow>
        <boxGeometry args={[DIM.topSize, DIM.topThickness, DIM.topSize]} />
        <Highlight on={highlighted} />
      </mesh>
      {[
        [-inset, inset],
        [inset, inset],
        [inset, -inset],
        [-inset, -inset],
      ].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, DIM.topThickness / 2 + 0.0006, z]}>
          <cylinderGeometry args={[0.006, 0.006, 0.0012, 20]} />
          <meshBasicMaterial color={COLORS.hole} />
        </mesh>
      ))}
    </group>
  );
}

function Leg({ highlighted }: { highlighted: boolean }) {
  const xray=useContext(XrayContext);
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[DIM.legSize, DIM.legLength, DIM.legSize]} />
        <meshStandardMaterial
          transparent={xray} opacity={xray?.18:1} depthWrite={!xray}
          color={COLORS.finish}
          roughness={0.38}
          emissive={highlighted ? COLORS.highlight : "#000000"}
          emissiveIntensity={highlighted ? 0.22 : 0}
        />
        <Highlight on={highlighted} />
      </mesh>
      {/* Hole at the attaching end (local -Y). */}
      <mesh position={[0, -DIM.legLength / 2 - 0.0006, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.0012, 20]} />
        <meshBasicMaterial color={COLORS.hole} />
      </mesh>
      {/* Faint line on one face so turning is visible. */}
      <mesh position={[DIM.legSize / 2 + 0.0004, 0, 0]}>
        <boxGeometry args={[0.0008, DIM.legLength * 0.92, 0.006]} />
        <meshBasicMaterial color={COLORS.raw} />
      </mesh>
    </group>
  );
}

function Fastener({ highlighted }: { highlighted: boolean }) {
  const thread = useMemo(() => {
    const points = Array.from({length:241},(_,i)=> {
      const f=i/240, angle=f*Math.PI*2*15;
      return new THREE.Vector3(Math.cos(angle)*DIM.fastenerRadius*1.04,(f-.5)*DIM.fastenerLength*.85,Math.sin(angle)*DIM.fastenerRadius*1.04);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),240,.00035,4,false);
  }, []);
  useEffect(()=>()=>thread.dispose(),[thread]);
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[DIM.fastenerRadius, DIM.fastenerRadius, DIM.fastenerLength, 16]} />
        <meshStandardMaterial
          color={COLORS.metal}
          metalness={0.6}
          roughness={0.35}
          emissive={highlighted ? COLORS.highlight : "#000000"}
          emissiveIntensity={highlighted ? 0.35 : 0}
        />
        <Highlight on={highlighted} />
      </mesh>
      <mesh geometry={thread}><meshStandardMaterial color="#646d75" metalness={.8} roughness={.3}/></mesh>
      {[-1,1].map(end=><mesh key={end} position={[0,end*DIM.fastenerLength/2,0]} rotation={[end===-1?Math.PI:0,0,0]}><coneGeometry args={[DIM.fastenerRadius,.006,12]}/><meshStandardMaterial color={COLORS.metal} metalness={.7} roughness={.3}/></mesh>)}
      <mesh>
        <cylinderGeometry args={[DIM.fastenerRadius * 1.25, DIM.fastenerRadius * 1.25, 0.008, 16]} />
        <meshStandardMaterial color="#6f767d" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[DIM.fastenerRadius * 1.2, 0, 0]}>
        <boxGeometry args={[0.002, 0.008, 0.003]} />
        <meshBasicMaterial color={COLORS.hole} />
      </mesh>
    </group>
  );
}

// --- Indicators ------------------------------------------------------

function SpinArrow({ radius }: { radius: number }) {
  const arc = Math.PI * 1.5;
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[radius, radius * 0.07, 8, 40, arc]} />
        <meshBasicMaterial color={COLORS.guide} />
      </mesh>
      <mesh position={[radius * Math.cos(arc), radius * Math.sin(arc), 0]} rotation={[0, 0, arc]}>
        <coneGeometry args={[radius * 0.2, radius * 0.4, 12]} />
        <meshBasicMaterial color={COLORS.guide} />
      </mesh>
    </group>
  );
}

// --- Scene -----------------------------------------------------------

interface PlaybackApi {
  speed: React.MutableRefObject<number>;
  t: React.MutableRefObject<number>;
  playing: React.MutableRefObject<boolean>;
  /** Requests a frame; the canvas only renders on demand to save battery. */
  invalidate: React.MutableRefObject<() => void>;
  onTick: (t: number) => void;
  onFinished: () => void;
}

function AssemblyScene({ clip, highlighted, playback }: { clip: Clip; highlighted: Set<PartId>; playback: PlaybackApi }) {
  const assembly = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const parts = useRef<Partial<Record<PartId, THREE.Group>>>({});
  const labels = useRef<Record<string, THREE.Group>>({});
  // Group labels when three or more parts of one kind are highlighted, so they don't pile up.
  const labelSpecs = useMemo(() => {
    const specs: { key: string; text: string; ids: PartId[]; lift: number }[] = [];
    if (highlighted.has("tabletop")) specs.push({ key: "tabletop", text: PART_LABELS.tabletop, ids: ["tabletop"], lift: 0.08 });
    for (const kind of ["leg", "fastener"] as const) {
      const ids = PART_IDS.filter((id) => id.startsWith(kind) && highlighted.has(id));
      const lift = kind === "leg" ? 0.26 : 0.06;
      if (ids.length >= 3) specs.push({ key: `${kind}-group`, text: `${ids.length} ${kind}s`, ids, lift });
      else for (const id of ids) specs.push({ key: id, text: PART_LABELS[id], ids: [id], lift });
    }
    return specs;
  }, [highlighted]);
  const spinRefs = useRef<THREE.Group[]>([]);
  const guideLine = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geom, new THREE.LineDashedMaterial({ color: COLORS.guide, dashSize: 0.012, gapSize: 0.008 }));
    line.frustumCulled = false;
    return line;
  }, []);
  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);
  const spinClock = useRef(0);

  useFrame((state, rawDelta) => {
    const pb = playback;
    // On-demand rendering leaves gaps between frames; the first frame after a pause
    // must not jump the animation ahead. Slow devices otherwise keep real time.
    const delta = rawDelta > 0.25 ? 1 / 60 : rawDelta;
    if (pb.playing.current) {
      pb.t.current = Math.min(1, pb.t.current + delta * pb.speed.current / clip.duration);
      if (pb.t.current >= 1) {
        pb.playing.current = false;
        pb.onFinished();
      }
    }
    pb.onTick(pb.t.current);

    const frame = evaluateClip(clip, pb.t.current);
    const g = assembly.current;
    const gi = inner.current;
    if (g && gi) {
      const pv = frame.groupPivot;
      g.position.set(pv[0] + frame.group.pos[0], pv[1] + frame.group.pos[1], pv[2] + frame.group.pos[2]);
      g.rotation.set(frame.group.rot[0], frame.group.rot[1], frame.group.rot[2]);
      gi.position.set(-pv[0], -pv[1], -pv[2]);
    }
    for (const id of PART_IDS) {
      const obj = parts.current[id];
      const pose = frame.parts[id];
      if (!obj || !pose) continue;
      obj.position.set(...pose.pos);
      obj.rotation.set(...pose.rot);
    }
    g?.updateMatrixWorld(true);

    for (const spec of labelSpecs) {
      const label = labels.current[spec.key];
      if (!label) continue;
      tmpB.set(0, 0, 0);
      let count = 0;
      for (const id of spec.ids) {
        const obj = parts.current[id];
        if (!obj) continue;
        obj.getWorldPosition(tmpA);
        tmpB.add(tmpA);
        count++;
      }
      if (!count) continue;
      tmpB.divideScalar(count);
      label.position.set(tmpB.x, tmpB.y + spec.lift, tmpB.z);
    }

    // Indicators
    spinClock.current += delta;
    const spins = frame.indicators.filter((i) => i.kind === "spin");
    spinRefs.current.forEach((ref, index) => {
      const ind = spins[index];
      const obj = ind ? parts.current[ind.partId] : undefined;
      ref.visible = !!obj;
      if (!obj) return;
      obj.getWorldPosition(tmpA);
      const isLeg = ind.partId.startsWith("leg");
      ref.position.set(tmpA.x, isLeg ? DIM.topThickness + 0.06 : tmpA.y + 0.03, tmpA.z);
      ref.rotation.y = -spinClock.current * 2.2; // clockwise seen from above
    });

    const line = frame.indicators.find((i) => i.kind === "guide-line");
    const lineObj = line ? parts.current[line.partId] : undefined;
    guideLine.visible = !!(line && lineObj && line.target);
    if (line && lineObj && line.target) {
      const half = line.partId.startsWith("leg") ? DIM.legLength / 2 : DIM.fastenerLength / 2;
      lineObj.localToWorld(tmpA.set(0, -half, 0));
      tmpB.set(...line.target);
      guideLine.geometry.setFromPoints([tmpA.clone(), tmpB.clone()]);
      guideLine.computeLineDistances();
    }
    if (pb.playing.current) state.invalidate();
  });

  const setPart = (id: PartId) => (el: THREE.Group | null) => {
    if (el) parts.current[id] = el;
  };
  const setLabel = (key: string) => (el: THREE.Group | null) => {
    if (el) labels.current[key] = el;
  };

  return (
    <>
      <group ref={assembly}>
        <group ref={inner}>
          <group ref={setPart("tabletop")}>
            <Tabletop highlighted={highlighted.has("tabletop")} />
          </group>
          {([1, 2, 3, 4] as const).map((n) => (
            <group key={`leg-${n}`} ref={setPart(`leg-${n}`)}>
              <Leg highlighted={highlighted.has(`leg-${n}`)} />
            </group>
          ))}
          {([1, 2, 3, 4] as const).map((n) => (
            <group key={`fastener-${n}`} ref={setPart(`fastener-${n}`)}>
              <Fastener highlighted={highlighted.has(`fastener-${n}`)} />
            </group>
          ))}
        </group>
      </group>
      {labelSpecs.map((spec) => (
        <group key={`label-${spec.key}`} ref={setLabel(spec.key)}>
          <Html center zIndexRange={[20, 0]} className="viewer-label-wrap">
            <span className="viewer-label" aria-hidden="true">{spec.text}</span>
          </Html>
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={`spin-${i}`} ref={(el) => { if (el) spinRefs.current[i] = el; }} visible={false}>
          <SpinArrow radius={0.055} />
        </group>
      ))}
      <primitive object={guideLine} />
    </>
  );
}

function CameraRig({
  focus,
  closeUp,
  resetToken,
  controlsRef,
}: {
  closeUp?: boolean;
  focus: Vec3 | null;
  resetToken: number;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera, invalidate } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);
  const userActive = useRef(false);

  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA);
    controlsRef.current?.target.set(...DEFAULT_TARGET);
    controlsRef.current?.update();
    goal.current = null;
    invalidate();
  }, [resetToken, camera, controlsRef, invalidate]);

  useEffect(() => {
    goal.current = focus ? new THREE.Vector3(...focus) : null;
    if(closeUp && focus) { camera.position.set(focus[0]+.32,focus[1]+.28,focus[2]+.38); controlsRef.current?.target.set(...focus); controlsRef.current?.update(); }
    invalidate();
  }, [focus, closeUp, camera, controlsRef, invalidate]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const start = () => {
      userActive.current = true;
      goal.current = null; // never fight the user's camera
    };
    const end = () => {
      userActive.current = false;
    };
    controls.addEventListener("start", start);
    controls.addEventListener("end", end);
    return () => {
      controls.removeEventListener("start", start);
      controls.removeEventListener("end", end);
    };
  }, [controlsRef]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls || !goal.current || userActive.current) return;
    controls.target.lerp(goal.current, Math.min(1, Math.min(delta, 1 / 20) * 4));
    controls.update();
    if (controls.target.distanceTo(goal.current) < 0.002) goal.current = null;
    else state.invalidate();
  });
  return null;
}

/** Exposes the canvas's invalidate() to controls outside the canvas. */
function InvalidateBridge({ target }: { target: React.MutableRefObject<() => void> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    target.current = () => invalidate();
    invalidate();
  }, [invalidate, target]);
  return null;
}

class ViewerBoundary extends Component<{ onError: (m: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(`The 3D view stopped working: ${error.message}`);
  }
  render() {
    return this.state.failed ? (
      <div className="viewer-fallback" role="status">
        The 3D view isn't available on this device. The written steps still cover everything.
      </div>
    ) : (
      this.props.children
    );
  }
}

// --- Public component -------------------------------------------------

function LackAssemblyViewer({
  stepId,
  animationId,
  highlightedPartIds,
  replayToken,
  onAnimationFinished,
  prepared=true, closeUp=false, xray=false, finishToken=0, onReplay,
  onViewerError,
}: AssemblyViewerProps) {
  const preferences = useBuilderPreferences();
  const speed = useRef(preferences.speed);
  speed.current = preferences.speed;
  const clip = CLIPS[animationId] as Clip | undefined;
  const cameraFocus=useMemo<Vec3|null>(()=>{if(clip?.focus)return clip.focus;if(!closeUp)return null;const id=highlightedPartIds.find(p=>p.startsWith("fastener")||p.startsWith("leg"));if(!id)return null;const n=Number(id.split("-")[1]);return [[-.25,.055,.25],[.25,.055,.25],[.25,.055,-.25],[-.25,.055,-.25]][n-1] as Vec3;},[clip,closeUp,highlightedPartIds]);
  const reduced = useMemo(prefersReducedMotion, []);
  const webgl = useMemo(hasWebGL, []);
  const t = useRef(reduced ? 1 : 0);
  const playing = useRef(!reduced && preferences.autoplay && prepared);
  const [shownT, setShownT] = useState(t.current);
  const [isPlaying, setIsPlaying] = useState(playing.current);
  const [resetToken, setResetToken] = useState(0);
  const lastTick = useRef(0);
  const invalidate = useRef<() => void>(() => undefined);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const finishedRef = useRef(onAnimationFinished);
  finishedRef.current = onAnimationFinished;
  const errorRef = useRef(onViewerError);
  errorRef.current = onViewerError;

  // Restart from the clip's own baseline on any clip change or replay request.
  useEffect(() => {
    t.current = reduced ? 1 : 0;
    playing.current = !reduced && preferences.autoplay && prepared;
    setShownT(t.current);
    setIsPlaying(playing.current);
    invalidate.current();
  }, [animationId, stepId, replayToken, reduced, preferences.autoplay, prepared]);

  useEffect(()=>{if(finishToken){t.current=1;playing.current=false;setShownT(1);setIsPlaying(false);invalidate.current();}},[finishToken]);

  useEffect(() => {
    if (!clip) errorRef.current?.(`Animation "${animationId}" is missing. Follow the written steps for now.`);
  }, [clip, animationId]);
  useEffect(() => {
    if (!webgl) errorRef.current?.("3D graphics aren't available in this browser.");
  }, [webgl]);

  const highlighted = useMemo(() => new Set(highlightedPartIds), [highlightedPartIds]);
  const playback: PlaybackApi = useMemo(
    () => ({
      speed,
      t,
      playing,
      invalidate,
      onTick: (value: number) => {
        const now = performance.now();
        if (now - lastTick.current > 90 || value >= 1) {
          lastTick.current = now;
          setShownT(value);
        }
      },
      onFinished: () => {
        setIsPlaying(false);
        finishedRef.current?.();
      },
    }),
    [],
  );

  const togglePlay = () => {
    if (!playing.current && t.current >= 1) t.current = 0;
    playing.current = !playing.current;
    setIsPlaying(playing.current);
    invalidate.current();
  };
  const replay = () => {
    t.current = 0;
    playing.current = true;
    setIsPlaying(true);
    invalidate.current();
  };
  const scrub = (value: number) => {
    t.current = value;
    playing.current = false;
    setIsPlaying(false);
    setShownT(value);
    invalidate.current();
  };

  const zoom = (factor: number) => {
    const c = controlsRef.current;
    if (!c) return;
    const offset=c.object.position.clone().sub(c.target);
    const distance=THREE.MathUtils.clamp(offset.length()*factor,.45,3);
    c.object.position.copy(c.target).add(offset.normalize().multiplyScalar(distance));
    c.update();invalidate.current();
  };
  const label = `3D view of this step. ${
    highlightedPartIds.length ? `Highlighted: ${highlightedPartIds.map((id) => PART_LABELS[id]).join(", ")}.` : ""
  } Drag to rotate, scroll or pinch to zoom.`;

  if (!webgl || !clip) {
    return (
      <div className="viewer viewer--empty" role="status">
        <p>{!clip ? "This animation isn't available yet. The written steps still cover this action." : "3D graphics aren't available in this browser. The written steps still cover everything."}</p>
      </div>
    );
  }

  return (
    <div className="viewer">
      <div className="viewer-canvas" role="img" aria-label={label}>
        <ViewerBoundary onError={(m) => errorRef.current?.(m)}>
          <Canvas
            shadows
            frameloop="demand"
            dpr={[1, 1.75]}
            camera={{ position: DEFAULT_CAMERA, fov: 38, near: 0.01, far: 20 }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          >
            <AssemblyRoom studio={preferences.scene === "focus"} />
            <Suspense fallback={null}>
              <XrayContext.Provider value={xray}><AssemblyScene clip={clip} highlighted={highlighted} playback={playback} /></XrayContext.Provider>
              <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={2.2} blur={2.4} far={0.8} resolution={256} />
            </Suspense>
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              enablePan={false}
              minDistance={0.45}
              maxDistance={3}
              maxPolarAngle={Math.PI / 2 - 0.04}
              target={DEFAULT_TARGET}
            />
            <CameraRig closeUp={closeUp} focus={cameraFocus} resetToken={resetToken} controlsRef={controlsRef} />
            <InvalidateBridge target={invalidate} />
          </Canvas>
        </ViewerBoundary>
      </div>
      <div className="viewer-controls">
        <button type="button" className="vbtn" disabled={!prepared} onClick={togglePlay} aria-pressed={isPlaying}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" className="vbtn" disabled={!prepared} onClick={()=>{onReplay?.();replay();}}>
          Replay
        </button>
        <label className="scrub" htmlFor="viewer-scrub">
          <span className="sr-only">Animation position</span>
          <input
            id="viewer-scrub"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={shownT}
            onChange={(e) => scrub(Number(e.target.value))}
          />
        </label>
        <button type="button" className="vbtn viewer-zoom" aria-label="Zoom in" onClick={() => zoom(.8)}>＋</button>
        <button type="button" className="vbtn viewer-zoom" aria-label="Zoom out" onClick={() => zoom(1.25)}>−</button>
        <button type="button" className="vbtn" onClick={() => setResetToken((n) => n + 1)}>
          Reset view
        </button>
      </div>
      <p className="viewer-hint">Drag to rotate · scroll or pinch to zoom · {preferences.speed}× pace</p>
    </div>
  );
}

export function AssemblyViewer(props:AssemblyViewerProps){return props.guideId.startsWith("smastad-")?<SmastadViewer {...props}/>:<LackAssemblyViewer {...props}/>;}
