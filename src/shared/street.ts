// The street: every pet wanders past other people's windows on its own. Nobody joins or invites;
// being a neighbour is automatic. Only a pet's name, shape and age travel, never who owns it.
/** A postcard: the view another pet saw on its way home, left at your window when the two of you wave. */
export type Card={view:string;from:string;day:string};
export type Walker={did?:'try'|'gentle'|'watch';knows?:number;stars?:number;line?:string;view?:string;mark?:number;id:string;name:string;temperament?:'bold'|'shy'|'gentle';stage:'baby'|'child'|'grown';stray?:boolean};
export type Visitor=Walker&{from:number;until:number};
export type StreetView={count:number;visitor:Visitor|null;news:{seen:number;waves:number}|null;cards?:Card[];grown?:number;wall?:Walker[];told?:boolean};
/** One plant, on every sill, that belongs to the whole street. It grows with every find any pet makes, ever. */
export const PLANT=[1,4,10,25,60,150];
export const plantLevel=(finds:number)=>PLANT.filter(n=>finds>=n).length;
/** Add a card unless that view is already in the pile. Newest last, forty kept. */
export const addCard=(pile:Card[],c:Card):Card[]=>pile.some(x=>x.view===c.view)?pile:[...pile,c].slice(-40);
/** Strays keep an empty street from feeling abandoned. They are characters, never counted as players. */
export const STRAYS:Walker[]=[{mark:4,id:'stray-koma',name:'Koma',temperament:'shy',stage:'child',stray:true},{mark:1,id:'stray-fuku',name:'Fuku',temperament:'gentle',stage:'grown',stray:true},{mark:5,id:'stray-riku',name:'Riku',temperament:'bold',stage:'baby',stray:true}];
/** Rare, and enormous. Only its face fits in the window. */
export const DAIFUKU:Walker={id:'stray-daifuku',name:'Daifuku',temperament:'gentle',stage:'grown',stray:true};
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
export const SLOT=90000,STAY=40000;
/** A stable, opaque name for a pet on today's street. */
export const walkerId=(ownerKey:string,day:string)=>'w'+hash(`${ownerKey}|${day}`).toString(36)+hash(`${day}|${ownerKey}`).toString(36);
/** Who is at this viewer's window right now. Two slots in three someone comes by, for forty seconds.
 * A pet in its first quarter of an hour is never left alone: someone comes by in every slot, so a first visit meets a neighbour. */
export function pickVisitor(roster:Walker[],self:string,now:number,fresh=false):Visitor|null {
 const slot=Math.floor(now/SLOT),h=hash(`${self}:${slot}`);
 if(h%3===2&&!fresh)return null;
 const others=roster.filter(w=>w.id!==self),pool=others.length?others:STRAYS,w=(h>>>4)%31===0?DAIFUKU:pool[(h>>>3)%pool.length],from=slot*SLOT+(h>>>9)%20000;
 return now>=from&&now<from+STAY?{...w,from,until:from+STAY}:null;
}
