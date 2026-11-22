// A tiny PNG painter for the game's own dots: no image library, so the brand is drawn by the same code as the game.
import {deflateSync} from 'node:zlib';
import {creaturePaths,textPath,plain,type Look} from '../src/client/px';

export type RGB=[number,number,number];
export const hex=(h:string):RGB=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)) as RGB;
export const INK=hex('#22301f'),PAPER=hex('#a9b790'),GAP=hex('#b3c09b');
/** The game's paths are unions of axis-aligned runs: "Mx yh{w}v{h}h-{w}z". Turn them back into dots. */
function dots(d:string):[number,number,number,number][]{const out:[number,number,number,number][]=[];for(const m of d.matchAll(/M(-?\d+) (-?\d+)h(\d+)v(\d+)h-\d+z/g))out.push([+m[1],+m[2],+m[3],+m[4]]);return out;}
export class Canvas{
 px:Uint8Array;constructor(public w:number,public h:number,bg:RGB){this.px=new Uint8Array(w*h*3);for(let i=0;i<w*h;i++)this.px.set(bg,i*3);}
 rect(x:number,y:number,w:number,h:number,c:RGB){for(let j=Math.max(0,y);j<Math.min(this.h,y+h);j++)for(let i=Math.max(0,x);i<Math.min(this.w,x+w);i++)this.px.set(c,(j*this.w+i)*3);}
 /** One lit cell: a square with a hairline gap, as on the glass. */
 cell(x:number,y:number,s:number,c:RGB){const g=Math.max(1,Math.round(s/11));this.rect(x,y,s-g,s-g,c);}
 path(d:string,ox:number,oy:number,s:number,c:RGB){for(const[x,y,w,h]of dots(d))for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.cell(ox+(x+i)*s,oy+(y+j)*s,s,c);}
 /** A sprite written as rows of '#' and '.'. */
 bits(rows:readonly string[],ox:number,oy:number,s:number,c:RGB){rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(ch==='#')this.cell(ox+x*s,oy+y*s,s,c);}));}
 grid(s:number,c:RGB,ox=0,oy=0){for(let y=oy;y<this.h;y+=s)for(let x=ox;x<this.w;x+=s)this.cell(x,y,s,c);}
 png():Buffer{
  const raw=Buffer.alloc((this.w*3+1)*this.h);for(let y=0;y<this.h;y++){raw[y*(this.w*3+1)]=0;Buffer.from(this.px.buffer,y*this.w*3,this.w*3).copy(raw,y*(this.w*3+1)+1);}
  const crcT=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=(b:Buffer)=>{let c=0xffffffff;for(const v of b)c=crcT[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const chunk=(t:string,d:Buffer)=>{const len=Buffer.alloc(4);len.writeUInt32BE(d.length);const body=Buffer.concat([Buffer.from(t),d]),sum=Buffer.alloc(4);sum.writeUInt32BE(crc(body));return Buffer.concat([len,body,sum]);};
  const head=Buffer.alloc(13);head.writeUInt32BE(this.w,0);head.writeUInt32BE(this.h,4);head[8]=8;head[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
 }
}
export const pet=(c:Canvas,look:Look,ox:number,oy:number,s:number)=>{const p=creaturePaths(look);c.path(p.ink,ox,oy,s,INK);c.path(p.face,ox,oy,s,PAPER);};
export const text=(c:Canvas,t:string,ox:number,oy:number,s:number)=>c.path(textPath(plain(t).replace(/\*/g,'★').replace(/-/g,'☆'),0,0),ox,oy,s,INK);
export const width=(t:string)=>Math.max(0,[...plain(t)].length*6-1);
