// Views: on the way home from each day's find, the pet stops and looks at something. It brings the
// view back. Eleven to collect; two need the right weather and one is rare.
export type ViewId='roofs'|'moon'|'hill'|'crossing'|'laundry'|'sea'|'grass'|'light'|'rain'|'snow'|'star';
export const VIEWS:{id:ViewId;name:string;when?:'rain'|'snow'|'rare'}[]=[
 {id:'roofs',name:'Rooftops at dusk'},{id:'moon',name:'Moon on the water'},{id:'hill',name:'The one-tree hill'},{id:'crossing',name:'The crossing'},
 {id:'laundry',name:'Laundry day'},{id:'sea',name:'The sea, briefly'},{id:'grass',name:'Tall grass'},{id:'light',name:'A light at night'},
 {id:'rain',name:'Rain on the roof',when:'rain'},{id:'snow',name:'First snow',when:'snow'},{id:'star',name:'A falling star',when:'rare'},
];
export const viewName=(id:string)=>VIEWS.find(v=>v.id===id)?.name??'A view';
const mix=(a:number,b:number)=>{let x=(Math.imul(a|0,2654435761)^Math.imul(b|0,2246822519))>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;return x>>>0;};
/** The same sky for everyone: it rains about one day in four, and in winter the rain is snow and comes every other day. */
export function weatherAt(now:number):{season:'winter'|'spring'|'summer'|'autumn';sky:'rain'|'snow'|null}{
 const month=new Date(now).getUTCMonth(),season=month>=11||month<=1?'winter':month<=4?'spring':month<=7?'summer':'autumn',day=Math.floor(now/86400000);
 const wet=(Math.imul(day,2654435761)>>>0)%(season==='winter'?2:4)===0;
 return{season,sky:wet?(season==='winter'?'snow':'rain'):null};
}
/** Which view a pet brings home today. Unseen views come first, so a collection always moves. */
export function pickView(seed:number,now:number,have:readonly string[]):ViewId{
 const day=Math.floor(now/86400000),h=mix(seed,day),sky=weatherAt(now).sky;
 if(h%16===0)return 'star';
 if(sky&&!have.includes(sky))return sky;
 const common=VIEWS.filter(v=>!v.when).map(v=>v.id),fresh=common.filter(id=>!have.includes(id)),pool=fresh.length?fresh:sky&&h%3===0?[sky]:common;
 return pool[(h>>>4)%pool.length];
}
