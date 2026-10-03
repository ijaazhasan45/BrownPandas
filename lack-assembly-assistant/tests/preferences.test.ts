import { describe, it, expect } from 'vitest';
import { PreferencesStore, DEFAULT_PREFERENCES, PREFERENCES_KEY } from '../src/features/profile/preferences';
const memory = () => { const data = new Map<string,string>(); return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}; };
describe('builder preferences',()=>{
  it('restores choices across visits',()=>{const storage=memory(); const first=new PreferencesStore(storage); first.update({speed:1.5,textSize:130,scene:'focus',detail:'always',autoplay:false}); expect(new PreferencesStore(storage).getSnapshot()).toEqual(first.getSnapshot());});
  it('recovers damaged or invalid saved values',()=>{const storage=memory();storage.setItem(PREFERENCES_KEY,'broken');expect(new PreferencesStore(storage).getSnapshot()).toEqual(DEFAULT_PREFERENCES);storage.setItem(PREFERENCES_KEY,JSON.stringify({version:1,speed:-5,textSize:800,scene:'focus'}));expect(new PreferencesStore(storage).getSnapshot()).toEqual({...DEFAULT_PREFERENCES,scene:'focus'});});
  it('keeps usable choices when saving is blocked',()=>{const store=new PreferencesStore({getItem:()=>null,removeItem:()=>{},setItem:()=>{throw Error('blocked')}});store.update({speed:1});expect(store.getSnapshot().speed).toBe(1);expect(store.persistent).toBe(false);});
});
