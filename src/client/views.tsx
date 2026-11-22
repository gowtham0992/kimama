// The views a pet brings home: eleven small pictures, each painted into a 104x52 one-bit plate.
// Tone is ordered dither, the way the old paint programs did it. Nothing here is a stored image;
// each plate is drawn once by its painter and cached.
import {Bits,INK} from './px';

const W=104,H=52,B=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const bell=(x:number,c:number,w:number)=>Math.exp(-(((x-c)/w)*((x-c)/w)));
const rnd=(n:number)=>{let x=Math.imul(n|0,2654435761)>>>0;x^=x>>>15;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;return (x>>>0)/4294967296;};
class Plate{
 a=new Uint8Array(W*H);
 set(x:number,y:number,v=1){x=Math.round(x);y=Math.round(y);if(x>=0&&x<W&&y>=0&&y<H)this.a[y*W+x]=v;}
 tone(x:number,y:number,d:number){this.set(x,y,d*16>B[(y&3)*4+(x&3)]?1:0);}
 wash(y0:number,y1:number,d0:number,d1:number){for(let y=y0;y<y1;y++)for(let x=0;x<W;x++)this.tone(x,y,d0+(d1-d0)*(y-y0)/Math.max(1,y1-y0-1));}
 rect(x:number,y:number,w:number,h:number,v=1){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.set(x+i,y+j,v);}
 shade(x:number,y:number,w:number,h:number,d:number){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.tone(x+i,y+j,d);}
 disc(cx:number,cy:number,r:number,v=1){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r+r*.6)this.set(cx+x,cy+y,v);}
 oval(cx:number,cy:number,rx:number,ry:number,v=1){for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++)if(x*x/(rx*rx)+y*y/(ry*ry)<=1)this.set(cx+x,cy+y,v);}
 line(x0:number,y0:number,x1:number,y1:number,v=1){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let i=0;i<=n;i++)this.set(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,v);}
 /** A wire hanging between two points. */
 sag(x0:number,y0:number,x1:number,y1:number,drop:number,v=1){for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++){const u=(x-x0)/(x1-x0||1);this.set(x,y0+(y1-y0)*u+drop*4*u*(1-u),v);}}
 /** Fill everything under a ridge line. */
 under(f:(x:number)=>number,d:number){for(let x=0;x<W;x++)for(let y=Math.round(f(x));y<H;y++)d>=1?this.set(x,y,1):this.tone(x,y,d);}
 rows(){const out:string[]=[];for(let y=0;y<H;y++){let s='';for(let x=0;x<W;x++)s+=this.a[y*W+x]?'#':'.';out.push(s);}return out;}
}
const skyline=(p:Plate,blocks:[number,number,number][],gable:number[]=[])=>{blocks.forEach(([x,w,top],i)=>{p.rect(x,top,w,H-top);if(gable.includes(i))for(let k=0;k<Math.ceil(w/2);k++)p.rect(x+k,top-1-k,w-2*k,1);});};
const bird=(p:Plate,x:number,y:number,v=1)=>{p.set(x-2,y-1,v);p.set(x-1,y,v);p.set(x,y+1,v);p.set(x+1,y,v);p.set(x+2,y-1,v);};

const PAINT:Record<string,(p:Plate)=>void>={
 roofs(p){
  p.wash(0,40,.8,.06);p.disc(72,35,9,0);
  skyline(p,[[0,13,36],[13,11,30],[24,15,38],[39,9,31],[48,17,40],[65,13,33],[78,10,37],[88,16,30]],[1,3,5,7]);
  for(const[x,y]of[[16,36],[20,36],[42,37],[68,39],[72,39],[92,35],[97,41],[4,42],[52,45]])p.rect(x,y,2,2,0);
  p.line(30,26,30,37);p.line(28,29,32,29);p.line(84,27,84,36);
  p.rect(57,12,1,30);p.rect(54,15,7,1);p.rect(55,19,5,1);p.sag(57,15,0,19,3);p.sag(57,15,103,17,4);p.sag(57,19,0,24,3);p.sag(57,19,103,22,4);
 },
 moon(p){
  p.wash(0,30,.95,.7);for(let i=0;i<16;i++)p.set(rnd(i+40)*W,rnd(i+90)*24,0);
  p.disc(74,13,7,0);p.set(71,11,1);p.set(76,15,1);p.set(77,10,1);
  p.under(x=>30-5*bell(x,14,16)-3*bell(x,36,9),1);p.rect(0,30,W,1);
  p.wash(31,H,.8,.92);
  for(let y=32;y<H;y+=2){const w=3+Math.floor(rnd(y)*4)+Math.floor((y-32)/3),o=Math.round((rnd(y+7)-.5)*4);p.rect(74-Math.floor(w/2)+o,y,w,1,0);}
  for(let k=0;k<4;k++)p.rect(30+k,39-k,7-2*k>0?1:0,1,0);p.rect(27,40,9,1,0);p.rect(28,41,7,1,0);p.line(31,33,31,39,0);p.line(32,34,35,38,0);
 },
 hill(p){
  p.shade(0,0,W,H,.1);p.oval(22,11,13,5,0);p.oval(33,9,9,5,0);p.oval(84,16,10,4,0);
  const ridge=(x:number)=>46-24*bell(x,58,30);
  p.under(ridge,.55);for(let x=0;x<W;x++)p.set(x,ridge(x),1);
  p.rect(58,13,2,10);p.disc(59,11,7,1);p.disc(53,14,4,1);p.disc(65,14,4,1);for(const[x,y]of[[56,7],[58,9],[54,11],[61,6]])p.set(x,y,0);
  bird(p,80,8);bird(p,88,12);bird(p,74,13);
  p.under(x=>48+Math.sin(x/5)*1.2,1);for(let x=2;x<W;x+=5)p.line(x,48,x+(rnd(x)>.5?1:-1),44+Math.floor(rnd(x+3)*2));
 },
 crossing(p){
  p.shade(0,0,W,36,.1);p.under(x=>33-3*Math.sin(x/17)-2*Math.sin(x/7+1),.45);p.rect(0,36,W,H-36,0);p.shade(0,36,W,H-36,.2);p.rect(0,36,W,1);
  for(let y=37;y<H;y++){const u=(y-34)/18;p.set(52-u*26,y,1);p.set(52+u*26,y,1);p.set(52-u*26+1,y,1);p.set(52+u*26-1,y,1);}
  for(const y of[38,41,45,50]){const u=(y-34)/18;p.rect(Math.round(52-u*30),y,Math.round(u*60),1);}
  p.rect(20,10,2,36);p.line(15,10,26,21);p.line(26,10,15,21);p.line(16,10,27,21);p.line(27,10,16,21);p.disc(16,27,2,1);p.disc(25,27,2,1);p.set(25,27,0);p.rect(16,26,10,1);
  p.rect(88,2,2,44);p.rect(82,5,14,1);p.rect(84,9,10,1);for(const[a,b]of[[5,3],[9,4]])p.sag(89,a,0,a+6,b);p.sag(89,5,103,7,2);
 },
 laundry(p){
  p.shade(0,0,W,H,.08);p.oval(64,9,16,6,0);p.oval(50,11,9,4,0);p.oval(78,12,8,3,0);for(let x=44;x<86;x++)p.set(x,15,x%2?1:0);
  p.rect(8,6,2,H-6);p.rect(94,10,2,H-10);p.sag(9,8,95,12,5);
  const y=(x:number)=>8+(12-8)*((x-9)/86)+5*4*((x-9)/86)*(1-(x-9)/86);
  p.rect(18,y(18),12,13);p.rect(15,y(18),3,5);p.rect(30,y(30),3,5);p.rect(22,y(22),4,2,0);                 // a shirt
  p.shade(38,y(38)+1,20,20,.5);for(let i=0;i<20;i++){p.set(38+i,y(38+i)+1,1);p.set(38+i,y(38)+21,1);}p.rect(38,y(38)+1,1,21);p.rect(58,y(58)+1,1,20); // a sheet
  p.rect(64,y(64)+1,4,9);p.rect(64,y(64)+9,7,3);                                                             // one sock
  for(let j=0;j<12;j++)p.rect(76,y(76)+1+j,9,1,j%3===1?0:1);                                               // a striped towel
  for(const x of[18,29,38,57,65,76,84])p.rect(x,y(x)-1,1,3);
  p.under(x=>46+Math.sin(x/4)*.8,.7);p.rect(0,H-2,W,2);
 },
 sea(p){
  p.wash(0,27,.6,.22);p.disc(52,21,9,0);p.rect(0,27,W,H-27,0);p.wash(27,H,.35,.7);p.rect(0,27,W,1);
  for(let y=29;y<H;y+=2){const w=4+Math.floor((y-27)*.7)+Math.floor(rnd(y)*3);p.rect(52-Math.floor(w/2)+Math.round((rnd(y+5)-.5)*5),y,w,1,0);}
  for(let i=0;i<22;i++){const y=30+Math.floor(rnd(i+11)*20),x=Math.floor(rnd(i+70)*W),w=3+Math.floor(rnd(i)*5);p.rect(x,y,w,1,rnd(i+3)>.5?1:0);}
  bird(p,22,10);bird(p,30,14);
  p.under(x=>H-1-13*bell(x,0,20),1);p.rect(86,23,7,1);p.rect(88,21,1,2);p.rect(90,22,2,1);
 },
 grass(p){
  p.shade(0,0,W,H,.08);
  p.oval(40,15,15,8,1);p.oval(56,13,12,10,1);p.oval(70,17,12,6,1);p.oval(40,15,14,7,0);p.oval(56,13,11,9,0);p.oval(70,17,11,5,0);p.rect(27,20,55,5,0);for(let x=27;x<82;x++)p.set(x,23,1);
  for(let i=0;i<46;i++){const x=rnd(i+1)*W,h=10+rnd(i+50)*22,lean=(rnd(i+9)-.5)*8;p.line(x,H,x+lean,H-h);if(i%3===0)p.line(x+1,H,x+lean+1,H-h+3);}
  p.rect(84,9,5,1);p.rect(86,7,1,5);p.set(85,8,1);p.set(87,8,1);p.set(85,10,1);p.set(87,10,1);
 },
 light(p){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const d=Math.hypot((x-50)*.8,(y-34));p.tone(x,y,Math.min(.95,.3+d/34));}
  for(let i=0;i<10;i++)p.set(rnd(i+5)*W,rnd(i+60)*12,0);
  p.rect(39,14,22,31,1);p.rect(40,15,20,29,0);
  for(let r=0;r<3;r++)for(let c=0;c<5;c++){p.rect(42+c*4,17+r*7,2,4,1);p.set(42+c*4,22+r*7,1);p.set(43+c*4,22+r*7,1);}
  p.rect(41,37,18,1,1);p.rect(44,40,8,2,1);p.rect(55,39,2,3,1);
  p.rect(0,45,W,1,1);for(let y=46;y<H;y++)for(let x=0;x<W;x++)p.tone(x,y,Math.min(.95,.25+Math.abs(x-50)/26+(y-46)*.06));
  p.set(66,20,0);p.set(67,19,0);p.set(34,24,0);p.set(33,25,0);
 },
 rain(p){
  // Seen from under the eaves: straight rain, a far hill, one house, and a paper charm hung out for better weather.
  p.under(x=>34-5*bell(x,30,26)-3*bell(x,86,16),.35);for(let x=0;x<W;x++)p.set(x,34-5*bell(x,30,26)-3*bell(x,86,16),1);
  skyline(p,[[14,18,33]],[0]);p.rect(20,37,4,4,0);p.rect(21,38,1,2,1);
  p.rect(0,43,W,H-43,0);p.shade(0,43,W,H-43,.28);p.rect(0,43,W,1);
  for(const[x,y,r]of[[30,48,7],[66,50,9],[92,46,5]] as const){p.oval(x,y,r,2,1);p.oval(x,y,r-1,1,0);}
  for(let c=0;c<26;c++)for(let r=0;r<5;r++){const x=c*4.3+(r%2)*2+rnd(c*7+r)*1.5,y=9+r*8+rnd(c+r*31)*5;if(y<41)p.line(x,y,x-1,y+4);}
  p.rect(0,0,W,6,1);for(let x=0;x<W;x++)p.set(x,6+(x%8<4?1:0),1);for(let x=3;x<W;x+=8)p.rect(x,0,1,5,0);
  p.line(76,7,76,13);p.disc(76,17,4,0);p.disc(76,17,3,1);p.disc(76,17,2,0);p.set(75,16,1);p.set(77,16,1);
  for(let k=0;k<6;k++){p.rect(76-2-k,21+k,5+2*k,1,0);p.set(76-3-k,21+k,1);p.set(76+3+k,21+k,1);}p.rect(72,27,9,1,1);
 },
 snow(p){
  p.wash(0,42,.85,.6);
  skyline(p,[[4,18,30],[30,14,34],[52,20,28],[80,18,33]],[0,1,2,3]);
  for(const[x,w,top]of[[4,18,30],[30,14,34],[52,20,28],[80,18,33]])for(let k=0;k<Math.ceil(w/2);k++){const y=top-1-k,n=Math.min(3,w-2*k);p.rect(x+k,y,n,1,0);p.rect(x+w-k-n,y,n,1,0);if(k<Math.ceil(w/2)-1){p.set(x+k-1,y,0);p.set(x+w-k,y,0);}}
  p.rect(58,33,4,4,0);p.rect(59,34,1,2,1);p.rect(10,35,3,3,0);
  p.rect(0,41,W,H-41,0);for(let x=0;x<W;x++)p.set(x,41+Math.round(Math.sin(x/9)),0);
  for(const x of[14,47,71,96])p.line(x,45+Math.floor(rnd(x)*3),x,42+Math.floor(rnd(x)*2));p.shade(0,47,W,5,.12);
  for(let i=0;i<54;i++){const x=rnd(i+3)*W,y=rnd(i+33)*40;p.set(x,y,0);if(i%4===0){p.set(x+1,y,0);p.set(x,y+1,0);p.set(x+1,y+1,0);}}
 },
 star(p){
  p.wash(0,H,.97,.78);for(let i=0;i<34;i++){const x=rnd(i+12)*W,y=rnd(i+44)*36;p.set(x,y,0);if(i%7===0){p.set(x+1,y,0);p.set(x-1,y,0);p.set(x,y+1,0);p.set(x,y-1,0);}}
  for(let i=0;i<=44;i++){const x=84-i,y=5+i*.5;p.set(x,y,0);if(i<26)p.set(x,y+1,0);if(i<10){p.set(x+1,y,0);p.set(x,y-1,0);}}p.disc(85,5,2,0);
  p.under(x=>44-5*bell(x,26,22)-3*bell(x,84,14),1);
  p.rect(26,31,1,8);p.disc(26,30,3,1);p.disc(23,32,2,1);p.disc(29,32,2,1);
 },
};
const plates=new Map<string,string[]>();
function plate(id:string):string[]{let r=plates.get(id);if(!r){const p=new Plate();(PAINT[id]??PAINT.hill)(p);r=p.rows();plates.set(id,r);}return r;}
/** A framed view; x,y is the top-left of the frame (108x56). */
export function View({id,x,y}:{id:string;x:number;y:number}){
 return <g><path d={`M${x} ${y}h108v56h-108zM${x+2} ${y+2}v52h104v-52z`} fill={INK} fillRule="evenodd"/><Bits rows={plate(id)} x={x+2} y={y+2}/></g>;
}
