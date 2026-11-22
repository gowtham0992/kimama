export const VALUES = [['round','square','triangle'],['tomato','cheese','blueberry'],['plain','sprinkled','cherry'],['1 piece','2 pieces','3 pieces']] as const;
export const PARTS = ['Shape','Flavour','Topping','Pieces'];
export type Snack = [number,number,number,number];
export type Family = 'IS'|'NOT'|'EITHER'|'BOTH'|'ONE'|'UNLESS'|'HOMESICK';
export type Rule = { id: string; family: Family; a: number; b?: number };
export const TRAITS = VALUES.flatMap((values,part)=>values.map((label,value)=>({part,value,label})));
export const SNACKS: Snack[] = Array.from({length:81},(_,i)=>[Math.floor(i/27),Math.floor(i/9)%3,Math.floor(i/3)%3,i%3]);
export const FRAMES: Record<Family,[string,string,string]> = {
  HOMESICK:['Its favourite is ','','.'],
  IS:['It eats anything ','','.'],NOT:['It eats anything that is not ','','.'],
  EITHER:['It eats anything ',' or ','.'],BOTH:['It eats only what is both ',' and ','.'],
  ONE:['It eats anything ',' or ', ', but not both.'],UNLESS:['It spits out anything ', ', unless it is also ','.']
};
export const RULES: Rule[] = (['IS','NOT','EITHER','BOTH','ONE','UNLESS'] as Family[]).flatMap(family=>{
  const out: Rule[]=[];
  for(let a=0;a<12;a++){
    if(family==='IS'||family==='NOT')out.push({id:`${family}:${a}`,family,a});
    else for(let b=0;b<12;b++)if(TRAITS[a].part!==TRAITS[b].part&&(family==='UNLESS'||a<b))out.push({id:`${family}:${a}:${b}`,family,a,b});
  }return out;
});
export const FAVOURITE_RULES:Rule[]=SNACKS.map((_,a)=>({id:`HOMESICK:${a}`,family:'HOMESICK',a}));
export function accepts(r:Rule,s:Snack){
  if(r.family==='HOMESICK')return s.filter((v,i)=>v===SNACKS[r.a][i]).length>=2;
  const a=s[TRAITS[r.a].part]===TRAITS[r.a].value;
  const b=r.b===undefined?false:s[TRAITS[r.b].part]===TRAITS[r.b].value;
  switch(r.family){case 'IS':return a;case 'NOT':return !a;case 'EITHER':return a||b;case 'BOTH':return a&&b;case 'ONE':return a!==b;case 'UNLESS':return !a||b;}
}
export function sentence(r:Rule){if(r.family==='HOMESICK')return `Its favourite is ${snackName(SNACKS[r.a])}.`;const f=FRAMES[r.family];return f[0]+TRAITS[r.a].label+(r.b===undefined?'':f[1]+TRAITS[r.b].label)+f[2];}
export function snackName(s:Snack){return `${VALUES[3][s[3]]} ${VALUES[0][s[0]]} ${VALUES[1][s[1]]}, ${VALUES[2][s[2]]}`;}
export function isSnack(x:unknown): x is Snack{return Array.isArray(x)&&x.length===4&&x.every(n=>Number.isInteger(n)&&n>=0&&n<3);}
export type Observation={snack:Snack;ate:boolean;source:'starter'|'feed'|'claim'};
export type Mode='mixed'|'classic'|'homesick';
export const PUZZLE_COUNTS:Record<Mode,number>={mixed:6,classic:3,homesick:3};
export const MODE_LABELS:Record<Mode,string>={mixed:'Mixed rules',classic:'Single frame',homesick:'Homesick'};
export type GameEvent={kind:'start'|'feed'|'repeat'|'wrong'|'contradiction'|'solved'|'lost';snack?:Snack;ate?:boolean;claim?:string;predicted?:boolean;observationIndex?:number;claimSnack?:Snack};
export type GameView={puzzle:number;mode:Mode;title:string;families:Family[];family:Family|null;par:number|null;version:number;status:'playing'|'solved'|'lost';feeds:number;wrong:number;score:number;observations:Observation[];trail:string[];notice:string;event:GameEvent;reveal:string|null;airtight:boolean;remaining:number|null;suggestedSnack:Snack;favourite:Snack|null;reddit?:boolean;daily?:string|null;guest?:boolean};
