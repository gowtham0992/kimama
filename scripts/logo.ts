// Draws the community icon and banner from the game's own dots, so the logo is the pet, not a picture of it.
// Run: node --import tsx scripts/logo.ts
import {writeFileSync} from 'node:fs';
import {textPath,type Look} from '../src/client/px';
import {Canvas,INK,PAPER,GAP,pet,text} from './canvas';

// The pet, unimpressed, and its verdict: two stars.
const LOOK:Look={shape:'bold',stage:'child',eyes:'low',mouth:'flat',mark:0};

// Icon: the whole badge is the screen. Reddit crops it to a circle, so everything sits well inside one.
{const S=1024,s=22,c=new Canvas(S,S,PAPER);c.grid(s,GAP,(S%s)>>1,(S%s)>>1);
 const off=(S%s)>>1,cols=Math.floor(S/s),px=off+Math.round((cols-28)/2)*s,py=off+8*s;
 pet(c,LOOK,px,py,s);text(c,'**---',off+Math.round((cols-29)/2)*s,py+23*s,s);
 writeFileSync('brand/kimama-icon-1024.png',c.png());}
{const S=256,s=6,c=new Canvas(S,S,PAPER);c.grid(s,GAP,2,2);const cols=42,px=2+Math.round((cols-28)/2)*s,py=2+8*s;pet(c,LOOK,px,py,s);text(c,'**---',2+Math.round((cols-29)/2)*s,py+23*s,s);writeFileSync('brand/kimama-icon-256.png',c.png());}
// Banner: Reddit shows a short strip (about 1072x128 on desktop, 1080x128 on phones) cut from the middle of whatever
// is uploaded. So the banner is drawn at exactly twice that, one row of things, with clear space above and below.
{const W=2144,H=256,g=8,c=new Canvas(W,H,PAPER);c.grid(g,GAP);
 const name='KIMAMA',ns=2*g,nw=(name.length*6-1)*ns,ps=g,petW=28*ps,stars='**---',sw=(stars.length*6-1)*ns,gap=6*g,total=petW+gap+nw+gap+sw,x0=Math.round((W-total)/2/g)*g,top=Math.round((H-7*ns)/2/g)*g;
 pet(c,LOOK,x0,top-3*g,ps);c.path(textPath(name,0,0),x0+petW+gap,top,ns,INK);text(c,stars,x0+petW+gap+nw+gap,top,ns);
 writeFileSync('brand/kimama-banner-2144x256.png',c.png());}
console.log('wrote brand/kimama-icon-1024.png, kimama-icon-256.png and kimama-banner-2144x256.png');
