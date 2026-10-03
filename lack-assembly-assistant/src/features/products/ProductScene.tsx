import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';
import { AssemblyRoom } from '../viewer/AssemblyRoom';
import { useBuilderPreferences } from '../profile/preferences';
import type { Product, ProductStep } from './catalog';
type V=[number,number,number];
interface Board {id:string;label:string;at:V;size:V;stage:number;color?:string;holes?:number;}
function boards(product:Product):Board[]{
 const a:Board[]=[];const add=(id:string,label:string,at:V,size:V,stage:number,holes=0,color?:string)=>a.push({id,label,at,size,stage,holes,color});
 if(product.id==='bed'){
  add('head','Head panel',[0,.44,-1],[1.5,.85,.035],0,4);add('foot','Foot panel',[0,.19,1],[1.5,.35,.035],1,4);
  [-1,1].forEach(n=>add(`side${n}`,'Side rail',[n*.73,.2,0],[.035,.28,2],1,4));
  [-1,1].forEach(n=>add(`support${n}`,'Slat support',[n*.7,.29,0],[.025,.035,1.94],2,8,'#a4abb0'));
  add('centre','Centre support',[0,.27,0],[.035,.07,1.94],3,4,'#a4abb0');
  for(let i=0;i<16;i++)add('slat'+i,'Slatted base',[0,.32,-.91+i*.12],[1.4,.02,.065],4,0,'#c7ac7a');
 }else if(product.id==='wardrobe'){
  [-1,1].forEach(n=>add('side'+n,'Side panel',[n*.58,.91,0],[.035,1.8,.5],1,10));
  add('base','Base panel',[0,.05,0],[1.2,.035,.5],2,8);add('top','Top panel',[0,1.81,0],[1.2,.035,.5],1,8);
  add('divider','Divider',[.18,.91,0],[.03,1.73,.49],1,8);
  for(let i=0;i<4;i++)add('shelf'+i,'Shelf',[.38,.43+i*.34,0],[.37,.022,.47],3,4);
  add('back','Rear panels',[0,.92,-.249],[1.16,1.75,.009],2,10);
  add('rod','Hanging rail',[-.21,1.54,0],[.69,.016,.016],3,0,'#a5adb1');
  for(let i=0;i<3;i++) {add('door'+i,'Door '+(i+1),[-.4+i*.4,.93,.272],[.39,1.72,.023],4,6);add('handle'+i,'Door handle',[-.25+i*.4,.95,.303],[.018,.09,.018],4,0,'#939da4');}
 }else if(product.id==='dresser'){
  [-1,1].forEach(n=>add('side'+n,'Side frame',[n*.43,.73,0],[.035,1.38,.45],1,12));
  add('top','Top panel',[0,1.44,0],[.94,.035,.49],1,8);add('base','Base rail',[0,.045,0],[.94,.065,.48],2,6);
  add('back','Rear panel',[0,.75,-.224],[.85,1.32,.008],2,8);
  for(let i=0;i<6;i++){const y=i<2?1.24:1.02-(i-2)*.235;add('drawer'+i,'Drawer '+(i+1),[i<2?(i===0?-.21:.21):0,y,.23],[i<2?.4:.84,.195,.025],i<2?4:5,4);add('pull'+i,'Drawer handle',[i<2?(i===0?-.21:.21):0,y,.267],[i<2?.09:.13,.02,.028],5,0,'#b0b7bb');
   [-1,1].forEach(n=>add('runner'+i+n,'Drawer runner',[n*.4,y-.055,0],[.012,.015,.39],2,0,'#a6adb3'));
   add('drawerbottom'+i,'Drawer bottom',[i<2?(i===0?-.21:.21):0,y-.078,.02],[i<2?.36:.78,.012,.38],4,0,'#d4c4a5');}
 }else{
  // Existing frame is context: this manual covers the desk/storage additions.
  [-1,1].forEach(n=>add('frame'+n,'Existing loft-bed frame',[n*.57,1.02,-.18],[.035,2,.9],0,0,'#dce1e2'));
  add('bed','Existing loft-bed frame',[0,1.62,-.18],[1.17,.22,.93],0,0,'#dce1e2');
  add('desk','Desktop',[0,.74,.22],[1.16,.035,.56],2,8);
  add('storage-left','Storage side',[.16,.39,.15],[.025,.7,.45],0,6);add('storage-right','Storage side',[.55,.39,.15],[.025,.7,.45],0,6);
  add('storage-base','Storage base',[.355,.05,.15],[.4,.025,.45],0,4);add('storage-top','Storage top',[.355,.73,.15],[.4,.025,.45],1,4);
  add('storage-back','Storage back',[.355,.39,-.075],[.4,.7,.009],1,4);
  add('shelf','Storage shelf',[.355,.38,.15],[.36,.023,.43],3,4);
  add('panel','Storage front / selected configuration',[.355,.39,.39],[.36,.66,.023],4,4);
  for(let i=0;i<6;i++)add('rung'+i,'Existing ladder rung',[-.55,.15+i*.23,.32],[.025,.025,.28],0,0,'#dce1e2');
 }
 return a;
}
function ModelBoard({board,explode,progress,active,showHoles,baseColor,showLabel}:{board:Board;explode:boolean;progress:React.MutableRefObject<number>;active:boolean;showHoles:boolean;baseColor:string;showLabel:boolean}){
 const ref=useRef<THREE.Group>(null);const start=useMemo(()=>new THREE.Vector3(board.at[0]*1.45,board.at[1]+.18,board.at[2]*1.65+.1),[board]);
 useFrame(()=>{if(ref.current){const final=new THREE.Vector3(...board.at);ref.current.position.copy(start).lerp(final,explode?0:active?progress.current:1);}});
 return <group ref={ref} position={board.at}><RoundedBox args={board.size} radius={.002} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={board.color??baseColor} roughness={.42} metalness={board.color==='#a4abb0'?.6:0}/></RoundedBox>
 {showHoles&&board.holes?Array.from({length:board.holes},(_,i)=>{const rows=Math.ceil((board.holes??0)/2);const x=(i%2?1:-1)*board.size[0]*.32;const y=(Math.floor(i/2)/Math.max(1,rows-1)-.5)*board.size[1]*.8;return <group key={i} position={[x,y,board.size[2]/2+.001]} rotation={[Math.PI/2,0,0]}><mesh><cylinderGeometry args={[.004,.004,.001,12]}/><meshBasicMaterial color="#29323a"/></mesh><mesh><torusGeometry args={[.005,.0007,6,12]}/><meshStandardMaterial color="#aeb4b7" roughness={.5}/></mesh></group>;}):null}
 {active&&showLabel&&<Html position={[0,board.size[1]/2+.045,0]} center distanceFactor={3}><span className="model-label">{board.label}</span></Html>}</group>;
}
function Model({product,step,exploded,showHoles,replay,playing,onTick}:{product:Product;step:ProductStep;exploded:boolean;showHoles:boolean;replay:number;playing:boolean;onTick:(n:number)=>void}){
 const items=useMemo(()=>boards(product),[product]);const progress=useRef(0);const preferences=useBuilderPreferences();const previous=useRef(-1);
 useEffect(()=>{progress.current=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:0;previous.current=-1;},[step.number,replay]);
 useFrame((_,delta)=>{if(playing&&progress.current<1){progress.current=Math.min(1,progress.current+Math.min(delta,.06)*preferences.speed/4);}const n=Math.round(progress.current*100);if(n!==previous.current){previous.current=n;onTick(n);}});
 const color=product.id==='dresser'?'#47545d':product.id==='wardrobe'?'#47372e':'#f1f1ec';
 return <group>{items.filter(b=>b.stage<=Math.max(1,step.stage)).map((b,index)=><ModelBoard key={b.id} board={b} explode={exploded} progress={progress} active={step.stage===0?b.stage<=1:b.stage===step.stage} showLabel={index<3} showHoles={showHoles} baseColor={color}/>)}</group>;
}
export function ProductScene({product,step}:{product:Product;step:ProductStep}){
 const [exploded,setExploded]=useState(false),[holes,setHoles]=useState(true),[replay,setReplay]=useState(0),[playing,setPlaying]=useState(true),[progress,setProgress]=useState(0);const pref=useBuilderPreferences();
 useEffect(()=>{setPlaying(pref.autoplay);setProgress(0);},[step.number,pref.autoplay]);
 return <section className="product-simulation"><div className="product-canvas"><Canvas shadows dpr={[1,1.5]} camera={{position:[2.9,2.4,3.5],fov:40}}><AssemblyRoom studio={pref.scene==='focus'}/><Suspense fallback={null}><Model product={product} step={step} exploded={exploded} showHoles={holes} replay={replay} playing={playing} onTick={setProgress}/><ContactShadows opacity={.3} scale={5} blur={2} far={2}/></Suspense><OrbitControls makeDefault target={[0,product.id==='bed'?.35:.8,0]} minDistance={.3} maxDistance={7} maxPolarAngle={Math.PI/2-.03}/></Canvas></div>
 <div className="simulation-controls"><button className="btn" onClick={()=>setPlaying(!playing)}>{playing?'Pause':'Play'}</button><button className="btn" onClick={()=>{setReplay(replay+1);setPlaying(true);}}>Replay stage</button><button className="btn" aria-pressed={exploded} onClick={()=>setExploded(!exploded)}>{exploded?'Assembled view':'Explode parts'}</button><label><input type="checkbox" checked={holes} onChange={e=>setHoles(e.target.checked)}/> Connection markers</label><span>{progress}%</span></div>
 <p className="simulation-note">Illustrative assembly-stage model, not a verified replica. Connection markers are schematic; use the manual diagram for exact holes, quantities and orientation. Drag to rotate · pinch or scroll to zoom.</p></section>;
}
