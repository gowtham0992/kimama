import {afterEach,describe,expect,it} from 'vitest';
import {DAILY,KIND,OBJECTS,dailyObject,rotationObject,forgetFinds,dayAt,type ObjectId} from '../src/shared/scenes';
import {offerFor,decideFind,tallyOf,winnerOf,pickView,nextDay,prevDay} from '../src/shared/finds';
import {findOn,offerOn,pickOn,picksOn,type FindStore} from '../src/server/finds';
import {careForPet,newPet,type Pet} from '../src/shared/pet';
import {recapText} from '../src/shared/recap';

const t=Date.UTC(2026,10,25,12),DAY=86400000;
const memory=():FindStore=>{const kv:Record<string,string>={},h:Record<string,Record<string,string>>={};return{
 async get(k){return kv[k]??null;},async set(k,v,o){if(o?.nx&&k in kv)return null;kv[k]=v;return 'OK';},
 async hGetAll(k){return{...(h[k]??{})};},async hSet(k,v){h[k]={...(h[k]??{}),...v};return 1;}};};
afterEach(()=>forgetFinds());

describe('the path home',()=>{
 it('offers three different sorts of thing, never today’s sort and never anything found in the last fortnight',()=>{
  for(let i=0;i<60;i++){const day=dayAt(t+i*DAY),today=DAILY[i%30],recent=DAILY.filter((_,j)=>j!==i%30).slice(0,10) as ObjectId[];
   const o=offerFor(day,today,recent);
   expect(o).toHaveLength(3);expect(new Set(o.map(x=>KIND[x])).size).toBe(3);
   for(const x of o){expect(x).not.toBe(today);expect(KIND[x]).not.toBe(KIND[today]);expect(recent).not.toContain(x);}
   expect(offerFor(day,today,recent)).toEqual(o);}
 });
 it('lets the most-picked thing win, breaks a tie by the order on the path, and ignores picks of anything not on it',()=>{
  const offer=['duck','kite','bee'] as ObjectId[];
  expect(winnerOf(offer,tallyOf(offer,{a:'kite',b:'kite',c:'duck'}))).toEqual({object:'kite',votes:2});
  expect(winnerOf(offer,tallyOf(offer,{a:'kite',b:'duck'})).object).toBe('duck');
  expect(tallyOf(offer,{a:'sock',b:'bee'})).toEqual({votes:{bee:1},total:1});
  expect(decideFind('2026-11-26',offer,{})).toEqual({object:'duck',votes:0,total:0});
  expect(decideFind('2026-11-26',null,{a:'kite'}).object).toBe(rotationObject(Date.parse('2026-11-26T12:00:00Z')));
  const v=pickView('2026-11-25',offer,{me:'bee',a:'bee',b:'kite'},'me');expect(v).toMatchObject({mine:'bee',leader:'bee',total:3});
 });
 it('keeps the rotation on a day nobody had a path the day before, so the day this ships keeps its find',async()=>{
  const s=memory(),day=dayAt(t);expect((await findOn(s,day)).object).toBe(rotationObject(t));
 });
 it('brings back tomorrow what today’s pets picked, the same answer for every request, and tells the game and the post',async()=>{
  const s=memory(),day=dayAt(t),offer=await offerOn(s,day);
  await pickOn(s,day,'a',offer[2]);await pickOn(s,day,'b',offer[2]);await pickOn(s,day,'c',offer[1]);
  await pickOn(s,day,'c',offer[2]);// changing your mind replaces your pick
  await expect(pickOn(s,day,'d',DAILY.find(o=>!offer.includes(o))!)).rejects.toThrow('path');
  expect((await picksOn(s,day,'c')).votes[offer[2]]).toBe(3);
  const tomorrow=nextDay(day),f=await findOn(s,tomorrow);
  expect(f).toEqual({object:offer[2],votes:3,total:3});
  expect(dailyObject(Date.parse(`${tomorrow}T08:00:00Z`))).toBe(offer[2]);
  // A late pick for yesterday cannot move a find that has been decided.
  await pickOn(s,day,'e',offer[0]);await pickOn(s,day,'f',offer[0]);await pickOn(s,day,'g',offer[0]);await pickOn(s,day,'h',offer[0]);
  forgetFinds();expect((await findOn(s,tomorrow)).object).toBe(offer[2]);
  // The next path never offers what was just chosen.
  expect(await offerOn(s,tomorrow)).not.toContain(offer[2]);
  expect(prevDay(tomorrow)).toBe(day);
 });
 it('names the vote in the pinned results',()=>{
  const r=recapText({object:'kite',counts:{try:2,gentle:1,watch:0},total:3,pets:[],today:'duck',chosen:{votes:5,total:8}})!;
  expect(r).toContain('Today: a rubber duck, brought back by 5 of 8 pets.');
  expect(recapText({object:'kite',counts:{try:1,gentle:0,watch:0},total:1,pets:[],today:'duck'})).toContain('Today: a rubber duck. What will yours do');
 });
});

describe('the pet that chose',()=>{
 const act=(p:Pet,action:string,now:number,extra={})=>careForPet(p,{action,version:p.version,...extra},now);
 const ready=()=>{let p=careForPet(newPet(t-2000),{action:'hatch',name:'Pip',version:0},t-1000);p=act(p,'explore',t);const s=p.scenes![0];return act(p,'sceneChoose',t+10,{sceneId:s.id,choice:'try'});};
 it('can only pick after going out today, and keeps the pick for tomorrow',()=>{
  const fresh=careForPet(newPet(t-2000),{action:'hatch',name:'Pip',version:0},t-1000);
  expect(()=>act(fresh,'bring',t,{object:'duck'})).toThrow('today');
  expect(()=>act(ready(),'bring',t+20,{object:'nonsense'})).toThrow('path');
  const p=act(ready(),'bring',t+20,{object:'duck'});expect(p.brought).toEqual({day:dayAt(t+DAY),object:'duck'});
 });
 it('says so the next day: agreed with the street, or outvoted',()=>{
  const next=t+DAY,tomorrow=dayObj(next);
  let p=act(ready(),'bring',t+20,{object:tomorrow});p=act(p,'sceneFinish',t+30,{sceneId:p.scenes![0].id});p=act(p,'explore',next);
  expect(p.scenes![0].beats[0].text).toContain('Pip picked this one yesterday, and the street agreed.');
  const other=DAILY.find(o=>o!==tomorrow)!;
  let q=act(ready(),'bring',t+20,{object:other});q=act(q,'sceneFinish',t+30,{sceneId:q.scenes![0].id});q=act(q,'explore',next);
  expect(q.scenes![0].beats[0].text).toContain(`Pip wanted the ${OBJECTS[other].name}. The street chose this.`);
 });
});
const dayObj=(now:number)=>dailyObject(now);
