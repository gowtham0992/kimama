// The pet reviews its owner. Every day, out of five, with one line of comment in its own voice.
// Everything here is authored and computed from what actually happened today: no generated text.
import type {Pet} from './pet';
import {OBJECTS,dayAt} from './scenes';

export type DayLog={day:string;meals:number;refused:number;snacks:number;pets:number;yes:number;no:number;baths:number;plays:number};
/** How a line was chosen, small enough to travel in a shared link. The words are rebuilt from it, so a link can never carry text of its own. */
export type ReviewCode={k:string;v:number;a:number;o?:string;g?:string;d?:string;n?:number};
/** `note` is a second matter that is costing a star and that the line does not mention, so a rating can always be accounted for. */
export type Review={stars:number;line:string;code:ReviewCode;note?:string};
export const emptyDay=(day:string):DayLog=>({day,meals:0,refused:0,snacks:0,pets:0,yes:0,no:0,baths:0,plays:0});
export function logDay(p:Pet,k:keyof Omit<DayLog,'day'>,now:number):void{const d=dayAt(now);p.today=p.today?.day===d?p.today:emptyDay(d);p.today[k]++;}

// Three voices: bold is blunt, gentle is kind and devastating, shy would rather not say.
type Voices=[string,string,string];
const LINES:Record<string,Voices>={
 wrong:['You: {guess}. Me: {did}. Have we met?','You guessed wrong. I forgive you. I will remember it, though.','You guessed wrong. I did not want to say anything.'],
 mess:['There is a dropping. It has been there a while. We both know.','The room has a smell. I am sure you are very busy.','I made a mess and nobody came. I stood next to it.'],
 refused:['Offered rice to a full pet. {n} times. Bold strategy.','Kept bringing food I did not want. Sweet. Wrong, but sweet.','I said no to the rice. The rice came back.'],
 hungry:['No food today. I dragged the bowl out myself. Nothing.','I have not eaten. I am not saying anything. Only that.','My tummy made a noise. Nobody heard.'],
 fussed:['Petted {n} times. I am not a button.','Petted {n} times. I counted. Thank you. Please stop.','So much petting. I liked it. Do not tell anyone.'],
 scolded:['Told NO {n} times. I was right every time.','Heard NO a lot today. I will think about what I did. Briefly.','You said no. Then no. Then no again. Okay.'],
 streak:['A streak of {n}. Stop reading my mind.','A streak of {n}. It is nice to be known.','Streak: {n}. How do you keep knowing.'],
 away:['Gone a whole day. I kept your streak. Once.','You missed a day. I kept your place for you.','You were away. I did not move your streak.'],
 sure:['You were SURE: {guess}. I did: {did}. Sure.','So certain. So wrong. I admire the certainty.','You were sure. I did not want to be the one to say.'],
 called:['Sure, and right. I dislike being this obvious.','You were sure of me. You were right to be.','You did not even hesitate. How.'],
 right:['Knew exactly what I would do. Unsettling.','Guessed right. We are in step today.','You knew what I would do. I felt seen. Too seen.'],
 bath:['A bath. Unrequested. I smell of nothing now.','Bathed and looked after. I have no notes. Suspicious.','The bath was warm. Now I am warm. That is all.'],
 good:['Fed on time. Petted adequately. Fine. FINE.','Rice, a pat, a window. Would live here again.','It was a nice day. I did not say that out loud.'],
 fed:['Rice arrived. No conversation. Efficient.','Fed, and left in peace. A quiet sort of care.','There was food. Then it was quiet. I like quiet.'],
 idle:['Looked at me. Did nothing. Left. Riveting.','You stopped by. That was all. It was nearly enough.','You came. I saw you. I pretended not to.'],
};
// A second way of saying the commonest things, so two days running do not read the same.
const ALT:Record<string,Voices>={
 wrong:['I did: {did}. You said: {guess}. No.','You said: {guess}. Never mind. We have years.','You said: {guess}. I am sorry. It was not.'],
 hungry:['Bowl: empty. Me: also empty. Fix one.','No dinner yet. I am sure it is on its way.','I looked at the bowl. The bowl looked back.'],
 mess:['I live next to a dropping now. Thoughts?','A small mess. I am choosing to call it decor.','It is still there. I checked. Twice.'],
 sure:['You bet on: {guess}. I am sorry for your loss.','You were so sure. I felt bad doing: {did}.','You said you were sure. I heard you.'],
 called:['You bet on me and won. Do not make it a habit.','Sure and right. I am an open book, to you.','You were sure. I like that you were sure.'],
 right:['Correct. Do not get comfortable.','You called it. I felt very understood.','You knew. I did not even say anything.'],
 good:['Rice. Pats. No complaints. Write that down.','Fed and fussed over. A soft sort of day.','Today was good. Please do it again.'],
 fed:['Food came. I ate it. We are square.','A meal, quietly given. Thank you.','I ate. You watched. That was nice.'],
 idle:['You opened the door. That was the visit.','A short hello. I will take it.','I heard you come in. Then you went.'],
};
export const REVIEW_KEYS=Object.keys(LINES),REVIEW_ALT_KEYS=Object.keys(ALT);
export function reviewLine(key:string,voice:number,fill:Record<string,string|number>={},alt=false):string{return ((alt&&ALT[key])||LINES[key]||LINES.idle)[voice].replace(/\{(\w+)\}/g,(_,k)=>String(fill[k]??''));}

export function reviewOf(p:Pet,now:number):Review{
 const day=dayAt(now),d=p.today?.day===day?p.today:emptyDay(day),voice=p.temperament==='bold'?0:p.temperament==='shy'?2:1;
 const find=[...(p.scenes??[]),...(p.sceneAlbum??[])].find(s=>s.kind==='daily'&&dayAt(s.at)===day&&s.choice);
 const fed=d.meals+d.snacks,kind=d.pets+d.yes,mess=(p.droppings??0)>0,hungry=p.fullness<30&&fed===0,right=!!find?.guess&&!!find.guessed,wrong=!!find?.guess&&!find.guessed,sure=!!find?.sure;
 const nothing=fed+kind+d.no+d.baths+d.plays+d.refused===0&&!find;
 // The rating, as a function of the things an owner can still put right today, so the game can say exactly what doing so is worth.
 const score=(mess:boolean,hungry:boolean,fed:number):number=>{
  let s=3;
  if(right)s+=sure?2:1;if(wrong)s--;if(mess)s--;if(d.refused>=2)s--;if(hungry)s--;if(d.no>=3)s--;
  if(fed>=1&&!mess)s++;if(kind>=3&&kind<8)s++;if(fed+kind+d.no+d.baths+d.plays+d.refused===0&&!find)s=2;
  // Sure, and wrong: the wager is lost in full.
  if(wrong&&sure)s=1;
  return Math.max(1,Math.min(5,s));
 };
 const stars=score(mess,hungry,fed);void nothing;
 const low=(s:string)=>s.toLowerCase(),o=find?OBJECTS[find.object]:null;
 const[key,fill]:[string,Record<string,string|number>]=
  // Once the find is played, the line is about the find: it is what just happened, and the card in the feed has already said the rest.
  wrong&&o?[sure?'sure':'wrong',{guess:low(o[find!.guess!]),did:low(o[find!.choice!])}]:
  right&&sure?['called',{}]:right&&(find!.streak??0)>=3?['streak',{n:find!.streak!}]:right?['right',{}]:
  mess?['mess',{}]:d.refused>=2?['refused',{n:d.refused}]:hungry?['hungry',{}]:kind>=8?['fussed',{n:kind}]:d.no>=3?['scolded',{n:d.no}]:d.baths>=1?['bath',{}]:fed>=1&&kind>=1?['good',{}]:fed>=1?['fed',{}]:['idle',{}];
 const alt=(Math.floor(now/86400000)+Math.floor(p.bornAt/1000))%2===1;
 // What else is costing a star, in a few words, so the owner knows what to put right. It goes when they do.
 // First what can still be put right, with what it is worth: feeding a hungry pet lifts a penalty and earns the meal's own star, so it says +2.
 // Then what cannot be undone today. Last, a streak that was kept across a missed day: said here, so the line itself stays on the guess.
 const clean=mess?score(false,hungry,fed)-stars:0,feed=hungry?score(mess,false,fed+1)-stars:0;
 const note=clean>0?`Clean up: +${clean} ★`:feed>0?`Feed it: +${feed} ★`:d.refused>=2&&key!=='refused'?'Rice refused: -1 ★':d.no>=3&&key!=='scolded'?'Told off: -1 ★':right&&find!.kept?'Away a day: kept ♥':undefined;
 return{stars,line:reviewLine(key,voice,fill,alt),...(note?{note}:{}),code:{k:key,v:voice,a:alt?1:0,...(fill.guess!==undefined&&find?{o:find.object,g:find.guess,d:find.choice}:{}),...(typeof fill.n==='number'?{n:fill.n}:{})}};
}
/** The owner's right of reply, chosen before posting. Authored, so a comment never carries free text from the game. */
// Twelve letters at most: the reply has one line of the screen. They fit the verdict: nobody answers five stars with "Rude." Three sets, so a thread of reviews does not read as one reply said forty times.
const RETORTS:[string[],string[],string[]]=[
 ['Rude.','Recount!','Harsh.','Deserved.','No comment.'],
 ['Fair.','Only three?','Recount!','Noted.','No comment.'],
 ['Fair.','Finally.','Frame it.','Worth it.','No comment.'],
];
export const retortsFor=(stars:number):string[]=>RETORTS[stars<=2?0:stars===3?1:2];
/** How well an owner knows their pet: reads called right, as a percentage. Not shown until there are three to go on. */
export const knowsOf=(p:Pet):number|undefined=>(p.reads?.total??0)>=3?Math.round(p.reads!.right/p.reads!.total*100):undefined;
/** What everyone else's pet did, in one sentence. Silent until there are a few to count. */
export const crowdLine=(count:number,total:number):string=>{if(total<3)return '';const pct=Math.round(count/total*100);return pct>=50?`${pct}% of pets did the same today.`:`Only ${pct}% of pets did what mine did today.`;};
/** The line a code stands for, or null if anything in it is not something the game could have produced. */
export function reviewFromCode(c:unknown):string|null {
 if(!c||typeof c!=='object')return null;const x=c as Record<string,unknown>,ch=['try','gentle','watch'];
 if(typeof x.k!=='string'||!LINES[x.k]||![0,1,2].includes(x.v as number))return null;
 const fill:Record<string,string|number>={};
 if(x.o!==undefined||x.g!==undefined||x.d!==undefined){const o=OBJECTS[x.o as keyof typeof OBJECTS];if(!o||!ch.includes(x.g as string)||!ch.includes(x.d as string))return null;fill.guess=o[x.g as 'try'].toLowerCase();fill.did=o[x.d as 'try'].toLowerCase();}
 if(x.n!==undefined){if(!Number.isInteger(x.n)||(x.n as number)<0||(x.n as number)>99)return null;fill.n=x.n as number;}
 const line=reviewLine(x.k,x.v as number,fill,x.a===1);return /\{\w+\}/.test(line)||/:\s*\.|\s{2}/.test(line)?null:line;
}
export const starText=(n:number)=>'★'.repeat(n)+'☆'.repeat(5-n);
