import type {Pet} from './pet';
export type ActKind='window'|'toy'|'tidy'|'greet'|'bowl'|'nap';
export type Traits={bold:number;selective:number;social:number};
export type Activity={id:string;kind:ActKind;startedAt:number;duration:number;style:'eager'|'cautious'|'gentle';answered?:boolean};
export type Intent=Activity&{text:string;reason:string;until:number};
export type Reaction={at:number;pose:string;text:string;kind?:ActKind};
export type Autonomy={traits?:Traits;habits?:Partial<Record<ActKind,number>>;learning?:{day:string;count:number};nextActAt?:number;lastKind?:ActKind;prevKind?:ActKind;activity?:Activity;lastActivity?:Activity;activitySerial?:number;reaction?:Reaction;visitNotice?:{at:number;text:string;visitor:{name:string;temperament?:Pet['temperament']}}};
export const ACTS:Record<ActKind,{text:string;reason:string;habit:string}>={window:{text:'Watching the world go by.',reason:'Curiosity',habit:'window tapping'},toy:{text:'A game of its own.',reason:'Playful energy',habit:'bringing toys'},tidy:{text:'Everything in its place.',reason:'Familiar things',habit:'keepsake stacking'},greet:{text:'A little closer.',reason:'Company',habit:'warm greetings'},bowl:{text:'That little tummy.',reason:'Hungry',habit:'asking for meals'},nap:{text:'Just resting those eyes.',reason:'Tired',habit:'settling for naps'}};
export const ACT_MS:Record<ActKind,number>={window:16000,toy:20000,tidy:16000,greet:13000,bowl:18000,nap:26000};
export function traitsFor(p:Pet):Traits{return p.traits??{bold:p.temperament==='bold'?4:p.temperament==='shy'?-4:0,selective:p.temperament==='shy'?3:-2,social:p.temperament==='gentle'?4:0};}
export function styleFor(p:Pet):Activity['style']{const t=traitsFor(p);return t.bold< -2?'cautious':t.bold>2?'eager':'gentle';}
export function signatureFor(p:Pet):ActKind|null{return(Object.entries(p.habits??{}) as [ActKind,number][]).filter(([,v])=>v>=3).sort((a,b)=>b[1]-a[1])[0]?.[0]??null;}
function pickAct(p:Pet):ActKind {
 const t=traitsFor(p),serial=p.activitySerial??0,h=p.habits??{};
 if(p.fullness<32)return 'bowl';if(p.energy<30)return 'nap';
 // Favourites still lead, but nothing is allowed to become the only thing it does.
 const scores:Record<ActKind,number>={window:13-t.bold,toy:12+t.bold*1.5+(100-p.joy)/10,tidy:p.keepsake?11+t.selective*2:-100,greet:11+t.social*2.5,bowl:-30,nap:-30};
 return(Object.keys(scores) as ActKind[]).sort((a,b)=>{const score=(k:ActKind)=>scores[k]+(h[k]??0)*9-(p.lastKind===k?25:0)-(p.prevKind===k?10:0)+(serial*5+Object.keys(scores).indexOf(k)*3)%11;return score(b)-score(a);})[0];
}
/** Bounded catch-up: finish at most one pending activity; never farm unattended time. */
export function tickAutonomy(p:Pet,now:number):Pet {
 const n=structuredClone(p);
 if(n.hatchedAt===null||n.sleeping||n.scenes?.length||n.visitNotice){if(n.activity){n.lastActivity={...n.activity,answered:true};delete n.activity;}return n;}
 if(n.activity&&now>=n.activity.startedAt+n.activity.duration){
  const a=n.activity;n.lastActivity=a;if(n.lastKind!==a.kind)n.prevKind=n.lastKind;n.lastKind=a.kind;delete n.activity;
  if(!a.answered){if(a.kind==='toy'){n.joy=Math.min(100,n.joy+2);n.energy=Math.max(15,n.energy-1);}if(a.kind==='nap')n.energy=Math.min(100,n.energy+5);}
  // Uneven quiet: a creature does not keep time.
  n.nextActAt=a.startedAt+a.duration+7000+(((n.activitySerial??0)*7919)%5)*4500+(a.style==='cautious'?5000:0);
 }
 if(!n.activity&&now>=(n.nextActAt??0)){
  const kind=pickAct(n);n.activitySerial=(n.activitySerial??0)+1;
  n.activity={id:`act:${n.hatchedAt}:${n.activitySerial}`,kind,startedAt:now,duration:ACT_MS[kind],style:styleFor(n)};
 }
 return n;
}
export function intention(p:Pet,now:number):Intent|null{
 const a=p.activity;if(!a||p.sleeping||p.scenes?.length||p.visitNotice||now>=a.startedAt+a.duration)return null;
 return{...a,text:ACTS[a.kind].text,reason:ACTS[a.kind].reason,until:a.startedAt+a.duration};
}
export function respond(p:Pet,input:Record<string,unknown>,now:number):Pet{
 // A short grace period refers to the completed action, never whatever replaced it.
 const a=[p.activity,p.lastActivity].find(a=>a?.id===input.intentId);
 if(!a||a.answered||now>a.startedAt+a.duration+8000)throw new Error('Pet moment passed.');
 if(!['yes','no','watch'].includes(String(input.answer)))throw new Error('Choose a response to your pet.');
 const n=structuredClone(p),day=new Date(now).toISOString().slice(0,10);
 if(input.answer==='watch')return n; // Observation needs no write, reward or lesson.
 n.traits={...traitsFor(n)};n.habits={...n.habits};n.learning=n.learning?.day===day?n.learning:{day,count:0};
 const teachable=a.kind!=='bowl'&&a.kind!=='nap',canLearn=teachable&&n.learning.count<5;
 if(canLearn){const sign=input.answer==='yes'?1:-1;n.habits[a.kind]=Math.min(5,Math.max(0,(n.habits[a.kind]??0)+sign));const axis=a.kind==='tidy'?'selective':a.kind==='greet'?'social':'bold';n.traits[axis]=Math.max(-10,Math.min(10,n.traits[axis]+sign));n.learning.count++;}
 const text=input.answer==='no'?`${n.name} turns away. Then, one little look back.`:a.kind==='bowl'?`${n.name} pats the empty bowl once more.`:a.kind==='nap'?`${n.name} closes its eyes again.`:`${n.name} looks up at you, pleased.`;
 if(n.activity?.id===a.id){n.lastActivity={...n.activity,answered:true};delete n.activity;}else if(n.lastActivity?.id===a.id)n.lastActivity.answered=true;
 n.lastKind=a.kind;n.nextActAt=now+10000;n.reaction={at:now,pose:input.answer==='no'?'turn':'proud',kind:a.kind,text};
 // Preserve milestones rather than logging every button press.
 if(canLearn&&(n.habits[a.kind]??0)===3&&input.answer==='yes')n.journal=[...n.journal,{at:now,text:`${n.name} keeps coming back to ${a.kind==='window'?'the window':a.kind==='toy'?'that ball':a.kind==='greet'?'your side':'its little collection'}.`}].slice(-12);
 n.version++;return n;
}
