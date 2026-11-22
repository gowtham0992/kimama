// Yesterday on the street, as one comment under today's post: something to read, compare and answer before playing.
// Built only from counts, pet names (a fixed list) and authored lines. Never an owner's name.
import {OBJECTS,an,type ObjectId,type Choice} from './scenes';
import {starText} from './review';

export type RecapPet={name:string;stars?:number;line?:string;knows?:number;temperament?:'bold'|'shy'|'gentle';did?:Choice};
export type RecapInput={object:ObjectId;counts:Record<Choice,number>;total:number;pets:RecapPet[];today:ObjectId};
/** Null when nobody went out: an empty recap is worse than none. */
export function recapText(r:RecapInput):string|null {
 const rated=r.pets.filter((p):p is RecapPet&{stars:number;line:string}=>typeof p.stars==='number'&&!!p.line),o=OBJECTS[r.object];
 if(r.total<1&&!rated.length)return null;
 const out=[`**Yesterday: ${an(o.name)}.**`];
 if(r.total===1){const k=(['try','gentle','watch'] as const).find(k=>r.counts[k]>0)!;out.push(`One pet went out. It chose: ${o[k]}.`);}
 else if(r.total>1)out.push(`${r.total} pets went out. ${(['try','gentle','watch'] as const).filter(k=>r.counts[k]>0).sort((a,b)=>r.counts[b]-r.counts[a]).map(k=>`${o[k]}: ${Math.round(r.counts[k]/r.total*100)}%`).join(' · ')}`);
 // By nature: something a newcomer can use tomorrow, and something an owner can say their pet is the exception to.
 const natures=(['bold','gentle','shy'] as const).flatMap(n=>{const of=r.pets.filter(p=>p.temperament===n&&p.did);if(of.length<2)return[];const c=(k:Choice)=>of.filter(p=>p.did===k).length,top=(['try','gentle','watch'] as const).reduce((a,k)=>c(k)>c(a)?k:a);
  // Only a real majority is news. An even split says so instead of picking a winner.
  if(c(top)*2<=of.length)return[`${n} ones were split`];return[`${n} ones mostly chose "${o[top]}"`];});
 if(natures.length){const t=natures.join(' · ');out.push(t[0].toUpperCase()+t.slice(1)+'.');}
 if(rated.length>1)out.push(`By the end of the day, the pets rated their humans ${(rated.reduce((a,p)=>a+p.stars,0)/rated.length).toFixed(1)} stars out of 5, on average.`);
 if(rated.length){
  const low=rated.reduce((a,p)=>p.stars<a.stars?p:a),high=rated.reduce((a,p)=>p.stars>=a.stars?p:a);
  out.push(`${rated.length>1?'Harshest review':'The only review'}: **${low.name}**, ${starText(low.stars)} "${low.line}"`);
  if(high!==low&&high.stars>low.stars)out.push(`Kindest: **${high.name}**, ${starText(high.stars)} "${high.line}"`);
 }
 const known=r.pets.filter((p):p is RecapPet&{knows:number}=>typeof p.knows==='number');
 if(known.length>1){const best=known.reduce((a,p)=>p.knows>a.knows?p:a);out.push(`Best-known pet: **${best.name}**. Its human calls it right ${best.knows}% of the time.`);}
 out.push(`Today: ${an(OBJECTS[r.today].name)}. What will yours do, and what will it say about you?`);
 return out.join('\n\n');
}
