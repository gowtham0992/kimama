import type {GardenView} from '../shared/garden';
import type {PetView} from '../shared/pet';
export type View=PetView&{inviteCode?:string};
async function call(path:string,body?:unknown){
 // A visitor's pet is found again by this id. It is kept across a sign-in, so the pet can move to the account.
 let id:string|null=null;try{id=localStorage.getItem('picky-guest')??sessionStorage.getItem('picky-guest');}catch{/* private mode */}
 if(!id){id=crypto.randomUUID();try{localStorage.setItem('picky-guest',id);}catch{try{sessionStorage.setItem('picky-guest',id);}catch{/* nowhere to keep it */}}}
 // One quiet second try when the network drops or the server stumbles. A repeated action is safe: the pet's version number refuses it if the first one landed.
 const go=()=>fetch(path,{headers:{'Content-Type':'application/json','x-picky-guest':id!},...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
 let r:Response;try{r=await go();if(r.status>=500)throw new Error('server');}catch{await new Promise(s=>setTimeout(s,700));r=await go();}
 const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Could not reach your pet.'),{code:data.code});return data;
}
export const pickApi=(body?:{object:string;version:number})=>call('/api/pick',body) as Promise<import('../shared/finds').PickView&{pick?:import('../shared/finds').PickView;pet?:View}>;
export const petApi=(body?:unknown)=>call('/api/pet',body) as Promise<View>;
export const callsApi=(body?:unknown)=>call('/api/calls',body) as Promise<{on:boolean;available?:boolean;error?:string}>;
export const joinApi=()=>call('/api/join',{}) as Promise<{ok:boolean}>;
export const meApi=()=>call('/api/me') as Promise<{avatar:string|null;signedIn?:boolean}>;
export const tellApi=(retort?:number,remove?:boolean)=>call('/api/tell',remove?{remove:true}:{retort}) as Promise<{ok:boolean;already?:boolean;removed?:boolean;by?:'app'|'you'}>;
export const streetApi=(body?:unknown)=>call('/api/street',body) as Promise<import('../shared/street').StreetView>;
export const gardenApi=(body?:unknown)=>call('/api/garden',body) as Promise<GardenView&{pet?:View}>;
