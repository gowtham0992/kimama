import {directoryHas} from './garden';
import {tickAutonomy} from '../shared/autonomy';
import {careForPet,newPet,advancePet,type Pet} from '../shared/pet';
import {StateConflict,type StateStore} from './redis-state';
// Reddit asks that stored user data deletes itself within about a month. A pet is kept thirty days from the last time anything about it changed.
const keep=(now:number)=>({expiration:new Date(now+30*86400000)});
export async function transitionPet(store:StateStore,key:string,input:unknown,now:number):Promise<Pet>{
 const tx=await store.watch(key);let started=false,finished=false;
 try{const raw=await store.get(key),pet=careForPet(raw?JSON.parse(raw):newPet(now),input,now);await tx.multi();started=true;await tx.set(key,JSON.stringify(pet),keep(now));const result=await tx.exec();finished=true;if(result.length!==1||result[0]!=='OK')throw new StateConflict('Your pet changed. Reopen the screen and try again.');return pet;}
 finally{if(!finished){if(started)await tx.discard();else await tx.unwatch();}}
}

export async function savePlaydate(store:StateStore,aKey:string,bKey:string,aId:string,bId:string,version:number,now:number,guard?:{key:string;id:string}){
 const tx=await store.watch(aKey,bKey,...(guard?[guard.key]:[]));let started=false,finished=false;
 try{if(guard&&!directoryHas(await store.get(guard.key),guard.id,bKey))throw new Error('That pet has left today’s garden.');const [ar,br]=await Promise.all([store.get(aKey),store.get(bKey)]);if(!ar||!br)throw new Error('Pet invitation is unavailable.');const a=JSON.parse(ar),b=JSON.parse(br);if(a.version!==version)throw new StateConflict('Your pet changed. Refresh and try again.');const {meetPets}=await import('../shared/pet');const [na,nb]=meetPets(a,b,aId,bId,now);await tx.multi();started=true;await tx.set(aKey,JSON.stringify(na),keep(now));await tx.set(bKey,JSON.stringify(nb),keep(now));const r=await tx.exec();finished=true;if(r.length!==2||r.some(x=>x!=='OK'))throw new StateConflict('A pet changed. Try the playdate again.');return na;}finally{if(!finished){if(started)await tx.discard();else await tx.unwatch();}}
}

export async function settlePet(store:StateStore,key:string,now:number):Promise<Pet>{
 for(let attempt=0;attempt<3;attempt++){
 const tx=await store.watch(key);let started=false,finished=false;
 try{const raw=await store.get(key),p:Pet=raw?JSON.parse(raw):newPet(now),n=tickAutonomy(advancePet(p,now),now);
 const changed=!raw||JSON.stringify([p.activity,p.lastActivity,p.activitySerial])!==JSON.stringify([n.activity,n.lastActivity,n.activitySerial]);
 if(!changed){await tx.unwatch();finished=true;return n;}
 await tx.multi();started=true;await tx.set(key,JSON.stringify(n),keep(now));const r=await tx.exec();finished=true;if(r.length===1&&r[0]==='OK')return n;
 }finally{if(!finished){if(started)await tx.discard();else await tx.unwatch();}}
 }throw new StateConflict('Your pet is busy. Try again.');
}
