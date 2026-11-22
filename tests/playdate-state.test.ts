import{expect,it}from'vitest';
import{newPet,careForPet}from'../src/shared/pet';
import{savePlaydate}from'../src/server/pet-state';
import type{StateStore}from'../src/server/redis-state';
it('saves both playdate memories atomically under concurrent visits',async()=>{
 const now=Date.UTC(2026,10,13),a=careForPet(newPet(now),{action:'hatch',version:0},now),b=careForPet(newPet(now+1),{action:'hatch',version:0},now+1);
 const data=new Map([['a',JSON.stringify(a)],['b',JSON.stringify(b)]]),versions=new Map<string,number>();
 const store:StateStore={get:async k=>data.get(k),watch:async(...keys)=>{const old=keys.map(k=>versions.get(k)??0),writes:{key:string;value:string}[]=[];return{multi:async()=>{},set:async(key,value)=>{writes.push({key,value});},unwatch:async()=>{},discard:async()=>{},exec:async()=>{if(keys.some((k,i)=>(versions.get(k)??0)!==old[i]))return[];for(const w of writes){data.set(w.key,w.value);versions.set(w.key,(versions.get(w.key)??0)+1);}return writes.map(()=>'OK');}};}};
 const results=await Promise.allSettled([savePlaydate(store,'a','b','a','b',1,now+1000),savePlaydate(store,'b','a','b','a',1,now+1000)]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const aa=JSON.parse(data.get('a')!),bb=JSON.parse(data.get('b')!);expect(aa.version).toBe(2);expect(bb.version).toBe(2);expect(aa.journal.at(-1).text).toBe(bb.journal.at(-1).text);
});
