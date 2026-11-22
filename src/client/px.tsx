// Dot-matrix drawing kit. Everything on the LCD is a 1-bit bitmap placed on a 128x128 grid:
// no anti-aliased type, no smooth tweens, no sub-dot positions.
import type {ReactNode} from 'react';

export const INK='var(--ink)',PAPER='var(--paper)';

const cache=new Map<string,string>();
/** Bitmap rows ('#' = lit) to a single SVG path of horizontal runs. */
export function bitsPath(rows:readonly string[],ox=0,oy=0):string{
 const key=ox+','+oy+'|'+rows.join('/');let d=cache.get(key);if(d!==undefined)return d;d='';
 rows.forEach((row,y)=>{let x=0;while(x<row.length){if(row[x]!=='#'){x++;continue;}let e=x;while(e<row.length&&row[e]==='#')e++;d+=`M${ox+x} ${oy+y}h${e-x}v1h${x-e}z`;x=e;}});
 if(cache.size>4000)cache.clear();cache.set(key,d);return d;
}
export function Bits({rows,x=0,y=0,fill=INK,opacity}:{rows:readonly string[];x?:number;y?:number;fill?:string;opacity?:number}){
 return <path d={bitsPath(rows,Math.round(x),Math.round(y))} fill={fill} opacity={opacity}/>;
}

// 5x7 face, drawn by hand. Upper case only, like the handhelds it imitates.
const G:Record<string,string>={
 A:'.###./#...#/#...#/#####/#...#/#...#/#...#',B:'####./#...#/#...#/####./#...#/#...#/####.',C:'.###./#...#/#..../#..../#..../#...#/.###.',
 D:'####./#...#/#...#/#...#/#...#/#...#/####.',E:'#####/#..../#..../####./#..../#..../#####',F:'#####/#..../#..../####./#..../#..../#....',
 G:'.###./#...#/#..../#.###/#...#/#...#/.###.',H:'#...#/#...#/#...#/#####/#...#/#...#/#...#',I:'.###./..#../..#../..#../..#../..#../.###.',
 J:'..###/...#./...#./...#./...#./#..#./.##..',K:'#...#/#..#./#.#../##.../#.#../#..#./#...#',L:'#..../#..../#..../#..../#..../#..../#####',
 M:'#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',N:'#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',O:'.###./#...#/#...#/#...#/#...#/#...#/.###.',
 P:'####./#...#/#...#/####./#..../#..../#....',Q:'.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',R:'####./#...#/#...#/####./#.#../#..#./#...#',
 S:'.####/#..../#..../.###./....#/....#/####.',T:'#####/..#../..#../..#../..#../..#../..#..',U:'#...#/#...#/#...#/#...#/#...#/#...#/.###.',
 V:'#...#/#...#/#...#/#...#/#...#/.#.#./..#..',W:'#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',X:'#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
 Y:'#...#/#...#/.#.#./..#../..#../..#../..#..',Z:'#####/....#/...#./..#../.#.../#..../#####',
 0:'.###./#...#/#..##/#.#.#/##..#/#...#/.###.',1:'..#../.##../..#../..#../..#../..#../.###.',2:'.###./#...#/....#/...#./..#../.#.../#####',
 3:'####./....#/....#/.###./....#/....#/####.',4:'...#./..##./.#.#./#..#./#####/...#./...#.',5:'#####/#..../####./....#/....#/#...#/.###.',
 6:'.###./#..../#..../####./#...#/#...#/.###.',7:'#####/....#/...#./..#../..#../..#../..#..',8:'.###./#...#/#...#/.###./#...#/#...#/.###.',
 9:'.###./#...#/#...#/.####/....#/....#/.###.',
 '.':'...../...../...../...../...../.##../.##..',',':'...../...../...../...../.##../..#../.#...','!':'..#../..#../..#../..#../..#../...../..#..',
 '?':'.###./#...#/....#/...#./..#../...../..#..',"'":'..#../..#../...../...../...../...../.....','-':'...../...../...../#####/...../...../.....',
 ':':'...../.##../.##../...../.##../.##../.....','/':'....#/....#/...#./..#../.#.../#..../#....','+':'...../..#../..#../#####/..#../..#../.....',
 '%':'##..#/##.#./...#./..#../.#.../.#.##/#..##','♥':'...../.#.#./#####/#####/.###./..#../.....','▶':'#..../##.../###../####./###../##.../#....',
 '◀':'....#/...##/..###/.####/..###/...##/....#','▼':'...../...../#####/.###./..#../...../.....','·':'...../...../...../..#../...../...../.....',
 '…':'...../...../...../...../...../...../#.#.#','■':'...../#####/#####/#####/#####/#####/.....','□':'...../#####/#...#/#...#/#...#/#####/.....',
 '★':'..#../..#../#####/.###./.###./##.##/#...#','☆':'..#../..#../##.##/.#.#./.#.#./##.##/#...#',
 '♪':'..##./..#.#/..#../..#../.##../###../.#...','*':'...../#.#.#/.###./#####/.###./#.#.#/.....',
};
const glyph=(c:string)=>G[c]?.split('/');
/** Fold arbitrary prose into what the matrix can show. */
export function plain(s:string):string{return s.toUpperCase().replace(/[’‘]/g,"'").replace(/[—–]/g,'-').replace(/[“”"]/g,'').replace(/;/g,',').replace(/\s+/g,' ').trim();}
export function textPath(s:string,ox:number,oy:number):string{
 const key='t'+ox+','+oy+'|'+s;let d=cache.get(key);if(d!==undefined)return d;d='';
 [...s].forEach((c,i)=>{const g=glyph(c);if(g)d+=bitsPath(g,ox+i*6,oy);});cache.set(key,d);return d;
}
export const textWidth=(s:string)=>Math.max(0,[...s].length*6-1);
export function Txt({s,x,y,fill=INK,align='left',opacity}:{s:string;x:number;y:number;fill?:string;align?:'left'|'center'|'right';opacity?:number}){
 const t=plain(s),w=textWidth(t),ox=Math.round(align==='center'?x-w/2:align==='right'?x-w:x);
 return <path d={textPath(t,ox,y)} fill={fill} opacity={opacity}/>;
}
export function wrap(s:string,cols:number):string[]{
 const out:string[]=[];let line='';
 for(const word of plain(s).split(' ')){if(!line)line=word;else if([...line].length+1+[...word].length<=cols)line+=' '+word;else{out.push(line);line=word;}}
 if(line)out.push(line);return out;
}

// ---- The creature -------------------------------------------------------------------------
// One 24x20 body per temperament, assembled from spans so every pose is the same animal:
// frames differ by feet, squash, eyes and mouth, never by a redrawn stranger.
export type Shape='bold'|'shy'|'gentle';
type Span=[number,number];
const WIDE:Span[][]=[[[0,23]],[[0,23]],[[0,23]],[[0,23]],[[0,23]],[[0,23]],[[1,22]],[[1,22]],[[2,21]],[[4,19]]];
const TOP:Record<Shape,Span[][]>={
 bold:[[[4,5],[18,19]],[[3,6],[17,20]],[[3,7],[16,20]],[[3,8],[15,20]],[[3,20]],[[2,21]],[[1,22]],[[1,22]]],
 gentle:[[[12,15]],[[11,14]],[[11,12]],[[7,16]],[[4,19]],[[2,21]],[[1,22]],[[1,22]]],
 shy:[[],[],[],[],[[5,6],[17,18]],[[4,19]],[[2,21]],[[1,22]]],
};
const FEET:Record<Shape,[Span,Span]>={bold:[[5,8],[15,18]],gentle:[[5,8],[15,18]],shy:[[6,8],[15,17]]};
export type Eyes='open'|'shut'|'happy'|'wide'|'low';
export type Mouth='flat'|'open'|'o'|'none';
export type Look={shape:Shape;stage?:string;feet?:0|1|2;squash?:number;back?:boolean;glance?:boolean;eyes?:Eyes;gx?:number;gy?:number;mouth?:Mouth;mark?:number};
/** Every pet is born with one of five markings (or none). It is how you tell yours from a neighbour's. */
export const markOf=(bornAt:number|undefined)=>bornAt?Math.floor(bornAt/7)%6:0;
const looks=new Map<string,{ink:string;face:string}>();
export function creaturePaths(l:Look):{ink:string;face:string}{
 const key=JSON.stringify(l);const hit=looks.get(key);if(hit)return hit;
 // 28 columns: the 24-wide body sits two in, leaving room for a tail and cheek fur as it grows.
 const W=28,OX=2,grid=Array.from({length:20},()=>Array<string>(W).fill('.')),face=Array.from({length:20},()=>Array<string>(W).fill('.'));
 const stage=l.stage??'baby',baby=stage==='baby',grown=stage==='grown',base=[...TOP[l.shape],...WIDE];
 // Babies are squat and narrow; growing up is getting taller, wider, and then growing a tail.
 const n=Math.min(6,(l.squash??0)+(baby?3:stage==='child'?1:0));
 const drop=[16,13,12,15,11,14].slice(0,n),kept=base.map((spans,r)=>({spans,r})).filter(v=>!drop.includes(v.r));
 const at=(r:number)=>r+n-drop.filter(d=>d<r).length;
 const ink=(x:number,y:number)=>{if(y>=0&&y<20&&x+OX>=0&&x+OX<W)grid[y][x+OX]='#';};
 kept.forEach((v,i)=>{for(const[a,b]of v.spans)for(let x=Math.max(a,baby?2:0);x<=Math.min(b,baby?21:23);x++)ink(x,i+n);});
 FEET[l.shape].forEach(([a,b],i)=>{for(let x=a;x<=b;x++){ink(x,18);if(l.feet!==i+1)ink(x,19);}});
 if(!baby){const side=l.back?-1:1,tx=(d:number)=>side>0?23+d:-d; // the tail trails behind; seen from the back it is on the other side
  for(const r of[14,15]){ink(tx(1),at(r));ink(tx(2),at(r));}
  if(grown){for(const r of[12,13]){ink(tx(1),at(r));ink(tx(2),at(r));}ink(tx(2),at(12)-1);ink(tx(3),at(12)-1);ink(tx(3),at(12));
   if(l.shape==='bold'){const fx=(d:number)=>side>0?-d:23+d;ink(fx(1),at(9));ink(fx(1),at(10));ink(fx(2),at(9));}
   if(l.shape==='gentle'){for(let x=7;x<=10;x++)ink(x,n);for(let x=8;x<=11;x++)ink(x,n+1);}
   if(l.shape==='shy'){ink(8,n+3);ink(9,n+3);ink(14,n+3);ink(15,n+3);ink(9,n+2);ink(14,n+2);}
  }}
 const put=(x:number,y:number)=>{if(y>=0&&y<20&&x+OX>=0&&x+OX<W&&grid[y][x+OX]==='#')face[y][x+OX]='#';};
 const ey=at(l.shape==='shy'?10:9)+(l.gy??0),gx=l.gx??0,eyes=l.eyes??'open';
 if(l.back){for(const r of[8,10,12,14])put(11,at(r)),put(12,at(r));if(l.glance){put(19,ey);put(20,ey);put(19,ey+1);put(20,ey+1);}}
 else{
  for(const ex of[6+gx,15+gx]){
   if(eyes==='shut')for(let i=0;i<3;i++)put(ex+i,ey+2);
   else if(eyes==='happy'){put(ex+1,ey);put(ex,ey+1);put(ex+2,ey+1);}
   else if(eyes==='low')for(let i=0;i<3;i++){put(ex+i,ey+1);put(ex+i,ey+2);}
   else for(let i=0;i<(l.shape==='shy'?2:3);i++)for(let j=0;j<(eyes==='wide'?4:3);j++)put(ex+i+(l.shape==='shy'?1:0),ey+j);
  }
  // Markings: cheeks, a forehead diamond, whisker dashes, brow stripes, or three dashes on the brow.
  // All of them sit inside the body on every shape and at every age, so none can read as a bite out of the outline.
  const mk=l.mark??0;
  if(mk===1){for(const x of[2,3,20,21]){put(x+gx,at(13));}put(3+gx,at(13)+1);put(20+gx,at(13)+1);}
  else if(mk===2){put(11,at(6));put(12,at(6));for(const x of[10,11,12,13])put(x,at(7));put(11,at(8));put(12,at(8));}
  else if(mk===3){const xs=baby?[...(gx>-2?[3]:[]),...(gx<2?[20]:[])]:[1,2,21,22];for(const y of[ey,ey+2])for(const x of xs)put(x,y);} // a baby is narrower: its whiskers sit further in, and the far one hides when it turns its head
  else if(mk===4){for(const x of[3,4,5])put(x,at(6));for(const x of[2,3,4])put(x,at(8));for(const x of[18,19,20])put(x,at(6));for(const x of[19,20,21])put(x,at(8));}
  else if(mk===5){for(const x of[7,8,11,12,15,16])put(x,at(7));}
  const my=at(14),mouth=l.mouth??'flat';
  if(mouth==='flat')for(let x=10;x<=13;x++)put(x+gx,my);
  else if(mouth==='open')for(let x=10;x<=13;x++){put(x+gx,my);put(x+gx,my+1);}
  else if(mouth==='o'){put(11+gx,my);put(12+gx,my);put(11+gx,my+1);put(12+gx,my+1);}
 }
 const res={ink:bitsPath(grid.map(r=>r.join(''))),face:bitsPath(face.map(r=>r.join('')))};
 if(looks.size>600)looks.clear();looks.set(key,res);return res;
}
/** x is the centre of the feet, y the floor line. */
export function Creature({x,y,look,s=2}:{x:number;y:number;look:Look;s?:number}){
 const p=creaturePaths(look);
 return <g transform={`translate(${Math.round(x)-14*s} ${Math.round(y)-20*s}) scale(${s})`}><path d={p.ink} fill={INK}/><path d={p.face} fill={PAPER}/></g>;
}
/** A bitmap drawn in double-size dots, anchored by its bottom centre: the scale of everything that lives in the room. */
export function Big({rows,x,y,s=2,fill=INK}:{rows:readonly string[];x:number;y:number;s?:number;fill?:string}){
 return <g transform={`translate(${Math.round(x)-Math.floor(rows[0].length/2)*s} ${Math.round(y)-rows.length*s}) scale(${s})`}><path d={bitsPath(rows)} fill={fill}/></g>;
}

/** The verdict's stars: eleven dots square, drawn by hand, because the stars are the point. An unearned star is the same star, hollow. */
const STAR=['.....#.....','.....#.....','....###....','....###....','###########','.#########.','..#######..','..#######..','.####.####.','.###...###.','##.......##'];
const HOLLOW=STAR.map((r,y)=>[...r].map((c,x)=>c==='#'&&[[0,1],[0,-1],[1,0],[-1,0]].every(([dx,dy])=>STAR[y+dy]?.[x+dx]==='#')?'.':c).join(''));
/** Five stars, 63 dots wide, from the left edge x. `shown` lets them arrive one at a time. */
export function Stars({n,x,y,shown=5}:{n:number;x:number;y:number;shown?:number}){
 return <>{[0,1,2,3,4].map(i=>i<shown?<Bits key={i} rows={i<n?STAR:HOLLOW} x={x+i*13} y={y} opacity={i<n?1:.7}/>:null)}</>;
}

// ---- Things ---------------------------------------------------------------------------------
export const ART={
 ball:['..###..','.#...#.','#.#...#','#..#..#','#...#.#','.#...#.','..###..'],
 ball2:['..###..','.#...#.','#...#.#','#..#..#','#.#...#','.#...#.','..###..'],
 bowl:['#############','.###########.','.###########.','..#########..','...#######...'],
 food:['....#####....','..#########..'],
 drop:['...##...','..####..','.#....#.','.######.','#......#','########'],
 stink:['#..','.#.','#..'],
 bird:['#.....#','.#...#.','..###..','...#...'],
 bird2:['.......','##...##','..###..','...#...'],
 bubble:['.##.','#..#','#..#','.##.'],
 spark:['..#..','..#..','##.##','..#..','..#..'],
 rain:['#','#','#'],
 egg:['....####....','..########..','.###..#####.','.##########.','############','#####..#####','############','############','##.#########','.##########.','.#######.##.','..########..','....####....'],
 crack:['...#....#...','..#.#..#.#..','.#...##...#.'],
 onigiri:['....###....','...#...#...','..#.....#..','..#.....#..','.#.......#.','.#..###..#.','#...###...#','#...###...#','.#########.'],
 berry:['....##...','...#.....','..###.##.','.#######.','#########','##.######','#########','.#######.','..#####..','...###...'],
 sign:['#############','#...........#','#...........#','#...........#','#############','......#......','......#......','......#......','......#......'],
 fence:['.#...#...#...#.','###############','.#...#...#...#.','.#...#...#...#.','###############','.#...#...#...#.'],
 grass:['#...#....#','.#.#..#.#.'],
 mine:['#####','.###.','..#..'],
} as const;
export const EMOTE={
 note:['...##..','...#.#.','...#..#','...#...','...#...','.###...','####...','.##....'],
 heart:['.##.##.','#######','#######','.#####.','..###..','...#...'],
 bang:['.##.','.##.','.##.','.##.','....','.##.','.##.'],
 ask:['.###.','#...#','....#','...#.','..#..','.....','..#..'],
 vein:['#...#','##.##','.....','##.##','#...#'],
 dots:['.......','#..#..#','#..#..#'],
 zed:['#####','...#.','..#..','.#...','#####'],
 sweat:['..#..','..#..','.###.','#####','#####','.###.'],
} as const;
export type EmoteId=keyof typeof EMOTE;
export const OBJ:Record<string,readonly string[]>={
 windmill:['....#....','....##...','....###..','#######..','..#######','..###....','...##....','....#....','....#....','....#....','....#....','....#....'],
 leaf:['......##.','...#####.','.######..','#######..','.#####...','..###....','.#.......'],
 bell:['....#....','...###...','..#####..','..#####..','.#######.','.#######.','#########','...###...','....#....'],
 spool:['#########','#########','..#####..','..#.#.#..','..#####..','..#.#.#..','..#####..','#########','#########'],
 pebble:['..#####..','.##..###.','#########','#########','.#######.'],
 umbrella:['......###......','...#########...','.#############.','###############','#.##.##.##.##.#','.......#.......','.......#.......','.......#.......','.......#.......','.....#.#.......','.....###.......'],
 boat:['......#......','.....##......','....###......','...####......','..#####......','......#......','#############','.###########.','..#########..'],
 acorn:['..#####..', '.#######.', '#########', '.#.....#.', '.#.....#.', '.#.....#.', '..#...#..', '..#...#..', '...#.#...', '....#....'],
 feather:['.........##', '.......####', '.....#####.', '...######..', '..######...', '.#####.....', '.###.......', '#..........', '#..........'],
 snail:['....###.....', '...#...#..#.', '..#.##..#.#.', '..#.#.#.#.##', '..#..#..###.', '...#...###..', '############', '.##########.'],
 puddle:['..#########..', '##.......####', '#############', '.###########.'],
 kite:['....#....', '...###...', '..#####..', '.#######.', '#########', '.#######.', '..#####..', '...###...', '....#....', '...#.....', '....#....', '...#.....'],
 mushroom:['...#####...', '.#########.', '##.###.####', '###########', '###########', '....###....', '....###....', '....###....', '....###....', '...#####...'],
 button:['..#####..', '.#######.', '###.#.###', '#########', '###.#.###', '#########', '#########', '.#######.', '..#####..'],
 dandelion:['.#.#.#.#.', '#.#.#.#.#', '.#.#.#.#.', '#.#.#.#.#', '.#.#.#.#.', '..#.#.#..', '....#....', '....#....', '....#....', '....#....', '....#....', '....#....'],
 shell:['....####..', '..##....#.', '.#..###..#', '#..#...#.#', '#..#.#.#.#', '#...##..#.', '.#.....#..', '..#####...'],
 sock:['..####...', '..####...', '..#..#...', '..####...', '..####...', '..####...', '..#####..', '..######.', '.########', '.########', '..######.'],
 ice:['.#######', '##.....#', '#.#....#', '#......#', '#......#', '#....#.#', '#......#', '########'],
 ladybird:['..#...#..', '...###...', '.#######.', '##.#.#.##', '#########', '##.#.#.##', '.#######.'],
 plane:['##...........','#.##.........','#...##.......','#.....##.....','#.......##...','#############','.##......##..','...##..##....','.....##......'],
 key:['..###.......','.#...#......','#.....######','#.....#..#.#','.#...#...#.#','..###.......'],
 can:['...####......','..#....#.....','.#########..#','.#########.#.','.##########..','.#########...','.#########...','..#######....'],
 mitten:['...####..','..######.','..######.','#.######.','########.','.#######.','..######.','..######.','..#.#.#..','..######.'],
 petal:['...##.#','..#####','.######','#######','.#####.','..##...','.#.....'],
 bee:['...##.##....','..#..#..#...','...##.##....','.#########..','#.##.##.###.','#.##.##.####','.#########..'],
 caterpillar:['..........##.','.##..##..####','#############','#############','.#.#.#.#.#.#.'],
 whistle:['..####......','.#....######','#......#####','#..##..#####','#......#....','.#....#.....','..####......'],
 musicbox:['.......#....','.......##...','.....###....','#########...','.#.......#..','..#.......#.','...#########','.##########.','.#........#.','.#.######.##','.#........#.','.##########.'],
 duck:['...###.....','..#####....','..##.###...','..#######..','..####.....','#.#######..','##########.','##########.','.########..'],
 bag:['#.#.#.#.#', '#########', '#.......#', '#.......#', '#..###..#', '#.......#', '#.......#', '#.......#', '#.......#', '#.......#', '#########'],
};
// Six things, two rows of three. Everything else the pet does by itself.
export const ICONS:{id:string;label:string;art:string[]}[]=[
 {id:'food',label:'FOOD',art:['...........','....###....','..#######..','.#########.','###########','...........','###########','.#########.','.#########.','..#######..','...#####...']},
 {id:'find',label:'OUTSIDE',art:['.....#.....','....#.#....','...#...#...','..#..#..#..','.#..###..#.','#..#####..#','.#..###..#.','..#..#..#..','...#...#...','....#.#....','.....#.....']},
 {id:'album',label:'ALBUM',art:['.#########.','.#.......##','.#.#####.##','.#.......##','.#.#####.##','.#.......##','.#.......##','.#########.','..#########','...........','...........']},
 {id:'check',label:'CHECK',art:['...........','.###...###.','#####.#####','###########','###########','.#########.','..#######..','...#####...','....###....','.....#.....','...........']},
];

/** The glass itself: lit dots, a faint ghost of each, and the gaps between cells. */
export function Lcd({children,night=false,label,onPoint}:{children:ReactNode;night?:boolean;label:string;onPoint?:(x:number,y:number,down:boolean,held:boolean)=>void}){
 // Where on the glass a finger is, in dots. Old handhelds could not feel this; it is the one modern liberty taken.
 const at=(e:{clientX:number;clientY:number;currentTarget:Element},down:boolean,held:boolean)=>{if(!onPoint)return;const r=e.currentTarget.getBoundingClientRect();onPoint((e.clientX-r.left)/r.width*128,(e.clientY-r.top)/r.height*128,down,held);};
 return <svg className={`matrix ${night?'night':''}`} viewBox="0 0 128 128" role="img" aria-label={label} shapeRendering="crispEdges" style={onPoint?{touchAction:'none'}:undefined} onPointerMove={e=>at(e,false,e.buttons!==0||e.pointerType==='touch')} onPointerDown={e=>at(e,true,true)}>
  <defs><clipPath id="pane"><rect x="76" y="20" width="46" height="27"/></clipPath><pattern id="cell" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0V1H0" fill="none" stroke="var(--gap)" strokeWidth=".16"/></pattern></defs>
  <rect width="128" height="128" fill={PAPER}/>
  <g className="ghost" transform="translate(.6 .6)" opacity=".1">{children}</g>
  <g>{children}</g>
  <rect width="128" height="128" fill="url(#cell)" pointerEvents="none"/>
 </svg>;
}
/** A framed text box at the foot of the screen, three lines of twenty characters. */
export function Box({lines,more=false,shown=999}:{lines:string[];more?:boolean;shown?:number}){
 let left=shown;
 return <g><rect x="0" y="92" width="128" height="36" fill={PAPER}/><path d="M1 93h126v34H1zM3 95v30h122V95z" fill={INK} fillRule="evenodd"/>
  {lines.slice(0,3).map((raw,i)=>{const l=plain(raw),cut=[...l].slice(0,Math.max(0,left)).join('');left-=[...l].length;return <path key={i} d={textPath(cut,5,98+i*9)} fill={INK}/>;})}
  {more&&<Bits rows={['#####','.###.','..#..']} x={117} y={121}/>}</g>;
}
