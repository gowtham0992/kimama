// Tomorrow's find is chosen by today's pets. On the way home each pet spots the same three things on the path, and its owner picks one
// to bring back. The most-picked comes back tomorrow for everyone. Pure rules here; the server keeps the tallies.
import {DAILY,KIND,OBJECTS,hash,rotationObject,type ObjectId} from './scenes';

export const DAY=86400000;
export const dayOf=(t:number)=>new Date(t).toISOString().slice(0,10);
export const nextDay=(day:string)=>dayOf(Date.parse(`${day}T12:00:00Z`)+DAY);
export const prevDay=(day:string)=>dayOf(Date.parse(`${day}T12:00:00Z`)-DAY);

/** The three things on the path on `day`. Never today's find or anything found in the last fortnight, never today's sort of thing,
 * and three different sorts, so the choice is between kinds of day, not near-copies. The same three for everyone. */
export function offerFor(day:string,today:ObjectId,recent:ObjectId[]):ObjectId[] {
 const order=(ids:ObjectId[])=>[...ids].sort((a,b)=>hash(`${day}:${a}:path`)-hash(`${day}:${b}:path`));
 for(const avoid of [new Set([today,...recent]),new Set([today])]){
  const out:ObjectId[]=[];
  for(const id of order(DAILY.filter(o=>!avoid.has(o)&&KIND[o]!==KIND[today])))if(!out.some(x=>KIND[x]===KIND[id])){out.push(id);if(out.length===3)return out;}
 }
 return DAILY.filter(o=>o!==today).slice(0,3);
}
export type Tally={votes:Partial<Record<ObjectId,number>>;total:number};
/** Counts only votes for things that were on the path. */
export function tallyOf(offer:ObjectId[],picks:Record<string,string>):Tally {
 const votes:Partial<Record<ObjectId,number>>={};let total=0;
 for(const o of Object.values(picks))if(offer.includes(o as ObjectId)){votes[o as ObjectId]=(votes[o as ObjectId]??0)+1;total++;}
 return{votes,total};
}
/** What comes back: the most-picked; a tie goes to whichever was further along the path. With no picks at all, the first on the path. */
export function winnerOf(offer:ObjectId[],t:Tally):{object:ObjectId;votes:number} {
 let best=offer[0],n=t.votes[best]??0;for(const o of offer)if((t.votes[o]??0)>n){best=o;n=t.votes[o]!;}
 return{object:best,votes:n};
}
/** Without yesterday's path (the day this began, or a day nobody opened the game) the rotation decides, as it always did. */
export function decideFind(day:string,yesterdaysOffer:ObjectId[]|null,picks:Record<string,string>):{object:ObjectId;votes:number;total:number} {
 if(!yesterdaysOffer?.length)return{object:rotationObject(Date.parse(`${day}T12:00:00Z`)),votes:0,total:0};
 const t=tallyOf(yesterdaysOffer,picks),w=winnerOf(yesterdaysOffer,t);return{...w,total:t.total};
}
/** For the screen: where the vote stands. */
export type PickView={day:string;offer:ObjectId[];votes:Partial<Record<ObjectId,number>>;total:number;mine?:ObjectId;leader?:ObjectId};
export function pickView(day:string,offer:ObjectId[],picks:Record<string,string>,user?:string):PickView {
 const t=tallyOf(offer,picks),mine=user&&offer.includes(picks[user] as ObjectId)?picks[user] as ObjectId:undefined;
 return{day,offer,votes:t.votes,total:t.total,...(mine?{mine}:{}),...(t.total?{leader:winnerOf(offer,t).object}:{})};
}
export const isObject=(o:unknown):o is ObjectId=>typeof o==='string'&&o in OBJECTS;
