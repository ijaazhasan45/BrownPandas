export interface ConnectionSignal { guideId:string; stepId:string; replays:number; details:number; }
const KEY='buildwise:connection-signals:v1';
export function recordSignal(guideId:string,stepId:string,event:'replays'|'details',storage:Pick<Storage,'getItem'|'setItem'>=localStorage):ConnectionSignal {
 let rows:ConnectionSignal[]=[];try{const raw=JSON.parse(storage.getItem(KEY)||'[]');if(Array.isArray(raw))rows=raw.filter(r=>typeof r.guideId==='string'&&typeof r.stepId==='string'&&Number.isFinite(r.replays)&&Number.isFinite(r.details));}catch{}
 let row=rows.find(r=>r.guideId===guideId&&r.stepId===stepId);if(!row){row={guideId,stepId,replays:0,details:0};rows.push(row);}row[event]++;try{storage.setItem(KEY,JSON.stringify(rows.slice(-300)));}catch{}return {...row};
}
export function needsFocusedGuidance(signal:ConnectionSignal){return signal.replays>=3;}
export function readSignals():ConnectionSignal[]{try{const rows=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows.filter(r=>typeof r?.guideId==='string'&&typeof r?.stepId==='string'&&Number.isFinite(r?.replays)&&Number.isFinite(r?.details)):[];}catch{return [];}}
