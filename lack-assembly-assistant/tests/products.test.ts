import { describe,it,expect } from 'vitest';
import { PRODUCTS,manualPage,productSteps } from '../src/features/products/catalog';
import { aggregate,type BuildRecord } from '../src/features/products/learning';
describe('prepared product paths',()=>{
 it('maps each numbered action to an existing page',()=>{for(const p of PRODUCTS){expect(p.steps.map(s=>s.number)).toEqual(Array.from({length:p.steps.length},(_,i)=>i+1));for(const step of p.steps)for(let layout=0;layout<6;layout++)for(const wall of ['A','B','C']){const page=manualPage(p,step,layout,wall);expect(page).toBeGreaterThan(0);expect(page).toBeLessThanOrEqual(p.pages);}}});
 it('preserves wall branches and supplied-key selection',()=>{const d=PRODUCTS.find(p=>p.id==='dresser')!;expect(manualPage(d,d.steps[31],0,'C')).toBe(28);expect(productSteps(d,'C').some(s=>s.number===33)).toBe(false);const w=PRODUCTS.find(p=>p.id==='wardrobe')!;expect(w.steps[7].tool).toBe('hex');expect(w.steps[7].page).toBe(11);});
 it('routes different desk layouts to their own diagrams',()=>{const p=PRODUCTS.find(p=>p.id==='loft')!;expect(manualPage(p,p.steps[10],2,'A')).toBe(24);expect(manualPage(p,p.steps[14],5,'A')).toBe(29);});
});
describe('manufacturer report',()=>{
 it('counts builds with difficulty once even with repeat requests',()=>{const base:BuildRecord={id:'a',product:'bed',layout:0,wall:'A',current:0,done:[],opened:[1],help:[]};const rows=aggregate([{...base,help:[{step:1,reason:'Choosing or using the tool',at:'today'},{step:1,reason:'Choosing or using the tool',at:'today'}]},{...base,id:'b'}]);expect(rows[0]).toMatchObject({buildsViewed:2,buildsWithHelp:1,helpRequests:2,helpRate:.5});expect(JSON.stringify(rows)).not.toContain('today');expect(rows[0]).not.toHaveProperty('id');});
});
