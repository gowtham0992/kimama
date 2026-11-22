import {randomUUID} from 'node:crypto';
import {dayAt,dailyObject} from '../shared/scenes';
import type {Pet} from '../shared/pet';
import type {GardenView,Choice} from '../shared/garden';
import {StateConflict,type StateStore} from './redis-state';
type Entry={id:string;owner:string;username:string;joinedAt:number};
type Directory=Entry[];
const base=(post:string,now:number)=>`picky:garden:v1:${post}:${dayAt(now)}`;
export const directoryKey=(post:string,now:number)=>base(post,now)+':pets';
const expiry=(now:number)=>new Date(Date.parse(dayAt(now)+'T00:00:00Z')+3*86400000);
function todayChoice(p:Pet|undefined,now:number):Choice|undefined{return p?[...(p.scenes??[]),...(p.sceneAlbum??[])].find(s=>s.kind==='daily'&&dayAt(s.at)===dayAt(now)&&s.choice)?.choice:undefined;}
/** Counts this pet's choice for today exactly once. True only on the call that counted it. */
export async function recordGardenChoice(store:StateStore,post:string,owner:string,p:Pet,now:number):Promise<boolean>{
 const choice=todayChoice(p,now);if(!choice)return false;
 const receipt=base(post,now)+':vote:'+owner,tally=base(post,now)+':tally';
 if(await store.get(receipt))return false;
 for(let attempt=0;attempt<4;attempt++){
  const tx=await store.watch(receipt,tally);let started=false,done=false;
  try{if(await store.get(receipt)){await tx.unwatch();done=true;return false;}
   const counts:Record<Choice,number>=JSON.parse(await store.get(tally)??'{"try":0,"gentle":0,"watch":0}');counts[choice]++;
   await tx.multi();started=true;await tx.set(receipt,choice,{expiration:expiry(now)});await tx.set(tally,JSON.stringify(counts),{expiration:expiry(now)});const r=await tx.exec();done=true;if(r.length===2&&r.every(x=>x==='OK'))return true;
  }finally{if(!done){if(started)await tx.discard();else await tx.unwatch();}}
 }throw new StateConflict('The garden is busy. Please try again.');
}
export async function setGardenMembership(store:StateStore,post:string,owner:string,username:string,join:boolean,now:number):Promise<void>{
 const key=directoryKey(post,now);
 for(let attempt=0;attempt<4;attempt++){
  const tx=await store.watch(key);let started=false,done=false;
  try{const entries:Directory=JSON.parse(await store.get(key)??'[]'),existing=entries.find(e=>e.owner===owner);let next=entries.filter(e=>e.owner!==owner);
   if(join){const raw=await store.get(owner);if(!raw||JSON.parse(raw).hatchedAt===null)throw new Error('Hatch your pet before joining the garden.');next.push(existing??{id:randomUUID().replace(/-/g,''),owner,username,joinedAt:now});}
   next=next.slice(-60);await tx.multi();started=true;await tx.set(key,JSON.stringify(next),{expiration:expiry(now)});const r=await tx.exec();done=true;if(r.length===1&&r[0]==='OK')return;
  }finally{if(!done){if(started)await tx.discard();else await tx.unwatch();}}
 }throw new StateConflict('The garden is busy. Please try again.');
}
export async function gardenView(store:StateStore,post:string,owner:string|null,now:number,own?:Pet):Promise<GardenView>{
 const [roster,tally]=await Promise.all([store.get(directoryKey(post,now)),store.get(base(post,now)+':tally')]);
 const entries:Directory=JSON.parse(roster??'[]'),counts:Record<Choice,number>=JSON.parse(tally??'{"try":0,"gentle":0,"watch":0}');
 const candidates=entries.filter(e=>e.owner!==owner).slice(-12).reverse();
 const pets=await Promise.all(candidates.map(async e=>{const raw=await store.get(e.owner);if(!raw)return null;const p:Pet=JSON.parse(raw);const met=own?.meetings?.[e.owner]===dayAt(now),busy=!!p.scenes?.some(s=>s.awaitingChoice)||(p.scenes?.length??0)>=4;
 return{id:e.id,name:p.name,username:e.username,temperament:p.temperament,available:!p.sleeping&&!busy&&!met,status:met?'Met today':p.sleeping?'Sleeping':busy?'Exploring':'Visit'};}));
 return{day:dayAt(now),object:dailyObject(now),counts,total:counts.try+counts.gentle+counts.watch,myChoice:todayChoice(own,now),joined:entries.some(e=>e.owner===owner),canJoin:!!owner,pets:pets.filter(p=>p!==null)};
}
export async function gardenTarget(store:StateStore,post:string,id:unknown,now:number):Promise<string>{
 if(typeof id!=='string'||!/[a-f0-9]{32}/.test(id)||id.length!==32)throw new Error('Choose a pet in today’s garden.');
 const roster:Directory=JSON.parse(await store.get(directoryKey(post,now))??'[]');const target=roster.find(e=>e.id===id);
 if(!target)throw new Error('That pet has left today’s garden.');return target.owner;
}
export function directoryHas(raw:string|undefined,id:string,owner:string){return(JSON.parse(raw??'[]') as Directory).some(e=>e.id===id&&e.owner===owner);}
