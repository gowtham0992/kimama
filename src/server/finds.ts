// The store side of "today's pets choose tomorrow's find". Each day's find is decided once, by the first request that needs it,
// and written so every later request agrees. Works against Devvit's Redis or the local stand-in.
import {DAILY,knowFinds,rotationObject,type ObjectId} from '../shared/scenes';
import {DAY,dayOf,prevDay,decideFind,offerFor,pickView,isObject,type PickView} from '../shared/finds';

export type FindStore={
 get(key:string):Promise<string|null|undefined>;
 set(key:string,value:string,opts?:{nx?:boolean;expiration?:Date}):Promise<unknown>;
 hGetAll(key:string):Promise<Record<string,string>>;
 hSet(key:string,values:Record<string,string>):Promise<unknown>;
 expire?(key:string,seconds:number):Promise<unknown>;
};
const findKey=(d:string)=>`picky:find:v1:${d}`,offerKey=(d:string)=>`picky:offer:v1:${d}`,picksKey=(d:string)=>`picky:picks:v1:${d}`;
const keep=(days:number)=>({expiration:new Date(Date.now()+days*DAY)});
export type Find={object:ObjectId;votes:number;total:number};
// Decided days never change, so they are remembered for the life of the process.
const decided=new Map<string,Find>();
const parse=(raw:string|null|undefined):Find|null=>{try{const f=raw?JSON.parse(raw):null;return f&&isObject(f.object)?{object:f.object,votes:Number(f.votes)||0,total:Number(f.total)||0}:null;}catch{return null;}};

/** The day's find: chosen by yesterday's pets if they had a path to choose from, otherwise the rotation. */
export async function findOn(store:FindStore,day:string):Promise<Find>{
 const known=decided.get(day);if(known)return known;
 let f=parse(await store.get(findKey(day)));
 if(!f){
  const y=prevDay(day),offer=await offerStored(store,y);
  const picks=offer?await store.hGetAll(picksKey(y)):{};
  const d=decideFind(day,offer,picks);
  // Whoever writes first decides; everyone reads back the same answer.
  await store.set(findKey(day),JSON.stringify(d),{nx:true,...keep(45)});
  f=parse(await store.get(findKey(day)))??d;
 }
 decided.set(day,f);knowFinds({[day]:f.object});return f;
}
async function offerStored(store:FindStore,day:string):Promise<ObjectId[]|null>{
 try{const o=JSON.parse((await store.get(offerKey(day)))??'null');return Array.isArray(o)&&o.length===3&&o.every(isObject)?o:null;}catch{return null;}
}
/** The three things on the path today. Written once, so a change in what counts as recent cannot move them mid-day. */
export async function offerOn(store:FindStore,day:string):Promise<ObjectId[]>{
 const have=await offerStored(store,day);if(have)return have;
 const today=(await findOn(store,day)).object,recent:ObjectId[]=[];
 for(let i=1;i<=14;i++){const d=dayOf(Date.parse(`${day}T12:00:00Z`)-i*DAY);recent.push(parse(await store.get(findKey(d)))?.object??rotationObject(Date.parse(`${d}T12:00:00Z`)));}
 await store.set(offerKey(day),JSON.stringify(offerFor(day,today,recent)),{nx:true,...keep(4)});
 return (await offerStored(store,day))??offerFor(day,today,recent);
}
export async function picksOn(store:FindStore,day:string,user?:string):Promise<PickView>{
 const offer=await offerOn(store,day);return pickView(day,offer,await store.hGetAll(picksKey(day)),user);
}
/** One pick per player per day; picking again changes it. */
export async function pickOn(store:FindStore,day:string,user:string,object:ObjectId):Promise<PickView>{
 const offer=await offerOn(store,day);if(!offer.includes(object))throw new Error('That is not on today’s path.');
 await store.hSet(picksKey(day),{[user]:object});try{await store.expire?.(picksKey(day),4*86400);}catch{/* the tally is small and goes with the day */}
 return picksOn(store,day,user);
}
/** Yesterday and today, so the game and the server agree on both. */
export async function knowRecentFinds(store:FindStore,now:number){await findOn(store,dayOf(now-DAY));await findOn(store,dayOf(now));}
export const ALL_FINDS=DAILY;
