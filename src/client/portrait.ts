// The owner's own avatar, redrawn for a one-colour dot matrix: an outline wherever the figure meets empty space,
// and the darker parts filled with an ordered dither. Returns null if the picture cannot be read (Reddit may refuse it to a canvas).
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
/** Rows of '#' and '.', W dots wide, from the top of the figure down. */
export function dots(data:Uint8ClampedArray,w:number,h:number):string[] {
 const solid=(x:number,y:number)=>x>=0&&y>=0&&x<w&&y<h&&data[(y*w+x)*4+3]>=96,rows:string[]=[];
 for(let y=0;y<h;y++){let row='';for(let x=0;x<w;x++){const i=(y*w+x)*4;
  if(!solid(x,y)){row+='.';continue;}
  const edge=!solid(x-1,y)||!solid(x+1,y)||!solid(x,y-1)||!solid(x,y+1),lum=(data[i]*.299+data[i+1]*.587+data[i+2]*.114)/255;
  row+=edge||lum<(BAYER[y%4][x%4]+.5)/16*.75?'#':'.';}rows.push(row);}
 return rows;
}
export function portrait(url:string,w=26,h=30):Promise<string[]|null> {
 return new Promise(done=>{try{const img=new Image();img.crossOrigin='anonymous';
  img.onload=()=>{try{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g)return done(null);
    // Head and shoulders: the full width of the picture, from its top.
    const sh=img.naturalWidth*h/w;g.drawImage(img,0,0,img.naturalWidth,Math.min(img.naturalHeight,sh),0,0,w,h);
    const rows=dots(g.getImageData(0,0,w,h).data,w,h);done(rows.some(r=>r.includes('#'))?rows:null);}catch{done(null);}};
  img.onerror=()=>done(null);img.src=url;}catch{done(null);}});
}
