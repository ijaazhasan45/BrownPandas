import {describe,it,expect} from 'vitest';
import {recordSignal,needsFocusedGuidance} from '../src/features/profile/connectionSignals';
function store(){const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);}};}
describe('connection feedback',()=>{
 it('keeps products and steps separate and offers focus after repeated replays',()=>{const s=store();for(let i=0;i<3;i++)recordSignal('lack','joint-1','replays',s);expect(needsFocusedGuidance(recordSignal('lack','joint-1','details',s))).toBe(true);expect(recordSignal('smastad','joint-1','replays',s).replays).toBe(1);expect(recordSignal('lack','joint-2','replays',s).replays).toBe(1);});
 it('recovers from corrupt storage without recording chat or identity',()=>{const s=store();s.setItem('buildwise:connection-signals:v1','bad');const row=recordSignal('lack','joint','replays',s);expect(row).toEqual({guideId:'lack',stepId:'joint',replays:1,details:0});});
});
