import {expect,it} from 'vitest';
import {createGame,view} from '../src/server/game';
import {packGame,restoreGame,transition,type StateStore} from '../src/server/redis-state';
class MemoryCAS implements StateStore{
  data=new Map<string,string>();revisions=new Map<string,number>();
  async get(key:string){return this.data.get(key);}
  async watch(key:string){
    const revision=this.revisions.get(key)??0;let queued:string|undefined;
    return {multi:async()=>{},set:async(_key:string,value:string)=>{queued=value;},unwatch:async()=>{},discard:async()=>{},exec:async()=>{
      if(revision!==(this.revisions.get(key)??0))return [];
      this.data.set(key,queued!);this.revisions.set(key,revision+1);return ['OK'];
    }};
  }
}
it('persists progress without copying secret rules into every user record',()=>{
  const g=createGame(0,'mixed');const raw=packGame(g);
  expect(JSON.parse(raw)).not.toHaveProperty('secret');expect(JSON.parse(raw)).not.toHaveProperty('allowedRules');
  expect(view(restoreGame(createGame(0,'mixed'),raw))).toEqual(view(g));
});
it('allows only one of two concurrent actions to charge a feed',async()=>{
  const store=new MemoryCAS(),base=()=>createGame(0,'mixed');
  const input={type:'feed',version:0,snack:view(base()).suggestedSnack};
  const results=await Promise.allSettled([transition(store,'user:A',base,input),transition(store,'user:A',base,input)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const saved=restoreGame(base(),await store.get('user:A'));
  expect(saved.feeds).toBe(1);expect(saved.version).toBe(1);
  await expect(transition(store,'user:A',base,input)).rejects.toThrow(/changed/);
});
it('isolates two players and releases watch on invalid actions',async()=>{
  const store=new MemoryCAS(),base=()=>createGame(0,'mixed');
  await transition(store,'user:A',base,{type:'feed',version:0,snack:view(base()).suggestedSnack});
  expect(restoreGame(base(),await store.get('user:B')).feeds).toBe(0);
  await expect(transition(store,'user:B',base,{type:'feed',version:0,snack:[99]})).rejects.toThrow();
  expect(await store.get('user:B')).toBeUndefined();
});
