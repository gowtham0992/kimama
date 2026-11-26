import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {requestExpandedMode,getShareData} from '@devvit/web/client';
import {NAMES} from '../shared/pet';
import {reviewFromCode} from '../shared/review';
import type {GardenView} from '../shared/garden';
import {OBJECTS,knowFinds} from '../shared/scenes';
import type {PickView} from '../shared/finds';
import {MAKER} from '../shared/launch';
import {gardenApi,petApi,pickApi,streetApi,type View} from './net';
import type {StreetView} from '../shared/street';
import {Lcd,Txt,Creature,Stars,wrap,markOf,INK,type Shape} from './px';
import {Egg,Room} from './stage';
import {SHELLS,shellFor} from './shell';
import './pet.css';
// The card in the feed is the handheld itself, switched on: your own pet, living in its room right now,
// with today's find and what the community's pets are doing with it.
/** A verdict that arrived in a shared link. Everything in it is checked against what the game itself can produce; anything else is ignored. */
function sharedVerdict(){try{const raw=getShareData();if(!raw)return null;const x=JSON.parse(raw) as Record<string,unknown>,line=reviewFromCode(x.c);
  if(!line||!NAMES.includes(x.n as string)||![1,2,3,4,5].includes(x.s as number)||!['bold','shy','gentle'].includes(x.t as string)||!['baby','child','grown'].includes(x.g as string)||![0,1,2,3,4,5].includes(x.m as number))return null;
  return{name:x.n as string,shape:x.t as Shape,stage:x.g as 'baby'|'child'|'grown',mark:x.m as number,stars:x.s as number,line,who:'sent to you'};}catch{return null;}}
const SHARED=sharedVerdict();
function Launch(){
 const[street,setStreet]=useState<StreetView|null>(null),[garden,setGarden]=useState<GardenView|null>(null),[mine,setMine]=useState<View|null>(null),[,tick]=useState(0),clock=useRef({server:0,local:0}),[path,setPath]=useState<PickView|null>(null);
 useEffect(()=>{let alive=true;
  const pet=()=>petApi().then(p=>{if(alive){clock.current={server:p.serverTime,local:Date.now()};knowFinds({[p.dailyFind.day]:p.dailyFind.object});setMine(p);}}).catch(()=>{}),yard=()=>gardenApi().then(g=>{if(alive)setGarden(g);}).catch(()=>{});
  const road=()=>streetApi().then(v=>{if(alive)setStreet(v);}).catch(()=>{});
  const walk=()=>pickApi().then(v=>{if(alive)setPath(v);}).catch(()=>{});
  void pet();void yard();void road();void walk();
  const a=setInterval(()=>{if(!document.hidden){void yard();void road();void walk();}},20000),b=setInterval(()=>{if(!document.hidden)void pet();},5000),c=setInterval(()=>{if(!document.hidden)tick(v=>v+1);},matchMedia('(prefers-reduced-motion: reduce)').matches?500:125);
  return()=>{alive=false;clearInterval(a);clearInterval(b);clearInterval(c);};},[]);
 const t=clock.current.server+Date.now()-clock.current.local,o=garden?OBJECTS[garden.object]:null,keys=['try','gentle','watch'] as const;
 const top=garden&&garden.total>0?keys.reduce((a,k)=>garden.counts[k]>garden.counts[a]?k:a,'try' as (typeof keys)[number]):null;
 const hatched=!!mine&&mine.stage!=='egg',stars=mine?.review?'★'.repeat(mine.review.stars)+'☆'.repeat(5-mine.review.stars):'';
 const status=!mine?'It will review you':!hatched?'It will review you':mine.sleeping?'is asleep':mine.dailyFind.available?'What will it do?':Math.floor(Date.now()/9600)%2?(path?.leader?`${OBJECTS[path.leader].name} leads`.slice(0,21):'Tomorrow: pets choose'):`rates you ${stars}`;
 const crowd=garden&&o?(top?`${garden.total} ${garden.total===1?'pet':'pets'} out today`:'Be the first out today'):'',most=top&&o?`Most: ${o[top]}`:'';
 const run=mine?.reads?.lastDay&&Math.round((Date.parse(new Date(t||Date.now()).toISOString().slice(0,10))-Date.parse(mine.reads.lastDay))/86400000)<=2?mine.reads.streak:0,streak=hatched&&run>0?`Your streak: ${run}`:'';
 const turns=[status,...(crowd?[crowd]:[]),...(most?[most]:[]),...(streak?[streak]:[])],line=turns[Math.floor(Date.now()/3200)%turns.length];
 // Half the time the card shows what the game is: a pet's verdict on its human. Other players' pets first, else your own.
 const wall=street?.wall??[],other=wall.length?wall[Math.floor(Date.now()/10000)%wall.length]:null;
 const said=SHARED??(other?{name:other.name,shape:(other.temperament??'gentle') as Shape,stage:other.stage,mark:other.mark,stars:other.stars??3,line:other.line??'',who:'on its human'}:hatched&&mine?{name:mine.name,shape:(mine.temperament??'gentle') as Shape,stage:mine.stage as 'baby'|'child'|'grown',mark:markOf(mine.bornAt),stars:mine.review.stars,line:mine.review.line,who:'on you'}:!mine||!hatched?{name:'For example',shape:'bold' as Shape,stage:'child' as const,mark:0,stars:2,line:'You: keep it safe. Me: launch it. Have we met?',who:'on its human'}:null);
 const verdict=!!said&&Math.floor(Date.now()/5000)%2===1,e=Date.now();
 const open=(e:React.MouseEvent)=>{try{requestExpandedMode(e.nativeEvent,'pet');}catch{/* the feed will retry on the next tap */}};
 return <main className="pet-launch" style={SHELLS[shellFor(mine?.bornAt)].vars as React.CSSProperties} onClick={open}>
  <div className={`bezel ${mine?.sleeping?'night':''}`}><Lcd label={`Kimama, a little pet that reviews you. ${status}. ${crowd}${said?` ${said.name}, ${said.who}: ${said.stars} of 5 stars. ${said.line}`:''}`} night={!!mine?.sleeping}>
   {o&&o.name.length>13?<Txt s={o.name.slice(0,21)} x={64} y={3} align="center"/>:<><Txt s={new Date().toLocaleDateString('en',{month:'short',day:'numeric',timeZone:'UTC'})} x={3} y={3}/>{o&&<Txt s={o.name} x={125} y={3} align="right"/>}</>}<path d="M0 12h128v1H0z" fill={INK} opacity={.35}/>
   {verdict&&said?<>
    <Creature x={28} y={58} look={{shape:said.shape,stage:said.stage,mark:said.mark,eyes:Math.floor(e/250)%17===0?'shut':said.stars<=2?'low':said.stars>=4?'happy':'open',...(said.stars<=2?{mouth:'flat' as const}:{})}}/>
    <Txt s={said.name} x={54} y={20}/><Txt s={said.who} x={54} y={30} opacity={.75}/><Stars n={said.stars} x={54} y={43}/>
    <path d="M0 62h128v1H0z" fill={INK} opacity={.35}/>
    {wrap(said.line,19).slice(0,4).map((l,i)=><Txt key={i} s={l} x={64} y={68+i*10} align="center"/>)}
    <Txt s={hatched?'What does yours say?':'What will yours say?'} x={64} y={116} align="center" opacity={.85}/>
   </>:<>
   {hatched?<Room pet={mine!} now={t} fx={null} grown={street?.grown}/>:<Egg now={Date.now()}/>}
   <path d="M0 101h128v1H0z" fill={INK} opacity={.35}/>
   <Txt s={hatched?mine!.name:'Kimama'} x={64} y={105} align="center"/><Txt s={line.slice(0,21)} x={64} y={116} align="center" opacity={.85}/></>}
  </Lcd></div>
  <div className="launch-side"><div className="about"><span className="brand">Kimama</span><p>A little pet that reviews you.</p>{MAKER&&<small>by u/{MAKER}</small>}</div><button aria-label="Open Kimama">▶</button><span className="go">Open</span><div className="speaker" aria-hidden="true"><i/><i/><i/></div></div>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Launch/>);
