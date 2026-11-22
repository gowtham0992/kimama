// The director turns server facts (what the pet is doing, since when, in what style) into
// stepped frames. It is a pure function of time, so a reload resumes the same moment.
// Rule borrowed from the old handhelds and from Petz: show the process, never the meter.
import type {Look,EmoteId} from './px';

export type Prop={k:'fly'|'ball'|'bowl'|'bowlTip'|'food'|'keep'|'bird'|'bubble'|'spark'|'egg'|'crack';x:number;y:number;f?:number};
export type Frame={x:number;lift:number;near:number;look:Omit<Look,'shape'|'stage'>;emote?:EmoteId;props:Prop[];hidden?:boolean};
export type Act={kind:string;elapsed:number;duration:number;style:'eager'|'cautious'|'gentle'};
export type Fx={kind:string;elapsed:number};

export const FLOOR=96,HOME=60;
const step=(v:number)=>Math.round(v/2)*2; // creatures move two dots at a time
const clamp01=(u:number)=>Math.max(0,Math.min(1,u));
const span=(t:number,a:number,b:number)=>clamp01((t-a)/(b-a));
const go=(from:number,to:number,u:number)=>step(from+(to-from)*clamp01(u));
const feetAt=(t:number,moving:boolean):0|1|2=>moving?(Math.floor(t/250)%2?1:2):0;
const hop=(t:number,period=500,height=4)=>{const u=(t%period)/period;return u<.5?Math.round(Math.sin(u*2*Math.PI)*height):0;};
const hash=(n:number)=>{let x=(n|0)*2654435761>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;return x>>>0;};

function idle(now:number,seed:number,mess:boolean,night:boolean,point?:{x:number;y:number}|null,sky?:'rain'|'snow'):Frame{
 // Five-second thoughts. Most are nothing; a few are small, and that is what reads as a mind.
 const bucket=Math.floor(now/5000),t=now%5000,h=night&&hash(bucket+seed)%3===0?8:hash(bucket*31+seed)%20,blink=Math.floor(now/250)%17===0;
 const f:Frame={x:HOME,lift:Math.floor(now/600)%2?0:0,near:0,look:{eyes:blink?'shut':'open',squash:Math.floor(now/700)%2},props:[]};
 // It knows about the mess, and it would like you to know too.
 if(mess&&(h===1||h===2||h===11)){f.look.gx=2;f.look.eyes='low';if(t>700&&t<3600)f.emote='sweat';if(t>3600){f.look.gy=1;f.look.gx=0;}}
 // Weather is an event. Rain is listened to, sitting low; snow gets a hop.
 else if(sky&&(h===3||h===14||h===9)){f.look.gx=2;f.look.gy=-1;if(sky==='rain'){f.look.squash=2;f.look.eyes=t>3000&&t<4200?'shut':'open';if(t>3000&&t<4200)f.emote='dots';}else{f.look.eyes='wide';f.look.squash=0;f.lift=t>1200&&t<2600?hop(t-1200,470,5):0;if(t>1200&&t<3400)f.emote='note';}}
 else if(h===3){f.look.gx=t<1600?-2:t<3200?2:0;}
 else if(h===4){f.lift=t>800&&t<1800?hop(t-800,500,4):0;}
 else if(h===5||h===10){const far=HOME+(hash(bucket)%2?18:-18),u=t<2000?span(t,0,2000):t<3000?1:1-span(t,3000,5000);f.x=go(HOME,far,u);const moving=t<2000||t>=3000;f.look.feet=feetAt(now,moving);f.look.gx=moving?(far>HOME===t<2000?2:-2):0;f.look.squash=0;}
 else if(h===6){f.look.gy=1;f.near=t>600&&t<4200?2:0;}
 else if(h===7){f.look.feet=t<1800?feetAt(now,true):0;f.look.eyes=t<1800?'shut':f.look.eyes;}
 else if(h===8){const y=t>500&&t<2600;f.look.mouth=y?'o':'flat';f.look.eyes=y?'shut':f.look.eyes;}
 else if(h===9){f.look.squash=2;f.look.gy=1;}
 else if(h===12){ // a fly: the eyes go where it goes, and near the end the pet has a go at it
  const a=t/5000*Math.PI*2,fx=HOME+Math.round(Math.sin(a*1.5)*34),fy=FLOOR-52+Math.round(Math.cos(a*2.3)*12);
  f.props.push({k:'fly',x:fx+(Math.floor(now/120)%2),y:fy});f.look.gx=Math.max(-2,Math.min(2,Math.round((fx-HOME)/14)));f.look.gy=-1;f.look.eyes='wide';if(t>3800){f.lift=hop(t-3800,400,6);f.look.mouth='open';}}
 else if(h===13){f.look.eyes='happy';f.lift=Math.floor(t/500)%2?2:0;if(t>600&&t<4200&&t%1400<900)f.emote='note';} // humming
 else if(h===14){f.look.gx=2;f.look.gy=-1;if(t>2600)f.look.gx=-2;} // the window, then its treasure
 else if(h===15){const s=t<1200?2:t<2400?0:t<3200?1:0;f.look.squash=s;f.look.eyes=t<2400?'shut':f.look.eyes;f.look.mouth=t>1200&&t<2400?'o':'flat';} // a long stretch
 else if(h===16){ // a sneeze, which surprises nobody more than the pet
  if(t>500&&t<1300){f.look.eyes='shut';f.look.mouth='o';f.look.squash=0;}else if(t>=1300&&t<1600){f.look.eyes='shut';f.look.squash=3;f.emote='bang';}else if(t>=1600&&t<2800){f.look.eyes='wide';f.look.squash=0;}}
 else if(h===17){ // nodding off on its feet
  if(t<2600){f.look.eyes=t<900?'low':'shut';f.look.squash=Math.min(3,Math.floor(t/800));}else if(t<3700){f.look.eyes='wide';f.look.squash=0;f.lift=t<2900?3:0;f.emote='sweat';}}
 else if(h===18){ // something behind it. Nothing behind it. Check again
  const turn=t>600&&t<3000&&Math.floor((t-600)/600)%2===0;f.look.back=turn;f.look.squash=0;f.x=HOME+(t>600&&t<3000?(turn?-4:4):0);f.look.feet=feetAt(now,t>600&&t<3000);if(t>=3000&&t<4200){f.look.eyes='low';f.emote='dots';}}
 else if(h===19){ // it looks at you, and that is enough to make its day
  f.look.gy=1;if(t>700&&t<3600){f.look.eyes='happy';f.near=2;f.lift=t<1300?hop(t-700,600,3):0;if(t<2400)f.emote='heart';}}
 // A finger on the glass outranks its own thoughts: it looks at you.
 if(point){f.look.gx=Math.max(-2,Math.min(2,Math.round((point.x-f.x)/16)));f.look.gy=point.y<FLOOR-34?-1:point.y>FLOOR-8?1:0;if(f.look.eyes==='shut'||f.look.eyes==='low')f.look.eyes='open';}
 return f;
}

function act(a:Act,now:number,keepX:number):Frame{
 const e=a.elapsed,D=a.duration,slow=a.style==='cautious',eager=a.style==='eager';
 const f:Frame={x:HOME,lift:0,near:0,look:{eyes:'open'},props:[]};
 if(a.kind==='toy'){
  // A ball arrives, and the pet makes a game of it. The ball always leads; the pet follows.
  const spots=slow?[92,28]:[92,24,104,30,96],t0=2400,t1=D-5000,seg=(t1-t0)/spots.length;
  if(e<t0){f.props.push({k:'ball',x:go(128,spots[0],span(e,0,1800)),y:FLOOR,f:Math.floor(e/200)%2});f.look.gx=2;f.look.eyes=e>900?'wide':'open';if(e>1200)f.emote='bang';}
  else if(e<t1){
   const i=Math.min(spots.length-1,Math.floor((e-t0)/seg)),u=((e-t0)-i*seg)/seg,side=(s:number)=>s>64?-30:30;
   const from=i===0?HOME:spots[i-1]+side(spots[i-1]),to=spots[i]+side(spots[i]),reach=slow?.7:.5;
   if(u<reach){const uu=slow&&u>.3&&u<.45?.3/reach:u/reach;f.x=go(from,to,uu);f.look.feet=feetAt(now,!(slow&&u>.3&&u<.45));f.look.gx=to>from?2:-2;f.props.push({k:'ball',x:spots[i],y:FLOOR});if(slow&&u>.3&&u<.45)f.emote='ask';}
   else{const next=spots[i+1]??spots[i],v=(u-reach)/(1-reach);f.x=to;f.lift=eager?hop(e,400,5):hop(e,600,3);f.look.eyes='happy';f.look.mouth='open';f.props.push({k:'ball',x:go(spots[i],next,v),y:FLOOR-(v<1?Math.round(Math.sin(v*Math.PI)*6):0),f:Math.floor(e/150)%2});}
  }else{const last=spots[spots.length-1],u=span(e,t1,t1+2400);f.x=go(last+(last>64?-30:30),HOME,u);f.look.feet=feetAt(now,u<1);f.props.push({k:'ball',x:last,y:FLOOR});if(u>=1){f.look.gy=1;f.near=2;if(eager||e%1600<800)f.emote='note';f.look.eyes='happy';}}
 }else if(a.kind==='window'){
  // Something passes outside. The pet saw it first.
  const post=slow?72:84,pass=span(e,5200,9800),there=span(e,0,3600);
  f.x=e<D-3600?go(HOME,post,there):go(post,HOME,span(e,D-3600,D-400));f.look.feet=feetAt(now,(e<3600)||(e>D-3600&&e<D-400));
  if(e>=3600&&e<D-3600){f.look.gx=2;f.look.gy=-1;if(pass>0&&pass<1){f.props.push({k:'bird',x:Math.round(76+pass*40),y:26+Math.round(Math.sin(pass*9)*2),f:Math.floor(e/250)%2});f.look.eyes='wide';if(slow){f.x=post-(pass<.5?6:0);f.emote=pass<.4?'bang':undefined;}else{f.lift=hop(e,500,pass<.6?5:0);if(pass<.35)f.emote='bang';}}else if(pass>=1&&e<D-4600)f.emote='note';}
  else f.look.gx=e<3600?2:-2;
 }else if(a.kind==='greet'){
  // It comes to the glass and waits for you. Unanswered, it gives up, and you can see it give up.
  const wait=e>2200&&e<D-4200;
  f.near=e<D-3000?Math.round(span(e,600,2200)*4):Math.round((1-span(e,D-3000,D-1200))*4);f.look.feet=feetAt(now,(e>600&&e<2200)||(e>D-3000&&e<D-1200));
  f.look.gy=1;if(wait){f.look.eyes=Math.floor(e/250)%13===0?'shut':'wide';f.lift=e%2200<500?hop(e%2200,500,3):0;if(e%2200<1100)f.emote='heart';}
  if(e>=D-4200){f.look.eyes='low';f.look.mouth='flat';if(e<D-2600)f.emote='dots';}
 }else if(a.kind==='tidy'){
  // It tries its treasure somewhere new, looks, and decides the old place was right after all.
  const K=keepX,S=K+36;
  f.x=e<2400?go(HOME,S,span(e,0,2400)):e<3000?S:e<5600?go(S,S+24,span(e,3000,5600)):e<6200?S+24:e<8000?go(S+24,S+34,span(e,6200,7400)):e<9000?S+34:e<10000?go(S+34,S+24,span(e,9000,10000)):e<12600?go(S+24,S,span(e,10000,12600)):e<13800?S:go(S,HOME,span(e,13800,D-200));
  f.look.feet=feetAt(now,e<2400||(e>3000&&e<5600)||(e>6200&&e<7400)||(e>9000&&e<12600)||e>13800);f.look.gx=e>13800||(e>3000&&e<7400)?2:-2;
  const held=(e>2400&&e<5900)||(e>9700&&e<12900);
  f.props.push({k:'keep',x:e<3000?K:e<5600?f.x-36:e<10000?K+24:e<12600?f.x-36:K,y:FLOOR-(held?6:0)});
  if(e>7400&&e<9000){f.look.gx=-2;f.look.gy=1;if(e>8000)f.emote='ask';}if(e>12900&&e<14200){f.emote='note';f.look.eyes='happy';}
 }else if(a.kind==='bowl'){
  // Hungry. It fetches the evidence and sits beside it.
  const fetch=span(e,0,2600),drag=span(e,3000,6000),ask=e>6400&&e<D-5200,tip=e>=D-5200;
  f.x=e<2600?go(HOME,56,fetch):e<6000?go(56,78,drag):78;f.look.feet=feetAt(now,e<2600||(e>3000&&e<6000));
  const bx=go(-16,40,span(e,600,6000));
  f.look.gx=e<2600?-2:e<6000?-2:0;
  if(ask){f.look.gy=1;f.near=2;f.look.mouth=e%1400<400?'o':'flat';if(e%2800<1300)f.emote='bang';f.props.push({k:'bowl',x:bx+(e%1400<200?1:0),y:FLOOR});}
  else if(tip){const u=span(e,D-5200,D-4400);f.x=78;f.props.push({k:u<1?'bowl':'bowlTip',x:bx,y:FLOOR-(u<1?Math.round(u*3):0)});if(u>=1){f.look.back=true;f.look.glance=e%2400>1700;if(e<D-2600)f.emote='vein';}else f.look.gx=-2;}
  else f.props.push({k:'bowl',x:bx,y:FLOOR});
 }else if(a.kind==='nap'){
  // Too tired to make it to bed.
  const yawn=e<3200,walk=span(e,3200,6400),down=e>=6400;
  f.x=e<3200?HOME:go(HOME,36,walk);f.look.feet=feetAt(now,e>=3200&&e<6400);f.look.eyes=yawn&&e>600?'shut':down?'shut':'low';f.look.mouth=yawn&&e>600&&e<2600?'o':'flat';
  if(down){f.look.squash=Math.min(4,1+Math.floor((e-6400)/500))-(Math.floor(e/1400)%2&&e>9000?1:0);if(e>8600)f.emote='zed';}
 }
 return f;
}

function react(r:Fx,now:number):Frame|null{
 const e=r.elapsed,f:Frame={x:HOME,lift:0,near:0,look:{eyes:'open'},props:[]};
 switch(r.kind){
  case 'proud':if(e>3200)return null;f.near=3;f.lift=e<2000?hop(e,500,5):0;f.look.eyes='happy';f.look.mouth='open';f.look.gy=1;if(e<2600)f.emote=e<1300?'note':'heart';return f;
  case 'purr':if(e>1800)return null;f.near=3;f.look.eyes='happy';f.look.mouth='open';f.look.squash=Math.floor(e/200)%2?2:1;f.emote=Math.floor(now/900)%2?'heart':'note';return f;
  // It kept something to show you. It has been waiting to show you.
  case 'show':{if(e>6800)return null;const K=18,G=K+36,S=78;f.x=e<1300?go(HOME,G,span(e,0,1300)):e<2900?go(G,S,span(e,1500,2900)):e<5000?S:e<6200?go(S,G,span(e,5000,6200)):go(G,HOME,span(e,6200,6800));f.look.feet=feetAt(now,e<1300||(e>1500&&e<2900)||e>5000);f.look.gx=e<1300?-2:e<2900?2:e<5000?0:-2;
   const held=e>1300&&e<6200;f.props.push({k:'keep',x:held?f.x-36:K,y:FLOOR-(held?(e>2900&&e<5000?8+hop(e,500,3):6):0)});if(e>2900&&e<5000){f.near=4;f.look.gy=1;f.look.eyes='happy';f.look.mouth='open';f.emote=e<4000?'bang':'heart';}return f;}
  case 'cuddle':if(e>2600)return null;f.near=4;f.look.eyes='happy';f.look.mouth='flat';f.look.squash=Math.floor(e/300)%2?1:0;f.emote='heart';return f;
  case 'turn':if(e>5200)return null;f.look.back=true;f.look.glance=e>2600&&e<4200;f.x=go(HOME,HOME-8,span(e,300,1300));f.look.feet=feetAt(now,e>300&&e<1300);if(e<1200)f.emote='sweat';return f;
  case 'call':if(e>1800)return null;f.near=2;f.look.gy=1;f.look.eyes='wide';f.lift=e<500?hop(e,500,3):0;f.emote='ask';return f;
  case 'eat':if(e>4600)return null;f.x=60;f.look.gx=2;f.props.push({k:'bowl',x:100,y:FLOOR});if(e<3000){f.props.push({k:'food',x:100,y:FLOOR,f:e<1500?0:1});f.look.mouth=Math.floor(e/250)%2?'open':'flat';f.look.eyes='happy';f.near=0;}else{f.look.eyes='happy';f.look.mouth='open';f.lift=hop(e,500,3);f.emote='heart';}return f;
  case 'refuse':if(e>5000)return null;f.props.push({k:'bowl',x:100,y:FLOOR},{k:'food',x:100,y:FLOOR,f:0});if(e<1400){f.x=go(HOME,64,span(e,0,900));f.look.gx=2;f.look.feet=feetAt(now,e<900);f.look.mouth='o';}else{f.x=go(64,HOME-8,span(e,1400,2400));f.look.back=true;f.look.feet=feetAt(now,e<2400);f.look.glance=e>3600&&e<4600;if(e>2400&&e<3600)f.emote='dots';}return f;
  case 'play':{if(e>4800)return null;const u=span(e,0,1600),bx=go(-8,112,u);f.props.push({k:'ball',x:bx,y:FLOOR-(u<1?Math.round(Math.abs(Math.sin(u*Math.PI*2))*9):0),f:Math.floor(e/150)%2});f.x=e<700?HOME:e<2600?go(HOME,84,span(e,700,2600)):go(84,HOME,span(e,3000,4600));f.look.feet=feetAt(now,(e>700&&e<2600)||e>3000);f.lift=e>700&&e<2600?hop(e,400,3):0;f.look.gx=e<2800?2:-2;f.look.eyes=e>700?'happy':'wide';f.look.mouth='open';if(e<700)f.emote='bang';if(e>2600&&e<3400)f.emote='note';return f;}
  case 'bath':if(e>4200)return null;f.look.eyes=e<3000?'shut':'happy';f.look.squash=Math.floor(e/250)%2;for(let i=0;i<4;i++){const p=hash(Math.floor(e/400)+i*7);if(e<3000)f.props.push({k:'bubble',x:HOME-32+(p%60),y:FLOOR-10-((p>>>8)%40)});}if(e>=3000){f.props.push({k:'spark',x:HOME-34,y:FLOOR-40},{k:'spark',x:HOME+28,y:FLOOR-30});f.emote='note';}return f;
  case 'hatch':{if(e>5200)return null;if(e<2600){f.hidden=true;f.props.push({k:'egg',x:HOME+(e>600&&Math.floor(e/160)%2?1:-1),y:FLOOR});if(e>1300)f.props.push({k:'crack',x:HOME,y:FLOOR-9});}else{f.lift=e<3600?hop(e-2600,500,6):0;f.look.eyes=e<3800?'wide':'happy';f.look.mouth=e<3800?'o':'open';if(e<3800)f.emote='bang';else f.emote='note';}return f;}
  case 'welcome':if(e>3600)return null;f.x=go(-30,HOME,span(e,0,1500));f.look.feet=feetAt(now,e<1500);f.lift=e<1500?hop(e,300,3):e<2800?hop(e,500,5):0;f.near=e>1500?4:0;f.look.eyes='happy';f.look.mouth='open';f.look.gx=e<1500?2:0;f.look.gy=e>1500?1:0;if(e>1500)f.emote='heart';return f;
  case 'sulk':if(e>4200)return null;f.x=HOME+14;f.look.back=true;f.look.glance=e>2200;if(e<2000)f.emote='dots';return f;
 }
 return null;
}

export function direct(o:{now:number;seed:number;sleeping:boolean;act?:Act|null;fx?:Fx|null;keepX:number;mess?:boolean;night?:boolean;point?:{x:number;y:number}|null;guest?:number;sky?:'rain'|'snow';style?:'eager'|'cautious'|'gentle'}):Frame{
 if(o.sleeping){const t=o.now;return{x:36,lift:0,near:0,look:{eyes:'shut',squash:4-(Math.floor(t/1500)%2)},emote:Math.floor(t/1000)%3?'zed':undefined,props:[]};}
 if(o.fx){const f=react(o.fx,o.now);if(f)return f;}
 if(o.act&&o.act.elapsed>=0&&o.act.elapsed<o.act.duration)return act(o.act,o.now,o.keepX);
 const f=idle(o.now,o.seed,!!o.mess,!!o.night,o.point,o.sky);
 // Someone is at the window. Whatever it was thinking about can wait.
 if(o.guest!==undefined){const g=o.guest;f.x=HOME;f.near=0;f.props=f.props.filter(p=>p.k!=='fly');const blinked=f.look.eyes==='shut';
  f.look={gx:2,gy:-1,squash:0,feet:0,mouth:g<1500?'o':'flat',eyes:g<1500?'wide':blinked?'shut':'open'};f.emote=g<1300?'bang':undefined;f.lift=0;
  // Each temperament has its own way with company.
  if(o.style==='cautious'){ // backs off, makes itself small, and comes round to the idea
   if(g>=1300&&g<7000){f.x=go(HOME,HOME-18,span(g,1300,2300));f.look.feet=feetAt(o.now,g<2300);f.look.squash=g>2300?3:0;f.look.eyes='low';if(g>2300&&g<4200)f.emote='sweat';}
   else if(g>=7000){f.x=go(HOME-18,HOME,span(g,7000,9000));f.look.feet=feetAt(o.now,g<9000);if(g>16000&&g%5000<600)f.lift=hop(g%5000,300,3);if(g>16000&&g%5000<1500)f.emote='ask';}
  }else if(o.style==='gentle'){ // a small bow, then a smile
   if(g>=1500&&g<3000){f.look.squash=3;f.look.eyes='shut';f.look.gy=0;}else if(g>=3000){if(g<4400)f.emote='heart';if(g<6000||g%6000<1200)f.look.eyes='happy';f.lift=g%6000<600?hop(g%6000,300,3):0;}
  }else{ // straight to the glass, bouncing
   if(g>=1500){f.x=go(HOME,HOME+10,span(g,1500,2200));f.look.feet=feetAt(o.now,g<2200);f.lift=g%2400<1200?hop(g%2400,400,5):0;f.look.eyes='happy';f.look.mouth='open';if(g%4800<1400)f.emote='note';}
  }}
 return f;
}
