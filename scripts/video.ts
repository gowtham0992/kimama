// Draws the title cards and caption panels for the demo video, in the game's own dots. Run: node --import tsx scripts/video.ts
import {mkdirSync,writeFileSync} from 'node:fs';
import {textPath,plain} from '../src/client/px';
import {Canvas,INK,PAPER,GAP,hex,pet,width,type RGB} from './canvas';
const W=1920,H=1080,OUT='output/video/cards/';mkdirSync(OUT,{recursive:true});
const DARK=hex('#161f14'),DIM=hex('#7f8c6c');
const say=(c:Canvas,t:string,x:number,y:number,s:number,col:RGB)=>c.path(textPath(plain(t).replace(/\*/g,'★').replace(/-/g,'☆'),0,0),x,y,s,col);
const centre=(c:Canvas,t:string,y:number,s:number,col:RGB)=>say(c,t,Math.round((W-width(t)*s)/2),y,s,col);
// A full card on the LCD's own paper.
function card(name:string,lines:[string,number,number?][],withPet?:'low'|'happy'){
 const c=new Canvas(W,H,PAPER);c.grid(8,GAP);
 if(withPet)pet(c,{shape:'bold',stage:'child',eyes:withPet,mouth:withPet==='happy'?'open':'flat',mark:0},Math.round((W-28*14)/2/8)*8,96,14);
 let y=withPet?456:Math.round((H-lines.reduce((a,[,s,g])=>a+7*s+(g??s*5),0))/2/8)*8;
 for(const[t,s,g] of lines){centre(c,t,y,s,INK);y+=7*s+(g??s*5);}
 writeFileSync(OUT+name+'.png',c.png());
}
// A caption panel: dark, with room on the left for the game's screen (896 square at 92,92) inside a bezel.
function panel(name:string,head:string,lines:string[],foot=''){
 const c=new Canvas(W,H,DARK);c.rect(64,64,952,952,hex('#3b3f3a'));c.rect(92,92,896,896,PAPER);
 const x=1088;say(c,head,x,150,8,PAPER);c.rect(x,150+7*8+24,720,6,DIM);
 lines.forEach((l,i)=>say(c,l,x,290+i*84,6,i===0?PAPER:hex('#c9d4a5')));
 if(foot)say(c,foot,x,920,4,DIM);
 say(c,'KIMAMA',x,1000,4,DIM);
 writeFileSync(OUT+name+'.png',c.png());
}
card('01-title',[['KIMAMA',20,64],['A LITTLE PET',8],['THAT REVIEWS YOU',8]],'low');
card('02-why',[['MOST DAILY GAMES',10],['END IN A SCORE.',10,120],['THIS ONE ENDS',10],['IN A REVIEW.',10]]);
panel('03-find','ONE FIND A DAY',['The same thing','for every pet','in the community.'],'A daily game inside a Reddit post');
panel('04-read','READ YOUR PET',['Mood and habit,','side by side.','Today it goes by one.','Nothing is hidden.'],'Three signs, all on screen');
panel('05-bet','BET YOUR STREAK',['Sure: +2,','or lose it all.','A hunch: +1, safe.']);
panel('06-reveal','THEN IT DECIDES',['It does as it pleases.','You read it,','or you did not.']);
panel('07-review','IT REVIEWS YOU',['Stars out of five,','and one line.','Sure, and wrong:','it turns its back.'],'Post it to the thread, or not');
panel('08-path','CHOOSE TOMORROW',['Every pet spots','the same three things.','Pick one.','Most picks wins.'],'Today chooses tomorrow');
card('09-proof',[['THE NEXT DAY, ON REDDIT:',6,96],['YOUR PETS CHOSE',12],['A FEATHER',12,96],['BROUGHT BACK BY 2 OF 3 PETS',6]]);
card('10-end',[['KIMAMA',20,64],['PLAY IN R/KIMAMA',8,80],['**---  HAVE WE MET?',6]],'low');
console.log('cards written');
// Small labels laid over the real Reddit footage.
for(const[name,t] of [['b-live','LIVE ON REDDIT: R/KIMAMA'],['b-post','THE NEXT DAY, THE POST SAYS SO'],['b-pin','AND SO DOES THE PINNED COMMENT']] as const){
 const s=5,c=new Canvas(width(t)*s+60,7*s+50,PAPER);c.grid(s,GAP);say(c,t,30,25,s,INK);writeFileSync(OUT+name+'.png',c.png());}
