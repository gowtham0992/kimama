import {isObject,nextDay} from './finds';
import {startDaily,chooseDaily,finishScene,playdateScenes,dailyObject,hasDailyScene,dayAt,OBJECTS,type SceneState,type ObjectId} from './scenes';
import {logDay,reviewOf,type DayLog,type Review} from './review';
import {intention,respond,traitsFor,tickAutonomy,signatureFor,styleFor,type Autonomy,type Intent} from './autonomy';
export type PetAction='bring'|'hatch'|'meal'|'snack'|'play'|'clean'|'sleep'|'wake'|'cuddle'|'explore'|'respond'|'rename'|'ackVisit'|'sceneChoose'|'sceneFinish';
export type Pet=Autonomy&SceneState&{schema:1;today?:DayLog;temperament?:'bold'|'shy'|'gentle';keepsake?:string;encounterDay?:string;meetings?:Record<string,string>;version:number;bornAt:number;hatchedAt:number|null;updatedAt:number;name:string;fullness:number;joy:number;energy:number;cleanliness:number;bond:number;sleeping:boolean;droppings?:number;dropAt?:number;meals:number;plays:number;careDays:string[];lastActionAt:Partial<Record<PetAction,number>>;journal:{at:number;text:string}[]};
export type PetView=Pet&{stage:'egg'|'baby'|'child'|'grown';mood:'waiting'|'sleeping'|'hungry'|'tired'|'messy'|'happy'|'content';personality:string;ageHours:number;message:string;intent:Intent|null;pose:string;signature:string|null;serverTime:number;style:'eager'|'cautious'|'gentle';dailyFind:{name:string;available:boolean;object:ObjectId;day:string};review:Review};
const clamp=(v:number)=>Math.min(100,Math.max(15,v));
/** Curated names: safe to show beside a Reddit username, short enough for the dot matrix. */
export const NAMES=['Mochi','Pip','Nori','Kiwi','Tofu','Miso','Yuzu','Soba','Udon','Momo','Kuma','Tama','Pochi','Sumi','Goma','Azuki','Ume','Panko','Koma','Bean','Riku','Hoshi','Dango','Fuku'];
export function newPet(now:number):Pet{return{schema:1,temperament:(['bold','shy','gentle'] as const)[Math.floor(now)%3],version:0,bornAt:now,hatchedAt:null,updatedAt:now,name:'Mochi',fullness:65,joy:60,energy:80,cleanliness:90,bond:0,sleeping:false,meals:0,plays:0,careDays:[],lastActionAt:{},journal:[{at:now,text:'A small egg. A very big beginning.'}]};}
export function advancePet(p:Pet,now:number):Pet{
 const n=structuredClone(p),hours=Math.min(24,Math.max(0,(now-p.updatedAt)/3600000));
 if(n.hatchedAt!==null){n.fullness=clamp(n.fullness-hours*(n.sleeping?2:3));n.joy=clamp(n.joy-hours*(n.sleeping?.5:1.5));n.energy=clamp(n.energy+hours*(n.sleeping?14:-2));n.cleanliness=clamp(n.cleanliness-hours*1.5);}
 if(n.dropAt&&now>=n.dropAt){n.droppings=Math.min(3,(n.droppings??0)+1);n.cleanliness=clamp(n.cleanliness-15);delete n.dropAt;}
 // A find that was played out but never closed belongs to its own day. Once that day is over it goes to the album,
 // so a new day opens on the new find, never on yesterday's card beside today's review.
 const s=n.scenes?.[0];if(s&&s.kind==='daily'&&!s.awaitingChoice&&dayAt(s.playedAt??s.at)!==dayAt(now)){n.scenes=n.scenes!.slice(1);n.sceneAlbum=[s,...(n.sceneAlbum??[])].slice(0,6);}
 n.updatedAt=Math.max(p.updatedAt,now);return n;
}
export function petView(p:Pet,now:number):PetView{
 const n=tickAutonomy(advancePet(p,now),now),ageHours=n.hatchedAt===null?0:Math.max(0,(now-n.hatchedAt)/3600000);
 const stage=n.hatchedAt===null?'egg':ageHours>=72&&n.careDays.length>=3?'grown':ageHours>=18&&n.careDays.length>=2?'child':'baby';
 const mood=stage==='egg'?'waiting':n.sleeping?'sleeping':n.fullness<30?'hungry':n.energy<30?'tired':n.cleanliness<35||(n.droppings??0)>=2?'messy':n.joy>=70?'happy':'content';
 const t=traitsFor(n);const personality=(t.bold>2?'bold':t.bold< -2?'cautious':'easygoing')+' · '+(t.social>2?'affectionate':t.social< -2?'independent':'observant');
 const messages={waiting:'Someone is waiting inside.',sleeping:'A very important little dream.',hungry:'A tiny tummy rumble.',tired:'Those little eyes are getting heavy.',messy:'A bath would be lovely.',happy:'Life is good. Especially with you.',content:'Just happy to be here.'};
 const {meetings:_privateMeetings,relations:_privateRelations,...safe}=n;
 const intent=intention(n,now);const signature=signatureFor(n);
 const recent=n.reaction&&now-n.reaction.at<5000;
 const pose=n.sleeping?'sleep':recent?n.reaction!.pose:intent?.kind??(mood==='hungry'?'bowl':'idle');
 return{...safe,traits:t,stage,mood,personality,ageHours,intent,pose,signature,serverTime:now,style:styleFor(n),dailyFind:{name:OBJECTS[dailyObject(now)].name,available:!hasDailyScene(n,now),object:dailyObject(now),day:dayAt(now)},review:reviewOf(n,now),message:recent?n.reaction!.text:intent?.text??messages[mood]};
}
export function careForPet(p:Pet,input:unknown,now:number):Pet{
 if(!input||typeof input!=='object')throw new Error('Invalid care action.');
 const x=input as Record<string,unknown>;
 if(x.action!=='respond'&&x.version!==p.version)throw new Error('Your pet changed. Reopen the screen and try again.');
 const actions:PetAction[]=['bring','hatch','meal','snack','play','clean','sleep','wake','cuddle','explore','respond','rename','ackVisit','sceneChoose','sceneFinish'];
 if(!actions.includes(x.action as PetAction))throw new Error('Choose a care action.');
 const action=x.action as PetAction,n=tickAutonomy(advancePet(p,now),now);
 if(action==='sceneChoose')return chooseDaily(n,x,now);
 if(action==='sceneFinish')return finishScene(n,x,now);
 // On the way home: which of the three things on the path it wants back tomorrow. Only a pet that went out today has seen the path.
 // The server checks the thing was on today's path before this is called.
 if(action==='bring'){
  if(!isObject(x.object))throw new Error('Choose one of the things on the path.');
  if(![...(n.scenes??[]),...(n.sceneAlbum??[])].some(s=>s.kind==='daily'&&dayAt(s.at)===dayAt(now)&&s.choice))throw new Error('Go and see today\u2019s find first.');
  n.brought={day:nextDay(dayAt(now)),object:x.object};n.version++;return n;
 }
 if(n.scenes?.length)throw new Error('Finish your pet scene before another care action.');
 if(action==='respond'){const r=respond(n,x,now);logDay(r,x.answer==='yes'?'yes':'no',now);return r;}
 if(n.activity){n.lastActivity={...n.activity,answered:true};delete n.activity;}
 if(action==='ackVisit'){delete n.visitNotice;n.version++;return n;}
 if(action==='rename'){if(typeof x.name!=='string'||!NAMES.includes(x.name))throw new Error('Choose a pet name.');n.name=x.name;n.version++;return n;}
 if(action!=='hatch'&&n.hatchedAt===null)throw new Error('Hatch your egg first.');
 if(action==='hatch'&&n.hatchedAt!==null)throw new Error('Your little friend is already here.');
 if(n.sleeping&&action!=='wake')throw new Error('Shh. Wake your pet first.');
 if(action==='wake'&&!n.sleeping)throw new Error('Your pet is already awake.');
 const cooldown:Partial<Record<PetAction,number>>={meal:30000,snack:30000,play:15000,clean:10000,cuddle:10000};
 if(cooldown[action]&&n.lastActionAt[action]!==undefined&&now-n.lastActionAt[action]!<cooldown[action]!)throw new Error('Give your little friend a moment before doing that again.');
 let text='';
 switch(action){
  case 'hatch':if(typeof x.name==='string'&&NAMES.includes(x.name))n.name=x.name;n.hatchedAt=now;text=`Hello, ${n.name}. The world is a little bigger now.`;break;
  case 'meal':if(n.fullness>90||traitsFor(n).selective>2&&n.fullness>30){const text=n.fullness>90?'The bowl gets pushed away. Its tummy is full.':'Sniffs the rice ball, turns away. This fussy pet prefers a berry.';n.reaction={at:now,pose:'refuse',text};n.nextActAt=now+6000;logDay(n,'refused',now);n.version++;return n;}n.fullness=clamp(n.fullness+25);n.joy=clamp(n.joy+3);n.meals++;n.dropAt??=now+150000+(n.meals%4)*40000;text='A warm rice ball. Every last crumb.';break;
  case 'snack':if(n.fullness>96)throw new Error('Save the treat for later.');n.fullness=clamp(n.fullness+8);n.joy=clamp(n.joy+12);text='A berry, two happy cheeks.';break;
  case 'play':if(n.energy<25)throw new Error('A little rest before another game.');n.joy=clamp(n.joy+20);n.energy=clamp(n.energy-12);n.cleanliness=clamp(n.cleanliness-4);n.plays++;text='A nudge. A roll. Off it goes.';break;
  case 'clean':n.cleanliness=100;n.droppings=0;n.joy=clamp(n.joy+5);text='Splish. Splash. Squeaky little feet.';break;
  case 'sleep':n.sleeping=true;text='Lights low. Goodnight, little one.';break;
  case 'wake':n.sleeping=false;text='A stretch, a blink, a brand-new hello.';break;
  case 'explore':return startDaily(n,now);
  case 'cuddle':n.joy=clamp(n.joy+6);n.bond=Math.min(100,n.bond+4);text='A little closer. A little more yours.';break;
 }
 if(action==='hatch'){n.reaction={at:now,pose:'hatch',text};n.nextActAt=now+5000;}
 if(action!=='hatch'){n.reaction={at:now,pose:action==='sleep'?'sleep':action==='meal'||action==='snack'?'eat':action==='play'?'play':action==='clean'?'bath':action==='cuddle'?'proud':'idle',text};n.nextActAt=now+6000;}
 const logged=({meal:'meals',snack:'snacks',cuddle:'pets',clean:'baths',play:'plays'} as const)[action as 'meal'];if(logged)logDay(n,logged,now);
 n.bond=Math.min(100,n.bond+1);n.lastActionAt[action]=now;
 const day=new Date(now).toISOString().slice(0,10);if(!n.careDays.includes(day))n.careDays.push(day);
 const previous=p.lastActionAt[action];const firstToday=previous===undefined||new Date(previous).toISOString().slice(0,10)!==day;
 if(firstToday||Math.floor(n.bond/25)>Math.floor(p.bond/25))n.journal=[...n.journal,{at:now,text}].slice(-12);n.version++;return n;
}

export function meetPets(a:Pet,b:Pet,aId:string,bId:string,now:number):[Pet,Pet]{
 const x=advancePet(a,now),y=advancePet(b,now),day=new Date(now).toISOString().slice(0,10);
 if(aId===bId)throw new Error('Invite another pet to your playdate.');
 if(x.hatchedAt===null||y.hatchedAt===null)throw new Error('Both pets need to hatch first.');
 if(x.sleeping||y.sleeping)throw new Error('A pet is sleeping. Try the playdate later.');
 if(x.meetings?.[bId]===day||y.meetings?.[aId]===day)throw new Error('These pets already met today. Try again tomorrow.');
 playdateScenes(x,y,aId,bId,now);
 const story=x.scenes!.at(-1)!.summary!;
 for(const [p,other] of [[x,bId],[y,aId]] as [Pet,string][]){p.joy=clamp(p.joy+10);p.bond=Math.min(100,p.bond+2);p.meetings={...Object.fromEntries(Object.entries(p.meetings??{}).filter(([,d])=>d===day)),[other]:day};p.journal=[...p.journal,{at:now,text:story}].slice(-12);p.version++;}
 x.visitNotice={at:now,text:story,visitor:{name:y.name,temperament:y.temperament}};y.visitNotice={at:now,text:story,visitor:{name:x.name,temperament:x.temperament}};
 return [x,y];
}
