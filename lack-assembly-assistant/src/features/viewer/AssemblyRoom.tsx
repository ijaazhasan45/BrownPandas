import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** Deterministic procedural material maps: no network textures or external assets. */
function surfaceTexture(kind: "oak" | "cloth") {
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext("2d")!;
 let seed=761;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 ctx.fillStyle=kind==="oak"?"#ba956b":"#ded5c5";ctx.fillRect(0,0,512,512);
 if(kind==="oak") {
  for(let i=0;i<1200;i++) {const x=random()*512;ctx.strokeStyle=`rgba(71,39,14,${random()*.09})`;ctx.lineWidth=random()*2+.3;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+random()*12,160,x-random()*12,340,x+random()*8,512);ctx.stroke();}
  for(let i=0;i<6;i++){const y=random()*512;ctx.strokeStyle="rgba(48,31,18,.15)";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
 } else {
  for(let i=0;i<512;i+=2){ctx.strokeStyle=i%4===0?"rgba(255,255,255,.18)":"rgba(70,55,30,.10)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,512);ctx.moveTo(0,i);ctx.lineTo(512,i);ctx.stroke();}
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
 return t;
}
export function ProtectiveMat({studio=false}:{studio?:boolean}) {
 const cloth=useMemo(()=>surfaceTexture("cloth"),[]);useEffect(()=>()=>cloth.dispose(),[cloth]);
 return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.003,0]} receiveShadow><planeGeometry args={[1.45,1.2]}/><meshStandardMaterial map={cloth} color={studio?"#d8e2ea":"#efe6d6"} roughness={1}/></mesh><mesh position={[0,-.008,0]} receiveShadow><boxGeometry args={[1.45,.008,1.2]}/><meshStandardMaterial color="#c5baaa" roughness={1}/></mesh></group>;
}
function RoomBox({position,size,color}:{position:[number,number,number];size:[number,number,number];color:string}) {
 return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.85}/></mesh>;
}
export function AssemblyRoom({studio}:{studio:boolean}) {
 const oak=useMemo(()=>surfaceTexture("oak"),[]);useEffect(()=>()=>oak.dispose(),[oak]);
 return <>
  <color attach="background" args={[studio?"#eaf0f5":"#ede8df"]}/>
  <fog attach="fog" args={[studio?"#eaf0f5":"#ede8df",4,10]}/>
  <hemisphereLight args={["#fff6e7","#b6b3af",1.8]}/>
  <directionalLight position={[1.8,3,1.1]} intensity={3.1} color="#fff4df" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={2} shadow-camera-bottom={-2} shadow-normalBias={.018} />
  <directionalLight position={[-2,1.5,-.3]} intensity={.8} color="#d9e8ff"/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.025,0]} receiveShadow><planeGeometry args={[10,10]}/><meshStandardMaterial color={studio?"#e4ebf1":"#c4a177"} roughness={.72}/></mesh>
  {!studio && <>
   {Array.from({length:19},(_,i)=><mesh key={i} position={[(i-9)*.25,-.017,0]} receiveShadow><boxGeometry args={[.246,.006,6]}/><meshStandardMaterial map={oak} color={i%3===0?"#ddc09a":i%3===1?"#cdb08c":"#d6b991"} roughness={.7}/></mesh>)}
   <RoomBox position={[0,1.3,-1.65]} size={[6,2.6,.08]} color="#e7e2d8"/>
   <RoomBox position={[-2.4,1.3,0]} size={[.08,2.6,4]} color="#deded7"/>
   <RoomBox position={[0,.05,-1.58]} size={[6,.1,.035]} color="#faf9f3"/>
   <RoomBox position={[-2.34,.05,0]} size={[.035,.1,4]} color="#faf9f3"/>
   {/* Window recess, daylight glass and solid frame. */}
   <RoomBox position={[-.6,1.48,-1.596]} size={[1.25,1.35,.025]} color="#f7fbff"/>
   <RoomBox position={[-.6,1.48,-1.565]} size={[1.1,1.2,.02]} color="#ccdfeb"/>
   <RoomBox position={[-.6,1.48,-1.54]} size={[.04,1.22,.035]} color="#f9f7ee"/>
   <RoomBox position={[-.6,1.48,-1.54]} size={[1.12,.04,.035]} color="#f9f7ee"/>
   <RoomBox position={[-.6,.8,-1.5]} size={[1.36,.06,.18]} color="#f9f7ee"/>
   {/* Flat-pack box behind the clear assembly area. */}
   <group position={[1.14,.034,-.84]} rotation={[0,-.2,0]}><RoomBox position={[0,0,0]} size={[.68,.09,.6]} color="#b99261"/><RoomBox position={[0,.046,0]} size={[.08,.002,.6]} color="#d2b584"/></group>
   <group position={[-1.35,0,-1.13]}><mesh position={[0,.13,0]} castShadow><cylinderGeometry args={[.13,.10,.26,32]}/><meshStandardMaterial color="#ad7357" roughness={.9}/></mesh><mesh position={[0,.265,0]}><cylinderGeometry args={[.12,.12,.015,24]}/><meshStandardMaterial color="#463e2d"/></mesh>{Array.from({length:9},(_,i)=><group key={i} rotation={[0,i*2.399,0]}><mesh position={[.04,.44,0]} rotation={[0,0,-.2]} castShadow><cylinderGeometry args={[.003,.004,.36,6]}/><meshStandardMaterial color="#496342"/></mesh><mesh position={[.1,.59,0]} rotation={[0,0,-.5]} scale={[.055,.15,.022]} castShadow><sphereGeometry args={[1,16,10]}/><meshStandardMaterial color={i%2?"#5c7953":"#749260"}/></mesh></group>)}</group>
  </>}
  <ProtectiveMat studio={studio}/>
 </>;
}
