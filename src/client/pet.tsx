import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {GardenView} from '../shared/garden';
import {NAMES} from '../shared/pet';
import {DAILY,OBJECTS,KIND,KIND_NAME,SIGN,HABIT_SAYS,An,careMood,dailyObject,habitFor,answerOrder,type Kind,type PetScene} from '../shared/scenes';
import {retortsFor,knowsOf} from '../shared/review';
const NOTE_SHORT={try:'goes at it',gentle:'is gentle',watch:'hangs back'} as const;
import {ART,ICONS,OBJ,Big,Bits,Box,Creature,Lcd,Stars,Txt,wrap,markOf,INK,PAPER,type Shape} from './px';
import {Egg,Emote,Play,Room,Tally,Thing} from './stage';
import type {Fx} from './director';
import {View as Plate} from './views';
import {VIEWS,viewName} from '../shared/views';
import {SHELLS,shellFor,saveShell} from './shell';
import './pet.css';

type Screen='room'|'menu'|'food'|'check'|'name'|'album'|'today'|'game'|'review'|'card'|'ask'|'join';
type Game={round:number;score:number;phase:'ask'|'show';pick:number;at:number;sides:number[]};
import {petApi,gardenApi,tellApi,streetApi,callsApi,joinApi,meApi,type View} from './net';
import {showShareSheet,showLoginPrompt} from '@devvit/web/client';
import {telemetry} from '@devvit/analytics/client/reddit';
import {portrait} from './portrait';
import {STRAYS,DAIFUKU,type StreetView} from '../shared/street';
// A piezo speaker and nothing else: short square notes, one motif per meaning.
const TUNES:Record<string,[number,number][]>={tick:[[1320,.03]],ok:[[988,.05],[1319,.07]],back:[[784,.05]],good:[[1047,.07],[1319,.07],[1568,.12]],no:[[494,.09],[370,.14]],ask:[[1175,.06],[1568,.06]],eat:[[880,.05],[1109,.05],[880,.05],[1319,.1]],hatch:[[659,.08],[784,.08],[988,.08],[1319,.18]],hi:[[1319,.07],[1568,.07],[2093,.14]],boot:[[1047,.06],[1568,.16]],knock:[[392,.04],[0,.07],[392,.04]],stamp:[[262,.05],[0,.03],[1568,.05],[2093,.12]],night:[[1319,.14],[1047,.14],[880,.14],[784,.26]],day:[[784,.08],[1047,.08],[1319,.14]],wave:[[1568,.06],[1319,.06],[1568,.06],[2093,.12]]};

function Pocket(){
 const[pet,setPet]=useState<View|null>(null),[garden,setGarden]=useState<GardenView|null>(null);
 const[screen,setScreen]=useState<Screen>('room'),[sel,setSel]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[muted,setMuted]=useState(()=>{try{return localStorage.getItem('picky-mute')==='1';}catch{return false;}}),[nameIdx,setNameIdx]=useState(0);
 const[replay,setReplay]=useState<PetScene|null>(null),[beat,setBeat]=useState(0),[page,setPage]=useState(0),[guess,setGuess]=useState(-1),[full,setFull]=useState(false);
 const[local,setLocal]=useState<{kind:string;at:number}|null>(null),[errPage,setErrPage]=useState(0),[toldDay,setToldDay]=useState(()=>{try{return localStorage.getItem('picky-told')||'';}catch{return '';}}),[shell,setShell]=useState(-1),[game,setGame]=useState<Game|null>(null),[street,setStreet]=useState<StreetView|null>(null),[waved,setWaved]=useState<{id:string;at:number}|null>(null),[,frame]=useState(0);
 const known=useRef<{ab?:boolean;c?:boolean;k?:boolean}>((()=>{try{return JSON.parse(localStorage.getItem('picky-known')||'{}');}catch{return{};}})());
 function learn(k:'ab'|'c'|'k'){if(known.current[k])return;known.current[k]=true;try{localStorage.setItem('picky-known',JSON.stringify(known.current));}catch{/* private mode */}}
 const finger=useRef<{x:number;y:number;at:number}|null>(null);
 const from=useRef(-1);
 // Posting the review is public and under the player's name, so B asks first and a second B confirms.
 const[sure,setSure]=useState(false),[retort,setRetort]=useState(0);
 // After picking what it will do: how sure? Sure doubles the streak or loses it; a hunch is safe.
 const[bet,setBet]=useState(false);
 // Calls: the pet may ring you through Reddit when a find turns up. Off until you say yes.
 const[calls,setCalls]=useState<boolean|null>(null);
 const tz=()=>-new Date().getTimezoneOffset();
 useEffect(()=>{callsApi().then(r=>{setCalls(r.available===false?null:r.on);if(r.on)void callsApi({tz:tz()}).catch(()=>{});}).catch(()=>setCalls(null));},[]);
 // Reddit's Journeys: say once when the game is loaded and can be played.
 const readied=useRef(false);useEffect(()=>{if(!pet||readied.current)return;readied.current=true;try{void telemetry.appReady().catch(()=>{});}catch{/* telemetry never affects play */}},[!pet]);
 // The owner's own avatar, redrawn in dots for the review page. If Reddit will not hand the picture over, there is simply no portrait.
 const[face,setFace]=useState<string[]|null>(null);
 // A visitor who is not signed in can play the whole find. Posting, joining and alerts need an account, so the end card offers to sign in and keep the pet.
 const[signedIn,setSignedIn]=useState(true);
 useEffect(()=>{let live=true;meApi().then(r=>{if(live&&r.signedIn===false)setSignedIn(false);return r.avatar?portrait(r.avatar):null;}).then(f=>{if(live&&f)setFace(f);}).catch(()=>{});return()=>{live=false;};},[]);
 function signIn(){sfx('ok');try{showLoginPrompt();}catch{setErrPage(0);setError('Sign in to Reddit to keep your pet.');}}
 // Taking a posted review down again asks first, like posting it did.
 const[unpost,setUnpost]=useState(false);
 async function setCalling(on:boolean){setError('');setErrPage(0);try{const r=await callsApi({on,tz:tz()});setCalls(r.on);if(r.error)setError(r.error);else if(r.on){sfx('good');setError(`${pet?.name??'Your pet'} will send you a Reddit notification when something turns up.`);}}catch(e){setErrPage(0);setError(e instanceof Error?e.message:'Calls are not available just now.');}}
 const[viewed,setViewed]=useState(''),endAt=useRef(0);
 const stroke=useRef({n:0,last:0,x:0});
 // Tap to pet; rub to make it purr; tap the window to wave.
 // The glass answers a finger: what you can see, you can tap. The three buttons still do everything; this is the short way on a phone.
 // A wave at whoever is at the window. A mess comes first on the A button, so the window itself always waves.
 function wave(){if(!guest||!canWave)return;sfx('wave');setWaved({id:guest.id,at:Date.now()});setLocal({kind:'proud',at:Date.now()});if(!guest.stray)void streetApi({action:'wave',id:guest.id}).then(loadStreet).catch(()=>{});}
 function openIcon(i:number){if(!pet)return;const id=ICONS[i].id;sfx('ok');learn('c');if(id==='food'||id==='check'||id==='album'){setScreen(id);setSel(0);}else if(id==='find'){if(!pet.dailyFind.available){setErrPage(0);setError(`${pet.name} already explored today. Next find in ${untilNext}.`);}else void care('explore');}}
 function tapped(x:number,y:number):boolean{
  if(busy)return true;if(error){dismiss();return true;}if(!pet||booting)return false;
  const row=Math.max(0,Math.min(2,Math.floor((y-96)/9)));
  // Posting stays on the B button: a stray touch must never publish. A tap may only change the reply.
  if(sure){if(y>=95&&row===2)pressA();return true;}
  if(scene){
   if(guessing){if(y<95)return true;if(bet){if(row===1)pressA();else if(row===2)pressC();}else if(guess===row)pressB();else{sfx('tick');setGuess(row);}return true;}
   if(ending){if(onView)pressA();return true;}
   pressA();return true;}
  if(pet.stage==='egg'){if(y<40)pressA();else pressB();return true;}
  if(screen==='today'){if(y>=110)pressC();else pressA();return true;}
  if(screen==='ask'||screen==='join'){if(y>=98&&y<109)pressA();else if(y>=109)pressC();return true;}
  if((screen==='room'||screen==='menu')&&y<15&&!pet.sleeping&&!pet.visitNotice){openIcon(Math.min(ICONS.length-1,Math.floor(x/32)));return true;}
  if(screen==='food'&&y<70){const i=x<64?0:1;if(sel===i)pressB();else{sfx('tick');setSel(i);}return true;}
  return false;}
 function onPoint(x:number,y:number,down:boolean,held:boolean){finger.current={x,y,at:Date.now()};
  if(down&&tapped(x,y))return;
  if(!pet||scene||screen!=='room'||pet.stage==='egg'||pet.sleeping||pet.visitNotice||booting)return;
  if(down&&guest&&canWave&&x>72&&y>16&&y<52){wave();return;}
  const over=y>50&&y<100&&Math.abs(x-60)<36;
  if(held&&!down&&over){const s=stroke.current,at=Date.now();if(at-s.last>1500)s.n=0;if(Math.abs(x-s.x)>3){s.n++;s.x=x;}s.last=at;
   if(s.n>=6&&(local?.kind!=='purr'||at-local.at>900)){setLocal({kind:'purr',at});learn('ab');if(s.n<9||s.n%40===0){sfx('good');void care('cuddle',{},true);}}return;}
  if(down&&over)pressA();}
 const boot=useRef(Date.now());
 const lock=useRef(false),audio=useRef<AudioContext|null>(null),clock=useRef({server:0,local:0}),beatAt=useRef(Date.now()),pageAt=useRef(Date.now()),greeted=useRef(false),hiddenAt=useRef(0);

 function sfx(name:string){if(muted)return;try{const ac=audio.current??=new AudioContext();void ac.resume();let t=ac.currentTime;for(const[hz,len]of TUNES[name]??[]){if(!hz){t+=len;continue;}const o=ac.createOscillator(),g=ac.createGain();o.type='square';o.frequency.value=hz;g.gain.setValueAtTime(.03,t);g.gain.setValueAtTime(0,t+len*.9);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+len);t+=len;}}catch{/* sound is optional */}}
 function accept(n:View){clock.current={server:n.serverTime,local:Date.now()};setPet(p=>!p||n.version>p.version||n.version===p.version&&n.updatedAt>=p.updatedAt?n:p);}
 async function refresh(){if(lock.current)return;try{accept(await petApi());}catch(e){if(!pet)setError(e instanceof Error?e.message:'Connection lost.');}}
 async function loadGarden(){try{setGarden(await gardenApi());}catch{/* the garden is optional */}}
 const now=()=>clock.current.server+Date.now()-clock.current.local;

 useEffect(()=>{void refresh();void loadGarden();
  const a=setInterval(()=>{if(!document.hidden)void refresh();},3000),b=setInterval(()=>{if(!document.hidden)void loadGarden();},15000),c=setInterval(()=>{if(!document.hidden)frame(v=>v+1);},matchMedia('(prefers-reduced-motion: reduce)').matches?500:125);
  const vis=()=>{if(document.hidden){hiddenAt.current=Date.now();return;}const away=Date.now()-hiddenAt.current;void refresh();if(hiddenAt.current&&away>20000){setLocal({kind:away>20*60000?'welcome':'call',at:Date.now()});}};
  document.addEventListener('visibilitychange',vis);
  return()=>{clearInterval(a);clearInterval(b);clearInterval(c);document.removeEventListener('visibilitychange',vis);void audio.current?.close();};},[]);
 // It notices you coming back. Long neglect earns a turned back before the hello.
 useEffect(()=>{if(!pet||greeted.current||pet.stage==='egg')return;greeted.current=true;const key='picky-seen:'+pet.bornAt;
  try{const last=Number(localStorage.getItem(key)||0),away=Date.now()-last;if(last&&away>20*60000&&!pet.sleeping){setLocal({kind:away>6*3600000&&(pet.mood==='hungry'||pet.mood==='messy')?'sulk':away>2*3600000&&pet.keepsake?'show':'welcome',at:Date.now()});sfx('hi');}localStorage.setItem(key,String(Date.now()));}catch{/* private mode */}
  // Birthdays: every day older is worth saying once.
  try{const days=Math.floor(pet.ageHours/24),ak='picky-age:'+pet.bornAt;if(days>=1&&!pet.dailyFind.available&&Number(localStorage.getItem(ak)||0)<days){/* never ahead of the day's find: it is why they came */localStorage.setItem(ak,String(days));setErrPage(0);setError(`${pet.name} is ${days} ${days===1?'day':'days'} old today ♥`);setLocal({kind:'proud',at:Date.now()});sfx('hatch');}}catch{/* private mode */}
  const id=setInterval(()=>{try{localStorage.setItem(key,String(Date.now()));}catch{/* ignore */}},30000);return()=>clearInterval(id);},[pet?.bornAt,pet?.stage]);

 // The street: who is at the window, and where yours has been.
 const loadStreet=()=>streetApi().then(setStreet).catch(()=>{});
 useEffect(()=>{void loadStreet();const id=setInterval(()=>{if(!document.hidden)void loadStreet();},20000);return()=>clearInterval(id);},[]);
 const guest=street?.visitor&&pet&&pet.stage!=='egg'&&!pet.sleeping&&pet.ageHours*3600000>25000&&now()>=street.visitor.from&&now()<street.visitor.until?street.visitor:null,canWave=!!guest&&waved?.id!==guest.id;
 useEffect(()=>{if(guest&&screen==='room')sfx('knock');},[guest?.id,guest?.from]);
 useEffect(()=>{const id=setTimeout(()=>sfx('boot'),900);return()=>clearTimeout(id);},[]);
 // The visitor book remembers who has been to this window (on this device).
 const[met,setMet]=useState<{ids:string[];pets:number}>(()=>{try{return{ids:[],pets:0,...JSON.parse(localStorage.getItem('picky-met')||'{}')};}catch{return{ids:[],pets:0};}});
 useEffect(()=>{if(!guest||screen!=='room'||met.ids.includes(guest.id))return;const next={ids:[...met.ids,guest.id].slice(-60),pets:met.pets+(guest.stray?0:1)};setMet(next);try{localStorage.setItem('picky-met',JSON.stringify(next));}catch{/* private mode */}},[guest?.id,screen]);
 const told2=useRef(false);
 useEffect(()=>{if(told2.current||!pet||pet.stage==='egg'||!street?.news||street.news.seen<1||screen!=='room'||pet.scenes?.length||pet.dailyFind.available)return;told2.current=true;const n=street.news;setErrPage(0);setError(`${pet.name} has been out. It looked in ${n.seen} ${n.seen===1?'window':'windows'} today${n.waves?`, and ${n.waves} waved back`:''}.`);},[street,pet]);
 // Today's find is the front door: offered once per visit, as soon as the pet is free.
 const offered=useRef(false);
 useEffect(()=>{if(!pet||offered.current||pet.stage==='egg'||pet.sleeping||pet.scenes?.length||pet.visitNotice||!pet.dailyFind.available||screen!=='room')return;const first=(pet.reads?.total??0)<1&&pet.ageHours<.05;if(pet.reaction&&now()-pet.reaction.at<(first?3000:4000))return;if(first&&lock.current)return;offered.current=true;if(first)void care('explore');else setScreen('today');},[pet,Math.floor(Date.now()/500)]);
 const msLeft=86400000-(now()%86400000),untilNext=`${Math.floor(msLeft/3600000)}h ${Math.floor(msLeft%3600000/60000)}m`;
 const today=new Date(now()).toISOString().slice(0,10),told=toldDay===today||!!street?.told,canTell=!!pet&&!pet.dailyFind.available&&!told&&signedIn;
 // The replies on offer fit the verdict. A note exists once a sort has been met, and says the pet's habit with it.
 const replies=retortsFor(pet?.review.stars??3),noteOf=(k:Kind)=>pet&&pet.kinds?.[k]?.length?habitFor(pet as unknown as Parameters<typeof habitFor>[0],k):null;
 const scene=replay??pet?.scenes?.[0]??null,beats=scene?.beats??[];
 // The three answers, in today's order. They carry no sign: which is the bold one is for the owner to judge.
 const ord=scene?answerOrder(scene.object,scene.at):(['try','gentle','watch'] as const);
 const guessing=!!scene?.awaitingChoice&&beat>=beats.length,ending=!!scene&&!scene.awaitingChoice&&beat>=beats.length;
 const pages=scene&&beat<beats.length?chunk(wrap(beats[beat].text,19)):[];
 const resumed=useRef(false);
 useEffect(()=>{if(!pet)return;const back=!resumed.current&&!!scene&&!replay&&scene.kind==='daily'&&!scene.awaitingChoice;resumed.current=true;if(back)setViewed(scene!.id);setBeat(back?scene!.beats.length:0);setPage(0);setGuess(0);beatAt.current=Date.now();},[scene?.id,!pet]);
 const soloEnd=ending&&!!scene&&scene.actors.length===1&&!replay;
 // After the story: the view on the way home is its last beat, then one card with everything, then the room.
 const onView=soloEnd&&!!scene?.view&&viewed!==scene.id,onCard=soloEnd&&!onView;
 async function untell(){if(lock.current)return;lock.current=true;setBusy(true);try{await tellApi(undefined,true);setToldDay('');try{localStorage.removeItem('picky-told');}catch{/* private mode */}await loadStreet();setErrPage(0);setError('Your review has been taken down.');}catch(e){setErrPage(0);setError(e instanceof Error?e.message:'Could not remove it just now.');}finally{lock.current=false;setBusy(false);}}
 async function join(){try{const r=await joinApi();setErrPage(0);setError(r.ok?'Joined. Each new find will come to your feed.':'To follow along, use Join at the top of the post.');if(r.ok)sfx('good');}catch{setErrPage(0);setError('To follow along, use Join at the top of the post.');}}
 // Reddit's own share sheet, with the verdict as the message. Nothing is posted by this.
 async function share(){if(!pet)return;sfx('ok');try{await showShareSheet({title:`${pet.name} rated me ${pet.review.stars} out of 5`,text:`"${pet.review.line}" What will yours say about you?`,data:JSON.stringify({n:pet.name,s:pet.review.stars,t:pet.temperament??'gentle',g:pet.stage,m:markOf(pet.bornAt),c:pet.review.code})});}catch{setErrPage(0);setError('Sharing is not available here.');}}
 async function tell(){if(lock.current)return;lock.current=true;setBusy(true);try{const r=await tellApi(retort);setToldDay(today);try{localStorage.setItem('picky-told',today);}catch{/* private mode */}if(r.already){setErrPage(0);setError('Already told the thread today. One comment a day.');}else{sfx('good');if(r.by==='app'){setErrPage(0);setError('Posted by the Kimama account, signed with your username.');}}}catch(e){setErrPage(0);setError(e instanceof Error?e.message:'Could not post just now.');}finally{lock.current=false;setBusy(false);}}
 useEffect(()=>{beatAt.current=Date.now();},[beat]);
 useEffect(()=>{pageAt.current=Date.now();setFull(false);},[beat,page,scene?.id]);
 const typed=full?999:Math.floor((Date.now()-pageAt.current)/24),pageChars=(pages[page]??[]).join('').length,pageDone=typed>=pageChars;
 // A scene left alone still plays itself out.
 // The guess is never made for you: nothing is marked until A is pressed, and B waits a moment after the choices appear.
 const guessAt=useRef(0);useEffect(()=>{setBet(false);if(guessing){setGuess(-1);guessAt.current=Date.now();}},[guessing,scene?.id]);
 // A fresh egg already has a name: one press hatches it, and A offers another.
 const named=useRef(false);useEffect(()=>{if(!pet||named.current)return;named.current=true;if(pet.stage==='egg')setNameIdx(Math.floor(pet.bornAt/7)%NAMES.length);},[pet?.bornAt]);
 useEffect(()=>{if(!scene||guessing||ending)return;const id=setTimeout(()=>advance(),pageChars*38+5200);return()=>clearTimeout(id);},[scene?.id,beat,page,guessing,ending,pageChars]);

 async function care(kind:string,extra:Record<string,unknown>={},quiet=false){
  if(!pet||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const n=await petApi({action:kind,version:pet.version,...extra});accept(n);if(kind==='sceneChoose'){setBeat(1);setPage(0);void loadGarden();const sc=n.scenes?.[0];if(sc?.guess)setTimeout(()=>sfx(sc.guessed?(sc.sure?'hatch':'good'):(sc.sure?'night':'no')),1000);}else if(kind!=='sceneFinish'&&kind!=='respond'&&kind!=='cuddle'&&kind!=='ackVisit')setScreen('room');
   if(kind==='meal'||kind==='snack')sfx(n.reaction?.pose==='refuse'?'no':'eat');if(kind==='hatch')sfx('hatch');if(kind==='sleep')sfx('night');if(kind==='wake')sfx('day');}
  catch(e){
   // Ask what is true before complaining. If the pet moved on, the action landed and only the answer was lost: carry on as if it had arrived.
   let landed=false;try{const f=await petApi();landed=f.version>pet.version;accept(f);if(landed&&kind==='sceneChoose'){setBeat(1);setPage(0);void loadGarden();}else if(landed&&kind!=='sceneFinish'&&kind!=='respond'&&kind!=='cuddle'&&kind!=='ackVisit')setScreen('room');}catch{/* keep the last view */}
   if(!landed&&!quiet&&!(e&&typeof e==='object'&&'code' in e&&e.code==='moment_passed')){setError(e instanceof Error?e.message:'Could not save.');sfx('no');}}
  finally{lock.current=false;setBusy(false);}
 }
 // "Which way?": five rounds of guessing which side it will hop to. It looks and leans where it means to go and holds it;
 // sometimes it fakes the other way first, bold pets more often. Wait for the look to settle. Reading your pet, as a game you can play any time.
 const careRef=useRef(care);careRef.current=care;
 function startGame(){if(!pet)return;const fav=pet.bornAt%2,seed=pet.bornAt%100000+Math.floor(Date.now()/1000);
  setGame({round:0,score:0,phase:'ask',pick:-1,at:Date.now(),sides:[0,1,2,3,4].map(i=>(Math.imul(seed+i*7919,2654435761)>>>0)%100<68?fav:1-fav)});setScreen('game');}
 function pick(p:number){if(!game||game.phase!=='ask'||game.round>=5||Date.now()-game.at<400)return;const ok=p===game.sides[game.round];sfx(ok?'good':'no');
  setGame({...game,phase:'show',pick:p,score:game.score+(ok?1:0),at:Date.now()});
  const last=game.round>=4;
  setTimeout(()=>{setGame(g=>g?{...g,round:g.round+1,phase:'ask',pick:-1,at:Date.now()}:g);if(last)setTimeout(()=>{setGame(null);void careRef.current('play');},1800);},1400);}
 // Long messages page through the box instead of being cut off.
 const errLines=error?wrap(error,19):[];
 function dismiss(){if((errPage+1)*3<errLines.length)setErrPage(errPage+1);else{setError('');setErrPage(0);}}
 function advance(){if(!scene||guessing||ending)return;if(!pageDone){setFull(true);return;}if(page<pages.length-1)setPage(page+1);else{setBeat(beat+1);setPage(0);}}
 function leaveScene(){if(!scene)return;if(replay){setReplay(null);setScreen('album');}else{if(soloEnd&&scene.view&&viewed!==scene.id){setViewed(scene.id);endAt.current=Date.now();setTimeout(()=>sfx('stamp'),350);return;}let next:Screen='room';try{if(!signedIn){/* nothing to ask a visitor */}else if(!localStorage.getItem('picky-join')&&pet&&pet.mood!=='hungry'&&pet.mood!=='messy'){/* Not while it is waiting to be fed or cleaned: the review has just said so. Another day. */localStorage.setItem('picky-join','1');next='join';}else if(!localStorage.getItem('picky-asked')&&calls===false){localStorage.setItem('picky-asked','1');next='ask';}}catch{/* private mode */}/* One thing at a time on the way home: the street's news can wait for the next visit. */told2.current=true;setScreen(next);void care('sceneFinish',{sceneId:scene.id});}}
 // The act a button press answers: what it is doing now, or what it has only just finished.
 const answerable=pet&&!pet.sleeping?(pet.intent??(pet.lastActivity&&!pet.lastActivity.answered&&now()<pet.lastActivity.startedAt+pet.lastActivity.duration+7000?pet.lastActivity:null)):null;
 // The stamp card: every kind of find it has ever met, and what it did with each.
 const finds:Record<string,string>=pet?{...Object.fromEntries([...(pet.sceneAlbum??[]),...(pet.scenes??[])].filter(s=>s.kind==='daily'&&s.choice).map(s=>[s.object,s.choice!])),...pet.finds}:{},found=DAILY.filter(id=>finds[id]).length;
 // Views it brought home itself, then postcards other pets left at the window.
 // Postcards were cut: a pet's views are the ones it brought home itself.
 const cards:{view:string;from:string}[]=[],own=pet?.views??[],views=[...own,...cards.map(c=>c.view).filter((v,i,a)=>!own.includes(v)&&a.indexOf(v)===i)],nv=views.length,cardOf=(id:string)=>own.includes(id)?null:cards.find(c=>c.view===id)??null;
 // The plant on the sill belongs to the whole street. When it grows, say so once.
 useEffect(()=>{if(!pet||pet.stage==='egg'||screen!=='room'||pet.scenes?.length||street?.grown===undefined)return;const lv=street.grown;let had=-1;try{had=Number(localStorage.getItem('picky-plant')??-1);}catch{/* private mode */}if(lv===had)return;try{localStorage.setItem('picky-plant',String(lv));}catch{/* private mode */}void lv;},[street?.grown,screen,pet?.stage]);
 // A new postcard is shown once, after the wave has played out.
 const[post,setPost]=useState<{view:string;from:string}|null>(null);
 useEffect(()=>{if(!pet||pet.stage==='egg'||screen!=='room'||pet.scenes?.length||!cards.length)return;let seen=0;try{seen=Number(localStorage.getItem('picky-cards')||0);}catch{/* private mode */}if(cards.length<=seen)return;const c=cards[cards.length-1],id=setTimeout(()=>{try{localStorage.setItem('picky-cards',String(cards.length));}catch{/* private mode */}setPost(c);setScreen('card');sfx('good');},waved&&Date.now()-waved.at<1800?1800:400);return()=>clearTimeout(id);},[cards.length,screen,pet?.stage]);
 const booting=Date.now()-boot.current<1500||!pet,fresh=!!pet&&pet.stage!=='egg'&&pet.ageHours*3600000<4000&&!pet.scenes?.length;
 const messy=!!pet&&((pet.droppings??0)>0||pet.mood==='messy');
 const memories=pet?[...pet.journal.slice().reverse().map(j=>({text:j.text,at:j.at,scene:null as PetScene|null})),...(pet.sceneAlbum??[]).map(s=>({text:s.summary??s.title,at:s.at,scene:s}))]:[];

 function pressA(){
  if(error){dismiss();return;}if(!pet)return;if(booting){boot.current=0;return;}
  if(sure){sfx('tick');setRetort((retort+1)%replies.length);return;}
  if(screen==='card'){sfx('back');setPost(null);setScreen('room');return;}
  if(unpost){setUnpost(false);sfx('back');return;}
  if(screen==='ask'){setScreen('room');void setCalling(true);return;}
  if(screen==='join'){setScreen('room');void join();return;}
  if(scene){sfx('tick');if(guessing){if(bet){setBet(false);void care('sceneChoose',{sceneId:scene.id,guess:ord[guess],sure:true});}else setGuess((guess+1)%3);}else if(ending)leaveScene();else advance();return;}
  // On the egg, the left button goes to the name before and the right button to the name after, as the arrows on screen point.
  if(pet.stage==='egg'){sfx('tick');setNameIdx((nameIdx+NAMES.length-1)%NAMES.length);return;}
  if(screen==='name'){sfx('tick');setNameIdx((nameIdx+1)%NAMES.length);return;}
  if(screen==='game'){pick(0);return;}
  if(screen==='today'){sfx('ok');void care('explore');return;}
  if(screen==='review'){sfx('back');setScreen('room');return;}
  if(screen==='check'){sfx('ok');setScreen('review');return;}
  if(screen==='room'){if(pet.visitNotice){void care('ackVisit');return;}if(pet.sleeping){void care('wake');return;}learn('ab');if(messy){void care('clean');return;}if(guest&&canWave){wave();return;}sfx('good');if(answerable)void care('respond',{answer:'yes',intentId:answerable.id},true);else{setLocal({kind:'cuddle',at:Date.now()});void care('cuddle',{},true);}return;}
  sfx('tick');setSel((sel+1)%(screen==='menu'?ICONS.length:screen==='food'?2:screen==='album'?memories.length+2+nv:1));
 }
 function pressB(){
  if(error){dismiss();return;}if(!pet)return;if(booting){boot.current=0;return;}
  if(screen==='card'||screen==='ask'||screen==='join'){pressA();return;}
  if(scene){if(guessing){if(bet){setBet(false);sfx('back');return;}if(guess<0||Date.now()-guessAt.current<700){sfx('no');return;}sfx('ask');setBet(true);}else if(ending){if(onCard&&!signedIn)signIn();else if(onCard&&canTell){if(sure){setSure(false);void tell();}else{sfx('ask');setSure(true);}}else leaveScene();}else{sfx('tick');advance();}return;}
  if(pet.stage==='egg'){void care('hatch',{name:NAMES[nameIdx]});return;}
  if(screen==='game'){pick(1);return;}
  if(screen==='today'){sfx('ok');void care('explore');return;}
  if(screen==='review'){if(!signedIn)signIn();else if(canTell){if(sure){setSure(false);void tell();}else{sfx('ask');setSure(true);}}else if(told){if(unpost){setUnpost(false);void untell();}else{sfx('ask');setUnpost(true);}}else{sfx('back');setScreen('room');}return;}
  if(screen==='room'){if(pet.visitNotice){void care('ackVisit');return;}if(pet.sleeping){sfx('back');return;}if(answerable&&!messy){sfx('no');void care('respond',{answer:'no',intentId:answerable.id},true);}else{sfx('ask');setLocal({kind:'call',at:Date.now()});}return;}
  sfx('ok');
  if(screen==='menu'){const id=ICONS[sel].id;if(id==='food'||id==='check'||id==='album'){setScreen(id);setSel(0);}else if(id==='friends'){from.current=sel;setScreen('album');setSel(1);}else if(id==='find'&&!pet.dailyFind.available){setErrPage(0);setError(`${pet.name} already explored today. Next find in ${untilNext}.`);}else if(id==='play'&&!pet.sleeping)startGame();else void care(id==='light'?(pet.sleeping?'wake':'sleep'):id==='bath'?'clean':id==='find'?'explore':'play');return;}
  if(screen==='food'){void care(sel===0?'meal':'snack');return;}
  if(screen==='check'){setNameIdx(Math.max(0,NAMES.indexOf(pet.name)));setScreen('name');return;}
  if(screen==='name'){void care('rename',{name:NAMES[nameIdx]});return;}
  if(screen==='album'){const m=memories[sel-2-nv];if(m?.scene){setReplay(m.scene);}else if(sel>0){sfx('tick');setSel(sel-1);}return;}
 }
 function pressC(){
  if(error){dismiss();return;}if(!pet)return;if(booting){boot.current=0;return;}if(sure){setSure(false);sfx('back');return;}if(screen==='card'){pressA();return;}sfx('back');
  if(unpost){setUnpost(false);return;}
  if(screen==='ask'||screen==='join'){setScreen('room');return;}
  if(pet.stage==='egg'){setNameIdx((nameIdx+1)%NAMES.length);return;}
  if(scene){if(guessing&&bet){setBet(false);void care('sceneChoose',{sceneId:scene.id,guess:ord[guess],sure:false});}else if(guessing){setBeat(0);setPage(0);}else if(ending&&onCard){void share();}else if(ending)leaveScene();else if(scene.awaitingChoice){setBeat(beats.length);}else setBeat(beats.length);return;}
  if(screen==='game'){setGame(null);setScreen('room');return;}
  if(screen==='today'||screen==='review'){setScreen('room');return;}
  if(screen==='room'){if(pet.visitNotice){void care('ackVisit');return;}learn('c');setScreen('menu');setSel(0);return;}
  setScreen(screen==='menu'?'room':screen==='name'?'check':'menu');if(screen!=='menu'&&screen!=='name'){setSel(from.current>=0?from.current:Math.max(0,ICONS.findIndex(i=>i.id===screen)));from.current=-1;}
 }
 useEffect(()=>{function key(e:KeyboardEvent){if(e.ctrlKey||e.metaKey||busy)return;const k=e.key.toLowerCase();if(k==='a'||k==='arrowright'){e.preventDefault();pressA();}else if(k==='b'||k==='enter'){e.preventDefault();pressB();}else if(k==='c'||k==='escape'){e.preventDefault();pressC();}}addEventListener('keydown',key);return()=>removeEventListener('keydown',key);});

 const t=now(),fxServer:Fx|null=pet?.reaction&&t-pet.reaction.at<5600&&pet.reaction.pose!=='idle'&&pet.reaction.pose!=='sleep'?{kind:pet.reaction.pose,elapsed:t-pet.reaction.at}:null;
 const fxLocal:Fx|null=local&&Date.now()-local.at<7000?{kind:local.kind,elapsed:Date.now()-local.at}:null;
 const fx=fxServer&&fxLocal?(local!.at>clock.current.local-(t-pet!.reaction!.at)?fxLocal:fxServer):fxServer??fxLocal;
 const shape=(pet?.temperament??'gentle') as Shape,mark=markOf(pet?.bornAt),blinkOn=Math.floor(Date.now()/500)%2===0;
 const labels=booting||fresh?['','','']:error?['OK','','']:sure?['REPLY','POST','NO']:unpost?['KEEP','REMOVE','KEEP']:screen==='game'&&game&&game.round>=5?['','','HOME']:scene?(guessing?(bet?['SURE','BACK','HUNCH']:[guess<0?'CHOOSE':'NEXT',guess<0?'':'PICK','BACK']):ending?(onView?['NEXT','','']:['HOME',onCard&&!signedIn?'SIGN IN':onCard&&canTell?'POST':'',onCard?'SHARE':'']):['NEXT','','SKIP']):!pet||pet.stage==='egg'?['◀ NAME','HATCH','NAME ▶']:screen==='room'?(pet.visitNotice?['OK','','']:[pet.sleeping?'WAKE':messy?'CLEAN':canWave?'WAVE':answerable?'YES':'PET',pet.sleeping?'':answerable&&!messy?'NO':'CALL','MENU']):screen==='game'?['LEFT','RIGHT','QUIT']:screen==='card'?['OK','OK','OK']:screen==='ask'?['YES','','NO']:screen==='join'?['JOIN','','NO']:screen==='today'?['GO','','LATER']:screen==='review'?['HOME',!signedIn?'SIGN IN':canTell?'POST':told?'UNPOST':'','']:screen==='check'?['REVIEW','NAME','BACK']:screen==='album'?['NEXT',memories[sel-2-nv]?.scene?'PLAY':sel>0?'PREV':'','BACK']:['NEXT','OK','BACK'];
 const iconRow=()=>ICONS.map((ic,i)=>{const n=i,on=screen==='menu'&&sel===n,hint=ic.id==='find'&&pet?.dailyFind.available&&!pet.sleeping&&screen==='room'&&blinkOn;
  return <g key={ic.id}><Bits rows={ic.art} x={10+i*32} y={1} opacity={on||hint?1:screen==='menu'?.45:.22}/>{on&&<path d={`M${7+i*32} 13h17v1h-17z`} fill={INK}/>}</g>;});
 const age=pet?`Day ${Math.floor(pet.ageHours/24)+1}`:'';

 let body;
 if(booting){
  // The logo drops in, two dots at a time, and lands. Every handheld worth loving did this.
  const e=Date.now()-boot.current,y=Math.round((-30+Math.min(1,e/900)*74)/2)*2,landed=e>=900;
  body=<><g transform={`translate(29 ${y+10}) scale(2)`}><Txt s="Kimama" x={0} y={0}/></g>
   {landed&&<path d="M29 82h70v1H29z" fill={INK}/>}{landed&&<Txt s="as it pleases" x={64} y={88} align="center" opacity={.8}/>}{landed&&e<1300&&<Txt s="♥" x={102} y={y}/>}
   {!pet&&landed&&<Txt s={error?'No signal':'.'.repeat(1+Math.floor(Date.now()/400)%3)} x={64} y={92} align="center"/>}</>;}
 else if(!pet)body=null;
 else if(scene){
  const o=OBJECTS[scene.object],pair=scene.actors.length===2,mine=scene.actors[scene.you??0]?.name??pet.name;
  // What to weigh, said in turn: the question, the mood, the notes, and what today's care has done.
  const cm=careMood(pet,scene.at),md=scene.mind,heads=[`What will ${mine} do?`,...(md==='restless'?['Restless: by mood','Watch how it stands']:md==='settled'?['Settled: by habit',noteOf(KIND[scene.object])?'Check its notes':'No note yet: hunch?']:md==='torn'?['In two minds today','Mood or habit?']:['Watch how it stands','Check its notes']),...(cm>0?['Fussed over: braver']:cm<0?['Told off: wary']:[])];
  // The streak as it stands today: one missed day is forgiven, two start it again.
  const gapDays=pet.reads?.lastDay?Math.round((Date.parse(new Date(t).toISOString().slice(0,10))-Date.parse(pet.reads.lastDay))/86400000):99,run=gapDays<=2?pet.reads?.streak??0:0;
  const r=pet.review,quote=wrap(r.line,19).slice(0,4),e=Date.now(),keys=['try','gentle','watch'] as const,most=Math.max(1,...keys.map(k=>garden?.counts[k]??0)),sinceEnd=e-(scene.view?endAt.current:beatAt.current);
  if(onView)body=<><Txt s="On the way home" x={64} y={3} align="center"/><path d="M0 12h128v1H0z" fill={INK}/><Plate id={scene.view!} x={10} y={17}/>
   <Txt s={viewName(scene.view!)} x={64} y={78} align="center"/><Txt s={`${scene.viewNew?'New ♥ ':''}${nv} of ${VIEWS.length}`} x={64} y={89} align="center" opacity={.8}/>
   <path d="M0 125h128v1H0z" fill={INK}/><Creature s={1} x={24} y={124} look={{shape,mark,stage:pet.stage,gx:2,gy:-1,eyes:Math.floor(e/250)%17===0?'shut':'wide'}}/><Txt s={`${pet.name} stopped`} x={44} y={104}/><Txt s="to look." x={44} y={114}/></>;
  // The one end card: what it did, whether you called it, what everyone else's did, what it thinks of you, and when to come back.
  else if(onCard){const w=street?.wall?.length?street.wall[Math.floor(e/10400)%street.wall.length]:null,kn=knowsOf(pet),turns=[...(pet.review.note?[pet.review.note]:[]),!garden||garden.total<=1?'First pet out today':`${garden.counts[scene.choice??'try']} of ${garden.total} pets did too`,`Next: ${OBJECTS[dailyObject(t+86400000)].name}`,...(kn!==undefined?[`You know ${mine}: ${kn}%`]:[]),...(w?[w.knows!==undefined&&Math.floor(e/10400)%2?`${w.name}'s human: ${w.knows}%`:`${w.name} gave ${'★'.repeat(w.stars??3)}`]:[])];const sy=sinceEnd<300?4:sinceEnd<420?16:14,art=OBJ[scene.object]??OBJ.pebble,sour=r.stars<=2,glad=r.stars>=4,bust=!!scene.sure&&!!scene.guess&&!scene.guessed,lead=!signedIn?`B: sign in, keep ${mine}`.slice(0,21):told?'Posted to the thread ♥':canTell?'B: post its review':`${found}/${DAILY.length} · next ${untilNext}`,foot=turns.flatMap(x=>[lead,x]);
   body=<><Txt s={(o.name.length>14?o.name:`Today: ${o.name}`)} x={64} y={3} align="center"/><path d="M0 12h128v1H0z" fill={INK}/>
    <Txt s={scene.choice?o[scene.choice].slice(0,16):'...'} x={4} y={15}/><Txt s={(()=>{if(!scene.guess)return '';
     // Why it did that, in the game's own three signs, so a miss can be traced to something that was on the screen.
     const why=!scene.habit?{try:'A hop means go',gentle:'A ? means gentle',watch:'Sat low: it waits'}[scene.choice??'try']:scene.tell===scene.habit?'Both said so':scene.mind==='restless'?'Restless: mood':scene.mind==='settled'?'Settled: habit':scene.mind==='torn'?`Two minds: ${scene.choice===scene.habit?'habit':'mood'}`:scene.choice===scene.habit?'Habit beat mood':'Mood beat habit';
     const lines=scene.guessed?[scene.sure?'Sure, and right ♥':'A hunch, right ♥',...((scene.streak??0)>1?[`Streak ${scene.streak} ♥`]:[]),why]:[why,scene.sure?'Sure. And wrong.':'Not your guess',...(scene.choice?[`It ${({try:'went at it',gentle:'was gentle',watch:'hung back'})[scene.choice]}`]:[])];
     if(scene.noted&&scene.habit)lines.push(`Note: ${NOTE_SHORT[scene.habit]}`);
     return lines[Math.floor(e/2400)%lines.length];})()} x={4} y={25} opacity={.85}/>
    <rect x={108} y={sy} width={18} height={18} fill={INK}/><Big rows={art} x={117} y={sy+9+Math.ceil(art.length/2)} s={1} fill={PAPER}/>
    <path d="M4 36h120v1H4z" fill={INK} opacity={.5}/>
    {/* The verdict is the point of the day, and it has a face. Sure and wrong, it turns its back. */}
    <Creature x={30} y={79-(glad&&sinceEnd<1300?Math.round(Math.abs(Math.sin(sinceEnd/210))*4):0)} look={bust?{shape,mark,stage:pet.stage,back:true,glance:Math.floor(e/1700)%3===0}:{shape,mark,stage:pet.stage,eyes:Math.floor(e/250)%17===0?'shut':sour?'low':glad?'happy':'open',gx:sour&&Math.floor(e/1400)%3===0?2:0,mouth:glad?'open':'flat'}}/>
    <Txt s={mine.slice(0,11)} x={62} y={41}/><Txt s="on you" x={62} y={50} opacity={.75}/>
    <Stars n={r.stars} x={62} y={61} shown={Math.max(0,Math.floor((sinceEnd-350)/170))}/>
    <path d="M4 81h120v1H4z" fill={INK} opacity={.5}/>
    {sinceEnd>1300&&!sure&&quote.map((l,i)=><Txt key={i} s={l} x={64} y={(quote.length>3?83:86)+i*9} align="center"/>)}
    {/* The foot takes turns: what to do next, then the street and tomorrow. */}
    <Txt s={foot[Math.floor(e/2600)%foot.length].slice(0,21)} x={64} y={119} align="center" opacity={.85}/></>;}
  else body=<>
   <Txt s={guessing?(bet&&guess>=0?`${o[ord[guess]]}?`:heads[Math.floor(Date.now()/1800)%heads.length]):replay?'Memory':pair?`${scene.actors[0].name} + ${scene.actors[1].name}`:(o.name.length>14?o.name:`Today: ${o.name}`)} x={64} y={3} align="center"/><path d="M0 12h128v1H0z" fill={INK}/>
   {ending&&!pair?<Tally garden={null} scene={scene} name={mine} next=""/>:<Play scene={scene} beat={guessing?beats.length-1:beat} t={guessing?9999+Date.now()-guessAt.current:Date.now()-beatAt.current}/>}
   {!guessing&&!ending&&!replay&&beat===1&&scene.kind==='daily'&&!!scene.guess&&(()=>{const w=Date.now()-beatAt.current,to=scene.streak??0,was=scene.was??to,k=Math.min(1,Math.max(0,(w-1500)/600));
    return <><Txt s={w<1000?`${scene.sure?'Sure':'Hunch'}...`:w<1500?`${scene.sure?'Sure':'Hunch'}${scene.guessed?': right':': wrong'}`:scene.guessed?'Right ♥':'Wrong'} x={4} y={15}/>{w>=1500&&<Txt s={`streak ${Math.round(was+(to-was)*k)}`} x={124} y={15} align="right" opacity={k<1&&Math.floor(w/90)%2?.5:1}/>}</>;})()}
   {guessing&&!bet&&<Txt s={`${KIND_NAME[KIND[scene.object]].replace(' things','')}: ${noteOf(KIND[scene.object])?NOTE_SHORT[noteOf(KIND[scene.object])!]:'no note'}`} x={4} y={15} opacity={.85}/>}
   {guessing&&bet?<Box lines={[`Your streak: ${run}`,'A sure: +2 or bust','C hunch: +1, safe']}/>:guessing?<Box lines={ord.map((k,i)=>((guess===i?'▶':' ')+' '+o[k]).slice(0,19))}/>:ending?<Box lines={wrap(scene.effect??'',19)}/>:<Box lines={pages[page]??[]} shown={typed} more={pageDone&&blinkOn}/>}
  </>;
 }else if(pet.stage==='egg')body=<><Egg now={Date.now()}/><Txt s={`◀ ${NAMES[nameIdx]} ▶`} x={64} y={30} align="center"/><Txt s="Someone is inside" x={64} y={16} align="center" opacity={.8}/><Txt s="B: hatch" x={64} y={104} align="center"/><Txt s="A or C: other name" x={64} y={115} align="center" opacity={.7}/></>;
 else if(screen==='game'&&game){
  const e=Date.now()-game.at,done=game.round>=5,side=game.sides[Math.min(4,game.round)],bold=(pet.traits?.bold??0)>2,feint=(pet.bornAt+game.round*7)%10>=(bold?5:7),tell=feint&&e<1150?1-side:side,show=game.phase==='show'&&!done,glance=!show&&!done&&e>400,x=show?(side?94:34):64+(glance?(tell?12:-12):0),right=game.pick===side;
  body=<><Txt s={done?`${game.score} of 5`:'Which way?'} x={4} y={3}/><Txt s={'■'.repeat(game.score)+'□'.repeat(5-game.score)} x={124} y={3} align="right"/><path d="M0 12h128v1H0z" fill={INK}/><path d="M0 97h128v1H0z" fill={INK}/>
   {!done&&!show&&<><Txt s="◀" x={8} y={62}/><Txt s="▶" x={115} y={62}/></>}
   <Creature x={x} y={96-(show&&e<500?4:0)} look={{shape,mark,stage:pet.stage,gx:glance?(tell?2:-2):0,eyes:done?(game.score>=3?'happy':'open'):show?(right?'happy':'low'):'open',mouth:(show&&right)||(done&&game.score>=3)?'open':'flat',feet:show&&e<500?(Math.floor(e/125)%2?1:2):0}}/>
   {show&&<Emote id={right?'note':'sweat'} x={x>84?x-32:x+32} y={66}/>}
   <Txt s={done?(game.score>=3?'You know me!':'Again sometime?'):e<400||show?'':'A: left   B: right'} x={64} y={108} align="center"/></>;}
 else if(screen==='today'){const id=Object.keys(OBJECTS).find(k=>OBJECTS[k as keyof typeof OBJECTS].name===pet.dailyFind.name)??'leaf',streak=pet.reads?.lastDay&&pet.reads.streak>0?pet.reads.streak:0;
  body=<><Txt s="Today" x={4} y={3}/><Txt s={new Date(t).toLocaleDateString('en',{month:'short',day:'numeric',timeZone:'UTC'})} x={124} y={3} align="right" opacity={.8}/><path d="M0 12h128v1H0z" fill={INK}/>
   <Txt s={An(pet.dailyFind.name)} x={64} y={18} align="center"/><Txt s={`What will ${pet.name} do?`} x={64} y={29} align="center"/><Txt s={Math.floor(Date.now()/2600)%2&&careMood(pet,t)?(careMood(pet,t)>0?'All fussed: braver':'Told off: wary'):streak>0?`Streak ${streak} ♥`:'Watch how it stands.'} x={64} y={40} align="center" opacity={.8}/>
   <path d="M0 97h128v1H0z" fill={INK}/><Creature x={40} y={96} look={{shape,mark,stage:pet.stage,gx:2,eyes:Math.floor(Date.now()/250)%17===0?'shut':'wide',squash:Math.floor(Date.now()/700)%2}}/><Thing id={id} x={98} y={96-(Math.floor(Date.now()/500)%2?2:0)}/>
   <Txt s="A: go and see" x={64} y={104} align="center"/><Txt s="C: later" x={64} y={115} align="center" opacity={.7}/></>;}
 else if(screen==='review'){const r=pet.review,lines=wrap(r.line,19).slice(0,4),e=Date.now(),sour=r.stars<=2,glad=r.stars>=4;
  // The pet's verdict on you. Low marks come with the look.
  body=<><Txt s={`${pet.name}'s review`} x={64} y={3} align="center"/><path d="M0 12h128v1H0z" fill={INK}/><Txt s="of you, so far today" x={64} y={16} align="center" opacity={.7}/>{r.note&&<Txt s={r.note} x={64} y={48+lines.length*10} align="center" opacity={.7}/>}
   <Stars n={r.stars} x={33} y={28}/>
   {lines.map((l,i)=><Txt key={i} s={l} x={64} y={46+i*10} align="center"/>)}
   <path d="M0 127h128v1H0z" fill={INK}/><Creature x={40} y={126-(glad&&e%1800<500?Math.round(Math.sin(e%500/500*Math.PI)*4):0)} look={{shape,mark,stage:pet.stage,eyes:sour?'low':glad?'happy':Math.floor(e/250)%17===0?'shut':'open',gx:sour?(Math.floor(e/1400)%3===0?2:0):0,mouth:glad?'open':'flat'}}/>
   {/* The one being reviewed, in the same dots as everything else. */}
   {face?<><Bits rows={face} x={98-Math.floor(face[0].length/2)} y={88}/><Txt s={told?'You ♥':'You'} x={98} y={120} align="center" opacity={.8}/></>:told?<Txt s="Posted ♥" x={124} y={116} align="right"/>:canTell?<><Txt s="B: post" x={124} y={106} align="right"/><Txt s="its review" x={124} y={116} align="right"/></>:null}</>;}
 else if(screen==='food'){const fussy=(pet.traits?.selective??0)>2&&pet.fullness>30,full=pet.fullness>90;
  body=<><Txt s="Something good?" x={64} y={3} align="center"/><path d="M0 12h128v1H0z" fill={INK}/><Big rows={ART.onigiri} x={34} y={46}/><Big rows={ART.berry} x={94} y={46}/><Txt s="Rice" x={34} y={50} align="center" opacity={sel===0?1:.5}/><Txt s="Berry" x={94} y={50} align="center" opacity={sel===1?1:.5}/><Txt s="a meal" x={34} y={60} align="center" opacity={sel===0?.8:.35}/><Txt s="a treat" x={94} y={60} align="center" opacity={sel===1?.8:.35}/><Txt s="▼" x={sel===0?34:94} y={16} align="center"/>
   <path d="M0 123h128v1H0z" fill={INK}/><Creature x={64} y={122} look={{shape,mark,stage:pet.stage,gx:sel===0?-2:2,gy:-1,eyes:sel===0&&(fussy||full)?'low':'wide',mouth:sel===0&&(fussy||full)?'flat':'o'}}/></>;}
 else if(screen==='check'){const rows:[string,number][]=[['Tummy',pet.fullness],['Joy',pet.joy],['Energy',pet.energy],['Clean',pet.cleanliness]],likes=pet.signature==='window'?'the window':pet.signature==='toy'?'that ball':pet.signature==='greet'?'company':pet.signature==='tidy'?'its treasure':'',e=Date.now(),sad=Math.min(pet.fullness,pet.joy,pet.cleanliness)<30;
  // A page from the owner's handbook: a portrait, who it is, how it is, and what it thinks of you today.
  body=<><Txt s={pet.name} x={4} y={3}/><Txt s={`${age} ${pet.stage}`} x={124} y={3} align="right" opacity={.8}/><path d="M0 12h128v1H0z" fill={INK}/>
   <path d="M4 16h38v38H4zM5 17v36h36V17z" fill={INK} fillRule="evenodd"/><path d="M5 49h36v1H5z" fill={INK} opacity={.4}/><Creature s={1} x={23} y={49} look={{shape,mark,stage:pet.stage,eyes:Math.floor(e/250)%17===0?'shut':sad?'low':'open',...(sad?{mouth:'flat' as const}:{})}}/>
   <Txt s={`${shape[0].toUpperCase()}${shape.slice(1)} one`} x={48} y={17}/><Txt s={`Finds ${found}/${DAILY.length}`} x={48} y={27} opacity={.8}/><Txt s={'♥'.repeat(Math.max(0,Math.min(5,Math.ceil(pet.bond/20))))||'-'} x={48} y={37}/>{likes&&<Txt s={`♥ ${likes}`.slice(0,13)} x={48} y={47} opacity={.8}/>}
   <path d="M4 58h120v1H4z" fill={INK} opacity={.5}/>
   {rows.map(([l,v],i)=><g key={l}><Txt s={l} x={4} y={63+i*10}/><Txt s={'■'.repeat(Math.round(v/20))+'□'.repeat(5-Math.round(v/20))} x={124} y={63+i*10} align="right"/></g>)}
   <path d="M4 104h120v1H4z" fill={INK} opacity={.5}/><Txt s="You, today" x={4} y={109}/><Txt s={'★'.repeat(pet.review.stars)+'☆'.repeat(5-pet.review.stars)} x={124} y={109} align="right"/></>;}
 else if(screen==='name')body=<><Txt s="A new name" x={64} y={16} align="center" opacity={.8}/><Txt s={`◀ ${NAMES[nameIdx]} ▶`} x={64} y={32} align="center"/><Creature x={64} y={96} look={{shape,mark,stage:pet.stage,gy:-1,eyes:'wide'}}/><path d="M0 97h128v1H0z" fill={INK}/></>;
 else if(screen==='album'&&sel===0){const today=dailyObject(t);
  // A stamp card, like the ones handed out for summer-morning exercises: one square a day, thirty to fill, six to a row.
  body=<><Txt s="Finds" x={4} y={3}/><Txt s={found>=DAILY.length?'All ♥':`${found}/${DAILY.length}`} x={124} y={3} align="right"/><path d="M0 12h128v1H0z" fill={INK}/>
   {DAILY.map((id,i)=>{const x=5+(i%6)*20,y=15+Math.floor(i/6)*20,got=!!finds[id],due=id===today&&!got,h=OBJ[id].length;
    return <g key={id}><path d={`M${x} ${y}h19v19h-19zM${x+1} ${y+1}v17h17v-17z`} fill={INK} fillRule="evenodd" opacity={got?1:due&&blinkOn?.9:.25}/>{got?<><rect x={x+2} y={y+2} width={15} height={15} fill={INK}/><Big rows={OBJ[id]} x={x+10} y={y+10+Math.ceil(h/2)} s={1} fill={PAPER}/></>:due?<Txt s="?" x={x+10} y={y+6} align="center" opacity={blinkOn?1:.4}/>:null}</g>;})}</>;}
 else if(screen==='album'&&sel===1){const kinds=Object.keys(KIND_NAME) as Kind[];
  // The owner's notebook: its habit with each sort of thing, written down the first time they meet one. With its stance and its mind, this is the whole read.
  body=<><Txt s="Notes" x={4} y={3}/><path d="M0 12h128v1H0z" fill={INK}/>
   {kinds.map((k,i)=>{const h=noteOf(k);return <g key={k}><Txt s={KIND_NAME[k].replace(' things','')} x={4} y={18+i*14}/><Txt s={h?`${SIGN[h]} ${NOTE_SHORT[h]}`:'·'} x={124} y={18+i*14} align="right" opacity={h?1:.6}/></g>;})}
   <path d="M4 101h120v1H4z" fill={INK} opacity={.5}/><Txt s="Restless: by mood." x={64} y={105} align="center" opacity={.8}/><Txt s="Settled: by habit." x={64} y={115} align="center" opacity={.8}/></>;}
 else if(screen==='album'&&sel===-99){const e=Date.now(),blink=(k:number)=>Math.floor((e+k*700)/250)%19===0;
  // The visitor book: who has come to the window. One of them does not fit on the page at the same size as the others.
  body=<><Txt s="Strays" x={4} y={3}/><Txt s={`${[...STRAYS,DAIFUKU].filter(w=>met.ids.includes(w.id)).length}/4`} x={124} y={3} align="right"/><path d="M0 12h128v1H0z" fill={INK}/>
   {STRAYS.map((w,i)=>{const x=22+i*42,got=met.ids.includes(w.id);return <g key={w.id}>{got?<Creature s={1} x={x} y={40} look={{shape:(w.temperament??'gentle') as Shape,stage:w.stage,mark:w.mark,eyes:blink(i)?'shut':'open'}}/>:<Txt s="?" x={x} y={26} align="center" opacity={.5}/>}<Txt s={got?w.name:'...'} x={x} y={44} align="center" opacity={got?1:.5}/></g>;})}
   {met.ids.includes(DAIFUKU.id)?<Creature x={64} y={100} look={{shape:'gentle',stage:'grown',eyes:blink(5)?'shut':'open'}}/>:<g transform="translate(58 70) scale(2)" opacity={.5}><Txt s="?" x={0} y={0}/></g>}
   <Txt s={met.ids.includes(DAIFUKU.id)?DAIFUKU.name:'Someone big...'} x={64} y={104} align="center" opacity={met.ids.includes(DAIFUKU.id)?1:.5}/>
   <Txt s={`Players' pets: ${met.pets}`} x={64} y={116} align="center" opacity={.7}/></>;}
 else if(screen==='join'){const e=Date.now();
  // Asked once, after the first find. Joining is its own question, and the answer is reported as Reddit gave it.
  body=<><Txt s="One thing" x={64} y={3} align="center"/><path d="M0 12h128v1H0z" fill={INK}/><Txt s="Join this community," x={64} y={18} align="center"/><Txt s="and each day's find" x={64} y={28} align="center"/><Txt s="comes to your feed?" x={64} y={38} align="center"/>
   <Creature x={64} y={92} look={{shape,mark,stage:pet.stage,gy:-1,eyes:Math.floor(e/250)%17===0?'shut':'wide',mouth:'o'}}/><path d="M0 93h128v1H0z" fill={INK}/>
   <Txt s="A: join" x={64} y={100} align="center"/><Txt s="C: no thanks" x={64} y={111} align="center" opacity={.8}/></>;}
 else if(screen==='ask'){const e=Date.now();
  // Asked once, after the first find: may it call you?
  body=<><Txt s="One thing" x={64} y={3} align="center"/><path d="M0 12h128v1H0z" fill={INK}/><Txt s={`May ${pet.name} send you`.slice(0,21)} x={64} y={18} align="center"/><Txt s="a Reddit notification" x={64} y={28} align="center"/><Txt s="when a find turns up?" x={64} y={38} align="center"/>
   <Creature x={64} y={92} look={{shape,mark,stage:pet.stage,gy:-1,eyes:Math.floor(e/250)%17===0?'shut':'wide',mouth:'o'}}/><path d="M0 93h128v1H0z" fill={INK}/>
   <Txt s="A: yes please" x={64} y={100} align="center"/><Txt s="C: no thanks" x={64} y={111} align="center" opacity={.8}/></>;}
 else if(screen==='card'&&post&&!error){
  // A postcard left at the window by another player's pet.
  body=<><Txt s="Postcard" x={4} y={3}/><Txt s="♥" x={124} y={3} align="right"/><path d="M0 12h128v1H0z" fill={INK}/><Plate id={post.view} x={10} y={20}/><Txt s={viewName(post.view)} x={64} y={82} align="center"/><Txt s={`from ${post.from}`.slice(0,21)} x={64} y={93} align="center"/><Txt s={`${pet.name} rates them`.slice(0,21)} x={64} y={105} align="center" opacity={.8}/><Txt s={`${'★'.repeat(Math.min(5,Math.max(4,pet.review.stars+1)))}  you: ${'★'.repeat(pet.review.stars)+'☆'.repeat(5-pet.review.stars)}`} x={64} y={116} align="center"/></>;}
 else if(screen==='album'&&sel<=nv+1){const id=views[sel-2],c=cardOf(id);
  body=<><Txt s="Views" x={4} y={3}/><Txt s={`${sel-1}/${nv}`} x={124} y={3} align="right"/><path d="M0 12h128v1H0z" fill={INK}/><Plate id={id} x={10} y={22}/><Txt s={viewName(id)} x={64} y={86} align="center"/><Txt s={c?`Postcard from ${c.from}`.slice(0,21):`${nv} of ${VIEWS.length} views`} x={64} y={100} align="center" opacity={.7}/></>;}
 else if(screen==='album'){const m=memories[sel-2-nv],lines=m?wrap((m.scene?'▶ ':'')+m.text,19):['No memories yet'];
  body=<><Txt s="Memories" x={4} y={3}/><Txt s={memories.length?`${sel-1-nv}/${memories.length}`:''} x={124} y={3} align="right"/><path d="M0 12h128v1H0z" fill={INK}/>
   {m&&<Txt s={new Date(m.at).toLocaleDateString('en',{month:'short',day:'numeric'})} x={4} y={18} opacity={.7}/>}{lines.slice(0,9).map((l,i)=><Txt key={i} s={l} x={4} y={30+i*10}/>)}{m?.scene&&<Thing id={m.scene.object} x={112} y={28} s={1}/>}</>;}
 else body=<>
   {iconRow()}<path d="M0 14h128v1H0z" fill={INK} opacity={.35}/>
   <Room pet={pet} now={t} fx={fx} point={finger.current&&Date.now()-finger.current.at<2500?finger.current:null} guest={guest} wavedAt={waved?.at??0} grown={street?.grown}/>
   {screen==='menu'?<Txt s={ICONS[sel].id==='light'&&pet.sleeping?'Wake':ICONS[sel].label} x={64} y={118} align="center"/>:(()=>{const tip=pet.sleeping?null:messy?'A: clean up':guest?(guest.stars&&Math.floor(Date.now()/3200)%2?`rates its human ${'★'.repeat(guest.stars)}`:`${guest.name} at the window`):!known.current.ab&&answerable?'A: yes  B: no':!known.current.ab?(messy?'A: clean up':'A: pet it'):!known.current.c?'C: menu':!known.current.k&&!pet.dailyFind.available?'Tap KIMAMA: colour':null;return tip&&Math.floor(Date.now()/1600)%2===0?<Txt s={tip} x={64} y={118} align="center"/>:<><Txt s={pet.name} x={3} y={118}/>{Math.floor(Date.now()/3200)%2===0?<Txt s={'★'.repeat(pet.review.stars)+'☆'.repeat(5-pet.review.stars)} x={125} y={118} align="right"/>:<Txt s={!pet.dailyFind.available&&Math.floor(Date.now()/3200)%4===1?`next ${untilNext}`:age} x={125} y={118} align="right" opacity={.8}/>}</>;})()}
   {pet.visitNotice&&screen==='room'&&<Box lines={wrap(`${pet.visitNotice.visitor.name} came to visit!`,19)}/>}
  </>;

 // The glass is one image to assistive tech, so say what it shows.
 const spoken=error?error:unpost?'Take your review down from the thread? B removes it, C keeps it.':screen==='join'&&pet?'Join this community, and each day\'s find comes to your feed? A to join, C for no thanks.':sure?`Post this review to the thread with your username on it, and your reply: ${replies[retort%replies.length]} A changes the reply, B posts, C cancels.`:!pet?'Loading':scene?(guessing&&bet?'How sure are you? A: sure, your streak gains two, or you lose all of it. C: a hunch, your streak gains one, and a miss costs it nothing. B goes back.':guessing?`${noteOf(KIND[scene.object])?`Your note: ${HABIT_SAYS[noteOf(KIND[scene.object])!].toLowerCase()} ${KIND_NAME[KIND[scene.object]].toLowerCase()}. `:`No note on ${KIND_NAME[KIND[scene.object]].toLowerCase()} yet. `}${scene.tell?{try:`${pet.name} is leaning right in.`,gentle:`${pet.name} is circling it carefully.`,watch:`${pet.name} is hanging back.`}[scene.tell]+' ':''}${scene.mind?{restless:'It is restless today, so it will do as it pleases. ',settled:'It is settled today, so it will keep to its habit. ',torn:'It is in two minds today: it could go by its mood or by its habit. '}[scene.mind]:''}What will ${pet.name} do? ${ord.map((k,i)=>(guess===i?'Selected: ':'')+OBJECTS[scene.object][k]).join('. ')}`:ending?`${scene.summary??''} ${scene.guess?(scene.guessed?'You called it.':'Not your guess.'):''} ${onView&&scene.view?`On the way home it stopped to look at: ${viewName(scene.view)}.`:onCard?`${pet.name}'s review of you today: ${pet.review.stars} of 5 stars. ${pet.review.line}${canTell?' B to tell the thread.':''}`:scene.effect??''}`:beats[beat]?.text??''):pet.stage==='egg'?`An egg. Name: ${NAMES[nameIdx]}. A and C change the name, B hatches.`:screen==='game'?(game&&game.round>=5?`${game.score} of 5. C for home.`:'Which way will it hop? It looks where it means to go. A for left, B for right.'):screen==='ask'?`May ${pet.name} send you a Reddit notification when a find turns up? A for yes. C for no.`:screen==='card'&&post?`A postcard from ${post.from}: ${viewName(post.view)}. ${pet.name} rates them ${Math.min(5,Math.max(4,pet.review.stars+1))} stars, and you ${pet.review.stars}.`:screen==='menu'?`Menu: ${ICONS[sel].label}`:screen==='today'?`Today: a ${pet.dailyFind.name}. What will ${pet.name} do? A to go and see, C for later.`:screen==='review'?`${pet.name}'s review of you today: ${pet.review.stars} out of 5 stars. ${pet.review.line}${canTell?' B tells the thread.':''}`:screen==='food'?`Food: ${sel===0?'rice ball':'berry'} selected`:screen==='check'?`${pet.name}. Tummy ${Math.round(pet.fullness)}, joy ${Math.round(pet.joy)}, energy ${Math.round(pet.energy)}, clean ${Math.round(pet.cleanliness)}, bond ${Math.round(pet.bond)} percent.`:screen==='name'?`Name: ${NAMES[nameIdx]}`:screen==='album'?(sel===0?`Stamp card: ${found} of ${DAILY.length} finds. ${DAILY.filter(id=>finds[id]).map(id=>OBJECTS[id].name).join(', ')}`:sel===1?`Notes. ${(Object.keys(KIND_NAME) as Kind[]).map(k=>`${KIND_NAME[k]}: ${noteOf(k)?HABIT_SAYS[noteOf(k)!].toLowerCase()+' them':'not met yet'}`).join('. ')}. Restless, it goes by its mood. Settled, it goes by its habit.`:sel<=nv+1?`View ${sel-1} of ${nv}: ${viewName(views[sel-2])}`:memories[sel-2-nv]?.text??'No memories yet'):pet.sleeping?`${pet.name} is asleep`:pet.visitNotice?`${pet.visitNotice.visitor.name} came to visit`:`${guest?`${guest.name} is looking in at the window. `:''}${pet.name} is ${pet.intent?({toy:'playing with a ball',window:'at the window',greet:'waiting at the glass for you',tidy:'moving its treasure',bowl:'asking for food',nap:'dozing off'} as Record<string,string>)[pet.intent.kind]??'busy':'resting'}${(pet.droppings??0)>0?'. There is a mess to clean':''}`;
 return <main className="pocket-page"><section className="device" style={SHELLS[shell>=0?shell:shellFor(pet?.bornAt)].vars as React.CSSProperties} aria-label="Kimama handheld">
  <div className="device-top"><button className="brand" style={{appearance:'none',border:0,background:'none',padding:0,cursor:'pointer'}} aria-label="Change the colour of the case" onClick={()=>{learn('k');const n=((shell>=0?shell:shellFor(pet?.bornAt))+1)%SHELLS.length;saveShell(n);setShell(n);}}>Kimama</button><span style={{display:'flex',alignItems:'center'}}><button className="sound" onClick={()=>{try{localStorage.setItem('picky-mute',muted?'0':'1');}catch{/* private mode */}setMuted(!muted);}} aria-label={muted?'Turn sound on':'Mute sound'} aria-pressed={!muted}><i className={`sw ${muted?'':'on'}`}/>sound</button>{calls!==null&&<button className="sound" style={{marginLeft:6}} onClick={()=>void setCalling(!calls)} aria-label={calls?'Turn off Reddit notifications from your pet':'Let your pet send you Reddit notifications'} aria-pressed={calls}><i className={`sw ${calls?'on':''}`}/>alerts</button>}</span></div>
  <div className={`bezel ${pet?.sleeping&&!scene?'night':''}`}><Lcd onPoint={onPoint} night={!!pet?.sleeping&&!scene} label={pet?(pet.stage==='egg'?`An egg. ${NAMES[nameIdx]} is inside`:`${pet.name}, a ${pet.temperament??'gentle'} ${pet.stage}`):'Kimama'}>{body}{busy&&<Txt s="…" x={122} y={118} align="right"/>}{sure&&!error&&<Box lines={['Post it with your','username?',`Reply: ${replies[retort%replies.length]}`]}/>}{unpost&&!error&&<Box lines={['Take your review','down from the thread?','B: remove   C: keep']}/>}{error&&<Box lines={errLines.slice(errPage*3,errPage*3+3)} more={(errPage+1)*3<errLines.length&&blinkOn}/>}</Lcd><span className="bezel-note">DOT MATRIX · 128×128</span><p className="sr" role="status" aria-live="polite">{spoken}</p></div>
  <div className="hardware">{(['A','B','C'] as const).map((k,i)=><div key={k}><button disabled={busy} onClick={()=>{try{navigator.vibrate?.(8);}catch{/* no motor */}[pressA,pressB,pressC][i]();}} aria-label={labels[i]?`${k}: ${labels[i]}`:k}>{k}</button><span>{labels[i]||' '}</span></div>)}</div>
  <div className="speaker" aria-hidden="true"><i/><i/><i/><i/><i/></div>
 </section></main>;
}
function chunk(lines:string[]):string[][]{const out:string[][]=[];for(let i=0;i<lines.length;i+=3)out.push(lines.slice(i,i+3));return out.length?out:[[]];}
createRoot(document.getElementById('root')!).render(<Pocket/>);
