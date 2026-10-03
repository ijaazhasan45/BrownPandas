import type { ProductId } from './catalog';
export const REASONS=['Identifying the part','Finding the correct hole','Choosing or using the tool','Aligning the parts','Understanding the diagram','Wall fixing or configuration'] as const;
export type Reason=typeof REASONS[number];
export interface BuildRecord {id:string;product:ProductId;layout:number;wall:string;done:number[];current:number;help:{step:number;reason:Reason;at:string}[];opened:number[];}
const KEY='buildwise:product-builds:v1';
let fallback:BuildRecord[]=[];
export function readBuilds():BuildRecord[]{try{const stored=localStorage.getItem(KEY);if(!stored)return fallback;const raw=JSON.parse(stored);return Array.isArray(raw)?raw.filter(b=>b&&typeof b.id==='string'&&['bed','dresser','loft','wardrobe'].includes(b.product)&&Array.isArray(b.done)&&Array.isArray(b.help)&&Array.isArray(b.opened)):[];}catch{return fallback;}}
export function saveBuild(build:BuildRecord){const all=readBuilds().filter(b=>b.id!==build.id);all.push(build);fallback=all;try{localStorage.setItem(KEY,JSON.stringify(all));return true;}catch{return false;}}
export function newBuild(product:ProductId,layout=0,wall='A'):BuildRecord {return {id:crypto.randomUUID(),product,layout,wall,done:[],current:0,help:[],opened:[1]};}
export function savedReasons(product:ProductId):Reason[]{return [...new Set(readBuilds().filter(b=>b.product===product).flatMap(b=>b.help.map(h=>h.reason)))];}
export function aggregate(builds=readBuilds()){
 return ['bed','dresser','loft','wardrobe'].flatMap(product=>{const rows=builds.filter(b=>b.product===product);const steps=[...new Set(rows.flatMap(b=>b.opened))];return steps.map(step=>{const viewed=rows.filter(b=>b.opened.includes(step));const struggling=viewed.filter(b=>b.help.some(h=>h.step===step));return {product,step,buildsViewed:viewed.length,buildsWithHelp:struggling.length,helpRequests:struggling.reduce((n,b)=>n+b.help.filter(h=>h.step===step).length,0),helpRate:viewed.length?struggling.length/viewed.length:0,reasons:REASONS.map(reason=>({reason,count:struggling.reduce((n,b)=>n+b.help.filter(h=>h.step===step&&h.reason===reason).length,0)})).filter(r=>r.count>0)};});}).sort((a,b)=>b.buildsWithHelp-a.buildsWithHelp||b.helpRequests-a.helpRequests);
}
export function downloadReport(format:'json'|'csv'){
 const rows=aggregate();const report={schemaVersion:1,generatedAt:new Date().toISOString(),scope:'This browser only; help requests are self-reported, not observed assembly errors.',rows};
 const escape=(v:unknown)=>'"'+String(v).replaceAll('"','""')+'"';
 const content=format==='json'?JSON.stringify(report,null,2):['product,manual_step,builds_viewed,builds_with_help,help_requests,help_rate,reasons',...rows.map(r=>[r.product,r.step,r.buildsViewed,r.buildsWithHelp,r.helpRequests,r.helpRate,r.reasons.map(x=>`${x.reason}: ${x.count}`).join('; ')].map(escape).join(','))].join('\n');
 const url=URL.createObjectURL(new Blob([content],{type:format==='json'?'application/json':'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`buildwise-manufacturer-report.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
