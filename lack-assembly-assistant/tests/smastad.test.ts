import { describe,it,expect } from 'vitest';
import { PIECES,SM_ACTIONS,evaluateAction } from '../src/features/smastad/timeline';
import { SM_GUIDE } from '../src/features/smastad/guide';
import { validateGuide } from '../src/shared/guideValidation';
import { hasAnimation } from '../src/features/viewer/animationRegistry';
import { buildPreparedHelp } from '../src/shared/preparedHelp';
import { parseGuide } from '../src/shared/schemas';
import { ProfileStore,type StorageLike } from '../src/features/profile/profileStore';
import rawLack from '../src/data/lack-guide.v1.json';
describe('SMÅSTAD action animations',()=>{
 it('validates all guide and detail clips against real tracks',()=>{expect(validateGuide(parseGuide(SM_GUIDE),hasAnimation)).toEqual([]);expect(SM_ACTIONS).toHaveLength(17);expect(new Set(SM_ACTIONS.map(a=>a.id)).size).toBe(17);});
 it('moves distinct parts for every action and replays deterministically',()=>{for(const a of SM_ACTIONS){const before=evaluateAction(a,0),after=evaluateAction(a,1),middle=evaluateAction(a,.5);expect(Object.keys(after)).toHaveLength(PIECES.length);expect(after).not.toEqual(before);evaluateAction(a,.2);expect(evaluateAction(a,.5)).toEqual(middle);for(const t of a.tracks){expect(after[t.id]).toBeDefined();expect(t.start).toBeGreaterThanOrEqual(0);expect(t.end).toBeLessThanOrEqual(1.000001);}}});
 it('carries completed actions into the next baseline without dropping parts',()=>{for(let i=0;i<SM_ACTIONS.length-1;i++){const prior=evaluateAction(SM_ACTIONS[i],1),next=SM_ACTIONS[i+1].baseline;for(const piece of PIECES){if(['driver','hammer','hexkey'].includes(piece.id))continue;expect(next[piece.id]).toEqual(prior[piece.id]);}}});
 it('uses product-specific help without LACK assumptions',()=>{const help=buildPreparedHelp(SM_GUIDE,{requestId:'req-smastad-1',guideId:SM_GUIDE.id,stepId:SM_GUIDE.steps[1].id,choice:'part_orientation',relevantLearningNeeds:[]});expect(help.explanation).not.toContain('tabletop');expect(help.explanation).toContain('hole');});
 it('uses the provided key and illustrates the required hardware counts',()=>{expect(SM_ACTIONS[0].tracks.filter(t=>t.id.startsWith('bolt'))).toHaveLength(8);expect(SM_ACTIONS[3].tracks.filter(t=>t.id.startsWith('dowel'))).toHaveLength(8);expect(SM_ACTIONS[7].tracks.filter(t=>t.id.startsWith('deskbolt'))).toHaveLength(6);expect(SM_ACTIONS[13].hardware).toContain('100218');expect(SM_ACTIONS[13].tool).toContain('100092');});
 it('retains each product progress when switching catalogues',()=>{const data=new Map<string,string>();const storage:StorageLike={getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)},removeItem:k=>{data.delete(k)}};const s=new ProfileStore({storage});const lack=parseGuide(rawLack);const l=s.loadOrCreateSession(lack);s.completeStep(l.id,'prepare');const sm=s.loadOrCreateSession(SM_GUIDE);s.completeStep(sm.id,SM_GUIDE.steps[0].id);expect(s.loadOrCreateSession(lack).completedStepIds).toEqual(['prepare']);expect(s.loadOrCreateSession(SM_GUIDE).completedStepIds).toEqual([SM_GUIDE.steps[0].id]);});
});
