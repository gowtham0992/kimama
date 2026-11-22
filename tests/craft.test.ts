import {describe,expect,it} from 'vitest';
import {careForPet,newPet,petView,NAMES,type Pet} from '../src/shared/pet';
import {recapText} from '../src/shared/recap';
import {dots} from '../src/client/portrait';
import {reviewFromCode,retortsFor} from '../src/shared/review';
import {petChoice,dailyRead,habitFor,mindOf,answerOrder,KIND,KIND_NAME,DAILY,OBJECTS} from '../src/shared/scenes';
import {pickView,weatherAt,VIEWS} from '../src/shared/views';
import {reviewOf,reviewLine,REVIEW_KEYS,REVIEW_ALT_KEYS} from '../src/shared/review';
const t=Date.UTC(2026,10,13,12);
const baby=(name='Pip')=>careForPet(newPet(t),{action:'hatch',name,version:0},t);
const act=(p:Pet,action:string,now:number,extra={})=>careForPet(p,{action,version:p.version,...extra},now);
describe('the pet decides',()=>{
 it('lets the owner guess, then acts on its own nature and rewards a right guess once',()=>{
  let p=baby();p.traits={bold:8,selective:0,social:0};
  p=act(p,'explore',t+1000);const scene=p.scenes![0],expected=dailyRead(p,scene.object,scene.at).will,bond=p.bond;
  const right=act(p,'sceneChoose',t+2000,{sceneId:scene.id,guess:expected});
  expect(right.scenes![0].choice).toBe(expected);expect(right.scenes![0].guessed).toBe(true);expect(right.bond).toBeGreaterThan(bond+1);
  const wrong=act(p,'sceneChoose',t+2000,{sceneId:scene.id,guess:expected==='watch'?'try':'watch'});
  expect(wrong.scenes![0].choice).toBe(expected);expect(wrong.scenes![0].guessed).toBe(false);
  expect(()=>act(right,'sceneChoose',t+3000,{sceneId:scene.id,guess:'try'})).toThrow();
 });
 it('makes bold pets usually try and timid pets usually hold back, without being certain',()=>{
  const tally=(bold:number)=>{const c={try:0,gentle:0,watch:0};for(let i=0;i<200;i++){const p=baby();p.bornAt=t+i*977;p.traits={bold,selective:0,social:0};c[petChoice(p,'leaf',t)]++;}return c;};
  const brave=tally(4),timid=tally(-4);
  expect(brave.try).toBeGreaterThan(105);expect(timid.watch).toBeGreaterThan(105);expect(brave.try).toBeLessThan(200);
 });
});
describe('care has consequences you can see',()=>{
 it('leaves a dropping a few minutes after a meal and a bath clears it',()=>{
  let p=baby();p.fullness=40;p=act(p,'meal',t+1000);
  expect(petView(p,t+60000).droppings??0).toBe(0);
  const later=petView(p,t+1000+6*60000);expect(later.droppings).toBe(1);expect(later.cleanliness).toBeLessThan(90);
  const clean=act(p,'clean',t+1000+7*60000);expect(clean.droppings).toBe(0);expect(clean.cleanliness).toBe(100);
 });
 it('accepts every curated name and nothing else',()=>{
  for(const name of NAMES)expect(careForPet(newPet(t),{action:'hatch',name,version:0},t).name).toBe(name);
  expect(()=>act(baby(),'rename',t+1,{name:'<script>'})).toThrow();
 });
});
describe('reading your pet is a daily game',()=>{
 it('keeps a streak: a hunch is safe, being sure doubles or loses the lot, and a missed day starts again',()=>{
  let p=baby();p.traits={bold:8,selective:0,social:0};const day=86400000;
  const play=(q:Pet,now:number,right:boolean,sure=false)=>{let n=act(q,'explore',now);const s=n.scenes![0],real=dailyRead(n,s.object,now).will;expect(['try','gentle','watch']).toContain(s.tell);n=act(n,'sceneChoose',now+10,{sceneId:s.id,guess:right?real:real==='watch'?'try':'watch',sure});return act(n,'sceneFinish',now+20,{sceneId:s.id});};
  p=play(p,t+1000,true);expect(p.reads).toMatchObject({streak:1,right:1,total:1});expect(p.sceneAlbum![0].sure).toBeUndefined();expect(p.sceneAlbum![0].habit).toBeDefined();
  p=play(p,t+day,true,true);expect(p.reads!.streak).toBe(3);expect(p.sceneAlbum![0].sure).toBe(true);
  p=play(p,t+2*day,false);expect(p.reads).toMatchObject({streak:3,best:3,total:3});
  p=play(p,t+3*day,false,true);expect(p.reads!.streak).toBe(0);expect(reviewOf(p,t+3*day+30).stars).toBe(1);
  p=play(p,t+4*day,true);p=play(p,t+6*day,true);expect(p.reads!.streak).toBe(2);expect(p.sceneAlbum![0].kept).toBe(true);{const rk=reviewOf({...p,fullness:80,droppings:0},t+6*day+30);/* The line stays on the guess; the kept streak is said beside it. */expect(['right','streak','called']).toContain(rk.code.k);expect(rk.note).toBe('Away a day: kept ♥');}
  p=play(p,t+9*day,true);expect(p.reads!.streak).toBe(1);expect(p.sceneAlbum![0].kept).toBeUndefined();
  expect(Object.values(p.kinds!).flat()).toHaveLength(8);
 });
 it('decides by three signs that are all shown: restless goes by mood, settled by habit, and nothing is rolled out of sight',()=>{
  let agree=0,differ=0,restless=0,settled=0;const did=new Set<string>();
  for(let i=0;i<900;i++){const p=baby();p.bornAt=t+i*613;p.temperament=(['bold','shy','gentle'] as const)[i%3];p.reads={streak:0,best:0,right:1,total:2};
   const o=DAILY[i%DAILY.length],r=dailyRead(p,o,t+i*86400000);expect(r.pose).toBe(petChoice(p,o,t+i*86400000));expect(r.habit).toBe(habitFor(p,KIND[o]));expect(r.mind).toBe(mindOf(p,o,t+i*86400000));did.add(r.will);
   // In its first three finds it is never in two minds: a new owner's days are decided by what they can read.
   expect(r.mind).not.toBe('torn');
   if(r.mind==='restless'){restless++;expect(r.will).toBe(r.pose);}else{settled++;expect(r.will).toBe(r.habit);}
   if(r.pose===r.habit)agree++;else differ++;}
  expect(agree).toBeGreaterThan(250);expect(differ).toBeGreaterThan(350);expect(restless).toBeGreaterThan(380);expect(settled).toBeGreaterThan(380);expect(did.size).toBe(3);
 });
 it('is in two minds about one day in five once it is known, says so, and only then leaves anything to chance',()=>{
  let torn=0,mood=0,split=0;
  for(let i=0;i<1500;i++){const p=baby();p.bornAt=t+i*613;p.reads={streak:2,best:2,right:3,total:5};
   const o=DAILY[i%DAILY.length],r=dailyRead(p,o,t+i*86400000);
   if(r.mind!=='torn'){expect(r.will).toBe(r.mind==='restless'?r.pose:r.habit);continue;}
   torn++;expect([r.pose,r.habit]).toContain(r.will);if(r.pose!==r.habit){split++;if(r.will===r.pose)mood++;}}
  expect(torn/1500).toBeGreaterThan(.15);expect(torn/1500).toBeLessThan(.25);expect(mood/split).toBeGreaterThan(.38);expect(mood/split).toBeLessThan(.62);
 });
 it('says its mind in the same words each day, and a find under way keeps its answer whatever care comes after',()=>{
  const said={restless:'It is restless today.',settled:'It is settled today.',torn:'It is in two minds today.'};const seen=new Set<string>();
  for(let i=0;i<200;i++){let p=baby();p.bornAt=t+i*613;p.reads={streak:1,best:1,right:2,total:4};p.kinds={moving:['try']};const now=t+i*86400000;p.updatedAt=now;p.hatchedAt=now-1000;
   p=act(p,'explore',now);const s=p.scenes![0],r=dailyRead(p,s.object,s.at,s);seen.add(s.mind!);
   expect(s.beats[1].text).toContain(said[s.mind!]);expect(s.mind).toBe(r.mind);expect(s.tell).toBe(r.pose);
   // Fuss it between the story and the guess: the stance it was shown with still decides.
   const fussed=structuredClone(p);fussed.today={day:new Date(now).toISOString().slice(0,10),meals:0,refused:0,snacks:3,pets:3,yes:0,no:0,baths:0,plays:0};
   expect(dailyRead(fussed,s.object,s.at,s).will).toBe(r.will);
   p=act(fussed,'sceneChoose',now+10,{sceneId:s.id,guess:r.will});expect((p.sceneAlbum?.[0]??p.scenes![0]).guessed).toBe(true);}
  expect(seen.size).toBe(3);
 });
 it('writes the note the first time a sort is met, and says beforehand when there is none',()=>{
  let fresh=0;
  for(let i=0;i<120;i++){let p=baby();p.bornAt=t+i*613;p.reads={streak:0,best:0,right:1,total:1};p.kinds={moving:['try']};const now=t+i*86400000;p.updatedAt=now;p.hatchedAt=now-1000;
   p=act(p,'explore',now);const s=p.scenes![0],k=KIND[s.object],r=dailyRead(p,s.object,s.at,s);
   if(k==='moving'){expect(s.beats[1].text).not.toContain('no note');p=act(p,'sceneChoose',now+10,{sceneId:s.id,guess:r.will});expect((p.sceneAlbum?.[0]??p.scenes![0]).noted).toBeUndefined();continue;}
   fresh++;expect(s.beats[1].text).toContain(`You have no note on ${KIND_NAME[k].toLowerCase()} yet.`);expect(s.beats[1].text).not.toContain('The egg came');
   p=act(p,'sceneChoose',now+10,{sceneId:s.id,guess:r.will});expect(p.sceneAlbum?.[0]??p.scenes![0]).toMatchObject({noted:true,habit:r.habit});expect(p.kinds![k]).toEqual([r.will]);}
  expect(fresh).toBeGreaterThan(80);
 });
 it('reviews the find once it is played, and accounts for a star lost to something else',()=>{
  let p=baby();p.bornAt=t+613;const now=t+86400000;p.updatedAt=now;p.hatchedAt=now-1000;p.fullness=10;
  // Before the find, a hungry pet says so: that is the line the card in the feed carries.
  const before=reviewOf(p,now);expect(before.code.k).toBe('hungry');expect(before.note).toBe('Feed it: +2 ★');
  p=act(p,'explore',now);const s=p.scenes![0],r=dailyRead(p,s.object,s.at,s);p=act(p,'sceneChoose',now+10,{sceneId:s.id,guess:r.will,sure:true});p.fullness=10;
  // After it, the line is about the guess, so the end card never repeats the feed. The empty bowl is still counted, and named.
  const after=reviewOf(p,now+20);expect(after.code.k).toBe('called');expect(after.note).toMatch(/^Feed it: \+[12] ★$/);const promised=Number(after.note!.match(/\+(\d)/)![1]);expect(after.line).not.toBe(before.line);
  p=act(p,'sceneFinish',now+25,{sceneId:s.id});p.fullness=10;p=act(p,'meal',now+30);const fed=reviewOf(p,now+40);expect(fed.note).toBeUndefined();/* What it said feeding was worth is exactly what feeding gave. */expect(fed.stars-after.stars).toBe(promised);expect(fed.code.k).toBe('called');
  for(const n of ['Clean up: +2 ★','Rice refused: -1 ★','Feed it: +2 ★','Told off: -1 ★','Away a day: kept ♥'])expect(n.length).toBeLessThanOrEqual(21);
 });
 it('never says it kept something that left',()=>{
  const day=(o:string)=>t+((DAILY.indexOf(o as never)-Math.floor(t/86400000)%DAILY.length+DAILY.length)%DAILY.length)*86400000;
  for(const[o,pick,kept] of [['bee','gentle',false],['puddle','try',false],['ice','gentle',false],['dandelion','try',false],['dandelion','gentle',true],['sock','try',true],['kite','gentle',true]] as const){
   let p=baby();const now=day(o);p.updatedAt=now;p.hatchedAt=now-1000;p=act(p,'explore',now);const s=p.scenes![0];expect(s.object).toBe(o);
   p=act(p,'sceneChoose',now+10,{sceneId:s.id,choice:pick});const done=p.sceneAlbum?.[0]??p.scenes![0],said=done.beats.map(b=>b.text).join(' ')+' '+done.effect;
   if(kept){expect(said).toContain('close');expect(p.keepsake).toBe(OBJECTS[o].name);}else{expect(said).not.toContain('close');expect(said).toContain('remembered');expect(p.keepsake).toBeUndefined();}}
 });
 it('words the three answers so each can be told apart without a sign',()=>{
  // The wary answer never touches the thing: it watches, waits, listens, looks or counts. The other two never use those words.
  const wary=/\b(watch|wait|listen|look|peer|count|stare|sniff|hum from afar)\b/i,care=/\b(soft|softly|gently|neatly|safe|steady|tidy|tuck|share|keep|clear|untangle|polish|carry|hold|snuggle|offer|fold|smooth|water|open|bring|rest)\b/i;
  for(const o of DAILY){const x=OBJECTS[o];
   expect(x.watch,`${o} watch`).toMatch(wary);expect(x.try,`${o} try`).not.toMatch(wary);expect(x.gentle,`${o} gentle`).not.toMatch(wary);
   expect(x.gentle,`${o} gentle`).toMatch(care);expect(x.try,`${o} try`).not.toMatch(care);
   expect(new Set([x.try,x.gentle,x.watch]).size).toBe(3);for(const k of ['try','gentle','watch'] as const){expect(x[k].length).toBeLessThanOrEqual(16);expect(x[k]).not.toMatch(/[!?…]/);}}
 });
 it('lists the answers in a different order from day to day, the same for everyone',()=>{
  const seen=new Set<string>(),first=new Set<string>();
  for(let i=0;i<120;i++){const now=t+i*86400000,o=DAILY[i%DAILY.length],ord=answerOrder(o,now);expect([...ord].sort()).toEqual(['gentle','try','watch']);expect(answerOrder(o,now+3600000)).toEqual(ord);seen.add(ord.join());first.add(ord[0]);}
  expect(seen.size).toBe(6);expect(first.size).toBe(3);
 });
 it('offers replies that fit the verdict',()=>{
  for(const n of [1,2,3,4,5]){const r=retortsFor(n);expect(r).toHaveLength(5);expect(new Set(r).size).toBe(5);for(const x of r)expect(x.length).toBeLessThanOrEqual(19-'Reply: '.length);}
  expect(retortsFor(1)).toContain('Rude.');expect(retortsFor(5)).not.toContain('Rude.');expect(retortsFor(5)).toContain('Frame it.');expect(retortsFor(1)).toEqual(retortsFor(2));expect(retortsFor(4)).toEqual(retortsFor(5));
 });
 it('plays the whole game on a first find: the egg comes with a note of its habit, said in the story and kept in the notes',()=>{
  let differ=0;
  for(let i=0;i<120;i++){let p=baby();p.bornAt=t+i*613;p.temperament=(['bold','shy','gentle'] as const)[i%3];const now=t+i*86400000;p.updatedAt=now;p.hatchedAt=now-1000;
   p=act(p,'explore',now);const s=p.scenes![0],r=dailyRead(p,s.object,s.at),k=KIND[s.object];
   expect(p.kinds).toEqual({[k]:[r.habit]});expect(s.beats[1].text).toContain('The egg came with a note:');expect([r.pose,r.habit]).toContain(r.will);if(r.pose!==r.habit)differ++;
   p=act(p,'sceneChoose',now+10,{sceneId:s.id,guess:r.will,sure:true});expect(p.sceneAlbum?.[0]??p.scenes![0]).toMatchObject({habit:r.habit,sure:true,guessed:true});expect(p.kinds![k]).toEqual([r.habit,r.will]);}
  expect(differ).toBeGreaterThan(40);
 });
 it('has a habit with each sort of thing that differs between sorts and never changes, whatever it is taught',()=>{
  let varied=0;const kinds=['moving','still','wet','soft','alive','noisy'] as const;
  for(let i=0;i<200;i++){const p=baby();p.bornAt=t+i*977;p.temperament=(['bold','shy','gentle'] as const)[i%3];
   const now=kinds.map(k=>habitFor(p,k));if(new Set(now).size>1)varied++;
   const q=structuredClone(p);q.traits={bold:10,selective:-10,social:10};q.habits={toy:5,window:5};q.updatedAt+=400*86400000;expect(kinds.map(k=>habitFor(q,k))).toEqual(now);}
  expect(varied).toBeGreaterThan(170);
 });
 it('is braver after a fuss and warier after being told off',()=>{
  const c={plain:{try:0,gentle:0,watch:0},fussed:{try:0,gentle:0,watch:0},scolded:{try:0,gentle:0,watch:0}};
  for(let i=0;i<400;i++){const p=baby();p.bornAt=t+i*977;const now=t+i*86400000,d=new Date(now).toISOString().slice(0,10),blank={day:d,meals:0,refused:0,snacks:0,pets:0,yes:0,no:0,baths:0,plays:0};
   c.plain[petChoice(p,'leaf',now)]++;p.today={...blank,pets:4};c.fussed[petChoice(p,'leaf',now)]++;p.today={...blank,no:2};c.scolded[petChoice(p,'leaf',now)]++;}
  expect(c.fussed.try).toBeGreaterThan(c.plain.try+40);expect(c.scolded.watch).toBeGreaterThan(c.plain.watch+40);
 });
 it('lets every kind of pet do all three things, leaning toward its nature',()=>{
  for(const[bold,fav]of[[4,'try'],[-4,'watch']] as const){const c={try:0,gentle:0,watch:0};for(let i=0;i<400;i++){const p=baby();p.bornAt=t+i*977;p.traits={bold,selective:0,social:0};c[petChoice(p,'leaf',t+i*86400000)]++;}
   expect(c[fav]).toBeGreaterThan(210);expect(Math.min(c.try,c.gentle,c.watch)).toBeGreaterThan(12);}
 });
});
import {pickVisitor,walkerId,STRAYS,SLOT} from '../src/shared/street';
describe('the street',()=>{
 it('never shows a pet at its own window, falls back to strays, and leaves the window empty sometimes',()=>{
  const me=walkerId('owner-a','2026-11-14'),other={id:walkerId('owner-b','2026-11-14'),name:'Sumi',stage:'baby' as const};
  let seen=0,empty=0,strays=0;
  for(let s=0;s<400;s++){for(const dt of[1000,25000,50000]){const now=s*SLOT+dt,v=pickVisitor([{id:me,name:'Pip',stage:'baby'},other],me,now);if(v){expect([other.id,'stray-daifuku']).toContain(v.id);expect(now).toBeGreaterThanOrEqual(v.from);expect(now).toBeLessThan(v.until);seen++;}else empty++;
   const alone=pickVisitor([{id:me,name:'Pip',stage:'baby'}],me,now);if(alone){expect(alone.stray).toBe(true);strays++;}}}
  expect(seen).toBeGreaterThan(200);expect(empty).toBeGreaterThan(200);expect(strays).toBeGreaterThan(200);
  expect(walkerId('owner-a','2026-11-14')).not.toContain('owner');expect(walkerId('owner-a','2026-11-15')).not.toBe(me);
 });
 it('stamps the card once per kind of find and keeps it',()=>{
  let p=baby();p=act(p,'explore',t+1000);const scene=p.scenes![0];
  p=act(p,'sceneChoose',t+2000,{sceneId:scene.id,guess:'try'});
  expect(p.finds?.[scene.object]).toBe(p.scenes![0].choice);
  p=act(p,'sceneFinish',t+3000,{sceneId:scene.id});
  expect(Object.keys(p.finds??{})).toEqual([scene.object]);expect(petView(p,t+4000).finds?.[scene.object]).toBeTruthy();
 });
 it('reviews its owner from what happened today, in its own voice',()=>{
  let p=baby();p.temperament='bold';
  expect(reviewOf(p,t+1000)).toMatchObject({stars:2,line:'Looked at me. Did nothing. Left. Riveting.'});
  p.fullness=50;p=act(p,'meal',t+2000);p=act(p,'cuddle',t+40000);
  const good=reviewOf(p,t+41000);expect(good.stars).toBe(4);expect(good.line).toContain('FINE');
  p.droppings=1;const mess=reviewOf(p,t+42000);expect(mess.stars).toBeLessThan(good.stars);expect(mess.line).toContain('dropping');
  p.droppings=0;p=act(p,'explore',t+50000);const scene=p.scenes![0],will=dailyRead(p,scene.object,scene.at).will,other=(['try','gentle','watch'] as const).find(k=>k!==will)!;
  const wrong=act(p,'sceneChoose',t+51000,{sceneId:scene.id,guess:other}),right=act(p,'sceneChoose',t+51000,{sceneId:scene.id,guess:will});
  expect(reviewOf(wrong,t+52000).line).toContain(OBJECTS[scene.object][other].toLowerCase());
  expect(reviewOf(right,t+52000).stars).toBe(5);expect(reviewOf(right,t+52000).line).toContain('Unsettling');
  // a new day starts clean
  expect(reviewOf(right,t+2*86400000).stars).toBe(2);
 });
 it('never writes a review the screen cannot show',()=>{
  const wrap=(s:string)=>{const out:string[]=[];let line='';for(const w of s.split(' ')){if(!line)line=w;else if(line.length+1+w.length<=19)line+=' '+w;else{out.push(line);line=w;}}if(line)out.push(line);return out;};
  const verbs=Object.values(OBJECTS).flatMap(o=>[o.try,o.gentle,o.watch]).map(v=>v.toLowerCase());
  for(const alt of[false,true])for(const key of alt?REVIEW_ALT_KEYS:REVIEW_KEYS)for(const voice of[0,1,2])for(const guess of key==='wrong'?verbs:['x'])for(const did of key==='wrong'?verbs.slice(0,6).concat(verbs.slice(-6)):['x']){
   const lines=wrap(reviewLine(key,voice,{guess,did,n:12},alt));expect(lines.length,`${key}/${voice}: ${lines.join('|')}`).toBeLessThanOrEqual(4);for(const l of lines)expect(l.length).toBeLessThanOrEqual(19);}
 });
 it('brings a view home from each daily find, unseen ones first',()=>{
  let p=baby();p=act(p,'explore',t+1000);const scene=p.scenes![0];
  p=act(p,'sceneChoose',t+2000,{sceneId:scene.id,guess:'try'});
  expect(VIEWS.some(v=>v.id===p.scenes![0].view)).toBe(true);expect(p.scenes![0].viewNew).toBe(true);expect(p.views).toEqual([p.scenes![0].view]);
  // a collector who never misses a day completes the eight ordinary views without repeats
  const have:string[]=[];let day=Date.UTC(2026,5,1,12),repeats=0;
  for(let i=0;i<40&&VIEWS.filter(v=>!v.when).some(v=>!have.includes(v.id));i++,day+=86400000){const v=pickView(12345,day,have);if(have.includes(v))repeats++;else have.push(v);}
  expect(VIEWS.filter(v=>!v.when).every(v=>have.includes(v.id))).toBe(true);expect(repeats).toBeLessThan(4);
  // snow only in winter, and rare stars stay rare
  expect(weatherAt(Date.UTC(2026,6,1)).sky).not.toBe('snow');
  let stars=0;for(let i=0;i<800;i++)if(pickView(i*7919+1,Date.UTC(2026,5,1)+i*86400000,VIEWS.map(v=>v.id))==='star')stars++;
  expect(stars).toBeGreaterThan(15);expect(stars).toBeLessThan(110);
 });
});
import {addCard} from '../src/shared/street';
describe('postcards',()=>{
 it('keeps one card per view, newest last, forty at most',()=>{
  let pile=addCard([],{view:'sea',from:'Pip',day:'2026-11-15'});
  expect(addCard(pile,{view:'sea',from:'Nori',day:'2026-11-16'})).toBe(pile);
  pile=addCard(pile,{view:'star',from:'Kiwi',day:'2026-11-16'});expect(pile.map(c=>c.view)).toEqual(['sea','star']);
  for(let i=0;i<50;i++)pile=addCard(pile,{view:'v'+i,from:'x',day:'d'});expect(pile.length).toBe(40);
 });
});
import {plantLevel,PLANT} from '../src/shared/street';
describe('the street plant',()=>{
 it('starts as an empty pot and never shrinks as finds add up',()=>{
  expect(plantLevel(0)).toBe(0);expect(plantLevel(1)).toBe(1);let last=0;
  for(let n=0;n<400;n++){const lv=plantLevel(n);expect(lv).toBeGreaterThanOrEqual(last);last=lv;}
  expect(last).toBe(PLANT.length);
 });
});
describe("yesterday's results, under today's post",()=>{
 const base={object:'kite' as const,today:'sock' as const};
 it('says nothing when nobody went out',()=>{expect(recapText({...base,counts:{try:0,gentle:0,watch:0},total:0,pets:[{name:'Mochi'}]})).toBeNull();});
 it('gives the split, the average, the harshest and kindest review, and the best-known pet, with no owner in it',()=>{
  const text=recapText({...base,counts:{try:3,gentle:7,watch:2},total:12,pets:[{name:'Mochi',stars:1,line:'Have we met?',knows:40,temperament:'bold',did:'try'},{name:'Pip',stars:5,line:'Fine. FINE.',knows:83,temperament:'bold',did:'try'},{name:'Nori',stars:3,line:'Efficient.',temperament:'shy',did:'watch'},{name:'Kiwi',temperament:'shy',did:'watch'},{name:'Tofu',temperament:'gentle',did:'gentle'}]})!;
  expect(text).toContain('Bold ones mostly chose "Fly it" · shy ones mostly chose "Watch its tail".');
  expect(text).toContain('**Yesterday: a lost kite.**');expect(text).toContain('12 pets went out. Untangle it: 58% · Fly it: 25% · Watch its tail: 17%');
  expect(text).toContain('the pets rated their humans 3.0 stars out of 5');expect(text).toContain('Harshest review: **Mochi**, ★☆☆☆☆ "Have we met?"');expect(text).toContain('Kindest: **Pip**, ★★★★★ "Fine. FINE."');
  expect(text).toContain('Best-known pet: **Pip**. Its human calls it right 83% of the time.');expect(text).toContain('Today: an odd sock.');expect(text).not.toMatch(/u\//);
 });
 it('stays honest with one pet: no average, no ranking',()=>{
  const text=recapText({...base,counts:{try:1,gentle:0,watch:0},total:1,pets:[{name:'Mochi',stars:2,line:'Have we met?',knows:50}]})!;
  expect(text).toContain('One pet went out. It chose: Fly it.');expect(text).toContain('The only review: **Mochi**');expect(text).not.toContain('average');expect(text).not.toContain('Kindest');expect(text).not.toContain('Best-known');
 });
});
describe('the day turns over',()=>{
 it("files yesterday's finished find in the album, so today opens on today's find",()=>{
  const day=86400000;let p=baby();p.hatchedAt=t-1000;p=act(p,'explore',t);const s=p.scenes![0];p=act(p,'sceneChoose',t+10,{sceneId:s.id,guess:'try'});
  expect(p.scenes).toHaveLength(1);
  const next=petView(p,t+day);expect(next.scenes??[]).toHaveLength(0);expect(next.sceneAlbum![0].id).toBe(s.id);expect(next.dailyFind.available).toBe(true);
  // The same day, nothing moves.
  expect(petView(p,t+20).scenes).toHaveLength(1);
 });
 it('says a tie is a split, and an object takes the right article',()=>{
  const text=recapText({object:'ice',today:'acorn',counts:{try:1,gentle:1,watch:0},total:2,pets:[{name:'Pip',temperament:'gentle',did:'gentle'},{name:'Azuki',temperament:'gentle',did:'watch'}]})!;
  expect(text).toContain('Gentle ones were split.');expect(text).not.toContain('mostly');expect(text).toContain('Yesterday: an ice cube.');expect(text).toContain('Today: an acorn.');
 });
});
describe("the owner's portrait, in dots",()=>{
 it('outlines a pale figure, fills a dark one, and leaves empty space empty',()=>{
  const w=6,h=6,px=(r:number,g:number,b:number,a:number)=>[r,g,b,a];
  // A white 4x4 square on transparent, with one black dot inside it.
  const data=new Uint8ClampedArray(Array.from({length:w*h},(_,i)=>{const x=i%w,y=Math.floor(i/w),inside=x>=1&&x<=4&&y>=1&&y<=4;return !inside?px(0,0,0,0):x===2&&y===2?px(0,0,0,255):px(255,255,255,255);}).flat());
  expect(dots(data,w,h)).toEqual(['......','.####.','.##.#.','.#..#.','.####.','......']);
 });
});
describe('a verdict in a shared link',()=>{
 it('rebuilds exactly the line the pet said, for every kind of day',()=>{
  const day=86400000;let seen=0;
  for(let i=0;i<60;i++){let p=baby();p.bornAt=t+i*613;p.temperament=(['bold','shy','gentle'] as const)[i%3];p.hatchedAt=t-1000;const now=t+i*day;p.updatedAt=now;
   p=act(p,'explore',now);const s=p.scenes![0],will=dailyRead(p,s.object,s.at).will;p=act(p,'sceneChoose',now+10,{sceneId:s.id,guess:i%2?will:will==='watch'?'try':'watch',sure:i%3===0});
   const r=reviewOf(p,now+20);expect(reviewFromCode(r.code)).toBe(r.line);expect(JSON.stringify(r.code).length).toBeLessThan(120);seen++;}
  expect(seen).toBe(60);
 });
 it('refuses anything the game could not have said',()=>{
  for(const bad of[null,'x',{},{k:'nope',v:0,a:0},{k:'wrong',v:0,a:0},{k:'wrong',v:0,a:0,o:'kite',g:'try',d:'<b>'},{k:'wrong',v:5,a:0,o:'kite',g:'try',d:'watch'},{k:'fussed',v:0,a:0,n:1e9},{k:'right',v:0,a:0,o:'nothing',g:'try',d:'watch'}])expect(reviewFromCode(bad)).toBeNull();
  expect(reviewFromCode({k:'wrong',v:0,a:0,o:'kite',g:'try',d:'watch'})).toBe('You: fly it. Me: watch its tail. Have we met?');
 });
});

