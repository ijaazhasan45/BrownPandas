import { preferencesStore, useBuilderPreferences, type BuilderPreferences } from "../profile/preferences";
export function PreferencesPanel() {
 const p=useBuilderPreferences();
 return <section className="builder-preferences" aria-labelledby="preferences-heading"><h3 id="preferences-heading">How you like to build</h3><p className="small">These choices carry into your next build.</p>
  <label>Animation pace<select value={p.speed} onChange={e=>preferencesStore.update({speed:Number(e.target.value) as BuilderPreferences["speed"]})}><option value={0.5}>Slow · 0.5×</option><option value={1}>Standard · 1×</option><option value={1.5}>Quick · 1.5×</option></select></label>
  <label>Instruction detail<select value={p.detail} onChange={e=>preferencesStore.update({detail:e.target.value as BuilderPreferences["detail"]})}><option value="adaptive">Adapt to my saved struggles</option><option value="always">Always show smaller steps</option></select></label>
  <label>Assembly space<select value={p.scene} onChange={e=>preferencesStore.update({scene:e.target.value as BuilderPreferences["scene"]})}><option value="room">Daylight room</option><option value="focus">Quiet studio · fewer distractions</option></select></label>
  <label>Instruction text<select value={p.textSize} onChange={e=>preferencesStore.update({textSize:Number(e.target.value) as BuilderPreferences["textSize"]})}><option value={100}>Standard</option><option value={115}>Larger</option><option value={130}>Largest</option></select></label>
  <label className="preference-check"><input type="checkbox" checked={p.autoplay} onChange={e=>preferencesStore.update({autoplay:e.target.checked})}/>Play animations when a step opens</label>
  {!preferencesStore.persistent && <p role="status" className="small">Preferences are kept for this visit only because browser storage is unavailable.</p>}
 </section>;
}
