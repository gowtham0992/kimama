// What the matrix shows: the room, and the little plays (daily find, playdate, garden).
// Living things and their props are drawn in double-size dots; type, icons and scenery stay fine.
import type {PetView} from '../shared/pet';
import type {PetScene,ScenePet} from '../shared/scenes';
import {OBJECTS} from '../shared/scenes';
import type {GardenView} from '../shared/garden';
import {plantLevel,type Visitor} from '../shared/street';
import {weatherAt} from '../shared/views';
import {ART,EMOTE,OBJ,Big,Bits,Creature,Txt,markOf,INK,PAPER,type EmoteId,type Look,type Shape} from './px';
import {direct,FLOOR,type Fx} from './director';

const step=(v:number)=>Math.round(v/2)*2,c01=(u:number)=>Math.max(0,Math.min(1,u));
const go=(a:number,b:number,u:number)=>step(a+(b-a)*c01(u));
const feet=(t:number,on:boolean):0|1|2=>on?(Math.floor(t/250)%2?1:2):0;
const hop=(t:number,p=500,h=4)=>{const u=(t%p)/p;return u<.5?step(Math.sin(u*2*Math.PI)*h):0;};
const objId=(name?:string)=>Object.keys(OBJECTS).find(k=>OBJECTS[k as keyof typeof OBJECTS].name===name);
export function Emote({id,x,y,s=2}:{id:EmoteId;x:number;y:number;s?:number}){return <Big rows={EMOTE[id]} x={x} y={y} s={s}/>;}
export function Thing({id,x,y,s=2}:{id:string;x:number;y:number;s?:number}){return <Big rows={OBJ[id]??OBJ.pebble} x={x} y={y} s={s}/>;}
/** Height of the sprite above the floor, in screen dots, so emotes sit just over the head. */
const tall=(stage:string|undefined,look:Partial<Look>,s=2)=>(20-Math.min(6,(look.squash??0)+(stage==='baby'?3:stage==='child'?1:0)))*s;
/** Marks sit beside the head, on whichever side has room. */
const beside=(x:number)=>x>84?x-32:x+32;
const floor=(y:number)=><path d={`M0 ${y+1}h128v1H0z`} fill={INK}/>;

// The street's plant, on every sill. Six sizes; at the last a butterfly keeps it company.
const POT=['#########','.#######.','.#######.','..#####..'];
const PLANTS:string[][]=[[],
 ['....#....','...##....','....#....'],
 ['...#.#...','..##.##..','....#....','....#....'],
 ['....#....','..#.#.##.','.##.###..','..###....','....#....','....#....'],
 ['....#....','...###...','....#....','..#.#.##.','.##.###..','..###....','....#....','....#....'],
 ['..#.#.#..','...###...','..##.##..','...###...','..#.#.#..','....#....','..#.#.##.','.##.###..','..###....','....#....'],
 ['..#.#.#..','...###...','..##.##..','...###...','..#.#.#..','....#....','..#.#.##.','.##.###..','..###....','....#....']];
export function Room({pet,now,fx,point,guest,wavedAt=0,grown}:{pet:PetView;now:number;fx:Fx|null;point?:{x:number;y:number}|null;guest?:Visitor|null;wavedAt?:number;grown?:number}){
 const clock=new Date(),hour=clock.getHours()+clock.getMinutes()/60,day=hour>=6&&hour<18,arc=day?(hour-6)/12:((hour+6)%24)/12;
 // The window keeps real time: the sun or the moon crosses it once, left to right.
 const skyX=Math.round(79+arc*36),skyY=Math.round(23+Math.abs(arc-.5)*14);
 // Weather is the same for everyone. It rains about one day in four; in winter the rain is snow, and it comes more often.
 const wx=weatherAt(Date.now()),season=wx.season,wet=!!wx.sky,T=Date.now();
 const shape=(pet.temperament??'gentle') as Shape,a=pet.activity,keep=objId(pet.keepsake);
 const f=direct({now,seed:pet.bornAt%9973,sleeping:pet.sleeping,fx,keepX:18,mess:(pet.droppings??0)>0,night:hour>=22||hour<6,sky:wx.sky??undefined,style:pet.style,point,guest:guest?now-guest.from:undefined,act:a?{kind:a.kind,elapsed:now-a.startedAt,duration:a.duration,style:a.style}:null});
 const y=FLOOR+f.near-f.lift,look:Look={...f.look,shape,stage:pet.stage,mark:markOf(pet.bornAt)},wants=!pet.sleeping&&(pet.mood==='hungry'||pet.mood==='messy'||pet.mood==='tired');
 return <g>
  {floor(FLOOR)}
  <g clipPath="url(#pane)">
   {day?<path d={`M${skyX+1} ${skyY}h3v1h1v3h-1v1h-3v-1h-1v-3h1z`} fill={INK}/>:<><path d={`M${skyX} ${skyY}h3v1h1v4h-1v1h-3v-1h2v-1h1v-2h-1v-1h-2z`} fill={INK}/><path d={`M${skyX>100?81:116} 23h1v1h-1zM${skyX>100?88:110} 40h1v1h-1zM${skyX>100?93:104} 29h1v1h-1z`} fill={INK}/></>}
   {guest&&(()=>{
    // A neighbour's pet comes up to the glass at full size: ears, forehead and eyes over the sill, the rest hidden by the wall.
    const e=now-guest.from,left=guest.until-now,up=Math.min(1,e/1200),down=Math.max(0,1-left/1200),waved=T-wavedAt<2600,n=guest.stage==='baby'?3:guest.stage==='child'?1:0,low=guest.temperament==='shy'?8:0;
    // Daifuku is far too big for the window. You get the face.
    if(guest.id==='stray-daifuku')return <Creature s={3} x={99} y={56+step((1-up+down)*54)-(waved?hop(T-wavedAt,400,3):0)} look={{shape:'gentle',stage:'grown',gx:waved?0:-1,eyes:waved?'happy':Math.floor(now/250)%23===0?'shut':'open',mouth:waved?'open':'flat'}}/>;
    return <Creature x={99} y={61-2*n-low+step((1-up+down)*(28+2*n+low))-(waved?hop(T-wavedAt,400,4):0)} look={{shape:(guest.temperament??'gentle') as Shape,stage:guest.stage,mark:guest.mark,gx:waved?0:-2,eyes:waved?'happy':Math.floor(now/250)%19===0?'shut':'open'}}/>;})()}
   {wet&&season!=='winter'&&[0,1,2,3,4,5,6].map(k=><path key={k} d={`M${78+k*7} ${18+((Math.floor(T/150)+k*5)%30)}h1v3h-1z`} fill={INK}/>)}
   {wet&&season==='winter'&&[0,1,2,3,4,5,6,7].map(k=><path key={k} d={`M${77+k*6+(Math.floor(T/700+k)%2)} ${19+((Math.floor(T/350)+k*11)%29)}h1v1h-1z`} fill={INK}/>)}
   {!wet&&season==='autumn'&&(()=>{const t=T%7000,x=92+Math.round(Math.sin(t/650)*9)+Math.floor(t/1400);return t<5600?<Bits rows={Math.floor(t/650)%2?['.##','##.']:['##.','.##']} x={x} y={18+Math.floor(t/200)}/>:null;})()}
   {!wet&&season==='spring'&&[0,1,2].map(k=><path key={k} d={`M${78+((Math.floor(T/400)+k*17)%44)} ${19+((Math.floor(T/500)+k*9)%29)}h2v1h-2z`} fill={INK}/>)}
   {!wet&&season==='summer'&&!day&&[0,1,2].map(k=>{const h=Math.imul(Math.floor(T/2200)+k*97,2654435761)>>>0;return Math.floor(T/550+k)%4<2?<path key={k} d={`M${79+h%40} ${24+(h>>>8)%20}h1v1h-1z`} fill={INK}/>:null;})}
  </g>
  <path d="M74 18h50v31H74zM76 20v27h46V20zM98 20h2v27h-2z" fill={INK} fillRule="evenodd"/><path d="M72 49h54v2H72z" fill={INK}/>
  {grown!==undefined&&(()=>{const lv=plantLevel(grown),rows=PLANTS[lv],top=45-rows.length;return <g><rect x={112} y={top} width={10} height={rows.length+4} fill={PAPER}/><Bits rows={rows} x={112} y={top}/><Bits rows={POT} x={112} y={45}/>{lv>=6&&<Bits rows={Math.floor(T/300)%2?['#.#','.#.']:['.#.','#.#']} x={104+Math.round(Math.sin(T/900)*3)} y={top-4+Math.round(Math.cos(T/700)*2)}/>}</g>;})()}
  {guest&&T-wavedAt<2600&&<Big rows={EMOTE.heart} x={62} y={44}/>}
  {f.props.map((p,i)=>p.k==='fly'&&<path key={'f'+i} d={`M${p.x} ${p.y}h2v2h-2z`} fill={INK}/>)}
  {f.props.map((p,i)=>p.k==='bird'&&<Bits key={i} rows={p.f?ART.bird2:ART.bird} x={p.x} y={p.y}/>)}
  {keep&&!f.props.some(p=>p.k==='keep')&&<Thing id={keep} x={18} y={FLOOR}/>}
  {Array.from({length:pet.droppings??0},(_,i)=><g key={i}><Big rows={ART.drop} x={116-i*17} y={FLOOR}/>{Math.floor(now/500)%2===i%2&&<Big rows={ART.stink} x={118-i*17} y={FLOOR-13}/>}</g>)}
  {f.props.map((p,i)=>p.k==='bowl'?<Big key={i} rows={ART.bowl} x={p.x} y={p.y}/>:p.k==='bowlTip'?<Big key={i} rows={[...ART.bowl].reverse()} x={p.x} y={p.y}/>:p.k==='food'?<Big key={i} rows={p.f?ART.food.slice(1):ART.food} x={p.x} y={p.y-10}/>:p.k==='keep'?<Thing key={i} id={keep??'pebble'} x={p.x} y={p.y}/>:p.k==='egg'?<Big key={i} rows={ART.egg} x={p.x} y={p.y}/>:p.k==='crack'?<Big key={i} rows={ART.crack} x={p.x} y={p.y-12} fill={PAPER}/>:null)}
  {!f.hidden&&<Creature x={f.x} y={y} look={look}/>}
  {f.props.map((p,i)=>p.k==='ball'?<Big key={i} rows={p.f?ART.ball2:ART.ball} x={p.x} y={p.y}/>:p.k==='bubble'?<Big key={i} rows={ART.bubble} x={p.x} y={p.y}/>:p.k==='spark'?<Big key={i} rows={ART.spark} x={p.x} y={p.y}/>:null)}
  {!f.hidden&&f.emote&&<Emote id={f.emote} x={beside(f.x)} y={y-tall(pet.stage,look)+(f.emote==='zed'?8-step(Math.floor(now/500)%3*2):12)}/>}
  {pet.sleeping&&(()=>{
   // It dreams of what it knows: its treasure, today's find, rice.
   const things=[keep,objId(pet.dailyFind?.name),'rice'].filter(Boolean) as string[],k=Math.floor(T/9000),t=T%9000,id=things[k%things.length],rows=id==='rice'?ART.onigiri:OBJ[id]??OBJ.pebble;
   return t<6400?<g><path d="M46 63h2v2h-2zM43 56h3v3h-3z" fill={INK}/>{t>700&&<><path d="M30 29h24v1H30zM30 52h24v1H30zM28 31h1v20h-1zM55 31h1v20h-1zM29 30h1v1h-1zM54 30h1v1h-1zM29 51h1v1h-1zM54 51h1v1h-1z" fill={INK}/>{t>1300&&<Big rows={rows} x={42} y={41+Math.ceil(rows.length/2)} s={1}/>}</>}</g>:null;})()}
  {wants&&Math.floor(now/500)%2===0&&<g><path d="M2 17h11v15H2zM3 18v13h9V18z" fill={INK} fillRule="evenodd"/><Bits rows={EMOTE.bang} x={6} y={21}/></g>}
 </g>;
}
// The first thing anyone sees: drawn large, and restless. It rocks, settles, and now and then jumps, because someone is in there.
export function Egg({now}:{now:number}){const t=now%4000,rock=t<900?(Math.floor(t/150)%2?2:-2):0,jump=t>2000&&t<2300?Math.round(Math.sin((t-2000)/300*Math.PI)*4):0;return <g>{floor(FLOOR)}<Big rows={ART.egg} x={64+rock} y={FLOOR-jump} s={3}/></g>;}

// ---- Little plays ----------------------------------------------------------------------------
type Actor={x:number;lift?:number;back?:number;look:Partial<Look>;emote?:EmoteId};
const GROUND=84;
function soloFrame(s:PetScene,i:number,t:number):{a:Actor;ox:number;oy:number}{
 const b=s.beats[Math.min(i,s.beats.length-1)],shy=s.actors[0].bold< -2,u=c01(t/3600),start=26,tell=s.tell??(shy?'watch':'try'),stand=tell==='watch'?30:50;
 const restAt=s.choice==='try'?{a:78,o:116}:s.choice==='gentle'?{a:60,o:96}:{a:stand,o:150};
 if(i>=s.beats.length||b.motion==='rest'||b.motion==='bye'){const a:Actor={x:restAt.a,look:{eyes:s.choice==='watch'?'open':'happy',gx:s.choice==='watch'?2:0,squash:s.choice==='watch'?2:0},lift:s.choice==='watch'?0:hop(t,900,4)};if(s.choice!=='watch'&&t%2400<1200)a.emote=s.choice==='gentle'?'heart':'note';return{a,ox:s.choice==='watch'?go(122,150,c01(t/5000)):restAt.o,oy:s.choice==='gentle'?6:0};}
 if(b.motion==='arrive')return{a:{x:start,look:{gx:2,eyes:u>.5?'wide':'open'},emote:u>.6&&u<1?'bang':undefined},ox:go(150,104,u),oy:u<1?hop(t,450,2):0};
 if(b.motion==='notice'&&!s.choice){
  // The tell: how it carries itself before it acts. Learn to read this and you can call the day.
  // On a mood day the body says one thing and a smaller sign says the truth: tapping feet mean go, soft eyes mean gentle, a look back means wait.
  const sign=(a:Actor):Actor=>{const on=t>3600&&t%2600<900;if(!s.cue||!on)return a;return{...a,look:{...a.look,...(s.cue==='try'?{feet:feet(t,true)}:s.cue==='gentle'?{eyes:'happy' as const}:{gx:-2})}};};
  if(tell==='try')return{a:sign({x:go(start,stand,u),lift:u<1?hop(t,400,4):hop(t,900,3),look:{gx:2,feet:feet(t,u<1),eyes:'wide',mouth:'open'},emote:u>.4&&t%1600<900?'bang':undefined}),ox:104,oy:0};
  if(tell==='gentle'){const v=c01(t/5200);return{a:sign({x:go(start,stand,v),look:{gx:2,feet:feet(t,v<1&&Math.floor(t/600)%2===0),eyes:'open'},emote:v>=1&&t%2000<1100?'ask':undefined}),ox:104,oy:0};}
  return{a:sign({x:go(start,stand,c01(t/1500)),look:{gx:2,gy:1,feet:feet(t,t<1500),eyes:'low',squash:t>1500?1:0},emote:t>2200&&t%2400<1200?'dots':undefined}),ox:104,oy:0};
 }
 if(b.motion==='notice')return{a:{x:stand,look:{gx:2,squash:2,eyes:Math.floor(t/250)%15===0?'shut':'open'}},ox:go(104,122,c01(t/6000)),oy:0};
 if(b.motion==='play'){const reach=c01(u*2),flee=c01(u*2-1);return{a:{x:u<.5?go(stand,68,reach):go(68,78,flee),lift:u>=.5?hop(t,400,4):0,look:{gx:2,feet:feet(t,u<1),eyes:'happy',mouth:'open'},emote:u>=1&&t%1800<900?'note':undefined},ox:u<.5?104:go(104,116,flee),oy:u>=.5&&u<1?hop(t,400,6):0};}
 if(b.motion==='keep'){const x=go(stand,60,u);return{a:{x,look:{gx:2,feet:feet(t,u<1),eyes:u>=1?'happy':'open'},emote:u>=1&&t%2200<1300?'heart':undefined},ox:u<1?104:96,oy:u>=1?6:0};}
 return{a:{x:stand,look:{}},ox:104,oy:0};
}
function pairFrame(s:PetScene,i:number,t:number):{a:Actor;b:Actor;ox:number|null;oy:number;rain:boolean}{
 const beat=s.beats[Math.min(i,s.beats.length-1)],mid=s.beats[1]?.motion??'share',u=c01(t/3600),warm=/friends|trust|company/i.test(s.standing??'');
 const end:Record<string,[number,number,number|null]>={share:[26,102,64],shelter:[40,90,64],race:[54,104,null],hide:[30,102,66],notice:[26,104,58]};
 const pose=(p:string|undefined):Partial<Look>=>p==='turn'?{back:true}:p==='proud'||p==='play'?{eyes:'happy',mouth:'open'}:p==='watch'?{eyes:'low'}:{};
 if(i>=s.beats.length||beat.motion==='rest'||beat.motion==='bye'){const[e0,e1,eo]=end[mid]??end.share;return{a:{x:e0,lift:hop(t,1200,4),look:{gx:2,eyes:'happy'},emote:warm&&t%2600<1200?'heart':undefined},b:{x:e1,lift:hop(t+600,1200,4),back:mid==='race'?8:0,look:{gx:-2,eyes:'happy'}},ox:eo,oy:0,rain:false};}
 if(beat.motion==='arrive'){const shy=beat.otherPose==='watch';return{a:{x:go(-30,26,u),look:{gx:2,feet:feet(t,u<1)}},b:shy?{x:u<.6?126:go(126,112,(u-.6)/.4),look:{gx:-2,eyes:'low',gy:1},emote:u>=1&&t%2000<1000?'ask':undefined}:{x:go(150,102,u),lift:u<1?hop(t,400,4):0,look:{gx:-2,feet:feet(t,u<1),eyes:'wide'},emote:u>.5&&u<1?'bang':undefined},ox:null,oy:0,rain:false};}
 if(beat.motion==='share'){const ph=(t%2400)/2400,tri=ph<.5?ph*2:2-ph*2;return{a:{x:26,lift:ph<.15?hop(t%2400,360,4):0,look:{gx:2,eyes:'happy',mouth:'open'}},b:{x:102,lift:ph>.5&&ph<.65?hop(t%2400-1200,360,4):0,look:{gx:-2,eyes:'happy',mouth:'open'}},ox:go(58,70,tri),oy:0,rain:false};}
 if(beat.motion==='shelter'){const w=c01(t/5200);return{a:{x:go(26,40,c01(t/1800)),look:{gx:2,feet:feet(t,t<1800),eyes:w>=1?'happy':'open'}},b:{x:go(112,90,w),look:{gx:-2,gy:w<1?1:0,feet:feet(t,w<1&&Math.floor(t/700)%2===0),eyes:w>=1?'happy':'low'},emote:w>=1&&t%2400<1200?'heart':undefined},ox:64,oy:0,rain:true};}
 if(beat.motion==='race'){const lead=step(Math.sin(t/500)*6);return{a:{x:go(20,54,u)+(u<1?lead:0),lift:hop(t,300,4),look:{gx:2,feet:feet(t,true),eyes:'wide',mouth:'open'}},b:{x:go(60,104,u)-(u<1?lead:0),lift:hop(t+150,300,4),back:8,look:{gx:2,feet:feet(t,true),eyes:'wide',mouth:'open'}},ox:go(96,140,u),oy:hop(t,300,2),rain:false};}
 if(beat.motion==='hide'){const ph=(t%4800)/4800,first=ph<.5,v=first?ph*2:(ph-.5)*2;return{a:{x:first?go(26,30,v):30,look:{gx:2,feet:feet(t,first&&v<1)}},b:{x:102,look:{gx:-2,eyes:first?'low':'open'},emote:!first&&v<.5?'vein':undefined},ox:first?go(72,60,v):go(60,72,v),oy:0,rain:false};}
 return{a:{x:26,look:{gx:2,...pose(beat.pose)}},b:{x:104,look:{squash:2,gx:2,...pose(beat.otherPose)}},ox:58,oy:0,rain:false};
}
function Body({p,a}:{p:ScenePet;a:Actor}){const look={...a.look,shape:(p.temperament??'gentle') as Shape,stage:p.stage,mark:p.mark} as Look,y=GROUND-(a.lift??0)-(a.back??0);return <g><Creature x={a.x} y={y} look={look}/>{a.emote&&<Emote id={a.emote} x={beside(a.x)} y={y-tall(p.stage,look)+12}/>}</g>;}
export function Play({scene,beat,t}:{scene:PetScene;beat:number;t:number}){
 const pair=scene.actors.length===2;
 if(!pair){const f=soloFrame(scene,beat,t);return <g>{floor(GROUND)}<Thing id={scene.object} x={f.ox} y={GROUND-f.oy}/><Body p={scene.actors[0]} a={f.a}/></g>;}
 const f=pairFrame(scene,beat,t),mine=scene.you===1?f.b:f.a,roof=scene.object==='umbrella';
 return <g>{floor(GROUND)}
  {f.rain&&[6,18,110,122,28,100].map((x,k)=><Big key={k} rows={ART.rain} x={x} y={24+((Math.floor(t/120)*7+k*17)%58)}/>)}
  {(f.b.back??0)>0?<><Body p={scene.actors[1]} a={f.b}/><Body p={scene.actors[0]} a={f.a}/></>:<><Body p={scene.actors[0]} a={f.a}/><Body p={scene.actors[1]} a={f.b}/></>}
  {f.ox!==null&&<Thing id={scene.object} x={roof?66:f.ox} y={roof?GROUND-30:GROUND-f.oy} s={roof?3:2}/>}
  {scene.you!==undefined&&<Bits rows={ART.mine} x={mine.x-2} y={16}/>}
 </g>;
}
export function Tally({garden,scene,name,next,stampAt=-1}:{garden:GardenView|null;scene:PetScene;name:string;next:string;stampAt?:number}){
 // The one result card: what it did, whether you read it right, your streak, everyone else, and when to come back.
 const o=OBJECTS[scene.object],keys=['try','gentle','watch'] as const,max=Math.max(1,...keys.map(k=>garden?.counts[k]??0));
 return <g><Txt s={`${name} chose to`} x={stampAt>=0?54:64} y={15} align="center" opacity={.8}/><Txt s={scene.choice?o[scene.choice]:'...'} x={stampAt>=0?54:64} y={25} align="center"/>
  {scene.guess&&<Txt s={scene.guessed?((scene.streak??0)>1?`Read right ♥ ${scene.streak} days`:'You read it right ♥'):'Not what you thought'} x={64} y={36} align="center"/>}
  {stampAt>=0&&(()=>{const y=stampAt<300?4:stampAt<420?16:14,rows=OBJ[scene.object]??OBJ.pebble;return <g><rect x={107} y={y} width={18} height={18} fill={INK}/><Big rows={rows} x={116} y={y+9+Math.ceil(rows.length/2)} s={1} fill={PAPER}/></g>;})()}
  <path d="M4 46h120v1H4z" fill={INK} opacity={.5}/>
  {!garden?null:garden.total>0?keys.map((k,i)=>{const n=garden.counts[k],w=Math.round(n/max*12);return <g key={k}><Txt s={o[k].slice(0,15)} x={10} y={50+i*9}/>{w>0&&<rect x={103} y={50+i*9} width={w} height={7} fill={INK}/>}<Txt s={String(n)} x={125} y={50+i*9} align="right"/>{scene.choice===k&&<Txt s="▶" x={3} y={50+i*9}/>}</g>;}):<Txt s="First pet here today" x={64} y={58} align="center"/>}
  {next&&<Txt s={next} x={64} y={80} align="center" opacity={.8}/>}
 </g>;
}
